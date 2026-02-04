import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { logger } from '@rakuda/logger';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

const log = logger.child({ module: 'image-processor' });

// S3/MinIOクライアント
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minio_access_key',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minio_secret_key',
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET || 'images';

export interface ProcessedImage {
  originalUrl: string;
  processedKey: string;
  processedUrl: string;
  width: number;
  height: number;
  size: number;
}

/**
 * 画像をダウンロード
 */
async function downloadImage(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
}

/**
 * rembg で背景を削除
 */
async function removeBackground(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    // rembg がインストールされているか確認
    await execAsync('which rembg');

    // 背景削除実行
    await execAsync(`rembg i "${inputPath}" "${outputPath}"`, {
      timeout: 60000, // 1分タイムアウト
    });

    return true;
  } catch (error: any) {
    log.warn({
      type: 'rembg_not_available',
      message: 'rembg not installed, skipping background removal',
      error: error.message,
    });
    return false;
  }
}

/**
 * 画像を白背景に合成
 */
async function addWhiteBackground(inputPath: string, outputPath: string): Promise<void> {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  const width = metadata.width || 1000;
  const height = metadata.height || 1000;

  // 白背景を作成
  const whiteBackground = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  // 画像を合成
  await sharp(whiteBackground)
    .composite([{ input: inputPath, gravity: 'center' }])
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

/**
 * 画像をリサイズ・最適化
 */
async function optimizeImage(inputPath: string, outputPath: string): Promise<void> {
  await sharp(inputPath)
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toFile(outputPath);
}

/**
 * S3/MinIOにアップロード
 */
async function uploadToS3(filePath: string, key: string): Promise<string> {
  const fileContent = await fs.readFile(filePath);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: 'image/jpeg',
    })
  );

  // URLを構築
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  return `${endpoint}/${BUCKET_NAME}/${key}`;
}

/**
 * 画像を処理（ダウンロード → 背景削除 → 白背景追加 → 最適化 → アップロード）
 */
export async function processImage(
  imageUrl: string,
  productId: string,
  index: number,
  removeBackgroundEnabled: boolean = true
): Promise<ProcessedImage> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'als-image-'));
  const originalPath = path.join(tempDir, `original-${index}.jpg`);
  const noBgPath = path.join(tempDir, `nobg-${index}.png`);
  const whiteBgPath = path.join(tempDir, `whitebg-${index}.jpg`);
  const optimizedPath = path.join(tempDir, `optimized-${index}.jpg`);

  try {
    log.info({ type: 'process_image_start', imageUrl, productId, index });

    // 1. ダウンロード
    await downloadImage(imageUrl, originalPath);
    log.debug({ type: 'image_downloaded', index });

    let finalPath = originalPath;

    // 2. 背景削除（有効な場合）
    if (removeBackgroundEnabled) {
      const bgRemoved = await removeBackground(originalPath, noBgPath);
      if (bgRemoved) {
        // 3. 白背景追加
        await addWhiteBackground(noBgPath, whiteBgPath);
        finalPath = whiteBgPath;
        log.debug({ type: 'background_removed', index });
      }
    }

    // 4. 最適化
    await optimizeImage(finalPath, optimizedPath);
    log.debug({ type: 'image_optimized', index });

    // 5. S3にアップロード
    const timestamp = Date.now();
    const key = `products/${productId}/${timestamp}-${index}.jpg`;
    const uploadedUrl = await uploadToS3(optimizedPath, key);
    log.debug({ type: 'image_uploaded', key });

    // ファイル情報取得
    const stats = await fs.stat(optimizedPath);
    const metadata = await sharp(optimizedPath).metadata();

    return {
      originalUrl: imageUrl,
      processedKey: key,
      processedUrl: uploadedUrl,
      width: metadata.width || 0,
      height: metadata.height || 0,
      size: stats.size,
    };
  } finally {
    // 一時ファイル削除
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // 無視
    }
  }
}

/**
 * 複数画像を並列処理
 */
export async function processImages(
  imageUrls: string[],
  productId: string,
  removeBackgroundEnabled: boolean = true,
  concurrency: number = 3
): Promise<ProcessedImage[]> {
  const results: ProcessedImage[] = [];
  const errors: string[] = [];

  // 並列処理（制限付き）
  for (let i = 0; i < imageUrls.length; i += concurrency) {
    const batch = imageUrls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((url, batchIndex) =>
        processImage(url, productId, i + batchIndex, removeBackgroundEnabled)
      )
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason?.message || 'Unknown error');
      }
    }
  }

  if (errors.length > 0) {
    log.warn({
      type: 'some_images_failed',
      productId,
      successCount: results.length,
      errorCount: errors.length,
      errors: errors.slice(0, 5),
    });
  }

  return results;
}

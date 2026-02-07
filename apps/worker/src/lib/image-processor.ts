/**
 * Phase 40-B: 統合画像処理パイプライン
 * ダウンロード → 最適化 → 保存
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import sharp from 'sharp';
import { logger } from '@rakuda/logger';
import { downloadImage, isValidImageUrl } from './image-downloader';
import { optimizeImage, validateForJoom, OptimizationOptions } from './image-optimizer';
import { uploadFile, generateProductImageKey, deleteProductImages } from './storage';

const execAsync = promisify(exec);

const log = logger.child({ module: 'image-processor' });

export interface ProcessedImage {
  originalUrl: string;
  processedKey: string;
  processedUrl: string;
  width: number;
  height: number;
  size: number;
}

/**
 * 画像をダウンロード（シンプル版・後方互換性用）
 */
async function doDownloadImage(url: string, destPath: string): Promise<void> {
  // 新しいdownloaderモジュールを使用
  const result = await downloadImage(url, destPath, { timeout: 30000, retries: 3 });
  if (!result.success) {
    throw new Error(result.error || 'Download failed');
  }
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
 * 画像をリサイズ・最適化（シンプル版・後方互換性用）
 */
async function doOptimizeImage(inputPath: string, outputPath: string): Promise<void> {
  // 新しいoptimizerモジュールを使用
  const result = await optimizeImage(inputPath, outputPath, {
    maxWidth: 1200,
    maxHeight: 1200,
    format: 'jpeg',
    quality: 85,
    background: 'white',
  });
  if (!result.success) {
    throw new Error(result.error || 'Optimization failed');
  }
}

/**
 * S3/MinIOにアップロード（新モジュールを使用）
 */
async function uploadToS3(filePath: string, key: string): Promise<string> {
  const result = await uploadFile(filePath, key);
  if (!result.success || !result.url) {
    throw new Error(result.error || 'Upload failed');
  }
  return result.url;
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

    // 1. ダウンロード（リトライ付き）
    await doDownloadImage(imageUrl, originalPath);
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
    await doOptimizeImage(finalPath, optimizedPath);
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

/**
 * Phase 40-B: Joom用の画像処理パイプライン
 * WebP優先、白背景、Joom要件に準拠
 */
export interface JoomProcessedImage extends ProcessedImage {
  format: 'webp' | 'jpeg';
  joomCompliant: boolean;
  validationIssues: string[];
}

/**
 * Joom出品用に画像を処理
 */
export async function processImageForJoom(
  imageUrl: string,
  productId: string,
  index: number
): Promise<JoomProcessedImage> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'joom-image-'));
  const originalPath = path.join(tempDir, `original-${index}.tmp`);
  const optimizedPath = path.join(tempDir, `optimized-${index}`);

  try {
    log.info({ type: 'joom_image_start', imageUrl, productId, index });

    // URLの検証
    if (!isValidImageUrl(imageUrl)) {
      throw new Error(`Invalid image URL: ${imageUrl}`);
    }

    // 1. ダウンロード（リトライ付き）
    const downloadResult = await downloadImage(imageUrl, originalPath, {
      timeout: 30000,
      retries: 3,
    });

    if (!downloadResult.success) {
      throw new Error(downloadResult.error || 'Download failed');
    }

    // 2. WebP形式で最適化（Joom推奨）
    const optimizeResult = await optimizeImage(originalPath, optimizedPath, {
      maxWidth: 1200,
      maxHeight: 1200,
      format: 'webp',
      quality: 85,
      background: 'white',
    });

    if (!optimizeResult.success || !optimizeResult.outputPath) {
      throw new Error(optimizeResult.error || 'Optimization failed');
    }

    // 3. Joom要件の検証
    const validation = validateForJoom(
      optimizeResult.width || 0,
      optimizeResult.height || 0,
      optimizeResult.optimizedSize || 0
    );

    // 4. S3にアップロード
    const key = generateProductImageKey(productId, index, 'webp');
    const uploadResult = await uploadFile(optimizeResult.outputPath, key, {
      contentType: 'image/webp',
    });

    if (!uploadResult.success || !uploadResult.url) {
      throw new Error(uploadResult.error || 'Upload failed');
    }

    log.info({
      type: 'joom_image_complete',
      productId,
      index,
      format: 'webp',
      joomCompliant: validation.valid,
      issues: validation.issues,
    });

    return {
      originalUrl: imageUrl,
      processedKey: key,
      processedUrl: uploadResult.url,
      width: optimizeResult.width || 0,
      height: optimizeResult.height || 0,
      size: optimizeResult.optimizedSize || 0,
      format: 'webp',
      joomCompliant: validation.valid,
      validationIssues: validation.issues,
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
 * 複数画像をJoom用に並列処理
 */
export async function processImagesForJoom(
  imageUrls: string[],
  productId: string,
  concurrency: number = 3
): Promise<JoomProcessedImage[]> {
  const results: JoomProcessedImage[] = [];
  const errors: string[] = [];

  // 並列処理（制限付き）
  for (let i = 0; i < imageUrls.length; i += concurrency) {
    const batch = imageUrls.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map((url, batchIndex) =>
        processImageForJoom(url, productId, i + batchIndex)
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
      type: 'joom_some_images_failed',
      productId,
      successCount: results.length,
      errorCount: errors.length,
      errors: errors.slice(0, 5),
    });
  }

  // Joom準拠チェック結果をログ
  const compliantCount = results.filter(r => r.joomCompliant).length;
  log.info({
    type: 'joom_images_processed',
    productId,
    total: imageUrls.length,
    processed: results.length,
    joomCompliant: compliantCount,
    failed: errors.length,
  });

  return results;
}

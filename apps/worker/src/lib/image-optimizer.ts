/**
 * Phase 40-B: 画像最適化エンジン
 * sharp/jimpでリサイズ、WebP優先、JPEGフォールバック、白背景
 */
import sharp from 'sharp';
import fs from 'fs/promises';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'image-optimizer' });

/**
 * 最適化オプション
 */
export interface OptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  quality?: number;
  background?: 'white' | 'transparent' | 'original';
  stripMetadata?: boolean;
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  format: 'webp',          // WebP優先
  quality: 85,
  background: 'white',     // Joom推奨: 白背景
  stripMetadata: true,
};

/**
 * 最適化結果
 */
export interface OptimizationResult {
  success: boolean;
  outputPath?: string;
  format?: string;
  width?: number;
  height?: number;
  originalSize?: number;
  optimizedSize?: number;
  compressionRatio?: number;
  error?: string;
}

/**
 * 画像を最適化
 */
export async function optimizeImage(
  inputPath: string,
  outputPath: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    log.debug({
      type: 'optimize_start',
      inputPath,
      options: opts,
    });

    // 元ファイルサイズ
    const originalStats = await fs.stat(inputPath);
    const originalSize = originalStats.size;

    // 入力画像を読み込み
    let image = sharp(inputPath);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not determine image dimensions');
    }

    // リサイズ（アスペクト比維持）
    image = image.resize(opts.maxWidth, opts.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });

    // 白背景処理
    if (opts.background === 'white') {
      image = await addWhiteBackground(image);
    }

    // メタデータ削除
    if (opts.stripMetadata) {
      image = image.rotate(); // EXIFに基づいて回転してからメタデータ削除
    }

    // 出力フォーマット決定
    let finalFormat = opts.format;
    let finalOutputPath = outputPath;

    // auto: ブラウザ対応を考慮してWebP優先、フォールバックでJPEG
    if (finalFormat === 'auto') {
      finalFormat = 'webp';
    }

    // 拡張子を適切に設定
    if (finalFormat === 'webp') {
      finalOutputPath = outputPath.replace(/\.[^.]+$/, '.webp');
      image = image.webp({ quality: opts.quality, effort: 4 });
    } else if (finalFormat === 'png') {
      finalOutputPath = outputPath.replace(/\.[^.]+$/, '.png');
      image = image.png({ compressionLevel: 9 });
    } else {
      finalOutputPath = outputPath.replace(/\.[^.]+$/, '.jpg');
      image = image.jpeg({ quality: opts.quality, progressive: true });
    }

    // 出力
    const outputInfo = await image.toFile(finalOutputPath);

    // 出力ファイルサイズ
    const optimizedStats = await fs.stat(finalOutputPath);
    const optimizedSize = optimizedStats.size;
    const compressionRatio = originalSize / optimizedSize;

    log.info({
      type: 'optimize_complete',
      inputPath,
      outputPath: finalOutputPath,
      format: finalFormat,
      originalSize,
      optimizedSize,
      compressionRatio: compressionRatio.toFixed(2),
      dimensions: `${outputInfo.width}x${outputInfo.height}`,
    });

    return {
      success: true,
      outputPath: finalOutputPath,
      format: finalFormat,
      width: outputInfo.width,
      height: outputInfo.height,
      originalSize,
      optimizedSize,
      compressionRatio,
    };
  } catch (error: any) {
    log.error({
      type: 'optimize_error',
      inputPath,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 白背景を追加
 */
async function addWhiteBackground(image: sharp.Sharp): Promise<sharp.Sharp> {
  const metadata = await image.metadata();
  const width = metadata.width || 1200;
  const height = metadata.height || 1200;

  // 白背景を作成
  const whiteBackground = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  // 元画像をバッファに変換
  const imageBuffer = await image.png().toBuffer();

  // 合成して返す
  return sharp(whiteBackground)
    .composite([{ input: imageBuffer, gravity: 'center' }]);
}

/**
 * 画像のメタデータを取得
 */
export async function getImageMetadata(inputPath: string): Promise<{
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  size: number;
}> {
  const image = sharp(inputPath);
  const metadata = await image.metadata();
  const stats = await fs.stat(inputPath);

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    hasAlpha: metadata.hasAlpha || false,
    size: stats.size,
  };
}

/**
 * 画像がJoom要件を満たしているかチェック
 */
export function validateForJoom(
  width: number,
  height: number,
  size: number
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // 最小サイズ: 500x500
  if (width < 500 || height < 500) {
    issues.push(`Image too small: ${width}x${height} (minimum 500x500)`);
  }

  // 最大サイズ: 5000x5000
  if (width > 5000 || height > 5000) {
    issues.push(`Image too large: ${width}x${height} (maximum 5000x5000)`);
  }

  // ファイルサイズ: 最大10MB
  const maxSize = 10 * 1024 * 1024;
  if (size > maxSize) {
    issues.push(`File too large: ${(size / 1024 / 1024).toFixed(2)}MB (maximum 10MB)`);
  }

  // アスペクト比: 1:3以内
  const aspectRatio = Math.max(width, height) / Math.min(width, height);
  if (aspectRatio > 3) {
    issues.push(`Aspect ratio too extreme: ${aspectRatio.toFixed(2)} (maximum 3:1)`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * 複数画像を順次最適化
 */
export async function optimizeImages(
  inputPaths: string[],
  outputDir: string,
  options: OptimizationOptions = {}
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];

  for (let i = 0; i < inputPaths.length; i++) {
    const inputPath = inputPaths[i];
    const baseName = `image-${i}`;
    const outputPath = `${outputDir}/${baseName}`;

    const result = await optimizeImage(inputPath, outputPath, options);
    results.push(result);
  }

  return results;
}

/**
 * サムネイル生成
 */
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  size: number = 200
): Promise<OptimizationResult> {
  return optimizeImage(inputPath, outputPath, {
    maxWidth: size,
    maxHeight: size,
    format: 'webp',
    quality: 80,
    background: 'white',
  });
}

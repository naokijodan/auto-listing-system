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
 * Phase 48: 並列画像処理オプション
 */
export interface ParallelOptimizationOptions extends OptimizationOptions {
  concurrency?: number;  // 同時処理数（デフォルト: 4）
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Phase 48: 複数画像を並列最適化
 * Sharp並列処理でパフォーマンスを向上
 */
export async function optimizeImagesParallel(
  inputPaths: string[],
  outputDir: string,
  options: ParallelOptimizationOptions = {}
): Promise<OptimizationResult[]> {
  const { concurrency = 4, onProgress, ...optimizeOptions } = options;

  log.info({
    type: 'parallel_optimize_start',
    totalImages: inputPaths.length,
    concurrency,
  });

  const startTime = Date.now();
  const results: OptimizationResult[] = new Array(inputPaths.length);
  let completedCount = 0;

  // チャンクに分割して並列処理
  const chunks: string[][] = [];
  for (let i = 0; i < inputPaths.length; i += concurrency) {
    chunks.push(inputPaths.slice(i, i + concurrency));
  }

  let currentIndex = 0;
  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (inputPath, chunkIndex) => {
      const globalIndex = currentIndex + chunkIndex;
      const baseName = `image-${globalIndex}`;
      const outputPath = `${outputDir}/${baseName}`;

      try {
        const result = await optimizeImage(inputPath, outputPath, optimizeOptions);
        results[globalIndex] = result;

        completedCount++;
        if (onProgress) {
          onProgress(completedCount, inputPaths.length);
        }

        return result;
      } catch (error: any) {
        const errorResult: OptimizationResult = {
          success: false,
          error: error.message,
        };
        results[globalIndex] = errorResult;
        completedCount++;

        if (onProgress) {
          onProgress(completedCount, inputPaths.length);
        }

        return errorResult;
      }
    });

    await Promise.all(chunkPromises);
    currentIndex += chunk.length;
  }

  const duration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;

  log.info({
    type: 'parallel_optimize_complete',
    totalImages: inputPaths.length,
    successCount,
    failedCount: inputPaths.length - successCount,
    duration,
    avgPerImage: Math.round(duration / inputPaths.length),
  });

  return results;
}

/**
 * Phase 48: ストリーミング並列処理（大量画像向け）
 * メモリ効率を重視した実装
 */
export async function* optimizeImagesStream(
  inputPaths: string[],
  outputDir: string,
  options: ParallelOptimizationOptions = {}
): AsyncGenerator<OptimizationResult> {
  const { concurrency = 4, ...optimizeOptions } = options;

  const pending: Promise<{ index: number; result: OptimizationResult }>[] = [];
  const completed: Map<number, OptimizationResult> = new Map();
  let nextYieldIndex = 0;
  let startIndex = 0;

  // 初期バッチを開始
  while (startIndex < Math.min(concurrency, inputPaths.length)) {
    pending.push(processImage(startIndex, inputPaths[startIndex], outputDir, optimizeOptions));
    startIndex++;
  }

  while (nextYieldIndex < inputPaths.length) {
    // 完了済みを順番に返す
    while (completed.has(nextYieldIndex)) {
      yield completed.get(nextYieldIndex)!;
      completed.delete(nextYieldIndex);
      nextYieldIndex++;
    }

    if (pending.length === 0) break;

    // 次の完了を待つ
    const { index, result } = await Promise.race(pending);
    pending.splice(pending.findIndex(p => p.then(r => r.index === index)), 1);
    completed.set(index, result);

    // 新しいタスクを追加
    if (startIndex < inputPaths.length) {
      pending.push(processImage(startIndex, inputPaths[startIndex], outputDir, optimizeOptions));
      startIndex++;
    }
  }

  // 残りを返す
  while (completed.has(nextYieldIndex)) {
    yield completed.get(nextYieldIndex)!;
    completed.delete(nextYieldIndex);
    nextYieldIndex++;
  }
}

async function processImage(
  index: number,
  inputPath: string,
  outputDir: string,
  options: OptimizationOptions
): Promise<{ index: number; result: OptimizationResult }> {
  const baseName = `image-${index}`;
  const outputPath = `${outputDir}/${baseName}`;

  try {
    const result = await optimizeImage(inputPath, outputPath, options);
    return { index, result };
  } catch (error: any) {
    return {
      index,
      result: { success: false, error: error.message },
    };
  }
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

/**
 * Phase 40-B: 画像ダウンローダー
 * タイムアウト30秒、リトライ3回対応
 */
import fs from 'fs/promises';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'image-downloader' });

/**
 * ダウンロード設定
 */
export interface DownloadOptions {
  timeout?: number;      // タイムアウト（ミリ秒）
  retries?: number;      // リトライ回数
  retryDelay?: number;   // リトライ間隔（ミリ秒）
  headers?: Record<string, string>;
}

const DEFAULT_OPTIONS: Required<DownloadOptions> = {
  timeout: 30000,       // 30秒
  retries: 3,
  retryDelay: 1000,     // 1秒
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  },
};

/**
 * ダウンロード結果
 */
export interface DownloadResult {
  success: boolean;
  filePath?: string;
  contentType?: string;
  size?: number;
  error?: string;
  attempts: number;
}

/**
 * 指定URLから画像をダウンロード（リトライ対応）
 */
export async function downloadImage(
  url: string,
  destPath: string,
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      log.debug({
        type: 'download_attempt',
        url,
        attempt,
        maxAttempts: opts.retries,
      });

      const result = await downloadWithTimeout(url, destPath, opts);

      log.info({
        type: 'download_success',
        url,
        attempt,
        size: result.size,
        contentType: result.contentType,
      });

      return {
        success: true,
        filePath: destPath,
        contentType: result.contentType,
        size: result.size,
        attempts: attempt,
      };
    } catch (error: any) {
      lastError = error;

      log.warn({
        type: 'download_attempt_failed',
        url,
        attempt,
        error: error.message,
      });

      if (attempt < opts.retries) {
        await sleep(opts.retryDelay * attempt); // 指数バックオフ
      }
    }
  }

  log.error({
    type: 'download_failed',
    url,
    attempts: opts.retries,
    error: lastError?.message,
  });

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    attempts: opts.retries,
  };
}

/**
 * タイムアウト付きダウンロード
 */
async function downloadWithTimeout(
  url: string,
  destPath: string,
  opts: Required<DownloadOptions>
): Promise<{ contentType: string; size: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: opts.headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 画像かどうか確認
    if (!contentType.startsWith('image/')) {
      throw new Error(`Not an image: ${contentType}`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(buffer));

    return {
      contentType,
      size: buffer.byteLength,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 複数画像を並列ダウンロード
 */
export async function downloadImages(
  urls: string[],
  destDir: string,
  options: DownloadOptions = {},
  concurrency: number = 3
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map((url, batchIndex) => {
      const index = i + batchIndex;
      const destPath = `${destDir}/image-${index}.tmp`;
      return downloadImage(url, destPath, options);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * URLが有効な画像URLかどうかを簡易チェック
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 元サイトの画像URL有効期限を推測
 * メルカリ、ヤフオクなどは有効期限がある
 */
export function estimateUrlExpiry(url: string): Date | null {
  const urlLower = url.toLowerCase();

  // メルカリ: 約24時間
  if (urlLower.includes('static.mercdn.net')) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  // ヤフオク: 約7日
  if (urlLower.includes('auctions.c.yimg.jp')) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  // Amazon: 基本的に無期限（ただし変更される可能性あり）
  if (urlLower.includes('images-amazon.com') || urlLower.includes('m.media-amazon.com')) {
    return null;
  }

  // 不明な場合は1日と仮定
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

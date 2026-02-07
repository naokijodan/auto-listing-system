/**
 * Phase 40-B: ストレージサービス
 * MinIO/S3にアップロード、公開URLを返す
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'storage' });

/**
 * S3/MinIOクライアント
 */
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true, // MinIO互換性のため
});

const DEFAULT_BUCKET = process.env.S3_BUCKET || 'rakuda-images';
const CDN_URL = process.env.CDN_URL || process.env.S3_ENDPOINT || 'http://localhost:9000';

/**
 * アップロードオプション
 */
export interface UploadOptions {
  bucket?: string;
  contentType?: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

/**
 * アップロード結果
 */
export interface UploadResult {
  success: boolean;
  key?: string;
  url?: string;
  size?: number;
  error?: string;
}

/**
 * ファイルをS3/MinIOにアップロード
 */
export async function uploadFile(
  filePath: string,
  key: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const bucket = options.bucket || DEFAULT_BUCKET;

  try {
    // ファイル読み込み
    const fileContent = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    // Content-Typeを推測
    const contentType = options.contentType || guessContentType(filePath);

    log.debug({
      type: 'upload_start',
      key,
      bucket,
      size: stats.size,
      contentType,
    });

    // アップロード実行
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        Metadata: options.metadata,
        CacheControl: options.cacheControl || 'public, max-age=31536000', // 1年キャッシュ
      })
    );

    const url = buildPublicUrl(bucket, key);

    log.info({
      type: 'upload_success',
      key,
      bucket,
      size: stats.size,
      url,
    });

    return {
      success: true,
      key,
      url,
      size: stats.size,
    };
  } catch (error: any) {
    log.error({
      type: 'upload_error',
      key,
      bucket,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * バッファをS3/MinIOにアップロード
 */
export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const bucket = options.bucket || DEFAULT_BUCKET;

  try {
    const contentType = options.contentType || 'application/octet-stream';

    log.debug({
      type: 'upload_buffer_start',
      key,
      bucket,
      size: buffer.length,
      contentType,
    });

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: options.metadata,
        CacheControl: options.cacheControl || 'public, max-age=31536000',
      })
    );

    const url = buildPublicUrl(bucket, key);

    log.info({
      type: 'upload_buffer_success',
      key,
      bucket,
      size: buffer.length,
      url,
    });

    return {
      success: true,
      key,
      url,
      size: buffer.length,
    };
  } catch (error: any) {
    log.error({
      type: 'upload_buffer_error',
      key,
      bucket,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ファイルを削除
 */
export async function deleteFile(
  key: string,
  bucket: string = DEFAULT_BUCKET
): Promise<{ success: boolean; error?: string }> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );

    log.info({
      type: 'delete_success',
      key,
      bucket,
    });

    return { success: true };
  } catch (error: any) {
    log.error({
      type: 'delete_error',
      key,
      bucket,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * ファイルが存在するか確認
 */
export async function fileExists(
  key: string,
  bucket: string = DEFAULT_BUCKET
): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 商品画像用のキーを生成
 */
export function generateProductImageKey(
  productId: string,
  index: number,
  format: string = 'webp'
): string {
  const timestamp = Date.now();
  return `products/${productId}/${timestamp}-${index}.${format}`;
}

/**
 * 商品の全画像をリストアップ
 */
export async function listProductImages(
  productId: string,
  bucket: string = DEFAULT_BUCKET
): Promise<string[]> {
  try {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `products/${productId}/`,
      })
    );

    const keys = response.Contents?.map(obj => obj.Key).filter(Boolean) as string[] || [];

    log.debug({
      type: 'list_product_images',
      productId,
      count: keys.length,
    });

    return keys;
  } catch (error: any) {
    log.error({
      type: 'list_product_images_error',
      productId,
      error: error.message,
    });
    return [];
  }
}

/**
 * 商品の全画像を削除
 */
export async function deleteProductImages(
  productId: string,
  bucket: string = DEFAULT_BUCKET
): Promise<{ deleted: number; errors: number }> {
  const keys = await listProductImages(productId, bucket);
  let deleted = 0;
  let errors = 0;

  for (const key of keys) {
    const result = await deleteFile(key, bucket);
    if (result.success) {
      deleted++;
    } else {
      errors++;
    }
  }

  log.info({
    type: 'delete_product_images',
    productId,
    deleted,
    errors,
  });

  return { deleted, errors };
}

/**
 * 公開URLを構築
 */
export function buildPublicUrl(bucket: string, key: string): string {
  // CDN URLが設定されている場合はそれを使用
  const baseUrl = CDN_URL.replace(/\/$/, '');
  return `${baseUrl}/${bucket}/${key}`;
}

/**
 * Content-Typeを推測
 */
function guessContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();

  const contentTypes: Record<string, string> = {
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
  };

  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * ストレージのヘルスチェック
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  endpoint: string;
  bucket: string;
  error?: string;
}> {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  const bucket = DEFAULT_BUCKET;

  try {
    // バケットの存在確認（HeadBucketは権限が必要な場合があるため、ListObjectsを使用）
    await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 1,
      })
    );

    return {
      healthy: true,
      endpoint,
      bucket,
    };
  } catch (error: any) {
    return {
      healthy: false,
      endpoint,
      bucket,
      error: error.message,
    };
  }
}

/**
 * Cloudinary画像アップロードモジュール
 * Joom出品用の画像をCloudinaryにアップロードし、公開URLを返す
 */
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'cloudinary-uploader' });

let initialized = false;

// 環境変数: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export function initCloudinary(): void {
  if (initialized) return;
  if (!isCloudinaryConfigured()) {
    log.warn({ type: 'cloudinary_not_configured' });
    return;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: true,
  });
  initialized = true;
  log.info({ type: 'cloudinary_initialized', cloud: process.env.CLOUDINARY_CLOUD_NAME });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function uploadToCloudinary(
  filePath: string,
  options?: { folder?: string; publicId?: string }
): Promise<{ url: string; publicId: string }> {
  initCloudinary();

  const folder = options?.folder || 'rakuda/joom';
  const publicId = options?.publicId;

  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      log.debug({ type: 'cloudinary_upload_start', filePath, folder, publicId, attempt });
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
      });

      const url = result.secure_url || result.url;
      if (!url) {
        throw new Error('Cloudinary upload returned no URL');
      }

      log.info({ type: 'cloudinary_upload_success', publicId: result.public_id, url });
      return { url, publicId: result.public_id };
    } catch (err: any) {
      lastError = err;
      log.warn({ type: 'cloudinary_upload_retry', attempt, error: err?.message });
      if (attempt < maxRetries) await sleep(1000);
    }
  }

  log.error({ type: 'cloudinary_upload_failed', error: lastError?.message });
  throw lastError || new Error('Cloudinary upload failed');
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  initCloudinary();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    log.info({ type: 'cloudinary_delete_success', publicId });
  } catch (err: any) {
    log.error({ type: 'cloudinary_delete_failed', publicId, error: err?.message });
    throw err;
  }
}


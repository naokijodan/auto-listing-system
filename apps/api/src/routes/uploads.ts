/**
 * Phase 50: S3直接アップロード API
 * プリサインURLを生成してクライアント直接アップロードを可能にする
 */
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'uploads-api' });

// S3クライアント（遅延初期化）
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
      },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

function getDefaultBucket(): string {
  return process.env.S3_BUCKET || 'rakuda-images';
}

function getCdnUrl(): string {
  return process.env.CDN_URL || process.env.S3_ENDPOINT || 'http://localhost:9000';
}

function buildPublicUrl(bucket: string, key: string): string {
  const baseUrl = getCdnUrl().replace(/\/$/, '');
  return `${baseUrl}/${bucket}/${key}`;
}

// ========================================
// プリサインURL生成
// ========================================

interface PresignedUploadResult {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresAt: Date;
}

async function generatePresignedUploadUrl(
  key: string,
  options: {
    bucket?: string;
    contentType?: string;
    expiresIn?: number;
  } = {}
): Promise<PresignedUploadResult> {
  const bucket = options.bucket || getDefaultBucket();
  const expiresIn = options.expiresIn || 3600;
  const contentType = options.contentType || 'application/octet-stream';

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, { expiresIn });
  const publicUrl = buildPublicUrl(bucket, key);
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  log.info({
    type: 'presigned_upload_url_generated',
    key,
    bucket,
    contentType,
  });

  return { uploadUrl, key, publicUrl, expiresAt };
}

async function verifyUploadComplete(
  key: string,
  bucket: string = getDefaultBucket()
): Promise<{ exists: boolean; size?: number; contentType?: string }> {
  try {
    const response = await getS3Client().send(
      new HeadObjectCommand({ Bucket: bucket, Key: key })
    );
    return {
      exists: true,
      size: response.ContentLength,
      contentType: response.ContentType,
    };
  } catch (error: any) {
    if (error.name === 'NotFound') {
      return { exists: false };
    }
    throw error;
  }
}

// ========================================
// バリデーションスキーマ
// ========================================

const SingleUploadSchema = z.object({
  key: z.string().min(1),
  contentType: z.string().optional(),
  expiresIn: z.number().positive().optional(),
});

const BatchUploadSchema = z.object({
  files: z.array(z.object({
    key: z.string().min(1),
    contentType: z.string().optional(),
  })).min(1).max(20),
  expiresIn: z.number().positive().optional(),
});

const ProductImagesSchema = z.object({
  productId: z.string().min(1),
  imageCount: z.number().int().min(1).max(10),
  format: z.enum(['webp', 'jpg', 'jpeg', 'png']).optional(),
  expiresIn: z.number().positive().optional(),
});

const VerifyUploadSchema = z.object({
  key: z.string().min(1),
  bucket: z.string().optional(),
});

// ========================================
// エンドポイント
// ========================================

/**
 * POST /api/uploads/presigned
 */
router.post('/presigned', async (req: Request, res: Response) => {
  try {
    const data = SingleUploadSchema.parse(req.body);
    const result = await generatePresignedUploadUrl(data.key, {
      contentType: data.contentType,
      expiresIn: data.expiresIn,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      return;
    }
    log.error({ type: 'presigned_url_error', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uploads/batch
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const data = BatchUploadSchema.parse(req.body);

    const results = await Promise.all(
      data.files.map(file =>
        generatePresignedUploadUrl(file.key, {
          contentType: file.contentType,
          expiresIn: data.expiresIn,
        })
      )
    );

    log.info({ type: 'batch_presigned_urls_requested', count: data.files.length });
    res.json({ success: true, data: results });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      return;
    }
    log.error({ type: 'batch_presigned_error', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uploads/product-images
 */
router.post('/product-images', async (req: Request, res: Response) => {
  try {
    const data = ProductImagesSchema.parse(req.body);
    const format = data.format || 'webp';
    const timestamp = Date.now();

    const files = Array.from({ length: data.imageCount }, (_, i) => ({
      key: `products/${data.productId}/${timestamp}-${i}.${format}`,
      contentType: `image/${format}`,
    }));

    const results = await Promise.all(
      files.map(file =>
        generatePresignedUploadUrl(file.key, {
          contentType: file.contentType,
          expiresIn: data.expiresIn,
        })
      )
    );

    log.info({ type: 'product_image_urls_requested', productId: data.productId, count: data.imageCount });
    res.json({ success: true, data: { productId: data.productId, uploads: results } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      return;
    }
    log.error({ type: 'product_images_error', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uploads/verify
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const data = VerifyUploadSchema.parse(req.body);
    const bucket = data.bucket || getDefaultBucket();
    const result = await verifyUploadComplete(data.key, bucket);

    res.json({
      success: true,
      data: {
        key: data.key,
        ...result,
        publicUrl: result.exists ? buildPublicUrl(bucket, data.key) : null,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      return;
    }
    log.error({ type: 'verify_upload_error', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/uploads/verify-batch
 */
router.post('/verify-batch', async (req: Request, res: Response) => {
  try {
    const { keys, bucket: inputBucket } = req.body;

    if (!Array.isArray(keys) || keys.length === 0) {
      res.status(400).json({ success: false, error: 'keys must be a non-empty array' });
      return;
    }

    const bucket = inputBucket || getDefaultBucket();
    const results = await Promise.all(
      keys.map(async (key: string) => {
        const result = await verifyUploadComplete(key, bucket);
        return {
          key,
          ...result,
          publicUrl: result.exists ? buildPublicUrl(bucket, key) : null,
        };
      })
    );

    const allComplete = results.every(r => r.exists);
    const completedCount = results.filter(r => r.exists).length;

    res.json({
      success: true,
      data: { allComplete, completedCount, totalCount: keys.length, files: results },
    });
  } catch (error: any) {
    log.error({ type: 'verify_batch_error', error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/uploads/instructions
 */
router.get('/instructions', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      steps: [
        { step: 1, action: 'Request presigned URL', endpoint: 'POST /api/uploads/presigned' },
        { step: 2, action: 'Upload file directly to S3', method: 'PUT', headers: { 'Content-Type': 'Your file content type' } },
        { step: 3, action: 'Verify upload', endpoint: 'POST /api/uploads/verify' },
      ],
      example: {
        request: { key: 'products/123/image-0.webp', contentType: 'image/webp', expiresIn: 3600 },
        response: {
          uploadUrl: 'https://s3.example.com/bucket/products/123/image-0.webp?signature=...',
          key: 'products/123/image-0.webp',
          publicUrl: 'https://cdn.example.com/bucket/products/123/image-0.webp',
          expiresAt: '2024-01-01T12:00:00.000Z',
        },
      },
      notes: [
        'Presigned URLs expire after the specified time (default: 1 hour)',
        'Maximum file size: 10MB for product images',
        'For product images, use POST /api/uploads/product-images for convenience',
      ],
    },
  });
});

export default router;

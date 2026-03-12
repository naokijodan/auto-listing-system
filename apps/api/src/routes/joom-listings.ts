/**
 * Joom 出品管理 + 統計 ルーター
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, ListingStatus, Marketplace } from '@prisma/client';
import { addPublishJob } from '@rakuda/queue';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// Joom API base URL (v3) used by enable/disable/delete
const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3';

// ========================================
// Joom出品管理
// ========================================

// ========================================
// Validation Schemas
// ========================================

const ListingsQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateListingSchema = z.object({
  enrichmentTaskId: z.string().min(1),
});

const ListingIdParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * Joom出品一覧
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const { status, limit, offset } = ListingsQuerySchema.parse(req.query);

    const where: Record<string, unknown> = {
      marketplace: Marketplace.JOOM,
    };
    if (status) {
      const s = String(status).toUpperCase();
      const statusMap: Record<string, ListingStatus> = {
        DRAFT: 'DRAFT',
        READY: 'PENDING_PUBLISH',
        PUBLISHING: 'PUBLISHING',
        ACTIVE: 'ACTIVE',
        PAUSED: 'PAUSED',
        SOLD: 'SOLD',
        ENDED: 'ENDED',
        ERROR: 'ERROR',
      };
      if (statusMap[s]) where.status = statusMap[s];
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              price: true,
              images: true,
              processedImages: true,
              category: true,
              brand: true,
              condition: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({ success: true, data: listings, total });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to list Joom listings:', error);
    res.status(500).json({ success: false, error: 'Failed to list Joom listings' });
  }
});

/**
 * Joom出品詳細
 */
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    res.json({ success: true, data: listing });
  } catch (error) {
    console.error('Failed to get Joom listing:', error);
    res.status(500).json({ success: false, error: 'Failed to get Joom listing' });
  }
});

/**
 * Joom出品作成（エンリッチメントタスクから）
 */
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const parsed = CreateListingSchema.parse({
      enrichmentTaskId: req.body?.enrichmentTaskId ?? req.body?.taskId,
    });
    const taskId = parsed.enrichmentTaskId;

    const task = await prisma.enrichmentTask.findUnique({
      where: { id: taskId },
      // Ensure pricing is included along with required fields
      select: {
        id: true,
        productId: true,
        status: true,
        pricing: true,
      },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Enrichment task not found' });
    }

    if (!['APPROVED', 'PUBLISHED'].includes(task.status)) {
      return res.status(400).json({ success: false, error: `Task not approved: ${task.status}` });
    }

    // Determine initial listing price from task.pricing.finalPriceUsd
    const pricing = (task.pricing as any) || {};
    const initialPriceUsd: number = typeof pricing.finalPriceUsd === 'number' ? pricing.finalPriceUsd : 0;
    if (typeof pricing.finalPriceUsd !== 'number') {
      console.warn(`Joom listingPrice missing for task ${taskId}; defaulting to 0`);
    }

    const existingListing = await prisma.listing.findFirst({
      where: {
        productId: task.productId,
        marketplace: Marketplace.JOOM,
        credentialId: null,
      },
      include: { product: true },
    });

    const listing = existingListing
      ? existingListing
      : await prisma.listing.create({
          data: {
            productId: task.productId,
            marketplace: Marketplace.JOOM as any,
            status: 'DRAFT',
            listingPrice: initialPriceUsd,
            currency: 'USD',
            marketplaceData: {},
          },
          include: { product: true },
        });

    res.status(201).json({ success: true, data: listing });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to create Joom listing:', error);
    res.status(500).json({ success: false, error: 'Failed to create Joom listing' });
  }
});

/**
 * Dry-Run（出品プレビュー）
 */
router.post('/listings/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = ListingIdParamSchema.parse(req.params);

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    const data = (listing.marketplaceData as Record<string, any>) || {};

    const warnings: string[] = [];

    // 価格チェック
    const priceForPreview = listing.listingPrice || listing.product.price || 0;
    if (priceForPreview < 5) {
      warnings.push('Price might be too low for this category');
    }
    if (priceForPreview > 500) {
      warnings.push('High price items may have lower conversion');
    }

    // 画像チェック
    const imagesFromProduct = (listing.product.processedImages?.length ? listing.product.processedImages : listing.product.images) || [];
    const imagesFromData = (data.joomImages as string[]) || [];
    const images = imagesFromData.length > 0 ? imagesFromData : imagesFromProduct;
    if (images.length < 3) {
      warnings.push('Recommended to have at least 3 images');
    }

    // 属性チェック
    const attributes = (data.joomAttributes as Record<string, unknown>) || {};
    if (!attributes || Object.keys(attributes).length === 0) {
      warnings.push('No brand detected - may affect search visibility');
    }

    // 可視性スコア
    let visibility: 'low' | 'medium' | 'high' = 'medium';
    const title = (data.title as string) || listing.product.titleEn || listing.product.title;
    if (title && images.length >= 3) {
      visibility = 'high';
    } else if (warnings.length > 2) {
      visibility = 'low';
    }

    const preview = {
      wouldCreate: {
        title,
        description: (data.description as string) || listing.product.descriptionEn || listing.product.description,
        price: priceForPreview,
        images,
        attributes: attributes || {},
      },
      validation: {
        passed: true,
        warnings,
      },
      estimatedVisibility: visibility,
    };

    // Dry-Run結果を保存（marketplaceDataに格納）
    await prisma.listing.update({
      where: { id },
      data: { marketplaceData: { ...(listing.marketplaceData as object), dryRunResult: preview } as any },
    });

    res.json({ success: true, data: preview });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to preview Joom listing:', error);
    res.status(500).json({ success: false, error: 'Failed to preview Joom listing' });
  }
});

/**
 * 出品実行（ジョブキュー経由）
 */
router.post('/listings/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = ListingIdParamSchema.parse(req.params);

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    if (listing.status === 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Listing is already active' });
    }

    // ステータスを更新
    await prisma.listing.update({
      where: { id },
      data: { status: 'PENDING_PUBLISH' },
    });

    // ジョブキューに追加
    const jobId = await addPublishJob(id);

    res.json({ success: true, data: { message: 'Publishing started', listingId: id, jobId, status: 'PENDING_PUBLISH' } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to publish Joom listing:', error);
    res.status(500).json({ success: false, error: 'Failed to publish Joom listing' });
  }
});

/**
 * Joom出品の再有効化（PAUSED → ACTIVE）
 */
router.post('/listings/:id/enable', async (req: Request, res: Response) => {
  try {
    const { id } = ListingIdParamSchema.parse(req.params);
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    if (listing.marketplace !== Marketplace.JOOM) return res.status(400).json({ success: false, error: 'Not a Joom listing' });
    if (listing.status !== 'PAUSED') return res.status(400).json({ success: false, error: 'Listing is not paused' });

    const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
    const joomProductId = (marketplaceData.joomProductId || (listing as any).marketplaceListingId) as string;
    if (!joomProductId) return res.status(400).json({ success: false, error: 'No Joom product ID found' });

    // Call Joom API directly
    const credential = await prisma.marketplaceCredential.findFirst({ where: { marketplace: 'JOOM' } });
    if (!credential) return res.status(400).json({ success: false, error: 'Joom credentials not found' });
    const creds = credential.credentials as any;
    const accessToken = creds?.accessToken as string | undefined;
    if (!accessToken) return res.status(400).json({ success: false, error: 'Joom access token missing' });

    const response = await fetch(`${JOOM_API_BASE}/products/update?id=${encodeURIComponent(joomProductId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    const data = (await response.json().catch(() => ({}))) as any;
    if (!response.ok && data?.code !== 0) {
      return res.status(502).json({ success: false, error: 'Failed to enable on Joom', details: data });
    }

    // Update DB only after Joom API success
    await prisma.listing.update({
      where: { id },
      data: { status: 'ACTIVE', listedAt: new Date(), errorMessage: null },
    });

    res.json({ success: true, message: 'Listing enabled on Joom', listingId: id, joomProductId });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to enable Joom listing:', error);
    res.status(500).json({ success: false, error: 'Failed to enable Joom listing' });
  }
});

/**
 * Joom出品の一時停止（ACTIVE → PAUSED）
 */
router.post('/listings/:id/disable', async (req: Request, res: Response) => {
  try {
    const { id } = ListingIdParamSchema.parse(req.params);
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ success: false, error: 'Listing not found' });
    if (listing.marketplace !== Marketplace.JOOM) return res.status(400).json({ success: false, error: 'Not a Joom listing' });
    if (listing.status !== 'ACTIVE') return res.status(400).json({ success: false, error: 'Listing is not active' });

    const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
    const joomProductId = (marketplaceData.joomProductId || (listing as any).marketplaceListingId) as string;
    if (!joomProductId) return res.status(400).json({ success: false, error: 'No Joom product ID found' });

    // Call Joom API directly
    const credential = await prisma.marketplaceCredential.findFirst({ where: { marketplace: 'JOOM' } });
    if (!credential) return res.status(400).json({ success: false, error: 'Joom credentials not found' });
    const creds = credential.credentials as any;
    const accessToken = creds?.accessToken as string | undefined;
    if (!accessToken) return res.status(400).json({ success: false, error: 'Joom access token missing' });

    const response = await fetch(`${JOOM_API_BASE}/products/update?id=${encodeURIComponent(joomProductId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    const data = (await response.json().catch(() => ({}))) as any;
    if (!response.ok && data?.code !== 0) {
      return res.status(502).json({ success: false, error: 'Failed to disable on Joom', details: data });
    }

    // Update DB only after Joom API success
    await prisma.listing.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    res.json({ success: true, message: 'Listing disabled on Joom', listingId: id, joomProductId });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to disable Joom listing:', error);
    res.status(500).json({ success: false, error: 'Failed to disable Joom listing' });
  }
});

/**
 * 出品キャンセル/削除
 */
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = ListingIdParamSchema.parse(req.params);

    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return res.status(404).json({ success: false, error: 'Listing not found' });
    }

    // Get Joom product ID
    const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
    const joomProductId = (marketplaceData.joomProductId || (listing as any).marketplaceListingId) as string | undefined;

    // Delete from Joom API directly (not via queue)
    if (joomProductId) {
      const credential = await prisma.marketplaceCredential.findFirst({
        where: { marketplace: 'JOOM' },
      });
      if (credential) {
        const creds = credential.credentials as any;
        const accessToken = (creds?.accessToken as string) || undefined;
        if (accessToken) {
          const response = await fetch(
            `${JOOM_API_BASE}/products/remove?id=${encodeURIComponent(joomProductId)}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ reason: 'stopSelling' }),
            }
          );
          const data = (await response.json().catch(() => ({}))) as any;
          if (!response.ok && data?.code !== 0) {
            console.error('Joom API delete failed:', data);
            return res.status(502).json({ success: false, error: 'Failed to delete from Joom', details: data });
          }
        }
      }
    }

    // Only delete from DB after successful Joom deletion
    await prisma.listing.delete({ where: { id } });

    res.json({ success: true, message: 'Listing deleted from Joom and DB' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to delete Joom listing:', error);
    res.status(500).json({ success: false, error: 'Failed to delete Joom listing' });
  }
});

// ========================================
// 出品統計
// ========================================

/**
 * 出品統計
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const baseWhere = { marketplace: Marketplace.JOOM };

    const [
      total,
      draft,
      pendingPublish,
      publishing,
      active,
      paused,
      sold,
      error,
    ] = await Promise.all([
      prisma.listing.count({ where: baseWhere }),
      prisma.listing.count({ where: { ...baseWhere, status: 'DRAFT' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'PENDING_PUBLISH' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'PUBLISHING' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'PAUSED' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'SOLD' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'ERROR' } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        draft,
        pendingPublish,
        publishing,
        active,
        paused,
        sold,
        error,
      },
    });
  } catch (error) {
    console.error('Failed to get Joom stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get Joom stats' });
  }
});

export default router;

/**
 * Phase 40-41: Joom出品ワークフロー API
 * Phase 41: BullMQジョブキュー統合
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, ListingStatus, Marketplace } from '@prisma/client';
import type { BatchPublishStatus } from '@prisma/client';
import {
  addCreateListingJob,
  addPublishJob,
  addBatchPublishJob,
  addFullJoomWorkflowJob,
  addAutoJoomPublishJob,
  getJoomPublishQueueStats,
  getJobStatus,
  QUEUE_NAMES,
  initQueueConnection,
} from '@rakuda/queue';
import { Queue } from 'bullmq';

const router = Router();
const prisma = new PrismaClient();
// BullMQ queue for Joom publish-related jobs
const joomPublishQueue = new Queue(QUEUE_NAMES.JOOM_PUBLISH, { connection: initQueueConnection() });

// ========================================
// Joom出品管理
// ========================================

/**
 * Joom出品一覧
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = '50',
      offset = '0',
    } = req.query;

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
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
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

    res.json({ listings, total });
  } catch (error) {
    console.error('Failed to list Joom listings:', error);
    res.status(500).json({ error: 'Failed to list Joom listings' });
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
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    console.error('Failed to get Joom listing:', error);
    res.status(500).json({ error: 'Failed to get Joom listing' });
  }
});

/**
 * Joom出品作成（エンリッチメントタスクから）
 */
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

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
      return res.status(404).json({ error: 'Enrichment task not found' });
    }

    if (task.status !== 'APPROVED') {
      return res.status(400).json({ error: `Task not approved: ${task.status}` });
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

    res.status(201).json(listing);
  } catch (error) {
    console.error('Failed to create Joom listing:', error);
    res.status(500).json({ error: 'Failed to create Joom listing' });
  }
});

/**
 * Dry-Run（出品プレビュー）
 */
router.post('/listings/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
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

    res.json(preview);
  } catch (error) {
    console.error('Failed to preview Joom listing:', error);
    res.status(500).json({ error: 'Failed to preview Joom listing' });
  }
});

/**
 * 出品実行（ジョブキュー経由）
 */
router.post('/listings/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Listing is already active' });
    }

    // ステータスを更新
    await prisma.listing.update({
      where: { id },
      data: { status: 'PENDING_PUBLISH' },
    });

    // ジョブキューに追加
    const jobId = await addPublishJob(id);

    res.json({ message: 'Publishing started', listingId: id, jobId, status: 'PENDING_PUBLISH' });
  } catch (error) {
    console.error('Failed to publish Joom listing:', error);
    res.status(500).json({ error: 'Failed to publish Joom listing' });
  }
});

/**
 * Joom出品の再有効化（PAUSED → ACTIVE）
 */
router.post('/listings/:id/enable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.marketplace !== Marketplace.JOOM) return res.status(400).json({ error: 'Not a Joom listing' });
    if (listing.status !== 'PAUSED') return res.status(400).json({ error: 'Listing is not paused' });

    const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
    const joomProductId = (marketplaceData.joomProductId || (listing as any).marketplaceListingId) as string;
    if (!joomProductId) return res.status(400).json({ error: 'No Joom product ID found' });

    // Queue enable job
    await joomPublishQueue.add('enable-product', {
      listingId: id,
      joomProductId,
    });

    res.json({ message: 'Enable job queued', listingId: id, joomProductId });
  } catch (error) {
    console.error('Failed to enable Joom listing:', error);
    res.status(500).json({ error: 'Failed to enable Joom listing' });
  }
});

/**
 * Joom出品の一時停止（ACTIVE → PAUSED）
 */
router.post('/listings/:id/disable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (listing.marketplace !== Marketplace.JOOM) return res.status(400).json({ error: 'Not a Joom listing' });
    if (listing.status !== 'ACTIVE') return res.status(400).json({ error: 'Listing is not active' });

    const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
    const joomProductId = (marketplaceData.joomProductId || (listing as any).marketplaceListingId) as string;
    if (!joomProductId) return res.status(400).json({ error: 'No Joom product ID found' });

    // Queue disable job
    await joomPublishQueue.add('disable-product', {
      listingId: id,
      joomProductId,
    });

    res.json({ message: 'Disable job queued', listingId: id, joomProductId });
  } catch (error) {
    console.error('Failed to disable Joom listing:', error);
    res.status(500).json({ error: 'Failed to disable Joom listing' });
  }
});

/**
 * 出品キャンセル/削除
 */
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Joom APIから削除（出品済みの場合）- 非同期でWorkerに委託
    const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
    const joomProductId = marketplaceData.joomProductId as string | undefined;
    if (joomProductId) {
      try {
        await joomPublishQueue.add('delete-product', {
          joomProductId,
          joomListingId: listing.id,
        });
        console.log('Queued Joom product deletion:', joomProductId);
      } catch (queueErr: any) {
        console.error('Failed to queue Joom product deletion:', queueErr?.message);
      }
    }

    await prisma.listing.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete Joom listing:', error);
    res.status(500).json({ error: 'Failed to delete Joom listing' });
  }
});

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
      total,
      draft,
      pendingPublish,
      publishing,
      active,
      paused,
      sold,
      error,
    });
  } catch (error) {
    console.error('Failed to get Joom stats:', error);
    res.status(500).json({ error: 'Failed to get Joom stats' });
  }
});

// ========================================
// バッチ出品
// ========================================

/**
 * バッチ一覧
 */
router.get('/batches', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = '20',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as BatchPublishStatus;

    const [batches, total] = await Promise.all([
      prisma.joomPublishBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.joomPublishBatch.count({ where }),
    ]);

    res.json({ batches, total });
  } catch (error) {
    console.error('Failed to list Joom batches:', error);
    res.status(500).json({ error: 'Failed to list Joom batches' });
  }
});

/**
 * バッチ詳細
 */
router.get('/batches/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.joomPublishBatch.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(batch);
  } catch (error) {
    console.error('Failed to get Joom batch:', error);
    res.status(500).json({ error: 'Failed to get Joom batch' });
  }
});

/**
 * バッチ作成
 */
router.post('/batches', async (req: Request, res: Response) => {
  try {
    const {
      name,
      productIds,
      dryRun = false,
      concurrency = 5,
      createdById,
    } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    const batch = await prisma.joomPublishBatch.create({
      data: {
        name,
        productIds,
        totalCount: productIds.length,
        dryRun,
        concurrency,
        createdById,
        status: 'PENDING',
      },
    });

    res.status(201).json(batch);
  } catch (error) {
    console.error('Failed to create Joom batch:', error);
    res.status(500).json({ error: 'Failed to create Joom batch' });
  }
});

/**
 * バッチ実行（ジョブキュー経由）
 */
router.post('/batches/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.joomPublishBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (batch.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot execute batch in status: ${batch.status}` });
    }

    // ステータスを更新
    await prisma.joomPublishBatch.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    // ジョブキューに追加
    const jobId = await addBatchPublishJob(id);

    res.json({ message: 'Batch execution started', batchId: id, jobId });
  } catch (error) {
    console.error('Failed to execute Joom batch:', error);
    res.status(500).json({ error: 'Failed to execute Joom batch' });
  }
});

/**
 * バッチキャンセル
 */
router.post('/batches/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const batch = await prisma.joomPublishBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (!['PENDING', 'PROCESSING'].includes(batch.status)) {
      return res.status(400).json({ error: `Cannot cancel batch in status: ${batch.status}` });
    }

    await prisma.joomPublishBatch.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ message: 'Batch cancelled' });
  } catch (error) {
    console.error('Failed to cancel Joom batch:', error);
    res.status(500).json({ error: 'Failed to cancel Joom batch' });
  }
});

// ========================================
// APIログ
// ========================================

/**
 * APIログ一覧
 */
router.get('/api-logs', async (req: Request, res: Response) => {
  try {
    const {
      success,
      endpoint,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (success !== undefined) where.success = success === 'true';
    if (endpoint) where.endpoint = { contains: endpoint as string };

    const [logs, total] = await Promise.all([
      prisma.joomApiLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.joomApiLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (error) {
    console.error('Failed to list Joom API logs:', error);
    res.status(500).json({ error: 'Failed to list Joom API logs' });
  }
});

// ========================================
// ワークフロー操作
// ========================================

/**
 * 商品の完全ワークフロー実行（ジョブキュー経由）
 */
router.post('/workflow/full', async (req: Request, res: Response) => {
  try {
    const { taskId, skipImages = false } = req.body;

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    const task = await prisma.enrichmentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'APPROVED') {
      return res.status(400).json({ error: `Task not approved: ${task.status}` });
    }

    // ジョブキューに追加
    const jobId = await addFullJoomWorkflowJob(taskId, skipImages);

    res.json({
      message: 'Workflow started',
      taskId,
      jobId,
    });
  } catch (error) {
    console.error('Failed to start workflow:', error);
    res.status(500).json({ error: 'Failed to start workflow' });
  }
});

/**
 * 承認済み商品の自動出品（ジョブキュー経由）
 */
router.post('/workflow/publish-approved', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.body;

    // ジョブキューに追加
    const jobId = await addAutoJoomPublishJob(limit);

    res.json({
      message: 'Auto publish job queued',
      limit,
      jobId,
    });
  } catch (error) {
    console.error('Failed to publish approved:', error);
    res.status(500).json({ error: 'Failed to publish approved' });
  }
});

// ========================================
// キュー管理
// ========================================

/**
 * キュー統計
 */
router.get('/queue/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getJoomPublishQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

/**
 * 失敗したジョブ一覧（デバッグ用）
 */
router.get('/queue/failed', async (req: Request, res: Response) => {
  try {
    const jobs = await joomPublishQueue.getFailed(0, 10);
    const result = jobs.map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      timestamp: j.timestamp,
    }));
    res.json(result);
  } catch (error) {
    console.error('Failed to get failed jobs:', error);
    res.status(500).json({ error: 'Failed to get failed jobs' });
  }
});

/**
 * ジョブステータス
 */
router.get('/queue/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const status = await getJobStatus(QUEUE_NAMES.JOOM_PUBLISH, jobId);

    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Failed to get job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

export default router;

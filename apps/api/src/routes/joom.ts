/**
 * Phase 40-41: Joom出品ワークフロー API
 * Phase 41: BullMQジョブキュー統合
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type {
  JoomListingStatus,
  BatchPublishStatus,
} from '@prisma/client';
import {
  addCreateListingJob,
  addPublishJob,
  addBatchPublishJob,
  addFullJoomWorkflowJob,
  addAutoJoomPublishJob,
  getJoomPublishQueueStats,
  getJobStatus,
  QUEUE_NAMES,
} from '@rakuda/queue';

const router = Router();
const prisma = new PrismaClient();

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

    const where: Record<string, unknown> = {};
    if (status) where.status = status as JoomListingStatus;

    const [listings, total] = await Promise.all([
      prisma.joomListing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          task: {
            select: {
              id: true,
              status: true,
              translations: true,
              pricing: true,
            },
          },
        },
      }),
      prisma.joomListing.count({ where }),
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

    const listing = await prisma.joomListing.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            product: true,
            steps: true,
          },
        },
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
    });

    if (!task) {
      return res.status(404).json({ error: 'Enrichment task not found' });
    }

    if (task.status !== 'APPROVED') {
      return res.status(400).json({ error: `Task not approved: ${task.status}` });
    }

    const listing = await prisma.joomListing.upsert({
      where: { taskId },
      create: {
        taskId,
        productId: task.productId,
        status: 'DRAFT',
      },
      update: {},
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

    const listing = await prisma.joomListing.findUnique({
      where: { id },
      include: {
        task: {
          include: { product: true },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const task = listing.task;
    const translations = task.translations as any;
    const pricing = task.pricing as any;
    const attributes = task.attributes as any;
    const validation = task.validation as any;

    const warnings: string[] = [];

    // 価格チェック
    if (pricing?.finalPriceUsd < 5) {
      warnings.push('Price might be too low for this category');
    }
    if (pricing?.finalPriceUsd > 500) {
      warnings.push('High price items may have lower conversion');
    }

    // 画像チェック
    if (task.optimizedImages.length < 3) {
      warnings.push('Recommended to have at least 3 images');
    }

    // 属性チェック
    if (!attributes?.brand) {
      warnings.push('No brand detected - may affect search visibility');
    }

    // 可視性スコア
    let visibility: 'low' | 'medium' | 'high' = 'medium';
    if (translations?.en?.title && attributes?.brand && task.optimizedImages.length >= 3) {
      visibility = 'high';
    } else if (warnings.length > 2) {
      visibility = 'low';
    }

    const preview = {
      wouldCreate: {
        title: translations?.en?.title || task.product.title,
        description: translations?.en?.description || task.product.description,
        price: pricing?.finalPriceUsd || 0,
        images: task.optimizedImages,
        attributes: attributes || {},
      },
      validation: {
        passed: validation?.passed ?? true,
        warnings,
      },
      estimatedVisibility: visibility,
    };

    // Dry-Run結果を保存
    await prisma.joomListing.update({
      where: { id },
      data: { dryRunResult: preview as any },
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

    const listing = await prisma.joomListing.findUnique({
      where: { id },
      include: {
        task: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (!['DRAFT', 'READY', 'ERROR'].includes(listing.status)) {
      return res.status(400).json({ error: `Cannot publish listing in status: ${listing.status}` });
    }

    // ステータスを更新
    await prisma.joomListing.update({
      where: { id },
      data: { status: 'PUBLISHING' },
    });

    // ジョブキューに追加
    const jobId = await addPublishJob(id);

    res.json({ message: 'Publishing started', listingId: id, jobId });
  } catch (error) {
    console.error('Failed to publish Joom listing:', error);
    res.status(500).json({ error: 'Failed to publish Joom listing' });
  }
});

/**
 * 出品キャンセル/削除
 */
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.joomListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // TODO: Joom APIから削除（出品済みの場合）
    if (listing.joomProductId) {
      // await joomClient.deleteProduct(listing.joomProductId);
    }

    await prisma.joomListing.delete({
      where: { id },
    });

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
    const [
      total,
      draft,
      ready,
      publishing,
      active,
      paused,
      sold,
      error,
    ] = await Promise.all([
      prisma.joomListing.count(),
      prisma.joomListing.count({ where: { status: 'DRAFT' } }),
      prisma.joomListing.count({ where: { status: 'READY' } }),
      prisma.joomListing.count({ where: { status: 'PUBLISHING' } }),
      prisma.joomListing.count({ where: { status: 'ACTIVE' } }),
      prisma.joomListing.count({ where: { status: 'PAUSED' } }),
      prisma.joomListing.count({ where: { status: 'SOLD' } }),
      prisma.joomListing.count({ where: { status: 'ERROR' } }),
    ]);

    res.json({
      total,
      draft,
      ready,
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

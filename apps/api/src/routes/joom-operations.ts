/**
 * Joom オペレーション系 ルーター（リモート商品, バッチ, APIログ, ワークフロー, キュー, 緊急停止）
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import type { BatchPublishStatus } from '@prisma/client';
import {
  addBatchPublishJob,
  addFullJoomWorkflowJob,
  addAutoJoomPublishJob,
  getJoomPublishQueueStats,
  getJobStatus,
  QUEUE_NAMES,
  initQueueConnection,
} from '@rakuda/queue';
import { Queue } from 'bullmq';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// BullMQ queue for Joom publish-related jobs
const joomPublishQueue = new Queue(QUEUE_NAMES.JOOM_PUBLISH, { connection: initQueueConnection() });

// Joom API base URL (v3)
const JOOM_API_BASE = 'https://api-merchant.joom.com/api/v3';

// ========================================
// Joomリモート商品操作（恒久エンドポイント）
// ========================================

// ========================================
// Validation Schemas
// ========================================

const PaginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const JoomProductIdParamSchema = z.object({
  joomProductId: z.string().min(1),
});

const BatchesQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const CreateBatchSchema = z.object({
  name: z.string().optional(),
  productIds: z.array(z.string()).min(1),
  dryRun: z.boolean().optional().default(false),
  concurrency: z.coerce.number().int().min(1).max(50).optional().default(5),
  createdById: z.string().optional(),
});

const BatchIdParamSchema = z.object({ id: z.string().min(1) });

const WorkflowFullSchema = z.object({
  taskId: z.string().min(1),
  skipImages: z.boolean().optional().default(false),
});

const PublishApprovedSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(10),
});

const JobIdParamSchema = z.object({ jobId: z.string().min(1) });

/**
 * Joom API側の全商品一覧取得
 */
router.get('/products/remote', async (req: Request, res: Response) => {
  try {
    // Validate but not used to keep business logic unchanged
    PaginationSchema.parse(req.query);
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'JOOM' },
    });
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Joom credentials not found' });
    }
    const creds = credential.credentials as any;
    const accessToken = creds.accessToken as string | undefined;

    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'Joom access token missing' });
    }

    // Use products/multi to retrieve list
    const response = await fetch(`${JOOM_API_BASE}/products/multi`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json().catch(() => ({}))) as any;

    const items = data?.data?.items || [];
    const summary = items.map((p: any) => ({
      id: p.id,
      name: p.name,
      enabled: p.enabled,
      status: p.moderationStatus || 'unknown',
    }));

    res.json({ success: true, data: { total: items.length, products: summary, raw: data } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Joom product IDで直接削除
 */
router.delete('/products/remote/:joomProductId', async (req: Request, res: Response) => {
  try {
    const { joomProductId } = JoomProductIdParamSchema.parse(req.params);

    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'JOOM' },
    });
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Joom credentials not found' });
    }
    const creds = credential.credentials as any;
    const accessToken = creds.accessToken as string | undefined;

    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'Joom access token missing' });
    }

    const response = await fetch(`${JOOM_API_BASE}/products/remove?id=${encodeURIComponent(joomProductId)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'stopSelling' }),
    });
    const data = (await response.json().catch(() => ({}))) as any;

    if (response.ok || data?.code === 0) {
      // DB側のリスティングも削除（存在する場合）
      const listing = await prisma.listing.findFirst({
        where: {
          marketplace: 'JOOM' as any,
          marketplaceListingId: joomProductId,
        },
      });
      if (listing) {
        await prisma.listing.delete({ where: { id: listing.id } });
      }

      res.json({ success: true, joomProductId, message: 'Product removed from Joom' });
    } else {
      res.status(response.status).json({
        success: false,
        joomProductId,
        error: data,
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Joom側の全商品一括削除
 */
router.post('/products/remote/remove-all', async (req: Request, res: Response) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'JOOM' },
    });
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Joom credentials not found' });
    }
    const creds = credential.credentials as any;
    const accessToken = creds.accessToken as string | undefined;

    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'Joom access token missing' });
    }

    // 全商品取得
    const listResponse = await fetch(`${JOOM_API_BASE}/products/multi`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const listData = (await listResponse.json().catch(() => ({}))) as any;
    const items = listData?.data?.items || [];

    if (items.length === 0) {
      return res.json({ success: true, message: 'No products to remove', removed: 0 });
    }

    // 全削除
    const results: Array<{ id: string; name?: string; success: boolean; error?: any }> = [];
    for (const item of items) {
      try {
        const removeResponse = await fetch(`${JOOM_API_BASE}/products/remove?id=${encodeURIComponent(item.id)}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: 'stopSelling' }),
        });
        const removeData = (await removeResponse.json().catch(() => ({}))) as any;
        results.push({ id: item.id, name: item.name, success: removeResponse.ok || removeData?.code === 0 });
      } catch (err: any) {
        results.push({ id: item.id, name: item.name, success: false, error: err.message });
      }
    }

    // DB側のリスティングも削除
    const joomIds = items.map((i: any) => i.id);
    await prisma.listing.deleteMany({
      where: {
        marketplace: 'JOOM' as any,
        marketplaceListingId: { in: joomIds },
      },
    });

    res.json({
      success: true,
      total: items.length,
      removed: results.filter((r) => r.success).length,
      results,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
    const { status, limit, offset } = BatchesQuerySchema.parse(req.query);

    const where: Record<string, unknown> = {};
    if (status) where.status = status as BatchPublishStatus;

    const [batches, total] = await Promise.all([
      prisma.joomPublishBatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.joomPublishBatch.count({ where }),
    ]);

    res.json({ success: true, data: batches, total });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to list Joom batches:', error);
    res.status(500).json({ success: false, error: 'Failed to list Joom batches' });
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
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    console.error('Failed to get Joom batch:', error);
    res.status(500).json({ success: false, error: 'Failed to get Joom batch' });
  }
});

/**
 * バッチ作成
 */
router.post('/batches', async (req: Request, res: Response) => {
  try {
    const { name, productIds, dryRun, concurrency, createdById } = CreateBatchSchema.parse(req.body);

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

    res.status(201).json({ success: true, data: batch });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to create Joom batch:', error);
    res.status(500).json({ success: false, error: 'Failed to create Joom batch' });
  }
});

/**
 * バッチ実行（ジョブキュー経由）
 */
router.post('/batches/:id/execute', async (req: Request, res: Response) => {
  try {
    const { id } = BatchIdParamSchema.parse(req.params);

    const batch = await prisma.joomPublishBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    if (batch.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Cannot execute batch in status: ${batch.status}` });
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

    res.json({ success: true, data: { message: 'Batch execution started', batchId: id, jobId } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to execute Joom batch:', error);
    res.status(500).json({ success: false, error: 'Failed to execute Joom batch' });
  }
});

/**
 * バッチキャンセル
 */
router.post('/batches/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = BatchIdParamSchema.parse(req.params);

    const batch = await prisma.joomPublishBatch.findUnique({
      where: { id },
    });

    if (!batch) {
      return res.status(404).json({ success: false, error: 'Batch not found' });
    }

    if (!['PENDING', 'PROCESSING'].includes(batch.status)) {
      return res.status(400).json({ success: false, error: `Cannot cancel batch in status: ${batch.status}` });
    }

    await prisma.joomPublishBatch.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, data: { message: 'Batch cancelled' } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to cancel Joom batch:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel Joom batch' });
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

    res.json({ success: true, data: logs, total });
  } catch (error) {
    console.error('Failed to list Joom API logs:', error);
    res.status(500).json({ success: false, error: 'Failed to list Joom API logs' });
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
    const { taskId, skipImages } = WorkflowFullSchema.parse(req.body);

    const task = await prisma.enrichmentTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    if (!['APPROVED', 'PUBLISHED'].includes(task.status)) {
      return res.status(400).json({ success: false, error: `Task not approved: ${task.status}` });
    }

    // ジョブキューに追加
    const jobId = await addFullJoomWorkflowJob(taskId, skipImages);

    res.json({ success: true, data: { message: 'Workflow started', taskId, jobId } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to start workflow:', error);
    res.status(500).json({ success: false, error: 'Failed to start workflow' });
  }
});

/**
 * 承認済み商品の自動出品（ジョブキュー経由）
 */
router.post('/workflow/publish-approved', async (req: Request, res: Response) => {
  try {
    const { limit } = PublishApprovedSchema.parse(req.body);

    // ジョブキューに追加
    const jobId = await addAutoJoomPublishJob(limit);

    res.json({ success: true, data: { message: 'Auto publish job queued', limit, jobId } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to publish approved:', error);
    res.status(500).json({ success: false, error: 'Failed to publish approved' });
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
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get queue stats' });
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
      stacktrace: j.stacktrace,
      timestamp: j.timestamp,
    }));
    res.json({ success: true, data: result, total: result.length });
  } catch (error) {
    console.error('Failed to get failed jobs:', error);
    res.status(500).json({ success: false, error: 'Failed to get failed jobs' });
  }
});

/**
 * ジョブステータス
 */
router.get('/queue/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = JobIdParamSchema.parse(req.params);
    const status = await getJobStatus(QUEUE_NAMES.JOOM_PUBLISH, jobId);

    if (!status) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: status });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors.map(e => ({ path: e.path.join('.'), message: e.message })),
      });
    }
    console.error('Failed to get job status:', error);
    res.status(500).json({ success: false, error: 'Failed to get job status' });
  }
});

/**
 * 緊急: 全Joom出品を取り下げ
 */
router.post('/emergency-disable-all', async (req: Request, res: Response) => {
  try {
    const activeListings = await prisma.listing.findMany({
      where: {
        marketplace: Marketplace.JOOM,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    const jobs: Promise<any>[] = [];
    for (const listing of activeListings) {
      const marketplaceData = (listing.marketplaceData as Record<string, unknown>) || {};
      const joomProductId = marketplaceData.joomProductId as string | undefined;
      if (joomProductId) {
        jobs.push(
          joomPublishQueue.add('disable-product', {
            type: 'disable-product',
            listingId: listing.id,
            joomProductId,
          })
        );
      }
    }
    await Promise.all(jobs);

    await prisma.listing.updateMany({
      where: {
        marketplace: Marketplace.JOOM,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
      data: { status: 'PAUSED' },
    });

    res.json({
      success: true,
      data: {
        message: `Emergency disable: ${activeListings.length} Joom listings queued`,
        count: activeListings.length,
      },
    });
  } catch (error) {
    console.error('Failed to emergency disable all Joom listings:', error);
    res.status(500).json({ success: false, error: 'Failed to emergency disable all listings' });
  }
});

export default router;

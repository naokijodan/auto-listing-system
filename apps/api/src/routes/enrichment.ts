/**
 * Phase 39-41: エンリッチメントエンジン API
 * 翻訳・属性抽出・コンテンツ検証
 * Phase 41: BullMQジョブキュー統合
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type {
  EnrichmentStatus,
  EnrichmentStepStatus,
  ValidationResult,
  ProhibitedCategory,
  ProhibitedSeverity,
  KeywordMatchType,
} from '@prisma/client';
import {
  addEnrichProductJob,
  addEnrichBatchJob,
  addFullWorkflowJob,
  getEnrichmentQueueStats,
  getJobStatus,
  QUEUE_NAMES,
} from '@rakuda/queue';

const router = Router();
const prisma = new PrismaClient();

// ========================================
// エンリッチメントタスク管理
// ========================================

/**
 * タスク一覧
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const {
      status,
      validationResult,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status as EnrichmentStatus;
    if (validationResult) where.validationResult = validationResult as ValidationResult;

    const [tasks, total] = await Promise.all([
      prisma.enrichmentTask.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              brand: true,
              images: true,
            },
          },
        },
      }),
      prisma.enrichmentTask.count({ where }),
    ]);

    res.json({ tasks, total });
  } catch (error) {
    console.error('Failed to list enrichment tasks:', error);
    res.status(500).json({ error: 'Failed to list enrichment tasks' });
  }
});

/**
 * タスク詳細
 */
router.get('/tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.enrichmentTask.findUnique({
      where: { id },
      include: {
        product: true,
        steps: {
          orderBy: { stepOrder: 'asc' },
        },
        joomListing: true,
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Failed to get enrichment task:', error);
    res.status(500).json({ error: 'Failed to get enrichment task' });
  }
});

/**
 * タスク作成（ジョブキュー経由）
 */
router.post('/tasks', async (req: Request, res: Response) => {
  try {
    const { productId, priority = 0, async = true } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    // 商品存在チェック
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // タスクレコード作成
    const task = await prisma.enrichmentTask.upsert({
      where: { productId },
      create: {
        productId,
        priority,
        status: 'PENDING',
      },
      update: {
        priority,
        status: 'PENDING',
        errorCount: 0,
        lastError: null,
      },
    });

    // ジョブキューに追加（非同期処理）
    if (async) {
      const jobId = await addEnrichProductJob(productId, priority);
      return res.status(201).json({ ...task, jobId });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('Failed to create enrichment task:', error);
    res.status(500).json({ error: 'Failed to create enrichment task' });
  }
});

/**
 * 一括タスク作成（ジョブキュー経由）
 */
router.post('/tasks/bulk', async (req: Request, res: Response) => {
  try {
    const { productIds, priority = 0, async = true } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // タスクレコード作成
    const results = await Promise.all(
      productIds.map(async (productId: string) => {
        try {
          const task = await prisma.enrichmentTask.upsert({
            where: { productId },
            create: {
              productId,
              priority,
              status: 'PENDING',
            },
            update: {
              priority,
              status: 'PENDING',
            },
          });
          return { productId, taskId: task.id, success: true };
        } catch (error) {
          return { productId, success: false, error: 'Failed to create task' };
        }
      })
    );

    // バッチジョブをキューに追加
    let jobId: string | undefined;
    if (async && results.filter(r => r.success).length > 0) {
      const successIds = results.filter(r => r.success).map(r => r.productId);
      jobId = await addEnrichBatchJob(successIds, priority);
    }

    res.status(201).json({
      created: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      jobId,
      results,
    });
  } catch (error) {
    console.error('Failed to create bulk enrichment tasks:', error);
    res.status(500).json({ error: 'Failed to create bulk enrichment tasks' });
  }
});

/**
 * タスク承認
 */
router.post('/tasks/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.enrichmentTask.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'READY_TO_REVIEW') {
      return res.status(400).json({ error: `Cannot approve task in status: ${task.status}` });
    }

    const updated = await prisma.enrichmentTask.update({
      where: { id },
      data: {
        status: 'APPROVED',
        validationResult: 'APPROVED',
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to approve task:', error);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

/**
 * タスク却下
 */
router.post('/tasks/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const task = await prisma.enrichmentTask.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = await prisma.enrichmentTask.update({
      where: { id },
      data: {
        status: 'REJECTED',
        validationResult: 'REJECTED',
        validation: {
          passed: false,
          flags: ['manual_rejection'],
          reviewNotes: reason || 'Manually rejected',
          severity: 'high',
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to reject task:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  }
});

/**
 * タスクリトライ
 */
router.post('/tasks/:id/retry', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.enrichmentTask.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'FAILED') {
      return res.status(400).json({ error: `Cannot retry task in status: ${task.status}` });
    }

    const updated = await prisma.enrichmentTask.update({
      where: { id },
      data: {
        status: 'PENDING',
        lastError: null,
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to retry task:', error);
    res.status(500).json({ error: 'Failed to retry task' });
  }
});

/**
 * レビュー待ちタスク一覧
 */
router.get('/review', async (req: Request, res: Response) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const [tasks, total] = await Promise.all([
      prisma.enrichmentTask.findMany({
        where: { status: 'READY_TO_REVIEW' },
        orderBy: { createdAt: 'asc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              brand: true,
              images: true,
            },
          },
        },
      }),
      prisma.enrichmentTask.count({ where: { status: 'READY_TO_REVIEW' } }),
    ]);

    res.json({ tasks, total });
  } catch (error) {
    console.error('Failed to list review tasks:', error);
    res.status(500).json({ error: 'Failed to list review tasks' });
  }
});

/**
 * 統計情報
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      total,
      pending,
      processing,
      approved,
      rejected,
      readyToReview,
      published,
      failed,
    ] = await Promise.all([
      prisma.enrichmentTask.count(),
      prisma.enrichmentTask.count({ where: { status: 'PENDING' } }),
      prisma.enrichmentTask.count({ where: { status: 'PROCESSING' } }),
      prisma.enrichmentTask.count({ where: { status: 'APPROVED' } }),
      prisma.enrichmentTask.count({ where: { status: 'REJECTED' } }),
      prisma.enrichmentTask.count({ where: { status: 'READY_TO_REVIEW' } }),
      prisma.enrichmentTask.count({ where: { status: 'PUBLISHED' } }),
      prisma.enrichmentTask.count({ where: { status: 'FAILED' } }),
    ]);

    res.json({
      total,
      pending,
      processing,
      approved,
      rejected,
      readyToReview,
      published,
      failed,
    });
  } catch (error) {
    console.error('Failed to get enrichment stats:', error);
    res.status(500).json({ error: 'Failed to get enrichment stats' });
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
    const stats = await getEnrichmentQueueStats();
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
    const status = await getJobStatus(QUEUE_NAMES.ENRICHMENT, jobId);

    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Failed to get job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

/**
 * 完全ワークフロージョブ追加
 */
router.post('/queue/full-workflow', async (req: Request, res: Response) => {
  try {
    const { productId, autoPublish = false } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const jobId = await addFullWorkflowJob(productId, autoPublish);

    res.status(201).json({ jobId, productId, autoPublish });
  } catch (error) {
    console.error('Failed to add full workflow job:', error);
    res.status(500).json({ error: 'Failed to add full workflow job' });
  }
});

// ========================================
// ステップ履歴
// ========================================

/**
 * タスクのステップ履歴
 */
router.get('/tasks/:id/steps', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const steps = await prisma.enrichmentStep.findMany({
      where: { taskId: id },
      orderBy: { stepOrder: 'asc' },
    });

    res.json(steps);
  } catch (error) {
    console.error('Failed to get task steps:', error);
    res.status(500).json({ error: 'Failed to get task steps' });
  }
});

// ========================================
// 禁制品キーワード管理
// ========================================

/**
 * キーワード一覧
 */
router.get('/keywords', async (req: Request, res: Response) => {
  try {
    const {
      category,
      isActive,
      limit = '100',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (category) where.category = category as ProhibitedCategory;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [keywords, total] = await Promise.all([
      prisma.prohibitedKeyword.findMany({
        where,
        orderBy: [{ category: 'asc' }, { keyword: 'asc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.prohibitedKeyword.count({ where }),
    ]);

    res.json({ keywords, total });
  } catch (error) {
    console.error('Failed to list prohibited keywords:', error);
    res.status(500).json({ error: 'Failed to list prohibited keywords' });
  }
});

/**
 * キーワード追加
 */
router.post('/keywords', async (req: Request, res: Response) => {
  try {
    const {
      keyword,
      category,
      severity = 'HIGH',
      matchType = 'CONTAINS',
      caseSensitive = false,
      languages = ['ja', 'en'],
      description,
      reason,
    } = req.body;

    if (!keyword || !category) {
      return res.status(400).json({ error: 'keyword and category are required' });
    }

    const created = await prisma.prohibitedKeyword.create({
      data: {
        keyword,
        category: category as ProhibitedCategory,
        severity: severity as ProhibitedSeverity,
        matchType: matchType as KeywordMatchType,
        caseSensitive,
        languages,
        description,
        reason,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to create prohibited keyword:', error);
    res.status(500).json({ error: 'Failed to create prohibited keyword' });
  }
});

/**
 * キーワード更新
 */
router.put('/keywords/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await prisma.prohibitedKeyword.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to update prohibited keyword:', error);
    res.status(500).json({ error: 'Failed to update prohibited keyword' });
  }
});

/**
 * キーワード削除
 */
router.delete('/keywords/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.prohibitedKeyword.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete prohibited keyword:', error);
    res.status(500).json({ error: 'Failed to delete prohibited keyword' });
  }
});

/**
 * キーワード一括インポート
 */
router.post('/keywords/import', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.body;

    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: 'keywords array is required' });
    }

    const results = await Promise.all(
      keywords.map(async (kw: any) => {
        try {
          await prisma.prohibitedKeyword.create({
            data: {
              keyword: kw.keyword,
              category: kw.category as ProhibitedCategory,
              severity: (kw.severity || 'HIGH') as ProhibitedSeverity,
              matchType: (kw.matchType || 'CONTAINS') as KeywordMatchType,
              caseSensitive: kw.caseSensitive || false,
              languages: kw.languages || ['ja', 'en'],
              description: kw.description,
              reason: kw.reason,
            },
          });
          return { keyword: kw.keyword, success: true };
        } catch {
          return { keyword: kw.keyword, success: false };
        }
      })
    );

    res.json({
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    });
  } catch (error) {
    console.error('Failed to import prohibited keywords:', error);
    res.status(500).json({ error: 'Failed to import prohibited keywords' });
  }
});

export default router;

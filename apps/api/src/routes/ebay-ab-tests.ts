// @ts-nocheck
/**
 * eBay A/BテストAPI
 * Phase 119: AI最適化のA/Bテスト機能
 *
 * Phase 118のAI最適化提案をA/Bテストで効果測定
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';
import {
  createABTest,
  startABTest,
  stopABTest,
  completeABTest,
  recordEvent,
  getTestResults,
} from '../lib/ab-test-engine';

const router = Router();

// ========================================
// ダッシュボード
// ========================================

/**
 * @swagger
 * /api/ebay-ab-tests/dashboard:
 *   get:
 *     summary: eBay A/Bテストダッシュボード
 *     tags: [eBay A/B Tests]
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // eBay関連のテストのみカウント
    const [total, running, completed, pendingOptimizations] = await Promise.all([
      prisma.aBTest.count({
        where: { targetEntity: 'listing', filters: { path: '$.marketplace', equals: 'EBAY' } },
      }),
      prisma.aBTest.count({
        where: { status: 'RUNNING', targetEntity: 'listing' },
      }),
      prisma.aBTest.count({
        where: { status: 'COMPLETED', targetEntity: 'listing' },
      }),
      prisma.listingOptimization.count({
        where: { status: 'PENDING' },
      }),
    ]);

    // 有意な結果が出たテスト
    const significantTests = await prisma.aBTest.count({
      where: {
        status: 'COMPLETED',
        isSignificant: true,
        targetEntity: 'listing',
      },
    });

    // 最近のテスト
    const recentTests = await prisma.aBTest.findMany({
      where: { targetEntity: 'listing' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        variants: {
          select: {
            id: true,
            name: true,
            isControl: true,
            views: true,
            sales: true,
            conversionRate: true,
          },
        },
      },
    });

    // テスト可能な最適化提案
    const testableOptimizations = await prisma.listingOptimization.findMany({
      where: {
        status: 'PENDING',
        listing: { marketplace: 'EBAY' },
      },
      take: 10,
      include: {
        listing: {
          select: {
            id: true,
            marketplaceListingId: true,
            product: {
              select: { title: true, titleEn: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      stats: {
        total,
        running,
        completed,
        significantTests,
        significantRate: completed > 0 ? Math.round((significantTests / completed) * 100) : 0,
        pendingOptimizations,
      },
      recentTests,
      testableOptimizations,
    });
  } catch (error) {
    logger.error('eBay A/B test dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ========================================
// 最適化提案からA/Bテスト作成
// ========================================

const createFromOptimizationSchema = z.object({
  optimizationId: z.string(),
  name: z.string().optional(),
  trafficPercent: z.number().min(1).max(100).default(50),
  minSampleSize: z.number().min(10).default(100),
  durationDays: z.number().min(1).max(90).default(14),
});

/**
 * @swagger
 * /api/ebay-ab-tests/from-optimization:
 *   post:
 *     summary: 最適化提案からA/Bテストを作成
 *     tags: [eBay A/B Tests]
 */
router.post('/from-optimization', async (req: Request, res: Response) => {
  try {
    const body = createFromOptimizationSchema.parse(req.body);

    // 最適化提案を取得
    const optimization = await prisma.listingOptimization.findUnique({
      where: { id: body.optimizationId },
      include: {
        listing: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!optimization) {
      return res.status(404).json({ error: 'Optimization not found' });
    }

    if (optimization.status !== 'PENDING') {
      return res.status(400).json({ error: 'Optimization is not in pending status' });
    }

    // テストタイプをマッピング
    const testTypeMap: Record<string, string> = {
      TITLE: 'TITLE',
      DESCRIPTION: 'DESCRIPTION',
      KEYWORDS: 'TITLE', // キーワードはタイトルに影響
    };

    const testType = testTypeMap[optimization.type] || 'TITLE';
    const testName = body.name || `AI最適化テスト: ${optimization.listing.product.titleEn?.substring(0, 30) || optimization.listing.product.title.substring(0, 30)}`;

    // A/Bテストを作成
    const startAt = new Date();
    const endAt = new Date();
    endAt.setDate(endAt.getDate() + body.durationDays);

    const test = await createABTest({
      name: testName,
      description: `Phase 118 AI最適化の効果測定。${optimization.reason || ''}`,
      testType,
      targetEntity: 'listing',
      targetField: optimization.type.toLowerCase(),
      filters: { marketplace: 'EBAY', listingId: optimization.listingId },
      trafficPercent: body.trafficPercent,
      startAt,
      endAt,
      primaryMetric: 'CONVERSION_RATE',
      secondaryMetrics: ['CLICK_RATE', 'REVENUE'],
      minSampleSize: body.minSampleSize,
      confidenceLevel: 0.95,
      variants: [
        {
          name: 'コントロール（元の値）',
          isControl: true,
          changes: { [optimization.type.toLowerCase()]: optimization.originalValue },
          weight: 50,
        },
        {
          name: 'AI最適化版',
          isControl: false,
          changes: { [optimization.type.toLowerCase()]: optimization.suggestedValue },
          weight: 50,
        },
      ],
    });

    // 最適化提案にテストIDを紐付け（メタデータとして）
    await prisma.listingOptimization.update({
      where: { id: body.optimizationId },
      data: {
        // statusは変更しない（テスト中はPENDINGのまま）
      },
    });

    logger.info(`Created A/B test from optimization: ${test.id}`);
    res.status(201).json(test);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Create from optimization error:', error);
    res.status(500).json({ error: 'Failed to create A/B test' });
  }
});

// ========================================
// 一括A/Bテスト作成
// ========================================

const bulkCreateSchema = z.object({
  optimizationIds: z.array(z.string()).min(1).max(20),
  trafficPercent: z.number().min(1).max(100).default(50),
  minSampleSize: z.number().min(10).default(100),
  durationDays: z.number().min(1).max(90).default(14),
});

/**
 * @swagger
 * /api/ebay-ab-tests/bulk-create:
 *   post:
 *     summary: 複数の最適化提案から一括でA/Bテスト作成
 *     tags: [eBay A/B Tests]
 */
router.post('/bulk-create', async (req: Request, res: Response) => {
  try {
    const body = bulkCreateSchema.parse(req.body);

    const results: Array<{ optimizationId: string; testId?: string; error?: string }> = [];

    for (const optimizationId of body.optimizationIds) {
      try {
        const optimization = await prisma.listingOptimization.findUnique({
          where: { id: optimizationId },
          include: { listing: { include: { product: true } } },
        });

        if (!optimization || optimization.status !== 'PENDING') {
          results.push({ optimizationId, error: 'Not found or not pending' });
          continue;
        }

        const testTypeMap: Record<string, string> = {
          TITLE: 'TITLE',
          DESCRIPTION: 'DESCRIPTION',
          KEYWORDS: 'TITLE',
        };

        const startAt = new Date();
        const endAt = new Date();
        endAt.setDate(endAt.getDate() + body.durationDays);

        const test = await createABTest({
          name: `AI最適化テスト: ${optimization.listing.product.titleEn?.substring(0, 30) || optimization.listing.product.title.substring(0, 30)}`,
          description: optimization.reason || 'AI optimization test',
          testType: testTypeMap[optimization.type] || 'TITLE',
          targetEntity: 'listing',
          targetField: optimization.type.toLowerCase(),
          filters: { marketplace: 'EBAY', listingId: optimization.listingId },
          trafficPercent: body.trafficPercent,
          startAt,
          endAt,
          primaryMetric: 'CONVERSION_RATE',
          minSampleSize: body.minSampleSize,
          confidenceLevel: 0.95,
          variants: [
            {
              name: 'コントロール',
              isControl: true,
              changes: { [optimization.type.toLowerCase()]: optimization.originalValue },
              weight: 50,
            },
            {
              name: 'AI最適化版',
              isControl: false,
              changes: { [optimization.type.toLowerCase()]: optimization.suggestedValue },
              weight: 50,
            },
          ],
        });

        results.push({ optimizationId, testId: test.id });
      } catch (err) {
        results.push({ optimizationId, error: 'Failed to create test' });
      }
    }

    const created = results.filter(r => r.testId).length;
    logger.info(`Bulk created ${created} A/B tests`);

    res.json({
      message: `${created}/${body.optimizationIds.length} tests created`,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Bulk create error:', error);
    res.status(500).json({ error: 'Failed to bulk create tests' });
  }
});

// ========================================
// テスト一覧
// ========================================

/**
 * @swagger
 * /api/ebay-ab-tests:
 *   get:
 *     summary: eBay A/Bテスト一覧
 *     tags: [eBay A/B Tests]
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, testType, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {
      targetEntity: 'listing',
    };
    if (status) where.status = status;
    if (testType) where.testType = testType;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [tests, total] = await Promise.all([
      prisma.aBTest.findMany({
        where,
        include: {
          variants: {
            select: {
              id: true,
              name: true,
              isControl: true,
              weight: true,
              views: true,
              sales: true,
              revenue: true,
              conversionRate: true,
            },
          },
          _count: {
            select: { assignments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.aBTest.count({ where }),
    ]);

    res.json({
      data: tests,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('List tests error:', error);
    res.status(500).json({ error: 'Failed to list tests' });
  }
});

// ========================================
// テスト詳細・結果
// ========================================

/**
 * @swagger
 * /api/ebay-ab-tests/{id}:
 *   get:
 *     summary: テスト詳細を取得
 *     tags: [eBay A/B Tests]
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const results = await getTestResults(req.params.id);
    res.json(results);
  } catch (error) {
    logger.error('Get test error:', error);
    res.status(500).json({ error: 'Failed to get test' });
  }
});

// ========================================
// テスト操作
// ========================================

/**
 * @swagger
 * /api/ebay-ab-tests/{id}/start:
 *   post:
 *     summary: テストを開始
 *     tags: [eBay A/B Tests]
 */
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const test = await startABTest(req.params.id);
    logger.info(`Started A/B test: ${test.id}`);
    res.json(test);
  } catch (error) {
    logger.error('Start test error:', error);
    res.status(500).json({ error: 'Failed to start test' });
  }
});

/**
 * @swagger
 * /api/ebay-ab-tests/{id}/stop:
 *   post:
 *     summary: テストを停止
 *     tags: [eBay A/B Tests]
 */
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const test = await stopABTest(req.params.id, reason);
    res.json(test);
  } catch (error) {
    logger.error('Stop test error:', error);
    res.status(500).json({ error: 'Failed to stop test' });
  }
});

/**
 * @swagger
 * /api/ebay-ab-tests/{id}/complete:
 *   post:
 *     summary: テストを完了し結果を分析
 *     tags: [eBay A/B Tests]
 */
router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const test = await completeABTest(req.params.id);
    res.json(test);
  } catch (error) {
    logger.error('Complete test error:', error);
    res.status(500).json({ error: 'Failed to complete test' });
  }
});

// ========================================
// イベント記録（eBay Webhookから）
// ========================================

const recordEventSchema = z.object({
  listingId: z.string(),
  eventType: z.enum(['impression', 'click', 'view', 'conversion']),
  revenue: z.number().optional(),
});

/**
 * @swagger
 * /api/ebay-ab-tests/{id}/event:
 *   post:
 *     summary: イベントを記録
 *     tags: [eBay A/B Tests]
 */
router.post('/:id/event', async (req: Request, res: Response) => {
  try {
    const body = recordEventSchema.parse(req.body);

    const assignment = await recordEvent(
      req.params.id,
      body.listingId,
      'listing',
      body.eventType,
      body.revenue
    );

    res.json({ success: !!assignment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Record event error:', error);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

// ========================================
// 勝者バリアント適用
// ========================================

/**
 * @swagger
 * /api/ebay-ab-tests/{id}/apply-winner:
 *   post:
 *     summary: 勝者バリアントを全体に適用
 *     tags: [eBay A/B Tests]
 */
router.post('/:id/apply-winner', async (req: Request, res: Response) => {
  try {
    const test = await prisma.aBTest.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
        assignments: {
          include: {
            listing: true,
          },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Test is not completed' });
    }

    if (!test.winningVariantId) {
      return res.status(400).json({ error: 'No winning variant determined' });
    }

    const winner = test.variants.find(v => v.id === test.winningVariantId);
    if (!winner) {
      return res.status(400).json({ error: 'Winning variant not found' });
    }

    // 勝者がコントロールの場合は何もしない
    if (winner.isControl) {
      return res.json({
        success: true,
        message: 'コントロールグループが勝者のため、変更は適用されませんでした',
        applied: 0,
      });
    }

    // 勝者の変更を関連するリスティングの最適化提案に適用
    const changes = winner.changes as Record<string, string>;
    const field = test.targetField;
    const appliedListings: string[] = [];

    // フィルターからlistingIdを取得
    const filters = test.filters as Record<string, unknown>;
    const targetListingId = filters.listingId as string | undefined;

    if (targetListingId) {
      // 関連する最適化提案を適用済みにマーク
      await prisma.listingOptimization.updateMany({
        where: {
          listingId: targetListingId,
          type: field.toUpperCase(),
          status: 'PENDING',
        },
        data: {
          status: 'APPLIED',
          appliedAt: new Date(),
        },
      });
      appliedListings.push(targetListingId);
    }

    logger.info(`Applied winning variant ${winner.name} to ${appliedListings.length} listings`);

    res.json({
      success: true,
      message: `勝者バリアント「${winner.name}」の変更を適用しました`,
      applied: appliedListings.length,
      changes,
    });
  } catch (error) {
    logger.error('Apply winner error:', error);
    res.status(500).json({ error: 'Failed to apply winner' });
  }
});

// ========================================
// 自動完了チェック
// ========================================

/**
 * @swagger
 * /api/ebay-ab-tests/auto-complete:
 *   post:
 *     summary: 条件を満たしたテストを自動完了
 *     tags: [eBay A/B Tests]
 */
router.post('/auto-complete', async (req: Request, res: Response) => {
  try {
    const now = new Date();

    // 終了日時を過ぎた実行中のテスト
    const expiredTests = await prisma.aBTest.findMany({
      where: {
        status: 'RUNNING',
        endAt: { lte: now },
      },
    });

    // 最小サンプルサイズに達した実行中のテスト
    const runningTests = await prisma.aBTest.findMany({
      where: { status: 'RUNNING' },
      include: {
        variants: true,
      },
    });

    const completedTests: string[] = [];

    for (const test of expiredTests) {
      await completeABTest(test.id);
      completedTests.push(test.id);
    }

    for (const test of runningTests) {
      const totalViews = test.variants.reduce((sum, v) => sum + v.views, 0);
      if (totalViews >= test.minSampleSize && !expiredTests.find(t => t.id === test.id)) {
        // サンプルサイズに達したが、まだ終了日時に達していない場合は
        // 統計的有意性があれば早期完了
        const controlVariant = test.variants.find(v => v.isControl);
        const treatmentVariant = test.variants.find(v => !v.isControl);

        if (controlVariant && treatmentVariant) {
          const controlRate = controlVariant.views > 0 ? controlVariant.sales / controlVariant.views : 0;
          const treatmentRate = treatmentVariant.views > 0 ? treatmentVariant.sales / treatmentVariant.views : 0;
          const diff = Math.abs(treatmentRate - controlRate);

          // 十分な差がある場合は早期完了
          if (diff > 0.05 && totalViews >= test.minSampleSize * 2) {
            await completeABTest(test.id);
            completedTests.push(test.id);
          }
        }
      }
    }

    logger.info(`Auto-completed ${completedTests.length} tests`);

    res.json({
      message: `${completedTests.length} tests auto-completed`,
      completedTests,
    });
  } catch (error) {
    logger.error('Auto-complete error:', error);
    res.status(500).json({ error: 'Failed to auto-complete tests' });
  }
});

// ========================================
// 統計
// ========================================

/**
 * @swagger
 * /api/ebay-ab-tests/stats:
 *   get:
 *     summary: eBay A/Bテスト統計
 *     tags: [eBay A/B Tests]
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [
      totalTests,
      runningTests,
      completedTests,
      significantTests,
      totalOptimizations,
      appliedOptimizations,
    ] = await Promise.all([
      prisma.aBTest.count({ where: { targetEntity: 'listing' } }),
      prisma.aBTest.count({ where: { status: 'RUNNING', targetEntity: 'listing' } }),
      prisma.aBTest.count({ where: { status: 'COMPLETED', targetEntity: 'listing' } }),
      prisma.aBTest.count({
        where: { status: 'COMPLETED', isSignificant: true, targetEntity: 'listing' },
      }),
      prisma.listingOptimization.count(),
      prisma.listingOptimization.count({ where: { status: 'APPLIED' } }),
    ]);

    // 平均改善率（有意な結果のみ）
    const significantResults = await prisma.aBTest.findMany({
      where: {
        status: 'COMPLETED',
        isSignificant: true,
        targetEntity: 'listing',
      },
      include: {
        variants: true,
      },
    });

    let totalLift = 0;
    let liftCount = 0;

    for (const test of significantResults) {
      const control = test.variants.find(v => v.isControl);
      const winner = test.variants.find(v => v.id === test.winningVariantId);

      if (control && winner && !winner.isControl) {
        const controlRate = control.views > 0 ? control.sales / control.views : 0;
        const winnerRate = winner.views > 0 ? winner.sales / winner.views : 0;

        if (controlRate > 0) {
          const lift = ((winnerRate - controlRate) / controlRate) * 100;
          totalLift += lift;
          liftCount++;
        }
      }
    }

    const avgLift = liftCount > 0 ? totalLift / liftCount : 0;

    res.json({
      tests: {
        total: totalTests,
        running: runningTests,
        completed: completedTests,
        significant: significantTests,
        significantRate: completedTests > 0 ? Math.round((significantTests / completedTests) * 100) : 0,
      },
      optimizations: {
        total: totalOptimizations,
        applied: appliedOptimizations,
        applicationRate: totalOptimizations > 0
          ? Math.round((appliedOptimizations / totalOptimizations) * 100)
          : 0,
      },
      performance: {
        avgLift: Math.round(avgLift * 100) / 100,
        avgLiftFormatted: `${avgLift > 0 ? '+' : ''}${avgLift.toFixed(2)}%`,
      },
    });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export { router as ebayABTestsRouter };

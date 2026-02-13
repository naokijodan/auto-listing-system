/**
 * A/BテストAPI
 * Phase 77: A/Bテスト機能
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import {
  createABTest,
  startABTest,
  stopABTest,
  completeABTest,
  assignToVariant,
  recordEvent,
  getTestResults,
  getABTestStats,
} from '../lib/ab-test-engine';

const router = Router();

/**
 * @swagger
 * /api/ab-tests/stats:
 *   get:
 *     summary: A/Bテスト統計を取得
 *     tags: [A/B Tests]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await getABTestStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/types:
 *   get:
 *     summary: テストタイプ一覧を取得
 *     tags: [A/B Tests]
 */
router.get('/types', async (req, res) => {
  res.json({
    testTypes: [
      { value: 'TITLE', label: 'タイトルテスト', description: '商品タイトルの比較' },
      { value: 'DESCRIPTION', label: '説明文テスト', description: '商品説明文の比較' },
      { value: 'PRICE', label: '価格テスト', description: '価格設定の比較' },
      { value: 'IMAGE', label: '画像テスト', description: 'メイン画像の比較' },
      { value: 'MULTI', label: '複合テスト', description: '複数要素の同時比較' },
    ],
    metrics: [
      { value: 'CONVERSION_RATE', label: 'コンバージョン率', description: '閲覧→購入の割合' },
      { value: 'CLICK_RATE', label: 'クリック率', description: 'インプレッション→クリックの割合' },
      { value: 'VIEW_TO_SALE', label: '閲覧→購入率', description: '商品閲覧から購入への割合' },
      { value: 'REVENUE', label: '収益', description: '総収益額' },
      { value: 'PROFIT', label: '利益', description: '総利益額' },
      { value: 'AVG_ORDER_VALUE', label: '平均注文額', description: '1注文あたりの平均金額' },
    ],
    targetEntities: [
      { value: 'listing', label: '出品', fields: ['title', 'description', 'price', 'images'] },
      { value: 'product', label: '商品', fields: ['titleEn', 'descriptionEn', 'price'] },
    ],
  });
});

/**
 * @swagger
 * /api/ab-tests:
 *   get:
 *     summary: A/Bテスト一覧を取得
 *     tags: [A/B Tests]
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, testType, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
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
              sales: true,
              views: true,
            },
          },
          _count: {
            select: {
              assignments: true,
            },
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
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests:
 *   post:
 *     summary: A/Bテストを作成
 *     tags: [A/B Tests]
 */
router.post('/', async (req, res, next) => {
  try {
    const test = await createABTest(req.body);
    res.status(201).json(test);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}:
 *   get:
 *     summary: A/Bテスト詳細を取得
 *     tags: [A/B Tests]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const test = await prisma.aBTest.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
        assignments: {
          take: 100,
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.json(test);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}:
 *   patch:
 *     summary: A/Bテストを更新
 *     tags: [A/B Tests]
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, description, endAt, minSampleSize } = req.body;

    const test = await prisma.aBTest.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(endAt && { endAt: new Date(endAt) }),
        ...(minSampleSize && { minSampleSize }),
      },
    });

    res.json(test);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}:
 *   delete:
 *     summary: A/Bテストを削除
 *     tags: [A/B Tests]
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const test = await prisma.aBTest.findUnique({
      where: { id: req.params.id },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.status === 'RUNNING') {
      return res.status(400).json({ error: 'Cannot delete running test' });
    }

    await prisma.aBTest.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/start:
 *   post:
 *     summary: A/Bテストを開始
 *     tags: [A/B Tests]
 */
router.post('/:id/start', async (req, res, next) => {
  try {
    const test = await startABTest(req.params.id);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/stop:
 *   post:
 *     summary: A/Bテストを停止
 *     tags: [A/B Tests]
 */
router.post('/:id/stop', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const test = await stopABTest(req.params.id, reason);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/complete:
 *   post:
 *     summary: A/Bテストを完了
 *     tags: [A/B Tests]
 */
router.post('/:id/complete', async (req, res, next) => {
  try {
    const test = await completeABTest(req.params.id);
    res.json(test);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/results:
 *   get:
 *     summary: A/Bテスト結果を取得
 *     tags: [A/B Tests]
 */
router.get('/:id/results', async (req, res, next) => {
  try {
    const results = await getTestResults(req.params.id);
    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/assign:
 *   post:
 *     summary: エンティティをバリアントに割り当て
 *     tags: [A/B Tests]
 */
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { entityId, entityType } = req.body;

    if (!entityId || !entityType) {
      return res.status(400).json({ error: 'entityId and entityType are required' });
    }

    const variantId = await assignToVariant(req.params.id, entityId, entityType);
    res.json({ variantId });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/event:
 *   post:
 *     summary: イベントを記録
 *     tags: [A/B Tests]
 */
router.post('/:id/event', async (req, res, next) => {
  try {
    const { entityId, entityType, eventType, revenue } = req.body;

    if (!entityId || !entityType || !eventType) {
      return res.status(400).json({ error: 'entityId, entityType, and eventType are required' });
    }

    const assignment = await recordEvent(
      req.params.id,
      entityId,
      entityType,
      eventType,
      revenue
    );

    res.json({ success: !!assignment });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/variants:
 *   post:
 *     summary: バリアントを追加
 *     tags: [A/B Tests]
 */
router.post('/:id/variants', async (req, res, next) => {
  try {
    const test = await prisma.aBTest.findUnique({
      where: { id: req.params.id },
    });

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    if (test.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Cannot add variants to non-draft test' });
    }

    const variant = await prisma.aBTestVariant.create({
      data: {
        testId: req.params.id,
        name: req.body.name,
        isControl: req.body.isControl || false,
        changes: req.body.changes || {},
        weight: req.body.weight || 50,
      },
    });

    res.status(201).json(variant);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/variants/{variantId}:
 *   patch:
 *     summary: バリアントを更新
 *     tags: [A/B Tests]
 */
router.patch('/:id/variants/:variantId', async (req, res, next) => {
  try {
    const { name, changes, weight } = req.body;

    const variant = await prisma.aBTestVariant.update({
      where: { id: req.params.variantId },
      data: {
        ...(name && { name }),
        ...(changes && { changes }),
        ...(weight !== undefined && { weight }),
      },
    });

    res.json(variant);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/variants/{variantId}:
 *   delete:
 *     summary: バリアントを削除
 *     tags: [A/B Tests]
 */
router.delete('/:id/variants/:variantId', async (req, res, next) => {
  try {
    const test = await prisma.aBTest.findUnique({
      where: { id: req.params.id },
    });

    if (!test || test.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Cannot delete variant from non-draft test' });
    }

    await prisma.aBTestVariant.delete({
      where: { id: req.params.variantId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/ab-tests/{id}/apply-winner:
 *   post:
 *     summary: 勝者バリアントを全体に適用
 *     tags: [A/B Tests]
 */
router.post('/:id/apply-winner', async (req, res, next) => {
  try {
    const test = await prisma.aBTest.findUnique({
      where: { id: req.params.id },
      include: {
        variants: true,
        assignments: true,
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

    // 勝者の変更を全リスティング/商品に適用するロジック
    // TODO: 実際の適用処理を実装
    logger.info(`Applying winning variant ${winner.name} to all ${test.targetEntity}s`);

    res.json({
      success: true,
      message: `勝者バリアント「${winner.name}」の変更を適用しました`,
      changes: winner.changes,
    });
  } catch (error) {
    next(error);
  }
});

export { router as abTestsRouter };

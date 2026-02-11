/**
 * Phase 61-62: 価格最適化AIエンドポイント
 *
 * 価格推奨・自動調整API:
 * - 価格推奨取得
 * - 一括価格分析
 * - 価格調整適用
 * - 価格最適化統計
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import {
  generatePriceRecommendation,
  generateBulkRecommendations,
  detectPriceAdjustments,
  applyPriceAdjustment,
  getPricingStats,
  calculateSellingPrice,
  calculateMargin,
  PricingStrategy,
} from '../lib/pricing-engine';

const router = Router();
const log = logger.child({ module: 'pricing-ai' });

// バリデーションスキーマ
const strategySchema = z.enum([
  'COMPETITIVE',
  'PROFIT_MAXIMIZE',
  'MARKET_AVERAGE',
  'PENETRATION',
  'PREMIUM',
]);

const priceCalculationSchema = z.object({
  costPriceJpy: z.number().positive(),
  targetMargin: z.number().min(0).max(100).optional(),
  exchangeRate: z.number().positive().optional(),
});

const applyPriceSchema = z.object({
  newPrice: z.number().positive(),
  reason: z.string().min(1),
});

/**
 * @swagger
 * /api/pricing-ai/stats:
 *   get:
 *     summary: 価格最適化統計を取得
 *     tags: [Pricing AI]
 *     responses:
 *       200:
 *         description: 価格最適化統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getPricingStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pricing-ai/calculate:
 *   post:
 *     summary: 原価から販売価格を計算
 *     tags: [Pricing AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - costPriceJpy
 *             properties:
 *               costPriceJpy:
 *                 type: number
 *               targetMargin:
 *                 type: number
 *               exchangeRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: 計算結果
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const data = priceCalculationSchema.parse(req.body);

    const result = calculateSellingPrice(
      data.costPriceJpy,
      data.targetMargin,
      data.exchangeRate
    );

    res.json({
      success: true,
      data: {
        input: data,
        result,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, `Validation error: ${error.errors.map(e => e.message).join(', ')}`, 'VALIDATION_ERROR'));
    } else {
      next(error);
    }
  }
});

/**
 * @swagger
 * /api/pricing-ai/recommendation/{listingId}:
 *   get:
 *     summary: 特定リスティングの価格推奨を取得
 *     tags: [Pricing AI]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: strategy
 *         schema:
 *           type: string
 *           enum: [COMPETITIVE, PROFIT_MAXIMIZE, MARKET_AVERAGE, PENETRATION, PREMIUM]
 *     responses:
 *       200:
 *         description: 価格推奨
 */
router.get('/recommendation/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const strategy = (req.query.strategy as PricingStrategy) || 'PROFIT_MAXIMIZE';

    const recommendation = await generatePriceRecommendation(listingId, strategy);

    if (!recommendation) {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pricing-ai/recommendations:
 *   get:
 *     summary: 一括価格推奨を取得
 *     tags: [Pricing AI]
 *     parameters:
 *       - in: query
 *         name: marketplace
 *         schema:
 *           type: string
 *           enum: [JOOM, EBAY]
 *       - in: query
 *         name: strategy
 *         schema:
 *           type: string
 *           enum: [COMPETITIVE, PROFIT_MAXIMIZE, MARKET_AVERAGE, PENETRATION, PREMIUM]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 価格推奨一覧
 */
router.get('/recommendations', async (req, res, next) => {
  try {
    const { marketplace, strategy = 'PROFIT_MAXIMIZE', limit = '50' } = req.query;

    const recommendations = await generateBulkRecommendations({
      marketplace: marketplace as 'JOOM' | 'EBAY' | undefined,
      strategy: strategy as PricingStrategy,
      limit: parseInt(limit as string, 10),
    });

    // 価格変更が必要なものを優先
    const sorted = recommendations.sort((a, b) => {
      const diffA = Math.abs(a.currentPrice - a.recommendedPrice) / a.currentPrice;
      const diffB = Math.abs(b.currentPrice - b.recommendedPrice) / b.currentPrice;
      return diffB - diffA;
    });

    res.json({
      success: true,
      data: sorted,
      total: sorted.length,
      summary: {
        needsAdjustment: sorted.filter(r =>
          Math.abs(r.currentPrice - r.recommendedPrice) / r.currentPrice > 0.05
        ).length,
        avgCurrentMargin: sorted.length > 0
          ? Math.round(sorted.reduce((a, b) => a + b.currentMargin, 0) / sorted.length * 10) / 10
          : 0,
        avgRecommendedMargin: sorted.length > 0
          ? Math.round(sorted.reduce((a, b) => a + b.recommendedMargin, 0) / sorted.length * 10) / 10
          : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pricing-ai/adjustments-needed:
 *   get:
 *     summary: 価格調整が必要なリスティングを取得
 *     tags: [Pricing AI]
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           default: 5
 *     responses:
 *       200:
 *         description: 調整が必要なリスティング
 */
router.get('/adjustments-needed', async (req, res, next) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 5;

    const adjustments = await detectPriceAdjustments(threshold);

    res.json({
      success: true,
      data: adjustments,
      total: adjustments.length,
      threshold,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pricing-ai/apply/{listingId}:
 *   post:
 *     summary: 価格調整を適用
 *     tags: [Pricing AI]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPrice
 *               - reason
 *             properties:
 *               newPrice:
 *                 type: number
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: 価格調整結果
 */
router.post('/apply/:listingId', async (req, res, next) => {
  try {
    const { listingId } = req.params;
    const data = applyPriceSchema.parse(req.body);

    const result = await applyPriceAdjustment(listingId, data.newPrice, data.reason);

    if (!result.success) {
      throw new AppError(400, result.error || 'Failed to apply price adjustment', 'ADJUSTMENT_FAILED');
    }

    log.info({
      type: 'price_adjustment_applied',
      listingId,
      newPrice: data.newPrice,
      reason: data.reason,
    });

    res.json({
      success: true,
      message: 'Price adjustment applied',
      listingId,
      newPrice: data.newPrice,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, `Validation error: ${error.errors.map(e => e.message).join(', ')}`, 'VALIDATION_ERROR'));
    } else {
      next(error);
    }
  }
});

/**
 * @swagger
 * /api/pricing-ai/bulk-apply:
 *   post:
 *     summary: 一括価格調整を適用
 *     tags: [Pricing AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adjustments
 *             properties:
 *               adjustments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     listingId:
 *                       type: string
 *                     newPrice:
 *                       type: number
 *     responses:
 *       200:
 *         description: 一括価格調整結果
 */
router.post('/bulk-apply', async (req, res, next) => {
  try {
    const { adjustments } = req.body;

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      throw new AppError(400, 'adjustments must be a non-empty array', 'VALIDATION_ERROR');
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const adj of adjustments) {
      const result = await applyPriceAdjustment(
        adj.listingId,
        adj.newPrice,
        'Bulk price adjustment by Pricing AI'
      );

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push(`${adj.listingId}: ${result.error}`);
      }
    }

    log.info({
      type: 'bulk_price_adjustment',
      total: adjustments.length,
      success: results.success,
      failed: results.failed,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/pricing-ai/simulate:
 *   post:
 *     summary: 価格変更のシミュレーション
 *     tags: [Pricing AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listingId
 *               - newPrice
 *             properties:
 *               listingId:
 *                 type: string
 *               newPrice:
 *                 type: number
 *     responses:
 *       200:
 *         description: シミュレーション結果
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const { listingId, newPrice } = req.body;

    if (!listingId || !newPrice) {
      throw new AppError(400, 'listingId and newPrice are required', 'VALIDATION_ERROR');
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing || !listing.product) {
      throw new AppError(404, 'Listing not found', 'NOT_FOUND');
    }

    const exchangeRateRecord = await prisma.exchangeRate.findFirst({
      where: { fromCurrency: 'JPY', toCurrency: 'USD' },
      orderBy: { fetchedAt: 'desc' },
    });
    const exchangeRate = exchangeRateRecord?.rate ? 1 / exchangeRateRecord.rate : 150;

    const currentMargin = calculateMargin(listing.listingPrice, listing.product.price, exchangeRate);
    const newMargin = calculateMargin(newPrice, listing.product.price, exchangeRate);

    const platformFeeRate = 0.15;
    const shippingCost = 5;
    const costUsd = listing.product.price / exchangeRate;

    const currentProfit = listing.listingPrice - costUsd - shippingCost - (listing.listingPrice * platformFeeRate);
    const newProfit = newPrice - costUsd - shippingCost - (newPrice * platformFeeRate);

    res.json({
      success: true,
      data: {
        listingId,
        productTitle: listing.product.title,
        current: {
          price: listing.listingPrice,
          margin: Math.round(currentMargin * 10) / 10,
          profit: Math.round(currentProfit * 100) / 100,
        },
        simulated: {
          price: newPrice,
          margin: Math.round(newMargin * 10) / 10,
          profit: Math.round(newProfit * 100) / 100,
        },
        difference: {
          price: Math.round((newPrice - listing.listingPrice) * 100) / 100,
          pricePercent: Math.round((newPrice - listing.listingPrice) / listing.listingPrice * 1000) / 10,
          margin: Math.round((newMargin - currentMargin) * 10) / 10,
          profit: Math.round((newProfit - currentProfit) * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as pricingAiRouter };

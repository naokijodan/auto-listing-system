/**
 * カスタマーサクセスAPI
 * Phase 83: カスタマーサクセス機能
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();

/**
 * RFMスコアを計算
 */
function calculateRFMScores(
  daysSinceLastOrder: number,
  orderCount: number,
  totalSpent: number
): { recency: number; frequency: number; monetary: number } {
  // Recency: 最近の購入ほど高スコア
  let recency = 1;
  if (daysSinceLastOrder <= 30) recency = 5;
  else if (daysSinceLastOrder <= 60) recency = 4;
  else if (daysSinceLastOrder <= 90) recency = 3;
  else if (daysSinceLastOrder <= 180) recency = 2;

  // Frequency: 購入回数が多いほど高スコア
  let frequency = 1;
  if (orderCount >= 10) frequency = 5;
  else if (orderCount >= 5) frequency = 4;
  else if (orderCount >= 3) frequency = 3;
  else if (orderCount >= 2) frequency = 2;

  // Monetary: 購入金額が多いほど高スコア
  let monetary = 1;
  if (totalSpent >= 100000) monetary = 5;
  else if (totalSpent >= 50000) monetary = 4;
  else if (totalSpent >= 20000) monetary = 3;
  else if (totalSpent >= 5000) monetary = 2;

  return { recency, frequency, monetary };
}

/**
 * チャーンリスクを計算
 */
function calculateChurnRisk(
  daysSinceLastOrder: number | null,
  orderCount: number,
  avgDaysBetweenOrders: number
): { risk: string; score: number } {
  if (!daysSinceLastOrder) {
    return { risk: 'LOW', score: 10 };
  }

  let score = 0;

  // 最終購入からの経過日数
  if (daysSinceLastOrder > 365) score += 40;
  else if (daysSinceLastOrder > 180) score += 30;
  else if (daysSinceLastOrder > 90) score += 20;
  else if (daysSinceLastOrder > 60) score += 10;

  // 購入頻度からの逸脱
  if (avgDaysBetweenOrders > 0 && daysSinceLastOrder > avgDaysBetweenOrders * 2) {
    score += 20;
  }

  // 購入回数が少ない
  if (orderCount <= 1) score += 15;

  // リスクレベルを決定
  let risk = 'LOW';
  if (score >= 75) risk = 'CRITICAL';
  else if (score >= 50) risk = 'HIGH';
  else if (score >= 25) risk = 'MEDIUM';

  return { risk, score: Math.min(score, 100) };
}

/**
 * セグメントを決定
 */
function determineSegment(
  daysSinceLastOrder: number | null,
  orderCount: number,
  totalSpent: number,
  firstOrderAt: Date | null
): string {
  if (!firstOrderAt) return 'NEW';

  const daysSinceFirstOrder = Math.floor(
    (Date.now() - firstOrderAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // VIP: 上位購入額
  if (totalSpent >= 100000) return 'VIP';

  // ロイヤル: 5回以上購入
  if (orderCount >= 5) return 'LOYAL';

  // 新規: 初回購入から30日以内
  if (daysSinceFirstOrder <= 30) return 'NEW';

  if (!daysSinceLastOrder) return 'NEW';

  // 離脱: 365日以上購入なし
  if (daysSinceLastOrder > 365) return 'CHURNED';

  // 休眠: 180日以上購入なし
  if (daysSinceLastOrder > 180) return 'DORMANT';

  // リスクあり: 90-180日購入なし
  if (daysSinceLastOrder > 90) return 'AT_RISK';

  // アクティブ
  return 'ACTIVE';
}

/**
 * ティアを決定
 */
function determineTier(totalSpent: number): string {
  if (totalSpent >= 100000) return 'DIAMOND';
  if (totalSpent >= 50000) return 'PLATINUM';
  if (totalSpent >= 20000) return 'GOLD';
  if (totalSpent >= 5000) return 'SILVER';
  return 'STANDARD';
}

/**
 * @swagger
 * /api/customer-success/stats:
 *   get:
 *     summary: カスタマーサクセス統計を取得
 *     tags: [CustomerSuccess]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      total,
      bySegment,
      byTier,
      byChurnRisk,
      avgLTV,
      atRiskCount,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.groupBy({
        by: ['segment'],
        _count: true,
      }),
      prisma.customer.groupBy({
        by: ['tier'],
        _count: true,
      }),
      prisma.customer.groupBy({
        by: ['churnRisk'],
        _count: true,
      }),
      prisma.customer.aggregate({
        _avg: { lifetimeValue: true },
      }),
      prisma.customer.count({
        where: { churnRisk: { in: ['HIGH', 'CRITICAL'] } },
      }),
    ]);

    res.json({
      total,
      bySegment: bySegment.reduce((acc, item) => {
        acc[item.segment] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byTier: byTier.reduce((acc, item) => {
        acc[item.tier] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byChurnRisk: byChurnRisk.reduce((acc, item) => {
        acc[item.churnRisk] = item._count;
        return acc;
      }, {} as Record<string, number>),
      averageLTV: Math.round(avgLTV._avg.lifetimeValue || 0),
      atRiskCount,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-success/segments:
 *   get:
 *     summary: セグメント定義を取得
 *     tags: [CustomerSuccess]
 */
router.get('/segments', async (req, res) => {
  res.json({
    segments: [
      { value: 'NEW', label: '新規', description: '初回購入後30日以内', color: '#3b82f6' },
      { value: 'ACTIVE', label: 'アクティブ', description: '過去90日以内に購入', color: '#22c55e' },
      { value: 'AT_RISK', label: 'リスクあり', description: '90-180日購入なし', color: '#f59e0b' },
      { value: 'DORMANT', label: '休眠', description: '180日以上購入なし', color: '#ef4444' },
      { value: 'CHURNED', label: '離脱', description: '365日以上購入なし', color: '#6b7280' },
      { value: 'VIP', label: 'VIP', description: '上位10%の購入額', color: '#8b5cf6' },
      { value: 'LOYAL', label: 'ロイヤル', description: '5回以上購入', color: '#ec4899' },
    ],
    tiers: [
      { value: 'STANDARD', label: '標準', minSpent: 0 },
      { value: 'SILVER', label: 'シルバー', minSpent: 5000 },
      { value: 'GOLD', label: 'ゴールド', minSpent: 20000 },
      { value: 'PLATINUM', label: 'プラチナ', minSpent: 50000 },
      { value: 'DIAMOND', label: 'ダイヤモンド', minSpent: 100000 },
    ],
    churnRisks: [
      { value: 'LOW', label: '低', description: '0-25%', color: '#22c55e' },
      { value: 'MEDIUM', label: '中', description: '25-50%', color: '#f59e0b' },
      { value: 'HIGH', label: '高', description: '50-75%', color: '#ef4444' },
      { value: 'CRITICAL', label: '危機的', description: '75%以上', color: '#991b1b' },
    ],
  });
});

/**
 * @swagger
 * /api/customer-success/customers:
 *   get:
 *     summary: 顧客一覧を取得
 *     tags: [CustomerSuccess]
 */
router.get('/customers', async (req, res, next) => {
  try {
    const {
      segment,
      tier,
      churnRisk,
      search,
      sortBy = 'lifetimeValue',
      sortOrder = 'desc',
      page = '1',
      limit = '20',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (segment) where.segment = segment;
    if (tier) where.tier = tier;
    if (churnRisk) where.churnRisk = churnRisk;
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          analytics: true,
          _count: { select: { activities: true } },
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      data: customers,
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
 * /api/customer-success/customers/{id}:
 *   get:
 *     summary: 顧客詳細を取得
 *     tags: [CustomerSuccess]
 */
router.get('/customers/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        analytics: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-success/customers/{id}/analyze:
 *   post:
 *     summary: 顧客を分析
 *     tags: [CustomerSuccess]
 */
router.post('/customers/:id/analyze', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // 日数計算
    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.floor((Date.now() - customer.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // RFMスコア計算
    const rfm = calculateRFMScores(
      daysSinceLastOrder || 999,
      customer.totalOrders,
      customer.totalSpent
    );

    // チャーンリスク計算
    const churn = calculateChurnRisk(
      daysSinceLastOrder,
      customer.totalOrders,
      customer.purchaseFrequency > 0 ? 30 / customer.purchaseFrequency : 0
    );

    // セグメント決定
    const segment = determineSegment(
      daysSinceLastOrder,
      customer.totalOrders,
      customer.totalSpent,
      customer.firstOrderAt
    );

    // ティア決定
    const tier = determineTier(customer.totalSpent);

    // 顧客を更新
    const updatedCustomer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        segment,
        tier,
        churnRisk: churn.risk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        churnScore: churn.score,
        daysSinceLastOrder,
      },
    });

    // 分析データを更新
    await prisma.customerAnalytics.upsert({
      where: { customerId: req.params.id },
      update: {
        recencyScore: rfm.recency,
        frequencyScore: rfm.frequency,
        monetaryScore: rfm.monetary,
        rfmScore: rfm.recency + rfm.frequency + rfm.monetary,
        lastAnalyzedAt: new Date(),
      },
      create: {
        customerId: req.params.id,
        recencyScore: rfm.recency,
        frequencyScore: rfm.frequency,
        monetaryScore: rfm.monetary,
        rfmScore: rfm.recency + rfm.frequency + rfm.monetary,
      },
    });

    logger.info(`Customer analyzed: ${req.params.id}`);

    res.json({
      customer: updatedCustomer,
      analysis: {
        rfm,
        churn,
        segment,
        tier,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-success/analyze-all:
 *   post:
 *     summary: 全顧客を分析
 *     tags: [CustomerSuccess]
 */
router.post('/analyze-all', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany();
    let updated = 0;

    for (const customer of customers) {
      const daysSinceLastOrder = customer.lastOrderAt
        ? Math.floor((Date.now() - customer.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const rfm = calculateRFMScores(
        daysSinceLastOrder || 999,
        customer.totalOrders,
        customer.totalSpent
      );

      const churn = calculateChurnRisk(
        daysSinceLastOrder,
        customer.totalOrders,
        customer.purchaseFrequency > 0 ? 30 / customer.purchaseFrequency : 0
      );

      const segment = determineSegment(
        daysSinceLastOrder,
        customer.totalOrders,
        customer.totalSpent,
        customer.firstOrderAt
      );

      const tier = determineTier(customer.totalSpent);

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          segment,
          tier,
          churnRisk: churn.risk as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          churnScore: churn.score,
          daysSinceLastOrder,
        },
      });

      await prisma.customerAnalytics.upsert({
        where: { customerId: customer.id },
        update: {
          recencyScore: rfm.recency,
          frequencyScore: rfm.frequency,
          monetaryScore: rfm.monetary,
          rfmScore: rfm.recency + rfm.frequency + rfm.monetary,
          lastAnalyzedAt: new Date(),
        },
        create: {
          customerId: customer.id,
          recencyScore: rfm.recency,
          frequencyScore: rfm.frequency,
          monetaryScore: rfm.monetary,
          rfmScore: rfm.recency + rfm.frequency + rfm.monetary,
        },
      });

      updated++;
    }

    logger.info(`All customers analyzed: ${updated}`);

    res.json({ updated, message: `${updated}件の顧客を分析しました` });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-success/at-risk:
 *   get:
 *     summary: リスクのある顧客一覧を取得
 *     tags: [CustomerSuccess]
 */
router.get('/at-risk', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        churnRisk: { in: ['HIGH', 'CRITICAL'] },
      },
      include: {
        analytics: true,
      },
      orderBy: { churnScore: 'desc' },
      take: 50,
    });

    res.json(customers);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-success/cohort-analysis:
 *   get:
 *     summary: コホート分析を取得
 *     tags: [CustomerSuccess]
 */
router.get('/cohort-analysis', async (req, res, next) => {
  try {
    const analytics = await prisma.customerAnalytics.findMany({
      where: { cohortMonth: { not: null } },
      select: {
        cohortMonth: true,
        customer: {
          select: {
            totalOrders: true,
            totalSpent: true,
            lastOrderAt: true,
          },
        },
      },
    });

    // コホート別に集計
    const cohorts: Record<string, { count: number; totalSpent: number; avgOrders: number; retentionRate: number }> = {};

    analytics.forEach((a) => {
      const month = a.cohortMonth!;
      if (!cohorts[month]) {
        cohorts[month] = { count: 0, totalSpent: 0, avgOrders: 0, retentionRate: 0 };
      }
      cohorts[month].count++;
      cohorts[month].totalSpent += a.customer.totalSpent;
      cohorts[month].avgOrders += a.customer.totalOrders;

      // 90日以内にアクティブな場合はリテンション
      if (a.customer.lastOrderAt) {
        const daysSince = Math.floor(
          (Date.now() - a.customer.lastOrderAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince <= 90) {
          cohorts[month].retentionRate++;
        }
      }
    });

    // 平均とリテンション率を計算
    Object.keys(cohorts).forEach((month) => {
      const c = cohorts[month];
      c.avgOrders = c.count > 0 ? c.avgOrders / c.count : 0;
      c.retentionRate = c.count > 0 ? (c.retentionRate / c.count) * 100 : 0;
    });

    res.json(cohorts);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-success/ltv-distribution:
 *   get:
 *     summary: LTV分布を取得
 *     tags: [CustomerSuccess]
 */
router.get('/ltv-distribution', async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({
      select: { lifetimeValue: true },
      orderBy: { lifetimeValue: 'desc' },
    });

    // 分布を計算
    const ranges = [
      { min: 0, max: 5000, label: '0-5千円' },
      { min: 5000, max: 20000, label: '5千-2万円' },
      { min: 20000, max: 50000, label: '2万-5万円' },
      { min: 50000, max: 100000, label: '5万-10万円' },
      { min: 100000, max: Infinity, label: '10万円以上' },
    ];

    const distribution = ranges.map((range) => ({
      ...range,
      count: customers.filter((c) => c.lifetimeValue >= range.min && c.lifetimeValue < range.max).length,
    }));

    // 統計
    const values = customers.map((c) => c.lifetimeValue);
    const total = values.reduce((sum, v) => sum + v, 0);
    const avg = values.length > 0 ? total / values.length : 0;
    const median = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;
    const top10Percent = values.length > 0 ? values[Math.floor(values.length * 0.1)] : 0;

    res.json({
      distribution,
      stats: {
        total: Math.round(total),
        average: Math.round(avg),
        median: Math.round(median),
        top10PercentThreshold: Math.round(top10Percent),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as customerSuccessRouter };

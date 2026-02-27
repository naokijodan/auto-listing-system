// @ts-nocheck
/**
 * 在庫予測・自動発注API
 * Phase 80: 在庫予測・自動発注
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();

/**
 * 需要予測を計算（移動平均法）
 */
function calculateDemandForecast(
  salesHistory: number[],
  forecastDays: number = 30
): { demand: number; confidence: number } {
  if (salesHistory.length === 0) {
    return { demand: 0, confidence: 0 };
  }

  // 7日間の移動平均
  const windowSize = Math.min(7, salesHistory.length);
  const recentSales = salesHistory.slice(-windowSize);
  const avgDailySales = recentSales.reduce((a, b) => a + b, 0) / windowSize;

  // 予測需要
  const demand = avgDailySales * forecastDays;

  // 信頼度（データ量と変動係数に基づく）
  const stdDev = Math.sqrt(
    recentSales.reduce((sum, val) => sum + Math.pow(val - avgDailySales, 2), 0) / windowSize
  );
  const cv = avgDailySales > 0 ? stdDev / avgDailySales : 1;
  const dataConfidence = Math.min(salesHistory.length / 30, 1);
  const variabilityConfidence = Math.max(0, 1 - cv);
  const confidence = (dataConfidence + variabilityConfidence) / 2;

  return { demand: Math.round(demand * 10) / 10, confidence };
}

/**
 * 安全在庫を計算
 */
function calculateSafetyStock(
  avgDailySales: number,
  leadTime: number,
  serviceLevel: number = 0.95
): number {
  // サービス係数（95%サービスレベル = 1.65）
  const zScore = serviceLevel === 0.99 ? 2.33 : serviceLevel === 0.95 ? 1.65 : 1.28;

  // 簡易計算：平均需要 × リードタイム × サービス係数
  const safetyStock = Math.ceil(avgDailySales * Math.sqrt(leadTime) * zScore);
  return safetyStock;
}

/**
 * 在庫切れリスクを判定
 */
function assessStockoutRisk(
  daysUntilStockout: number | null
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (daysUntilStockout === null || daysUntilStockout > 30) return 'LOW';
  if (daysUntilStockout > 14) return 'MEDIUM';
  if (daysUntilStockout > 7) return 'HIGH';
  return 'CRITICAL';
}

/**
 * @swagger
 * /api/inventory-forecast/stats:
 *   get:
 *     summary: 在庫予測統計を取得
 *     tags: [Inventory Forecast]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [
      totalForecasts,
      criticalRisk,
      highRisk,
      activeRules,
      pendingOrders,
    ] = await Promise.all([
      prisma.inventoryForecast.count(),
      prisma.inventoryForecast.count({ where: { stockoutRisk: 'CRITICAL' } }),
      prisma.inventoryForecast.count({ where: { stockoutRisk: 'HIGH' } }),
      prisma.autoReorderRule.count({ where: { isActive: true } }),
      prisma.autoReorderOrder.count({ where: { status: 'PENDING' } }),
    ]);

    // 最近の予測
    const recentForecasts = await prisma.inventoryForecast.findMany({
      where: {
        stockoutRisk: { in: ['CRITICAL', 'HIGH'] },
      },
      orderBy: { daysUntilStockout: 'asc' },
      take: 10,
    });

    res.json({
      totalForecasts,
      criticalRisk,
      highRisk,
      activeRules,
      pendingOrders,
      recentForecasts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inventory-forecast/forecasts:
 *   get:
 *     summary: 在庫予測一覧を取得
 *     tags: [Inventory Forecast]
 */
router.get('/forecasts', async (req, res, next) => {
  try {
    const { risk, page = '1', limit = '50' } = req.query;

    const where: Record<string, unknown> = {};
    if (risk) where.stockoutRisk = risk;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [forecasts, total] = await Promise.all([
      prisma.inventoryForecast.findMany({
        where,
        orderBy: [
          { stockoutRisk: 'asc' },
          { daysUntilStockout: 'asc' },
        ],
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.inventoryForecast.count({ where }),
    ]);

    res.json({
      data: forecasts,
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
 * /api/inventory-forecast/calculate:
 *   post:
 *     summary: 在庫予測を計算
 *     tags: [Inventory Forecast]
 */
router.post('/calculate', async (req, res, next) => {
  try {
    const { productId, listingId, forecastDays = 30, leadTime = 7 } = req.body;

    if (!productId && !listingId) {
      return res.status(400).json({ error: 'productId or listingId is required' });
    }

    // 過去30日の販売履歴を取得
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sales = await prisma.sale.findMany({
      where: {
        ...(productId && { productId }),
        ...(listingId && { listingId }),
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { quantity: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // 日別販売数を集計
    const dailySales: Record<string, number> = {};
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dailySales[date.toISOString().split('T')[0]] = 0;
    }
    for (const sale of sales) {
      const date = sale.createdAt.toISOString().split('T')[0];
      if (dailySales[date] !== undefined) {
        dailySales[date] += sale.quantity;
      }
    }

    const salesHistory = Object.values(dailySales).reverse();
    const { demand, confidence } = calculateDemandForecast(salesHistory, forecastDays);

    // 現在の在庫を取得
    const product = productId
      ? await prisma.product.findUnique({ where: { id: productId } })
      : null;
    const listing = listingId
      ? await prisma.listing.findUnique({ where: { id: listingId } })
      : null;

    const currentStock = listing?.stock || 1;
    const avgDailySales = demand / forecastDays;

    // 安全在庫を計算
    const safetyStock = calculateSafetyStock(avgDailySales, leadTime);
    const reorderPoint = safetyStock + Math.ceil(avgDailySales * leadTime);

    // 在庫切れまでの日数
    const daysUntilStockout = avgDailySales > 0
      ? Math.floor(currentStock / avgDailySales)
      : null;

    // リスク判定
    const stockoutRisk = assessStockoutRisk(daysUntilStockout);

    // 推奨アクション
    let recommendedAction: string | null = null;
    if (stockoutRisk === 'CRITICAL') {
      recommendedAction = 'ORDER_NOW';
    } else if (stockoutRisk === 'HIGH') {
      recommendedAction = 'ORDER_SOON';
    } else if (currentStock > demand * 2) {
      recommendedAction = 'REDUCE';
    } else {
      recommendedAction = 'MONITOR';
    }

    // 予測を保存
    const forecast = await prisma.inventoryForecast.create({
      data: {
        productId: productId || '',
        listingId,
        forecastDate: new Date(),
        forecastPeriod: forecastDays,
        currentStock,
        availableStock: currentStock,
        predictedDemand: demand,
        demandConfidence: confidence,
        safetyStock,
        reorderPoint,
        daysUntilStockout,
        stockoutRisk: stockoutRisk as any,
        recommendedAction: recommendedAction as any,
        modelType: 'moving_average',
        modelParams: { windowSize: 7, forecastDays },
      },
    });

    res.json(forecast);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inventory-forecast/bulk-calculate:
 *   post:
 *     summary: 全商品の在庫予測を一括計算
 *     tags: [Inventory Forecast]
 */
router.post('/bulk-calculate', async (req, res, next) => {
  try {
    const { forecastDays = 30, leadTime = 7 } = req.body;

    // アクティブなリスティングを取得
    const listings = await prisma.listing.findMany({
      where: {
        status: { in: ['ACTIVE', 'LISTED'] },
      },
      take: 100, // バッチサイズ制限
    });

    const results = {
      processed: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const listing of listings) {
      try {
        // 過去30日の販売履歴
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sales = await prisma.sale.findMany({
          where: {
            listingId: listing.id,
            createdAt: { gte: thirtyDaysAgo },
          },
          select: { quantity: true, createdAt: true },
        });

        // 日別集計
        const dailySales: number[] = [];
        for (let i = 0; i < 30; i++) {
          dailySales.push(0);
        }
        for (const sale of sales) {
          const daysAgo = Math.floor(
            (Date.now() - sale.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysAgo < 30) {
            dailySales[29 - daysAgo] += sale.quantity;
          }
        }

        const { demand, confidence } = calculateDemandForecast(dailySales, forecastDays);
        const avgDailySales = demand / forecastDays;
        const currentStock = listing.stock || 1;
        const safetyStock = calculateSafetyStock(avgDailySales, leadTime);
        const reorderPoint = safetyStock + Math.ceil(avgDailySales * leadTime);
        const daysUntilStockout = avgDailySales > 0
          ? Math.floor(currentStock / avgDailySales)
          : null;
        const stockoutRisk = assessStockoutRisk(daysUntilStockout);

        let recommendedAction: string | null = null;
        if (stockoutRisk === 'CRITICAL') recommendedAction = 'ORDER_NOW';
        else if (stockoutRisk === 'HIGH') recommendedAction = 'ORDER_SOON';
        else if (currentStock > demand * 2) recommendedAction = 'REDUCE';
        else recommendedAction = 'MONITOR';

        await prisma.inventoryForecast.create({
          data: {
            productId: listing.productId,
            listingId: listing.id,
            forecastDate: new Date(),
            forecastPeriod: forecastDays,
            currentStock,
            availableStock: currentStock,
            predictedDemand: demand,
            demandConfidence: confidence,
            safetyStock,
            reorderPoint,
            daysUntilStockout,
            stockoutRisk: stockoutRisk as any,
            recommendedAction: recommendedAction as any,
            modelType: 'moving_average',
          },
        });

        results.processed++;
        results[stockoutRisk.toLowerCase() as keyof typeof results]++;
      } catch (err) {
        logger.error(`Failed to calculate forecast for listing ${listing.id}`, err);
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// ========================================
// 自動発注ルール
// ========================================

/**
 * @swagger
 * /api/inventory-forecast/rules:
 *   get:
 *     summary: 自動発注ルール一覧を取得
 *     tags: [Inventory Forecast]
 */
router.get('/rules', async (req, res, next) => {
  try {
    const { isActive, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [rules, total] = await Promise.all([
      prisma.autoReorderRule.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, code: true },
          },
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { priority: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.autoReorderRule.count({ where }),
    ]);

    res.json({
      data: rules,
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
 * /api/inventory-forecast/rules:
 *   post:
 *     summary: 自動発注ルールを作成
 *     tags: [Inventory Forecast]
 */
router.post('/rules', async (req, res, next) => {
  try {
    const rule = await prisma.autoReorderRule.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        targetType: req.body.targetType || 'ALL',
        targetId: req.body.targetId,
        filters: req.body.filters || {},
        triggerType: req.body.triggerType || 'REORDER_POINT',
        reorderPoint: req.body.reorderPoint,
        daysBeforeStockout: req.body.daysBeforeStockout,
        safetyStockDays: req.body.safetyStockDays || 7,
        orderQuantityType: req.body.orderQuantityType || 'FIXED',
        fixedQuantity: req.body.fixedQuantity,
        daysOfStock: req.body.daysOfStock,
        minOrderQuantity: req.body.minOrderQuantity || 1,
        maxOrderQuantity: req.body.maxOrderQuantity,
        preferredSupplierId: req.body.preferredSupplierId,
        requiresApproval: req.body.requiresApproval ?? true,
        autoApproveLimit: req.body.autoApproveLimit,
        notifyOnTrigger: req.body.notifyOnTrigger ?? true,
        notifyChannels: req.body.notifyChannels || [],
        priority: req.body.priority || 50,
      },
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    logger.info(`Auto reorder rule created: ${rule.id} - ${rule.name}`);
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inventory-forecast/rules/{id}:
 *   patch:
 *     summary: 自動発注ルールを更新
 *     tags: [Inventory Forecast]
 */
router.patch('/rules/:id', async (req, res, next) => {
  try {
    const rule = await prisma.autoReorderRule.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.name && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.reorderPoint !== undefined && { reorderPoint: req.body.reorderPoint }),
        ...(req.body.daysBeforeStockout !== undefined && { daysBeforeStockout: req.body.daysBeforeStockout }),
        ...(req.body.fixedQuantity !== undefined && { fixedQuantity: req.body.fixedQuantity }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive }),
        ...(req.body.priority !== undefined && { priority: req.body.priority }),
        ...(req.body.requiresApproval !== undefined && { requiresApproval: req.body.requiresApproval }),
      },
    });

    res.json(rule);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inventory-forecast/rules/{id}:
 *   delete:
 *     summary: 自動発注ルールを削除
 *     tags: [Inventory Forecast]
 */
router.delete('/rules/:id', async (req, res, next) => {
  try {
    await prisma.autoReorderRule.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inventory-forecast/rules/{id}/toggle:
 *   patch:
 *     summary: ルールの有効/無効を切り替え
 *     tags: [Inventory Forecast]
 */
router.patch('/rules/:id/toggle', async (req, res, next) => {
  try {
    const rule = await prisma.autoReorderRule.findUnique({
      where: { id: req.params.id },
    });

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updated = await prisma.autoReorderRule.update({
      where: { id: req.params.id },
      data: { isActive: !rule.isActive },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// ========================================
// 自動発注オーダー
// ========================================

/**
 * @swagger
 * /api/inventory-forecast/orders:
 *   get:
 *     summary: 自動発注オーダー一覧を取得
 *     tags: [Inventory Forecast]
 */
router.get('/orders', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [orders, total] = await Promise.all([
      prisma.autoReorderOrder.findMany({
        where,
        include: {
          rule: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.autoReorderOrder.count({ where }),
    ]);

    res.json({
      data: orders,
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
 * /api/inventory-forecast/orders/{id}/approve:
 *   post:
 *     summary: 自動発注を承認
 *     tags: [Inventory Forecast]
 */
router.post('/orders/:id/approve', async (req, res, next) => {
  try {
    const { approvedBy } = req.body;

    const order = await prisma.autoReorderOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedBy: approvedBy || 'system',
        approvedAt: new Date(),
      },
    });

    logger.info(`Auto reorder order approved: ${order.id}`);
    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inventory-forecast/orders/{id}/reject:
 *   post:
 *     summary: 自動発注を却下
 *     tags: [Inventory Forecast]
 */
router.post('/orders/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await prisma.autoReorderOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        rejectedReason: reason,
      },
    });

    res.json(order);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/inventory-forecast/trigger-types:
 *   get:
 *     summary: トリガータイプ一覧を取得
 *     tags: [Inventory Forecast]
 */
router.get('/trigger-types', async (req, res) => {
  res.json({
    triggerTypes: [
      { value: 'REORDER_POINT', label: '発注点到達', description: '在庫が発注点に達したら発注' },
      { value: 'STOCKOUT_FORECAST', label: '在庫切れ予測', description: '在庫切れが予測されたら発注' },
      { value: 'SCHEDULE', label: 'スケジュール', description: '定期的に発注' },
      { value: 'MANUAL', label: '手動', description: '手動トリガー' },
    ],
    targetTypes: [
      { value: 'ALL', label: '全商品' },
      { value: 'PRODUCT', label: '特定商品' },
      { value: 'CATEGORY', label: 'カテゴリ' },
      { value: 'SUPPLIER', label: 'サプライヤー' },
      { value: 'LISTING', label: '特定出品' },
    ],
    quantityTypes: [
      { value: 'FIXED', label: '固定数量' },
      { value: 'DAYS_STOCK', label: '在庫日数分' },
      { value: 'EOQ', label: '経済的発注量' },
      { value: 'MIN_ORDER', label: '最小発注数量' },
    ],
  });
});

export { router as inventoryForecastRouter };

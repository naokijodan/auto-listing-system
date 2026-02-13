import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

export const profitCalculationRouter = Router();

// GET /api/profit-calculation/stats - 利益統計
profitCalculationRouter.get('/stats', async (_req, res) => {
  try {
    const calculations = await prisma.profitCalculation.findMany();

    const totalRevenue = calculations.reduce((sum, c) => sum + c.salePrice, 0);
    const totalCost = calculations.reduce((sum, c) => sum + c.totalCostUsd, 0);
    const totalProfit = calculations.reduce((sum, c) => sum + c.netProfit, 0);
    const avgProfitMargin = calculations.length > 0
      ? calculations.reduce((sum, c) => sum + c.profitMargin, 0) / calculations.length
      : 0;

    const byStatus = await prisma.profitCalculation.groupBy({
      by: ['profitStatus'],
      _count: true,
    });

    const profitableCount = byStatus
      .filter((s) => s.profitStatus === 'HIGHLY_PROFITABLE' || s.profitStatus === 'PROFITABLE')
      .reduce((sum, s) => sum + s._count, 0);

    const lossCount = byStatus
      .filter((s) => s.profitStatus === 'LOSS')
      .reduce((sum, s) => sum + s._count, 0);

    const [totalCosts, totalFees, totalTargets] = await Promise.all([
      prisma.productCost.count(),
      prisma.feeStructure.count(),
      prisma.profitTarget.count(),
    ]);

    res.json({
      totalCalculations: calculations.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      avgProfitMargin: Math.round(avgProfitMargin * 100) / 100,
      profitableCount,
      lossCount,
      byStatus: byStatus.map((s) => ({ status: s.profitStatus, count: s._count })),
      totalCosts,
      totalFees,
      totalTargets,
    });
  } catch (error) {
    logger.error('Failed to get profit stats', error);
    res.status(500).json({ error: 'Failed to get profit stats' });
  }
});

// GET /api/profit-calculation/listings - 出品別利益一覧
profitCalculationRouter.get('/listings', async (req, res) => {
  try {
    const { status, sortBy = 'profitMargin', order = 'desc', limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.profitStatus = status;

    const orderBy: any = {};
    orderBy[sortBy as string] = order;

    const [calculations, total] = await Promise.all([
      prisma.profitCalculation.findMany({
        where,
        orderBy,
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          cost: { select: { purchasePrice: true, supplierName: true } },
        },
      }),
      prisma.profitCalculation.count({ where }),
    ]);

    res.json({ calculations, total });
  } catch (error) {
    logger.error('Failed to get profit calculations', error);
    res.status(500).json({ error: 'Failed to get profit calculations' });
  }
});

// POST /api/profit-calculation/calculate - 利益計算（単品）
profitCalculationRouter.post('/calculate', async (req, res) => {
  try {
    const {
      listingId,
      ebayItemId,
      salePrice,
      saleCurrency = 'USD',
      purchasePrice,
      purchaseCurrency = 'JPY',
      domesticShipping = 0,
      internationalShipping = 0,
      exchangeRate,
    } = req.body;

    // 為替レート取得（指定がなければ仮のレート）
    const rate = exchangeRate || 150;

    // 原価をUSDに換算
    const totalCostJpy = purchasePrice + domesticShipping + internationalShipping;
    const totalCostUsd = totalCostJpy / rate;

    // eBay手数料計算（デフォルト値）
    const ebayFinalValueFee = salePrice * 0.129; // 12.9%
    const ebayFixedFee = 0.30;
    const paypalFee = salePrice * 0.029 + 0.30; // 2.9% + $0.30
    const shippingCost = internationalShipping / rate;

    const totalFees = ebayFinalValueFee + ebayFixedFee + paypalFee;

    // 利益計算
    const grossProfit = salePrice - totalCostUsd;
    const netProfit = salePrice - totalCostUsd - totalFees;
    const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

    // ステータス判定
    let profitStatus: string;
    if (profitMargin >= 30) profitStatus = 'HIGHLY_PROFITABLE';
    else if (profitMargin >= 15) profitStatus = 'PROFITABLE';
    else if (profitMargin >= 5) profitStatus = 'MARGINAL';
    else if (profitMargin >= 0) profitStatus = 'BREAK_EVEN';
    else profitStatus = 'LOSS';

    // 原価レコード作成
    const cost = await prisma.productCost.create({
      data: {
        organizationId: 'default',
        listingId,
        purchasePrice,
        purchaseCurrency,
        domesticShipping,
        internationalShipping,
        totalCost: totalCostJpy,
        exchangeRate: rate,
        exchangeRateDate: new Date(),
      },
    });

    // 利益計算レコード作成
    const calculation = await prisma.profitCalculation.create({
      data: {
        organizationId: 'default',
        listingId,
        ebayItemId,
        costId: cost.id,
        salePrice,
        saleCurrency,
        totalCost: totalCostJpy,
        costCurrency: purchaseCurrency,
        ebayFinalValueFee,
        ebayFixedFee,
        paypalFee,
        shippingCost,
        otherFees: 0,
        totalFees,
        totalCostUsd,
        grossProfit,
        netProfit,
        profitMargin,
        exchangeRate: rate,
        exchangeRateDate: new Date(),
        profitStatus: profitStatus as any,
      },
    });

    res.status(201).json({
      calculation,
      breakdown: {
        salePrice,
        totalCostJpy,
        totalCostUsd: Math.round(totalCostUsd * 100) / 100,
        ebayFinalValueFee: Math.round(ebayFinalValueFee * 100) / 100,
        ebayFixedFee,
        paypalFee: Math.round(paypalFee * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
        profitStatus,
      },
    });
  } catch (error) {
    logger.error('Failed to calculate profit', error);
    res.status(500).json({ error: 'Failed to calculate profit' });
  }
});

// POST /api/profit-calculation/simulate - シミュレーション（保存なし）
profitCalculationRouter.post('/simulate', async (req, res) => {
  try {
    const {
      salePrice,
      purchasePrice,
      domesticShipping = 0,
      internationalShipping = 0,
      exchangeRate = 150,
      ebayFeePercent = 12.9,
      paypalFeePercent = 2.9,
    } = req.body;

    const totalCostJpy = purchasePrice + domesticShipping + internationalShipping;
    const totalCostUsd = totalCostJpy / exchangeRate;

    const ebayFinalValueFee = salePrice * (ebayFeePercent / 100);
    const ebayFixedFee = 0.30;
    const paypalFee = salePrice * (paypalFeePercent / 100) + 0.30;
    const totalFees = ebayFinalValueFee + ebayFixedFee + paypalFee;

    const grossProfit = salePrice - totalCostUsd;
    const netProfit = salePrice - totalCostUsd - totalFees;
    const profitMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;

    // 損益分岐点計算
    const breakEvenPrice = (totalCostUsd + 0.30 + 0.30) / (1 - (ebayFeePercent + paypalFeePercent) / 100);

    // 目標利益率での価格計算
    const targetMargins = [15, 20, 25, 30];
    const suggestedPrices = targetMargins.map((margin) => {
      const price = (totalCostUsd + 0.60) / (1 - (ebayFeePercent + paypalFeePercent + margin) / 100);
      return {
        targetMargin: margin,
        suggestedPrice: Math.round(price * 100) / 100,
      };
    });

    res.json({
      input: { salePrice, purchasePrice, domesticShipping, internationalShipping, exchangeRate },
      result: {
        totalCostJpy,
        totalCostUsd: Math.round(totalCostUsd * 100) / 100,
        ebayFinalValueFee: Math.round(ebayFinalValueFee * 100) / 100,
        paypalFee: Math.round(paypalFee * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 100) / 100,
      },
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
      suggestedPrices,
    });
  } catch (error) {
    logger.error('Failed to simulate profit', error);
    res.status(500).json({ error: 'Failed to simulate profit' });
  }
});

// GET /api/profit-calculation/costs - 原価一覧
profitCalculationRouter.get('/costs', async (req, res) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const [costs, total] = await Promise.all([
      prisma.productCost.findMany({
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.productCost.count(),
    ]);

    res.json({ costs, total });
  } catch (error) {
    logger.error('Failed to get costs', error);
    res.status(500).json({ error: 'Failed to get costs' });
  }
});

// POST /api/profit-calculation/costs - 原価登録
profitCalculationRouter.post('/costs', async (req, res) => {
  try {
    const {
      listingId,
      productId,
      sku,
      purchasePrice,
      purchaseCurrency = 'JPY',
      domesticShipping = 0,
      internationalShipping = 0,
      supplierName,
      purchaseDate,
      purchaseUrl,
      notes,
    } = req.body;

    const totalCost = purchasePrice + domesticShipping + internationalShipping;

    const cost = await prisma.productCost.create({
      data: {
        organizationId: 'default',
        listingId,
        productId,
        sku,
        purchasePrice,
        purchaseCurrency,
        domesticShipping,
        internationalShipping,
        totalCost,
        supplierName,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchaseUrl,
        notes,
      },
    });

    res.status(201).json(cost);
  } catch (error) {
    logger.error('Failed to create cost', error);
    res.status(500).json({ error: 'Failed to create cost' });
  }
});

// PUT /api/profit-calculation/costs/:id - 原価更新
profitCalculationRouter.put('/costs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.purchasePrice !== undefined ||
        updateData.domesticShipping !== undefined ||
        updateData.internationalShipping !== undefined) {
      const current = await prisma.productCost.findUnique({ where: { id } });
      if (current) {
        updateData.totalCost =
          (updateData.purchasePrice ?? current.purchasePrice) +
          (updateData.domesticShipping ?? current.domesticShipping) +
          (updateData.internationalShipping ?? current.internationalShipping);
      }
    }

    const cost = await prisma.productCost.update({
      where: { id },
      data: updateData,
    });

    res.json(cost);
  } catch (error) {
    logger.error('Failed to update cost', error);
    res.status(500).json({ error: 'Failed to update cost' });
  }
});

// GET /api/profit-calculation/fees - 手数料設定一覧
profitCalculationRouter.get('/fees', async (req, res) => {
  try {
    const { platform } = req.query;

    const where: any = {};
    if (platform) where.platform = platform;

    const fees = await prisma.feeStructure.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(fees);
  } catch (error) {
    logger.error('Failed to get fee structures', error);
    res.status(500).json({ error: 'Failed to get fee structures' });
  }
});

// POST /api/profit-calculation/fees - 手数料設定作成
profitCalculationRouter.post('/fees', async (req, res) => {
  try {
    const {
      name,
      description,
      platform,
      category,
      finalValueFeePercent = 12.9,
      fixedFeeAmount = 0.30,
      paymentFeePercent = 2.9,
      paymentFixedFee = 0.30,
      isDefault = false,
    } = req.body;

    const fee = await prisma.feeStructure.create({
      data: {
        organizationId: 'default',
        name,
        description,
        platform,
        category,
        finalValueFeePercent,
        fixedFeeAmount,
        paymentFeePercent,
        paymentFixedFee,
        isDefault,
        isActive: true,
      },
    });

    res.status(201).json(fee);
  } catch (error) {
    logger.error('Failed to create fee structure', error);
    res.status(500).json({ error: 'Failed to create fee structure' });
  }
});

// GET /api/profit-calculation/targets - 利益目標一覧
profitCalculationRouter.get('/targets', async (req, res) => {
  try {
    const targets = await prisma.profitTarget.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(targets);
  } catch (error) {
    logger.error('Failed to get profit targets', error);
    res.status(500).json({ error: 'Failed to get profit targets' });
  }
});

// POST /api/profit-calculation/targets - 利益目標作成
profitCalculationRouter.post('/targets', async (req, res) => {
  try {
    const {
      name,
      description,
      targetType = 'GLOBAL',
      category,
      minProfitMargin = 15,
      targetProfitMargin = 25,
      isDefault = false,
      alertOnBelow = true,
      alertThreshold = 10,
    } = req.body;

    const target = await prisma.profitTarget.create({
      data: {
        organizationId: 'default',
        name,
        description,
        targetType,
        category,
        minProfitMargin,
        targetProfitMargin,
        isDefault,
        alertOnBelow,
        alertThreshold,
        isActive: true,
      },
    });

    res.status(201).json(target);
  } catch (error) {
    logger.error('Failed to create profit target', error);
    res.status(500).json({ error: 'Failed to create profit target' });
  }
});

// PUT /api/profit-calculation/targets/:id - 利益目標更新
profitCalculationRouter.put('/targets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const target = await prisma.profitTarget.update({
      where: { id },
      data: updateData,
    });

    res.json(target);
  } catch (error) {
    logger.error('Failed to update profit target', error);
    res.status(500).json({ error: 'Failed to update profit target' });
  }
});

// GET /api/profit-calculation/report - 利益レポート
profitCalculationRouter.get('/report', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period as string));

    const calculations = await prisma.profitCalculation.findMany({
      where: { createdAt: { gte: startDate } },
    });

    const totalRevenue = calculations.reduce((sum, c) => sum + c.salePrice, 0);
    const totalCost = calculations.reduce((sum, c) => sum + c.totalCostUsd, 0);
    const totalFees = calculations.reduce((sum, c) => sum + c.totalFees, 0);
    const totalProfit = calculations.reduce((sum, c) => sum + c.netProfit, 0);

    // 日別集計
    const dailyStats: Record<string, any> = {};
    for (const calc of calculations) {
      const dateKey = calc.createdAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { revenue: 0, cost: 0, profit: 0, count: 0 };
      }
      dailyStats[dateKey].revenue += calc.salePrice;
      dailyStats[dateKey].cost += calc.totalCostUsd;
      dailyStats[dateKey].profit += calc.netProfit;
      dailyStats[dateKey].count += 1;
    }

    res.json({
      period: parseInt(period as string),
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        avgProfitMargin: totalRevenue > 0
          ? Math.round((totalProfit / totalRevenue) * 10000) / 100
          : 0,
        totalTransactions: calculations.length,
      },
      dailyStats: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    logger.error('Failed to get profit report', error);
    res.status(500).json({ error: 'Failed to get profit report' });
  }
});

export default profitCalculationRouter;

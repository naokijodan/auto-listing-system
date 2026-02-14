import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 倉庫/ロケーション
const WAREHOUSES = {
  US_WEST: { code: 'US_WEST', name: 'US West (LA)', country: 'US', region: 'West', capacity: 5000 },
  US_EAST: { code: 'US_EAST', name: 'US East (NJ)', country: 'US', region: 'East', capacity: 4000 },
  UK: { code: 'UK', name: 'UK (London)', country: 'UK', region: 'Europe', capacity: 3000 },
  DE: { code: 'DE', name: 'Germany (Frankfurt)', country: 'DE', region: 'Europe', capacity: 2500 },
  AU: { code: 'AU', name: 'Australia (Sydney)', country: 'AU', region: 'Pacific', capacity: 1500 },
  JP: { code: 'JP', name: 'Japan (Tokyo)', country: 'JP', region: 'Asia', capacity: 2000 },
} as const;

// 最適化戦略
const OPTIMIZATION_STRATEGIES = {
  COST_MINIMIZE: { code: 'COST_MINIMIZE', name: 'コスト最小化', description: '保管・配送コストを最小化' },
  SPEED_MAXIMIZE: { code: 'SPEED_MAXIMIZE', name: '配送速度最大化', description: '配送時間を最短化' },
  BALANCED: { code: 'BALANCED', name: 'バランス', description: 'コストと速度のバランス' },
  DEMAND_DRIVEN: { code: 'DEMAND_DRIVEN', name: '需要ベース', description: '需要予測に基づく配置' },
} as const;

// 在庫ステータス
const INVENTORY_STATUS = {
  OPTIMAL: { code: 'OPTIMAL', name: '最適', color: '#10b981' },
  OVERSTOCKED: { code: 'OVERSTOCKED', name: '過剰', color: '#f59e0b' },
  UNDERSTOCKED: { code: 'UNDERSTOCKED', name: '不足', color: '#ef4444' },
  UNBALANCED: { code: 'UNBALANCED', name: '不均衡', color: '#8b5cf6' },
} as const;

// ダッシュボード
router.get('/dashboard', async (_req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY', status: 'ACTIVE' },
      include: { product: true },
    });

    // 在庫統計（モック）
    const stats = {
      totalSKUs: listings.length,
      totalUnits: 12500,
      totalValue: 285000,
      warehouseUtilization: 72.5,
      averageTurnoverRate: 4.2,
      stockoutRisk: 8,
      overstockItems: 15,
    };

    // 倉庫別状況
    const warehouseStats = Object.values(WAREHOUSES).map((wh) => ({
      ...wh,
      currentStock: Math.floor(Math.random() * wh.capacity * 0.8) + wh.capacity * 0.2,
      utilization: Math.floor(Math.random() * 40) + 50,
      inbound: Math.floor(Math.random() * 100) + 50,
      outbound: Math.floor(Math.random() * 80) + 30,
      pendingTransfers: Math.floor(Math.random() * 20),
    }));

    // 在庫健全性スコア
    const healthScore = {
      overall: 78,
      distribution: 72,
      turnover: 85,
      stockLevel: 75,
      demandAlignment: 80,
    };

    // 最適化提案サマリー
    const optimizationSummary = {
      pendingRecommendations: 12,
      potentialSavings: 4500,
      potentialSpeedImprovement: 18,
      urgentActions: 3,
    };

    res.json({
      success: true,
      stats,
      warehouseStats,
      healthScore,
      optimizationSummary,
    });
  } catch (error) {
    logger.error('Failed to get inventory optimization dashboard', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard' });
  }
});

// 倉庫一覧
router.get('/warehouses', (_req, res) => {
  res.json({
    success: true,
    warehouses: Object.values(WAREHOUSES),
  });
});

// 最適化戦略一覧
router.get('/strategies', (_req, res) => {
  res.json({
    success: true,
    strategies: Object.values(OPTIMIZATION_STRATEGIES),
  });
});

// 在庫配置分析
router.get('/distribution', async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY', status: 'ACTIVE' },
      include: { product: true },
      take: 50,
    });

    // 商品別の在庫配置（モック）
    const distribution = listings.map((listing) => {
      const warehouseAllocation = Object.keys(WAREHOUSES).reduce((acc, wh) => {
        acc[wh] = Math.floor(Math.random() * 30);
        return acc;
      }, {} as Record<string, number>);

      const totalStock = Object.values(warehouseAllocation).reduce((a, b) => a + b, 0);
      const demandByRegion = {
        'US': Math.floor(Math.random() * 50) + 30,
        'Europe': Math.floor(Math.random() * 30) + 10,
        'Asia': Math.floor(Math.random() * 20) + 5,
        'Pacific': Math.floor(Math.random() * 10) + 2,
      };

      // ステータス判定
      let status = 'OPTIMAL';
      const demandTotal = Object.values(demandByRegion).reduce((a, b) => a + b, 0);
      if (totalStock > demandTotal * 2) status = 'OVERSTOCKED';
      else if (totalStock < demandTotal * 0.5) status = 'UNDERSTOCKED';
      else if (Math.random() > 0.7) status = 'UNBALANCED';

      return {
        listingId: listing.id,
        sku: listing.productId.slice(0, 8),
        title: listing.product.titleEn || listing.product.title,
        category: listing.product.category,
        totalStock,
        warehouseAllocation,
        demandByRegion,
        status,
        turnoverRate: (Math.random() * 8 + 1).toFixed(1),
        daysOfSupply: Math.floor(totalStock / (demandTotal / 30)),
      };
    });

    // サマリー
    const summary = {
      optimal: distribution.filter(d => d.status === 'OPTIMAL').length,
      overstocked: distribution.filter(d => d.status === 'OVERSTOCKED').length,
      understocked: distribution.filter(d => d.status === 'UNDERSTOCKED').length,
      unbalanced: distribution.filter(d => d.status === 'UNBALANCED').length,
    };

    res.json({
      success: true,
      distribution,
      summary,
    });
  } catch (error) {
    logger.error('Failed to get inventory distribution', error);
    res.status(500).json({ success: false, error: 'Failed to get distribution' });
  }
});

// 最適化分析実行
const analyzeOptimizationSchema = z.object({
  strategy: z.enum(['COST_MINIMIZE', 'SPEED_MAXIMIZE', 'BALANCED', 'DEMAND_DRIVEN']).default('BALANCED'),
  includeTransferCosts: z.boolean().default(true),
  forecastPeriod: z.number().min(7).max(90).default(30),
});

router.post('/analyze', async (req, res) => {
  try {
    const body = analyzeOptimizationSchema.parse(req.body);

    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY', status: 'ACTIVE' },
      include: { product: true },
      take: 30,
    });

    // 最適化提案を生成
    const recommendations = listings.slice(0, 15).map((listing, index) => {
      const actions = [
        { type: 'TRANSFER', from: 'US_WEST', to: 'US_EAST', quantity: Math.floor(Math.random() * 20) + 5 },
        { type: 'RESTOCK', warehouse: 'UK', quantity: Math.floor(Math.random() * 30) + 10 },
        { type: 'REDISTRIBUTE', warehouses: ['US_WEST', 'DE'], ratio: '60:40' },
        { type: 'LIQUIDATE', warehouse: 'AU', quantity: Math.floor(Math.random() * 10) + 5 },
      ];

      const action = actions[index % actions.length];

      return {
        id: `rec-${index + 1}`,
        listingId: listing.id,
        sku: listing.productId.slice(0, 8),
        title: listing.product.titleEn || listing.product.title,
        action,
        reason: getRecommendationReason(action.type),
        impact: {
          costSaving: Math.floor(Math.random() * 500) + 50,
          deliveryImprovement: Math.floor(Math.random() * 3) + 1, // days
          riskReduction: Math.floor(Math.random() * 30) + 10, // percentage
        },
        priority: ['HIGH', 'MEDIUM', 'LOW'][Math.floor(Math.random() * 3)],
        estimatedROI: (Math.random() * 200 + 50).toFixed(0) + '%',
      };
    });

    // サマリー
    const summary = {
      totalRecommendations: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'HIGH').length,
      totalPotentialSavings: recommendations.reduce((sum, r) => sum + r.impact.costSaving, 0),
      averageDeliveryImprovement: (recommendations.reduce((sum, r) => sum + r.impact.deliveryImprovement, 0) / recommendations.length).toFixed(1),
    };

    res.json({
      success: true,
      strategy: body.strategy,
      forecastPeriod: body.forecastPeriod,
      recommendations,
      summary,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to analyze optimization', error);
    res.status(500).json({ success: false, error: 'Failed to analyze' });
  }
});

function getRecommendationReason(actionType: string): string {
  switch (actionType) {
    case 'TRANSFER':
      return '需要の高い地域への在庫移動で配送速度向上';
    case 'RESTOCK':
      return '在庫不足リスクの軽減';
    case 'REDISTRIBUTE':
      return '地域間の需要バランスに合わせた再配置';
    case 'LIQUIDATE':
      return '過剰在庫の削減によるコスト最適化';
    default:
      return '在庫配置の最適化';
  }
}

// 転送計画生成
const transferPlanSchema = z.object({
  listingIds: z.array(z.string()).min(1),
  strategy: z.enum(['COST_MINIMIZE', 'SPEED_MAXIMIZE', 'BALANCED']).default('BALANCED'),
});

router.post('/transfer-plan', async (req, res) => {
  try {
    const body = transferPlanSchema.parse(req.body);

    const listings = await prisma.listing.findMany({
      where: { id: { in: body.listingIds } },
      include: { product: true },
    });

    // 転送計画を生成
    const transfers = listings.map((listing) => {
      const fromWarehouse = Object.keys(WAREHOUSES)[Math.floor(Math.random() * 3)];
      const toWarehouse = Object.keys(WAREHOUSES)[Math.floor(Math.random() * 3) + 3];

      return {
        listingId: listing.id,
        sku: listing.productId.slice(0, 8),
        title: listing.product.titleEn || listing.product.title,
        from: fromWarehouse,
        to: toWarehouse,
        quantity: Math.floor(Math.random() * 30) + 10,
        estimatedCost: Math.floor(Math.random() * 200) + 50,
        estimatedDays: Math.floor(Math.random() * 5) + 2,
        reason: 'Demand optimization',
      };
    });

    const totalCost = transfers.reduce((sum, t) => sum + t.estimatedCost, 0);
    const totalUnits = transfers.reduce((sum, t) => sum + t.quantity, 0);

    res.json({
      success: true,
      strategy: body.strategy,
      transfers,
      summary: {
        totalTransfers: transfers.length,
        totalUnits,
        totalCost,
        estimatedSavings: Math.floor(totalCost * 0.3),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate transfer plan', error);
    res.status(500).json({ success: false, error: 'Failed to generate plan' });
  }
});

// 需要マップ
router.get('/demand-map', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // 地域別需要（モック）
    const demandMap = {
      US: {
        total: 4500,
        growth: 12,
        regions: {
          West: { demand: 1800, trend: 'up' },
          East: { demand: 1500, trend: 'stable' },
          Midwest: { demand: 800, trend: 'up' },
          South: { demand: 400, trend: 'down' },
        },
      },
      Europe: {
        total: 2200,
        growth: 8,
        regions: {
          UK: { demand: 800, trend: 'stable' },
          Germany: { demand: 600, trend: 'up' },
          France: { demand: 400, trend: 'up' },
          Other: { demand: 400, trend: 'stable' },
        },
      },
      Asia: {
        total: 1500,
        growth: 22,
        regions: {
          Japan: { demand: 600, trend: 'up' },
          China: { demand: 500, trend: 'up' },
          Korea: { demand: 250, trend: 'up' },
          Other: { demand: 150, trend: 'stable' },
        },
      },
      Pacific: {
        total: 800,
        growth: 5,
        regions: {
          Australia: { demand: 600, trend: 'stable' },
          NewZealand: { demand: 150, trend: 'up' },
          Other: { demand: 50, trend: 'stable' },
        },
      },
    };

    // 最適配置提案
    const optimalAllocation = Object.entries(demandMap).map(([region, data]) => ({
      region,
      currentAllocation: Math.floor(data.total * 0.8),
      optimalAllocation: data.total,
      gap: Math.floor(data.total * 0.2),
      priority: data.growth > 15 ? 'HIGH' : data.growth > 8 ? 'MEDIUM' : 'LOW',
    }));

    res.json({
      success: true,
      period,
      demandMap,
      optimalAllocation,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get demand map', error);
    res.status(500).json({ success: false, error: 'Failed to get demand map' });
  }
});

// ABC分析
router.get('/abc-analysis', async (req, res) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY', status: 'ACTIVE' },
      include: { product: true },
      take: 100,
    });

    // ABC分類
    const analyzed = listings.map((listing, index) => {
      const revenue = Math.floor(Math.random() * 10000) + 500;
      const units = Math.floor(Math.random() * 100) + 10;

      return {
        listingId: listing.id,
        sku: listing.productId.slice(0, 8),
        title: listing.product.titleEn || listing.product.title,
        revenue,
        units,
        category: listing.product.category,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const totalRevenue = analyzed.reduce((sum, a) => sum + a.revenue, 0);
    let cumulativeRevenue = 0;

    const classified = analyzed.map((item) => {
      cumulativeRevenue += item.revenue;
      const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100;

      let classification: 'A' | 'B' | 'C';
      if (cumulativePercent <= 80) classification = 'A';
      else if (cumulativePercent <= 95) classification = 'B';
      else classification = 'C';

      return {
        ...item,
        revenuePercent: ((item.revenue / totalRevenue) * 100).toFixed(2),
        cumulativePercent: cumulativePercent.toFixed(2),
        classification,
      };
    });

    const summary = {
      A: { count: classified.filter(c => c.classification === 'A').length, revenue: classified.filter(c => c.classification === 'A').reduce((sum, c) => sum + c.revenue, 0) },
      B: { count: classified.filter(c => c.classification === 'B').length, revenue: classified.filter(c => c.classification === 'B').reduce((sum, c) => sum + c.revenue, 0) },
      C: { count: classified.filter(c => c.classification === 'C').length, revenue: classified.filter(c => c.classification === 'C').reduce((sum, c) => sum + c.revenue, 0) },
    };

    res.json({
      success: true,
      items: classified,
      summary,
      recommendations: [
        { class: 'A', action: '優先的に在庫を確保し、複数倉庫に分散配置' },
        { class: 'B', action: '需要に応じた適正在庫を維持' },
        { class: 'C', action: '在庫削減を検討、集約配置を推奨' },
      ],
    });
  } catch (error) {
    logger.error('Failed to perform ABC analysis', error);
    res.status(500).json({ success: false, error: 'Failed to analyze' });
  }
});

// AI最適化提案
const aiOptimizationSchema = z.object({
  focus: z.enum(['cost', 'speed', 'balance', 'risk']).optional(),
  constraints: z.object({
    maxTransferCost: z.number().optional(),
    minServiceLevel: z.number().min(0).max(100).optional(),
  }).optional(),
});

router.post('/ai-optimize', async (req, res) => {
  try {
    const body = aiOptimizationSchema.parse(req.body);

    const prompt = `
あなたはEコマースの在庫配置最適化専門家です。
以下の条件で在庫配置の最適化提案を行ってください。

${body.focus ? `フォーカス: ${body.focus}` : 'バランスの取れた最適化'}
${body.constraints?.maxTransferCost ? `最大転送コスト: $${body.constraints.maxTransferCost}` : ''}
${body.constraints?.minServiceLevel ? `最低サービスレベル: ${body.constraints.minServiceLevel}%` : ''}

現在の状況（仮定）:
- 倉庫数: 6拠点（US West, US East, UK, Germany, Australia, Japan）
- 総SKU: 500
- 在庫回転率: 4.2
- 在庫健全性スコア: 78/100

以下の形式でJSONを返してください:
{
  "analysis": "現状分析",
  "recommendations": [
    {
      "title": "提案タイトル",
      "description": "詳細説明",
      "impact": { "cost": "コスト影響", "speed": "速度影響", "risk": "リスク影響" },
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "estimatedROI": "予想ROI"
    }
  ],
  "quickWins": ["すぐに実行可能なアクション1", "アクション2"],
  "longTermStrategy": "長期戦略の説明"
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      result = {
        analysis: '分析を生成できませんでした',
        recommendations: [],
        quickWins: [],
        longTermStrategy: '',
      };
    }

    res.json({
      success: true,
      focus: body.focus,
      ...result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate AI optimization', error);
    res.status(500).json({ success: false, error: 'Failed to generate AI optimization' });
  }
});

// 在庫移動履歴
router.get('/transfer-history', async (req, res) => {
  try {
    const { limit = '20' } = req.query;

    // 移動履歴（モック）
    const history = Array.from({ length: parseInt(limit as string) }, (_, i) => ({
      id: `transfer-${i + 1}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000 * Math.random() * 30).toISOString(),
      from: Object.keys(WAREHOUSES)[Math.floor(Math.random() * 3)],
      to: Object.keys(WAREHOUSES)[Math.floor(Math.random() * 3) + 3],
      sku: `SKU-${(1000 + i).toString(36).toUpperCase()}`,
      quantity: Math.floor(Math.random() * 50) + 10,
      cost: Math.floor(Math.random() * 300) + 50,
      status: ['COMPLETED', 'IN_TRANSIT', 'PENDING'][Math.floor(Math.random() * 3)],
      reason: ['Demand optimization', 'Stock balancing', 'Cost reduction'][Math.floor(Math.random() * 3)],
    }));

    res.json({
      success: true,
      history,
      total: history.length,
    });
  } catch (error) {
    logger.error('Failed to get transfer history', error);
    res.status(500).json({ success: false, error: 'Failed to get history' });
  }
});

// 設定
router.get('/settings', async (_req, res) => {
  try {
    const settings = {
      defaultStrategy: 'BALANCED',
      autoOptimize: false,
      optimizeFrequency: 'weekly',
      minTransferQuantity: 10,
      maxTransferCostPerUnit: 5,
      safetyStockDays: 14,
      targetServiceLevel: 95,
      enableAlerts: true,
      alertThresholds: {
        lowStock: 7, // days
        overstock: 60, // days
        imbalance: 30, // percentage
      },
    };

    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Failed to get settings', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// 設定更新
const updateSettingsSchema = z.object({
  defaultStrategy: z.enum(['COST_MINIMIZE', 'SPEED_MAXIMIZE', 'BALANCED', 'DEMAND_DRIVEN']).optional(),
  autoOptimize: z.boolean().optional(),
  optimizeFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  minTransferQuantity: z.number().min(1).optional(),
  maxTransferCostPerUnit: z.number().min(0).optional(),
  safetyStockDays: z.number().min(1).max(90).optional(),
  targetServiceLevel: z.number().min(80).max(100).optional(),
  enableAlerts: z.boolean().optional(),
});

router.put('/settings', async (req, res) => {
  try {
    const body = updateSettingsSchema.parse(req.body);

    logger.info('Inventory optimization settings updated', body);

    res.json({
      success: true,
      message: 'Settings updated',
      settings: body,
    });
  } catch (error) {
    logger.error('Failed to update settings', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

export { router as ebayInventoryOptimizationRouter };

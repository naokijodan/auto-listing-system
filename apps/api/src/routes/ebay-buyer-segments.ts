import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 顧客セグメント
const SEGMENTS = {
  CHAMPIONS: { code: 'CHAMPIONS', name: 'チャンピオン', description: '最近購入、高頻度、高額', color: '#10b981', rfmMin: { r: 4, f: 4, m: 4 } },
  LOYAL: { code: 'LOYAL', name: 'ロイヤル顧客', description: '高頻度購入者', color: '#3b82f6', rfmMin: { r: 3, f: 4, m: 3 } },
  POTENTIAL: { code: 'POTENTIAL', name: 'ポテンシャル', description: '最近購入、成長見込み', color: '#8b5cf6', rfmMin: { r: 4, f: 2, m: 2 } },
  NEW: { code: 'NEW', name: '新規顧客', description: '最近初めて購入', color: '#06b6d4', rfmMin: { r: 4, f: 1, m: 1 } },
  PROMISING: { code: 'PROMISING', name: '有望顧客', description: '中頻度、最近活動', color: '#f59e0b', rfmMin: { r: 3, f: 2, m: 2 } },
  NEED_ATTENTION: { code: 'NEED_ATTENTION', name: '要注意', description: '以前は活発、最近減少', color: '#f97316', rfmMin: { r: 2, f: 3, m: 3 } },
  ABOUT_TO_SLEEP: { code: 'ABOUT_TO_SLEEP', name: '休眠直前', description: 'しばらく購入なし', color: '#ef4444', rfmMin: { r: 2, f: 2, m: 2 } },
  AT_RISK: { code: 'AT_RISK', name: 'リスク顧客', description: '以前は高価値、現在低下', color: '#dc2626', rfmMin: { r: 1, f: 3, m: 3 } },
  HIBERNATING: { code: 'HIBERNATING', name: '休眠顧客', description: '長期間購入なし', color: '#6b7280', rfmMin: { r: 1, f: 1, m: 1 } },
  LOST: { code: 'LOST', name: '離脱顧客', description: '完全に離脱', color: '#374151', rfmMin: { r: 1, f: 1, m: 1 } },
} as const;

// RFMスコア計算のしきい値
const RFM_THRESHOLDS = {
  recency: [30, 60, 90, 180], // 日数
  frequency: [1, 2, 5, 10], // 購入回数
  monetary: [50, 100, 250, 500], // 総購入額（USD）
};

// ダッシュボード
router.get('/dashboard', async (_req, res) => {
  try {
    // モックデータ（実際の実装ではDBから集計）
    const stats = {
      totalBuyers: 1250,
      activeBuyers: 450,
      newBuyersThisMonth: 85,
      averageLTV: 285.50,
      averageOrderValue: 45.80,
      repeatPurchaseRate: 32.5,
      churnRate: 8.2,
    };

    // セグメント別分布
    const segmentDistribution = [
      { segment: 'CHAMPIONS', count: 125, percentage: 10, revenue: 45000, avgLTV: 450 },
      { segment: 'LOYAL', count: 180, percentage: 14.4, revenue: 38000, avgLTV: 320 },
      { segment: 'POTENTIAL', count: 220, percentage: 17.6, revenue: 28000, avgLTV: 180 },
      { segment: 'NEW', count: 150, percentage: 12, revenue: 12000, avgLTV: 80 },
      { segment: 'PROMISING', count: 175, percentage: 14, revenue: 18000, avgLTV: 150 },
      { segment: 'NEED_ATTENTION', count: 130, percentage: 10.4, revenue: 15000, avgLTV: 200 },
      { segment: 'ABOUT_TO_SLEEP', count: 100, percentage: 8, revenue: 8000, avgLTV: 120 },
      { segment: 'AT_RISK', count: 80, percentage: 6.4, revenue: 10000, avgLTV: 250 },
      { segment: 'HIBERNATING', count: 60, percentage: 4.8, revenue: 3000, avgLTV: 100 },
      { segment: 'LOST', count: 30, percentage: 2.4, revenue: 1000, avgLTV: 80 },
    ];

    // RFMスコア分布
    const rfmDistribution = {
      recency: [
        { score: 5, count: 250, label: '0-30日' },
        { score: 4, count: 200, label: '31-60日' },
        { score: 3, count: 300, label: '61-90日' },
        { score: 2, count: 280, label: '91-180日' },
        { score: 1, count: 220, label: '180日+' },
      ],
      frequency: [
        { score: 5, count: 150, label: '10+回' },
        { score: 4, count: 200, label: '5-9回' },
        { score: 3, count: 350, label: '3-4回' },
        { score: 2, count: 300, label: '2回' },
        { score: 1, count: 250, label: '1回' },
      ],
      monetary: [
        { score: 5, count: 120, label: '$500+' },
        { score: 4, count: 180, label: '$250-499' },
        { score: 3, count: 350, label: '$100-249' },
        { score: 2, count: 350, label: '$50-99' },
        { score: 1, count: 250, label: '<$50' },
      ],
    };

    // 月別トレンド
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('ja-JP', { month: 'short' }),
        newBuyers: 70 + Math.floor(Math.random() * 30),
        repeatBuyers: 100 + Math.floor(Math.random() * 50),
        churnedBuyers: 20 + Math.floor(Math.random() * 15),
      };
    });

    res.json({
      success: true,
      stats,
      segmentDistribution,
      rfmDistribution,
      monthlyTrend,
    });
  } catch (error) {
    logger.error('Failed to get buyer segments dashboard', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard' });
  }
});

// セグメント一覧
router.get('/segments', (_req, res) => {
  res.json({
    success: true,
    segments: Object.values(SEGMENTS),
  });
});

// RFMしきい値
router.get('/rfm-thresholds', (_req, res) => {
  res.json({
    success: true,
    thresholds: RFM_THRESHOLDS,
  });
});

// バイヤー一覧（セグメント別）
const getBuyersSchema = z.object({
  segment: z.string().optional(),
  sortBy: z.enum(['rfmScore', 'lastPurchase', 'totalSpent', 'orderCount']).default('rfmScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

router.get('/buyers', async (req, res) => {
  try {
    const query = getBuyersSchema.parse(req.query);

    // モックバイヤーデータ
    const mockBuyers = Array.from({ length: 100 }, (_, i) => {
      const recencyDays = Math.floor(Math.random() * 365);
      const orderCount = Math.floor(Math.random() * 15) + 1;
      const totalSpent = Math.floor(Math.random() * 800) + 50;

      const rScore = recencyDays <= 30 ? 5 : recencyDays <= 60 ? 4 : recencyDays <= 90 ? 3 : recencyDays <= 180 ? 2 : 1;
      const fScore = orderCount >= 10 ? 5 : orderCount >= 5 ? 4 : orderCount >= 3 ? 3 : orderCount >= 2 ? 2 : 1;
      const mScore = totalSpent >= 500 ? 5 : totalSpent >= 250 ? 4 : totalSpent >= 100 ? 3 : totalSpent >= 50 ? 2 : 1;
      const rfmScore = rScore + fScore + mScore;

      // セグメント決定
      let segment = 'HIBERNATING';
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) segment = 'CHAMPIONS';
      else if (fScore >= 4 && mScore >= 3) segment = 'LOYAL';
      else if (rScore >= 4 && fScore <= 2) segment = rScore === 4 && fScore === 1 ? 'NEW' : 'POTENTIAL';
      else if (rScore >= 3 && fScore >= 2) segment = 'PROMISING';
      else if (rScore <= 2 && fScore >= 3) segment = 'AT_RISK';
      else if (rScore === 2) segment = 'ABOUT_TO_SLEEP';
      else if (rScore === 1 && fScore === 1) segment = 'LOST';

      return {
        id: `buyer-${i + 1}`,
        ebayUsername: `buyer_${(1000 + i).toString(36)}`,
        email: `buyer${i + 1}@example.com`,
        country: ['US', 'UK', 'DE', 'AU', 'CA'][Math.floor(Math.random() * 5)],
        segment,
        rfm: { r: rScore, f: fScore, m: mScore, total: rfmScore },
        metrics: {
          orderCount,
          totalSpent,
          averageOrderValue: totalSpent / orderCount,
          lastPurchaseDate: new Date(Date.now() - recencyDays * 24 * 60 * 60 * 1000).toISOString(),
          firstPurchaseDate: new Date(Date.now() - (recencyDays + Math.floor(Math.random() * 365)) * 24 * 60 * 60 * 1000).toISOString(),
        },
        predictedLTV: Math.floor(totalSpent * (1 + Math.random())),
        churnProbability: Math.min(0.9, Math.max(0.1, (5 - rScore) * 0.2)),
      };
    });

    // フィルタリング
    let filtered = mockBuyers;
    if (query.segment) {
      filtered = filtered.filter(b => b.segment === query.segment);
    }

    // ソート
    filtered.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (query.sortBy) {
        case 'rfmScore':
          aVal = a.rfm.total;
          bVal = b.rfm.total;
          break;
        case 'lastPurchase':
          aVal = new Date(a.metrics.lastPurchaseDate).getTime();
          bVal = new Date(b.metrics.lastPurchaseDate).getTime();
          break;
        case 'totalSpent':
          aVal = a.metrics.totalSpent;
          bVal = b.metrics.totalSpent;
          break;
        case 'orderCount':
          aVal = a.metrics.orderCount;
          bVal = b.metrics.orderCount;
          break;
        default:
          aVal = a.rfm.total;
          bVal = b.rfm.total;
      }
      return query.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // ページネーション
    const paginated = filtered.slice(query.offset, query.offset + query.limit);

    res.json({
      success: true,
      buyers: paginated,
      total: filtered.length,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + query.limit < filtered.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get buyers', error);
    res.status(500).json({ success: false, error: 'Failed to get buyers' });
  }
});

// バイヤー詳細
router.get('/buyers/:buyerId', async (req, res) => {
  try {
    const { buyerId } = req.params;

    // モックバイヤー詳細
    const buyer = {
      id: buyerId,
      ebayUsername: 'top_buyer_001',
      email: 'topbuyer@example.com',
      country: 'US',
      segment: 'CHAMPIONS',
      rfm: { r: 5, f: 5, m: 5, total: 15 },
      metrics: {
        orderCount: 25,
        totalSpent: 1250.00,
        averageOrderValue: 50.00,
        lastPurchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        firstPurchaseDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        daysSinceFirstPurchase: 365,
        daysSinceLastPurchase: 5,
      },
      predictedLTV: 2500,
      churnProbability: 0.05,
      purchaseHistory: Array.from({ length: 10 }, (_, i) => ({
        orderId: `order-${i + 1}`,
        date: new Date(Date.now() - (i * 30 + Math.floor(Math.random() * 10)) * 24 * 60 * 60 * 1000).toISOString(),
        amount: Math.floor(Math.random() * 100) + 20,
        itemCount: Math.floor(Math.random() * 3) + 1,
      })),
      preferredCategories: [
        { category: 'Electronics', percentage: 45 },
        { category: 'Collectibles', percentage: 30 },
        { category: 'Fashion', percentage: 25 },
      ],
      engagement: {
        messageResponseRate: 95,
        averageRating: 4.8,
        feedbackCount: 20,
        returnsCount: 1,
        disputesCount: 0,
      },
    };

    res.json({ success: true, buyer });
  } catch (error) {
    logger.error('Failed to get buyer details', error);
    res.status(500).json({ success: false, error: 'Failed to get buyer details' });
  }
});

// RFM分析実行
const analyzeRfmSchema = z.object({
  period: z.enum(['30d', '90d', '180d', '365d']).default('365d'),
});

router.post('/analyze-rfm', async (req, res) => {
  try {
    const body = analyzeRfmSchema.parse(req.body);

    // 分析実行（モック）
    const analysis = {
      period: body.period,
      analyzedAt: new Date().toISOString(),
      totalBuyers: 1250,
      segments: Object.keys(SEGMENTS).map(seg => ({
        segment: seg,
        count: Math.floor(Math.random() * 200) + 50,
        avgRfmScore: (Math.random() * 5 + 5).toFixed(1),
        totalRevenue: Math.floor(Math.random() * 50000) + 10000,
        avgOrderValue: Math.floor(Math.random() * 50) + 30,
      })),
      insights: [
        { type: 'positive', message: 'チャンピオン顧客が先月比15%増加' },
        { type: 'warning', message: '休眠直前顧客が100名 - 早期介入推奨' },
        { type: 'negative', message: 'リスク顧客の解約率が上昇傾向' },
        { type: 'info', message: '新規顧客の平均初回購入額: $42.50' },
      ],
    };

    res.json({ success: true, analysis });
  } catch (error) {
    logger.error('Failed to analyze RFM', error);
    res.status(500).json({ success: false, error: 'Failed to analyze RFM' });
  }
});

// セグメント移行分析
router.get('/segment-transitions', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // セグメント間の移行（モック）
    const transitions = [
      { from: 'NEW', to: 'POTENTIAL', count: 25, percentage: 30 },
      { from: 'NEW', to: 'PROMISING', count: 15, percentage: 18 },
      { from: 'POTENTIAL', to: 'LOYAL', count: 20, percentage: 15 },
      { from: 'PROMISING', to: 'LOYAL', count: 12, percentage: 10 },
      { from: 'LOYAL', to: 'CHAMPIONS', count: 18, percentage: 12 },
      { from: 'NEED_ATTENTION', to: 'ABOUT_TO_SLEEP', count: 30, percentage: 25 },
      { from: 'ABOUT_TO_SLEEP', to: 'HIBERNATING', count: 20, percentage: 22 },
      { from: 'AT_RISK', to: 'LOST', count: 15, percentage: 20 },
      { from: 'CHAMPIONS', to: 'LOYAL', count: 8, percentage: 7 },
    ];

    // 改善率と悪化率
    const summary = {
      improved: 90, // 上位セグメントに移行した顧客数
      deteriorated: 73, // 下位セグメントに移行した顧客数
      stable: 1087, // 同じセグメントにとどまった顧客数
      improvementRate: 7.2,
      deteriorationRate: 5.8,
    };

    res.json({
      success: true,
      period,
      transitions,
      summary,
    });
  } catch (error) {
    logger.error('Failed to get segment transitions', error);
    res.status(500).json({ success: false, error: 'Failed to get segment transitions' });
  }
});

// LTV予測
const predictLtvSchema = z.object({
  buyerId: z.string(),
});

router.post('/predict-ltv', async (req, res) => {
  try {
    const body = predictLtvSchema.parse(req.body);

    // LTV予測（モック）
    const prediction = {
      buyerId: body.buyerId,
      currentLTV: 450.00,
      predictedLTV: {
        '3months': 520.00,
        '6months': 680.00,
        '12months': 950.00,
      },
      confidence: 0.85,
      factors: [
        { factor: '購入頻度', impact: 'positive', weight: 0.35 },
        { factor: '平均注文額', impact: 'positive', weight: 0.30 },
        { factor: '顧客年齢（日数）', impact: 'positive', weight: 0.20 },
        { factor: '直近の活動', impact: 'positive', weight: 0.15 },
      ],
      recommendations: [
        'クロスセル商品の推奨を強化',
        'VIP特典の提供を検討',
        'パーソナライズメールの送信',
      ],
    };

    res.json({ success: true, prediction });
  } catch (error) {
    logger.error('Failed to predict LTV', error);
    res.status(500).json({ success: false, error: 'Failed to predict LTV' });
  }
});

// 解約リスク分析
router.get('/churn-risk', async (req, res) => {
  try {
    const { threshold = '0.5' } = req.query;
    const thresholdValue = parseFloat(threshold as string);

    // 高リスク顧客（モック）
    const atRiskBuyers = Array.from({ length: 20 }, (_, i) => ({
      id: `buyer-risk-${i + 1}`,
      ebayUsername: `risk_buyer_${i + 1}`,
      segment: ['AT_RISK', 'ABOUT_TO_SLEEP', 'NEED_ATTENTION'][Math.floor(Math.random() * 3)],
      churnProbability: 0.5 + Math.random() * 0.4,
      lastPurchaseDays: 60 + Math.floor(Math.random() * 120),
      totalSpent: Math.floor(Math.random() * 500) + 100,
      riskFactors: [
        '最終購入から60日以上経過',
        '購入頻度の低下',
        '閲覧回数の減少',
      ].slice(0, Math.floor(Math.random() * 3) + 1),
      recommendedActions: [
        'リエンゲージメントメール送信',
        '限定クーポン提供',
        'パーソナライズ商品推奨',
      ],
    })).filter(b => b.churnProbability >= thresholdValue);

    const summary = {
      totalAtRisk: atRiskBuyers.length,
      potentialRevenueLoss: atRiskBuyers.reduce((sum, b) => sum + b.totalSpent * 0.5, 0),
      avgChurnProbability: atRiskBuyers.reduce((sum, b) => sum + b.churnProbability, 0) / atRiskBuyers.length,
    };

    res.json({
      success: true,
      atRiskBuyers,
      summary,
      threshold: thresholdValue,
    });
  } catch (error) {
    logger.error('Failed to get churn risk', error);
    res.status(500).json({ success: false, error: 'Failed to get churn risk' });
  }
});

// AI顧客インサイト
const aiInsightsSchema = z.object({
  segment: z.string().optional(),
  question: z.string().optional(),
});

router.post('/ai-insights', async (req, res) => {
  try {
    const body = aiInsightsSchema.parse(req.body);

    const prompt = `
あなたはEコマースの顧客分析専門家です。
${body.segment ? `「${SEGMENTS[body.segment as keyof typeof SEGMENTS]?.name || body.segment}」セグメントについて` : '全顧客セグメントについて'}分析し、アクショナブルなインサイトを提供してください。

${body.question ? `特に以下の質問に答えてください: ${body.question}` : ''}

以下の形式でJSONを返してください:
{
  "insights": [
    {
      "title": "インサイトのタイトル",
      "description": "詳細な説明",
      "impact": "high" | "medium" | "low",
      "actionItems": ["アクション1", "アクション2"]
    }
  ],
  "keyMetrics": [
    { "metric": "指標名", "value": "値", "trend": "up" | "down" | "stable" }
  ],
  "recommendations": ["推奨アクション1", "推奨アクション2", "推奨アクション3"]
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
        insights: [],
        keyMetrics: [],
        recommendations: [],
      };
    }

    res.json({
      success: true,
      segment: body.segment,
      ...result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate AI insights', error);
    res.status(500).json({ success: false, error: 'Failed to generate AI insights' });
  }
});

// キャンペーン提案
router.get('/campaign-suggestions', async (req, res) => {
  try {
    const { segment } = req.query;

    const campaigns = [
      {
        id: 'camp-1',
        name: 'VIP感謝キャンペーン',
        targetSegment: 'CHAMPIONS',
        description: 'チャンピオン顧客への特別割引',
        discount: 20,
        estimatedReach: 125,
        estimatedRevenue: 8500,
        priority: 'high',
      },
      {
        id: 'camp-2',
        name: 'リエンゲージメントキャンペーン',
        targetSegment: 'ABOUT_TO_SLEEP',
        description: '休眠直前顧客の呼び戻し',
        discount: 15,
        estimatedReach: 100,
        estimatedRevenue: 3500,
        priority: 'high',
      },
      {
        id: 'camp-3',
        name: '新規顧客育成キャンペーン',
        targetSegment: 'NEW',
        description: '2回目購入促進',
        discount: 10,
        estimatedReach: 150,
        estimatedRevenue: 4500,
        priority: 'medium',
      },
      {
        id: 'camp-4',
        name: 'ウィンバックキャンペーン',
        targetSegment: 'AT_RISK',
        description: 'リスク顧客の回復',
        discount: 25,
        estimatedReach: 80,
        estimatedRevenue: 5000,
        priority: 'medium',
      },
      {
        id: 'camp-5',
        name: 'ロイヤルティ報酬キャンペーン',
        targetSegment: 'LOYAL',
        description: 'ロイヤル顧客への報酬',
        discount: 15,
        estimatedReach: 180,
        estimatedRevenue: 7200,
        priority: 'medium',
      },
    ];

    const filtered = segment
      ? campaigns.filter(c => c.targetSegment === segment)
      : campaigns;

    res.json({
      success: true,
      campaigns: filtered,
    });
  } catch (error) {
    logger.error('Failed to get campaign suggestions', error);
    res.status(500).json({ success: false, error: 'Failed to get campaign suggestions' });
  }
});

// 設定
router.get('/settings', async (_req, res) => {
  try {
    const settings = {
      rfmThresholds: RFM_THRESHOLDS,
      analysisFrequency: 'daily',
      churnThreshold: 0.6,
      enableAutoSegmentation: true,
      enableChurnPrediction: true,
      enableLtvPrediction: true,
      notifyOnHighRisk: true,
      highRiskThreshold: 0.7,
    };

    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Failed to get settings', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// 設定更新
const updateSettingsSchema = z.object({
  rfmThresholds: z.object({
    recency: z.array(z.number()).length(4).optional(),
    frequency: z.array(z.number()).length(4).optional(),
    monetary: z.array(z.number()).length(4).optional(),
  }).optional(),
  analysisFrequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
  churnThreshold: z.number().min(0).max(1).optional(),
  enableAutoSegmentation: z.boolean().optional(),
  enableChurnPrediction: z.boolean().optional(),
  enableLtvPrediction: z.boolean().optional(),
  notifyOnHighRisk: z.boolean().optional(),
  highRiskThreshold: z.number().min(0).max(1).optional(),
});

router.put('/settings', async (req, res) => {
  try {
    const body = updateSettingsSchema.parse(req.body);

    logger.info('Buyer segments settings updated', body);

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

export { router as ebayBuyerSegmentsRouter };

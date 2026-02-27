// @ts-nocheck
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ライフサイクルステージ
const LIFECYCLE_STAGES = {
  PROSPECT: { code: 'PROSPECT', name: '見込み客', description: '閲覧のみ、未購入', color: '#94a3b8', order: 1 },
  FIRST_TIME: { code: 'FIRST_TIME', name: '初回購入', description: '初めての購入', color: '#06b6d4', order: 2 },
  ACTIVE: { code: 'ACTIVE', name: 'アクティブ', description: '定期的に購入', color: '#10b981', order: 3 },
  AT_RISK: { code: 'AT_RISK', name: 'リスク', description: '購入頻度低下', color: '#f59e0b', order: 4 },
  LAPSED: { code: 'LAPSED', name: '休眠', description: '長期間購入なし', color: '#ef4444', order: 5 },
  REACTIVATED: { code: 'REACTIVATED', name: '復帰', description: '休眠から復帰', color: '#8b5cf6', order: 6 },
  LOYAL: { code: 'LOYAL', name: 'ロイヤル', description: '高頻度・高額購入', color: '#ec4899', order: 7 },
  ADVOCATE: { code: 'ADVOCATE', name: 'アドボケイト', description: '推奨・レビュー投稿', color: '#f97316', order: 8 },
} as const;

// エンゲージメントアクション
const ENGAGEMENT_ACTIONS = {
  WELCOME_EMAIL: { code: 'WELCOME_EMAIL', name: 'ウェルカムメール', stage: ['FIRST_TIME'] },
  PRODUCT_RECOMMENDATION: { code: 'PRODUCT_RECOMMENDATION', name: '商品推奨', stage: ['ACTIVE', 'LOYAL'] },
  DISCOUNT_OFFER: { code: 'DISCOUNT_OFFER', name: '割引オファー', stage: ['AT_RISK', 'LAPSED'] },
  FEEDBACK_REQUEST: { code: 'FEEDBACK_REQUEST', name: 'フィードバック依頼', stage: ['ACTIVE', 'LOYAL'] },
  LOYALTY_REWARD: { code: 'LOYALTY_REWARD', name: 'ロイヤルティ報酬', stage: ['LOYAL', 'ADVOCATE'] },
  WINBACK_CAMPAIGN: { code: 'WINBACK_CAMPAIGN', name: 'ウィンバック', stage: ['LAPSED'] },
  REFERRAL_PROGRAM: { code: 'REFERRAL_PROGRAM', name: '紹介プログラム', stage: ['ADVOCATE'] },
  ANNIVERSARY_OFFER: { code: 'ANNIVERSARY_OFFER', name: '記念日オファー', stage: ['ACTIVE', 'LOYAL'] },
} as const;

// ダッシュボード
router.get('/dashboard', async (_req, res) => {
  try {
    // ライフサイクル統計（モック）
    const stats = {
      totalCustomers: 2500,
      averageLTV: 285,
      averageLifespan: 18, // months
      conversionRate: 3.2,
      retentionRate: 68,
      churnRate: 8.5,
      reactivationRate: 12,
    };

    // ステージ別分布
    const stageDistribution = [
      { stage: 'PROSPECT', count: 800, percentage: 32, avgValue: 0 },
      { stage: 'FIRST_TIME', count: 350, percentage: 14, avgValue: 45 },
      { stage: 'ACTIVE', count: 620, percentage: 24.8, avgValue: 180 },
      { stage: 'AT_RISK', count: 280, percentage: 11.2, avgValue: 220 },
      { stage: 'LAPSED', count: 200, percentage: 8, avgValue: 150 },
      { stage: 'REACTIVATED', count: 80, percentage: 3.2, avgValue: 120 },
      { stage: 'LOYAL', count: 120, percentage: 4.8, avgValue: 450 },
      { stage: 'ADVOCATE', count: 50, percentage: 2, avgValue: 680 },
    ];

    // ライフサイクルファネル
    const funnel = {
      prospects: 800,
      firstPurchase: 350,
      repeatPurchase: 620,
      loyal: 170,
      advocate: 50,
      conversionRates: {
        prospectToFirst: 43.8,
        firstToRepeat: 177.1,
        repeatToLoyal: 27.4,
        loyalToAdvocate: 29.4,
      },
    };

    // 月別トレンド
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleDateString('ja-JP', { month: 'short' }),
        newCustomers: 80 + Math.floor(Math.random() * 40),
        reactivated: 15 + Math.floor(Math.random() * 15),
        churned: 20 + Math.floor(Math.random() * 10),
        netGrowth: 50 + Math.floor(Math.random() * 30),
      };
    });

    // LTVコホート分析
    const cohortAnalysis = [
      { cohort: '2025 Q1', customers: 200, month1: 100, month3: 65, month6: 45, month12: 30, ltv: 220 },
      { cohort: '2025 Q2', customers: 250, month1: 100, month3: 70, month6: 50, month12: 35, ltv: 280 },
      { cohort: '2025 Q3', customers: 280, month1: 100, month3: 72, month6: 52, month12: null, ltv: 310 },
      { cohort: '2025 Q4', customers: 320, month1: 100, month3: 75, month6: null, month12: null, ltv: 180 },
      { cohort: '2026 Q1', customers: 350, month1: 100, month3: null, month6: null, month12: null, ltv: 85 },
    ];

    res.json({
      success: true,
      stats,
      stageDistribution,
      funnel,
      monthlyTrend,
      cohortAnalysis,
    });
  } catch (error) {
    logger.error('Failed to get customer lifecycle dashboard', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard' });
  }
});

// ステージ一覧
router.get('/stages', (_req, res) => {
  res.json({
    success: true,
    stages: Object.values(LIFECYCLE_STAGES).sort((a, b) => a.order - b.order),
  });
});

// アクション一覧
router.get('/actions', (_req, res) => {
  res.json({
    success: true,
    actions: Object.values(ENGAGEMENT_ACTIONS),
  });
});

// 顧客ライフサイクル詳細
router.get('/customers', async (req, res) => {
  try {
    const { stage, sortBy = 'ltv', limit = '50', offset = '0' } = req.query;

    // モック顧客データ
    const allCustomers = Array.from({ length: 200 }, (_, i) => {
      const stages = Object.keys(LIFECYCLE_STAGES);
      const randomStage = stages[Math.floor(Math.random() * stages.length)];
      const daysSinceFirst = Math.floor(Math.random() * 730) + 30;
      const daysSinceLast = Math.floor(Math.random() * 180);
      const orderCount = Math.floor(Math.random() * 20) + 1;
      const totalSpent = Math.floor(Math.random() * 1000) + 50;

      return {
        id: `customer-${i + 1}`,
        ebayUsername: `buyer_${(1000 + i).toString(36)}`,
        email: `customer${i + 1}@example.com`,
        stage: randomStage,
        metrics: {
          ltv: totalSpent * (1 + Math.random() * 0.5),
          orderCount,
          totalSpent,
          avgOrderValue: totalSpent / orderCount,
          daysSinceFirstPurchase: daysSinceFirst,
          daysSinceLastPurchase: daysSinceLast,
          lifespanMonths: Math.floor(daysSinceFirst / 30),
        },
        engagement: {
          emailOpenRate: Math.floor(Math.random() * 60) + 20,
          clickRate: Math.floor(Math.random() * 30) + 5,
          feedbackScore: (Math.random() * 2 + 3).toFixed(1),
        },
        nextAction: Object.values(ENGAGEMENT_ACTIONS).find(a =>
          a.stage.includes(randomStage as any)
        )?.code || null,
      };
    });

    // フィルタリング
    let filtered = allCustomers;
    if (stage) {
      filtered = filtered.filter(c => c.stage === stage);
    }

    // ソート
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'ltv':
          return b.metrics.ltv - a.metrics.ltv;
        case 'orderCount':
          return b.metrics.orderCount - a.metrics.orderCount;
        case 'recent':
          return a.metrics.daysSinceLast - b.metrics.daysSinceLast;
        default:
          return b.metrics.ltv - a.metrics.ltv;
      }
    });

    // ページネーション
    const paginated = filtered.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      customers: paginated,
      total: filtered.length,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + parseInt(limit as string) < filtered.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get customers', error);
    res.status(500).json({ success: false, error: 'Failed to get customers' });
  }
});

// 顧客詳細
router.get('/customers/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // モック顧客詳細
    const customer = {
      id: customerId,
      ebayUsername: 'top_customer_001',
      email: 'topcustomer@example.com',
      stage: 'LOYAL',
      joinedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      metrics: {
        ltv: 1250,
        predictedLtv: 1800,
        orderCount: 28,
        totalSpent: 980,
        avgOrderValue: 35,
        daysSinceFirstPurchase: 365,
        daysSinceLastPurchase: 12,
        lifespanMonths: 12,
        purchaseFrequency: 2.3, // per month
      },
      stageHistory: [
        { stage: 'FIRST_TIME', date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() },
        { stage: 'ACTIVE', date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString() },
        { stage: 'LOYAL', date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() },
      ],
      engagement: {
        emailOpenRate: 72,
        clickRate: 28,
        feedbackScore: 4.8,
        reviewsGiven: 8,
        referralsMade: 2,
      },
      recentOrders: Array.from({ length: 5 }, (_, i) => ({
        orderId: `order-${i + 1}`,
        date: new Date(Date.now() - i * 15 * 24 * 60 * 60 * 1000).toISOString(),
        amount: Math.floor(Math.random() * 80) + 20,
        itemCount: Math.floor(Math.random() * 3) + 1,
      })),
      preferences: {
        topCategories: ['Electronics', 'Collectibles', 'Fashion'],
        avgTimeToRepurchase: 14, // days
        preferredPayment: 'PayPal',
        preferredShipping: 'Express',
      },
      recommendedActions: [
        { action: 'LOYALTY_REWARD', reason: '高LTV顧客への報酬' },
        { action: 'REFERRAL_PROGRAM', reason: '紹介プログラムへの招待' },
        { action: 'PRODUCT_RECOMMENDATION', reason: 'パーソナライズ推奨' },
      ],
    };

    res.json({ success: true, customer });
  } catch (error) {
    logger.error('Failed to get customer details', error);
    res.status(500).json({ success: false, error: 'Failed to get customer details' });
  }
});

// ステージ移行分析
router.get('/transitions', async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // ステージ間の移行（モック）
    const transitions = [
      { from: 'PROSPECT', to: 'FIRST_TIME', count: 85, rate: 10.6 },
      { from: 'FIRST_TIME', to: 'ACTIVE', count: 120, rate: 34.3 },
      { from: 'ACTIVE', to: 'LOYAL', count: 45, rate: 7.3 },
      { from: 'ACTIVE', to: 'AT_RISK', count: 60, rate: 9.7 },
      { from: 'AT_RISK', to: 'LAPSED', count: 35, rate: 12.5 },
      { from: 'AT_RISK', to: 'ACTIVE', count: 25, rate: 8.9 },
      { from: 'LAPSED', to: 'REACTIVATED', count: 20, rate: 10.0 },
      { from: 'REACTIVATED', to: 'ACTIVE', count: 15, rate: 18.8 },
      { from: 'LOYAL', to: 'ADVOCATE', count: 12, rate: 10.0 },
      { from: 'LOYAL', to: 'AT_RISK', count: 8, rate: 6.7 },
    ];

    // 移行マトリックス
    const transitionMatrix: Record<string, Record<string, number>> = {};
    Object.keys(LIFECYCLE_STAGES).forEach(from => {
      transitionMatrix[from] = {};
      Object.keys(LIFECYCLE_STAGES).forEach(to => {
        const transition = transitions.find(t => t.from === from && t.to === to);
        transitionMatrix[from][to] = transition?.rate || 0;
      });
    });

    res.json({
      success: true,
      period,
      transitions,
      transitionMatrix,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get transitions', error);
    res.status(500).json({ success: false, error: 'Failed to get transitions' });
  }
});

// LTV予測
const predictLtvSchema = z.object({
  customerId: z.string(),
  horizon: z.number().min(1).max(24).default(12), // months
});

router.post('/predict-ltv', async (req, res) => {
  try {
    const body = predictLtvSchema.parse(req.body);

    // LTV予測（モック）
    const prediction = {
      customerId: body.customerId,
      currentLtv: 450,
      predictions: Array.from({ length: body.horizon }, (_, i) => ({
        month: i + 1,
        predictedLtv: 450 + (i + 1) * 35 + Math.floor(Math.random() * 20),
        confidence: Math.max(0.5, 0.95 - i * 0.03),
      })),
      factors: [
        { factor: '購入頻度', impact: 'positive', contribution: 35 },
        { factor: '平均注文額', impact: 'positive', contribution: 28 },
        { factor: '顧客年齢', impact: 'positive', contribution: 20 },
        { factor: 'エンゲージメント', impact: 'positive', contribution: 17 },
      ],
      riskFactors: [
        { factor: '競合への流出', probability: 0.15 },
        { factor: '購入頻度低下', probability: 0.20 },
      ],
    };

    res.json({ success: true, prediction });
  } catch (error) {
    logger.error('Failed to predict LTV', error);
    res.status(500).json({ success: false, error: 'Failed to predict LTV' });
  }
});

// エンゲージメントキャンペーン生成
const generateCampaignSchema = z.object({
  targetStage: z.string(),
  action: z.string(),
  budget: z.number().min(0).optional(),
});

router.post('/generate-campaign', async (req, res) => {
  try {
    const body = generateCampaignSchema.parse(req.body);

    const stage = LIFECYCLE_STAGES[body.targetStage as keyof typeof LIFECYCLE_STAGES];
    const action = ENGAGEMENT_ACTIONS[body.action as keyof typeof ENGAGEMENT_ACTIONS];

    if (!stage || !action) {
      return res.status(400).json({ success: false, error: 'Invalid stage or action' });
    }

    // GPT-4oでキャンペーン内容を生成
    const prompt = `
あなたはEコマースのマーケティング専門家です。
以下の条件でエンゲージメントキャンペーンを作成してください。

ターゲットステージ: ${stage.name}（${stage.description}）
アクションタイプ: ${action.name}
${body.budget ? `予算: $${body.budget}` : ''}

以下の形式でJSONを返してください:
{
  "campaignName": "キャンペーン名",
  "subject": "メール件名（英語）",
  "headline": "見出し（英語）",
  "body": "本文（英語、2-3文）",
  "cta": "CTAボタンテキスト（英語）",
  "incentive": "インセンティブ内容",
  "timing": "最適な送信タイミング",
  "expectedResults": {
    "openRate": 予想開封率,
    "clickRate": 予想クリック率,
    "conversionRate": 予想コンバージョン率
  }
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content || '{}';
    let campaign;
    try {
      campaign = JSON.parse(content);
    } catch {
      campaign = {
        campaignName: `${action.name} Campaign`,
        subject: 'Special offer for you',
        headline: 'We miss you!',
        body: 'Come back and enjoy exclusive deals.',
        cta: 'Shop Now',
        incentive: '10% off your next order',
        timing: 'Tuesday morning',
        expectedResults: { openRate: 25, clickRate: 5, conversionRate: 2 },
      };
    }

    res.json({
      success: true,
      targetStage: body.targetStage,
      action: body.action,
      campaign,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to generate campaign', error);
    res.status(500).json({ success: false, error: 'Failed to generate campaign' });
  }
});

// 自動化ルール
router.get('/automation-rules', async (_req, res) => {
  try {
    // 自動化ルール（モック）
    const rules = [
      {
        id: 'rule-1',
        name: 'ウェルカムシリーズ',
        trigger: 'STAGE_CHANGE',
        condition: { fromStage: null, toStage: 'FIRST_TIME' },
        action: 'WELCOME_EMAIL',
        delay: 0,
        isActive: true,
      },
      {
        id: 'rule-2',
        name: 'リスク顧客フォロー',
        trigger: 'STAGE_CHANGE',
        condition: { fromStage: 'ACTIVE', toStage: 'AT_RISK' },
        action: 'DISCOUNT_OFFER',
        delay: 24, // hours
        isActive: true,
      },
      {
        id: 'rule-3',
        name: 'ウィンバックキャンペーン',
        trigger: 'STAGE_CHANGE',
        condition: { fromStage: 'AT_RISK', toStage: 'LAPSED' },
        action: 'WINBACK_CAMPAIGN',
        delay: 48,
        isActive: true,
      },
      {
        id: 'rule-4',
        name: 'ロイヤルティ報酬',
        trigger: 'STAGE_CHANGE',
        condition: { fromStage: 'ACTIVE', toStage: 'LOYAL' },
        action: 'LOYALTY_REWARD',
        delay: 0,
        isActive: true,
      },
      {
        id: 'rule-5',
        name: '紹介プログラム招待',
        trigger: 'STAGE_CHANGE',
        condition: { fromStage: 'LOYAL', toStage: 'ADVOCATE' },
        action: 'REFERRAL_PROGRAM',
        delay: 72,
        isActive: false,
      },
    ];

    res.json({ success: true, rules });
  } catch (error) {
    logger.error('Failed to get automation rules', error);
    res.status(500).json({ success: false, error: 'Failed to get rules' });
  }
});

// 自動化ルール作成/更新
const automationRuleSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  trigger: z.enum(['STAGE_CHANGE', 'TIME_BASED', 'EVENT']),
  condition: z.object({
    fromStage: z.string().nullable(),
    toStage: z.string(),
  }),
  action: z.string(),
  delay: z.number().min(0),
  isActive: z.boolean(),
});

router.post('/automation-rules', async (req, res) => {
  try {
    const body = automationRuleSchema.parse(req.body);

    // ルールを保存（実際にはDBに保存）
    const rule = {
      id: body.id || `rule-${Date.now()}`,
      ...body,
      createdAt: new Date().toISOString(),
    };

    logger.info('Automation rule created/updated', rule);

    res.json({ success: true, rule });
  } catch (error) {
    logger.error('Failed to save automation rule', error);
    res.status(500).json({ success: false, error: 'Failed to save rule' });
  }
});

// 健全性レポート
router.get('/health-report', async (_req, res) => {
  try {
    const report = {
      overallScore: 78,
      metrics: {
        acquisitionHealth: { score: 82, trend: 'up', description: '新規獲得は好調' },
        retentionHealth: { score: 75, trend: 'stable', description: 'リテンションは安定' },
        engagementHealth: { score: 70, trend: 'down', description: 'エンゲージメント改善が必要' },
        monetizationHealth: { score: 85, trend: 'up', description: 'LTVは成長中' },
      },
      alerts: [
        { type: 'warning', message: 'AT_RISKステージの顧客が増加傾向（+15%）' },
        { type: 'info', message: 'LOYAL顧客のADVOCATE転換率が改善' },
        { type: 'critical', message: 'FIRST_TIME→ACTIVE転換率が低下（-8%）' },
      ],
      recommendations: [
        '初回購入者へのフォローアップ強化を推奨',
        'AT_RISK顧客への早期介入プログラムを実施',
        'ロイヤル顧客への紹介プログラム拡大を検討',
      ],
      generatedAt: new Date().toISOString(),
    };

    res.json({ success: true, report });
  } catch (error) {
    logger.error('Failed to get health report', error);
    res.status(500).json({ success: false, error: 'Failed to get report' });
  }
});

// 設定
router.get('/settings', async (_req, res) => {
  try {
    const settings = {
      stageDefinitions: {
        firstTimeDays: 30,
        activeDays: 90,
        atRiskDays: 120,
        lapsedDays: 180,
        loyalMinOrders: 5,
        loyalMinSpend: 500,
        advocateMinReviews: 3,
      },
      automationEnabled: true,
      emailNotifications: true,
      weeklyReport: true,
      ltvModel: 'predictive',
    };

    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Failed to get settings', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
});

// 設定更新
const updateSettingsSchema = z.object({
  stageDefinitions: z.object({
    firstTimeDays: z.number().min(1).optional(),
    activeDays: z.number().min(1).optional(),
    atRiskDays: z.number().min(1).optional(),
    lapsedDays: z.number().min(1).optional(),
    loyalMinOrders: z.number().min(1).optional(),
    loyalMinSpend: z.number().min(0).optional(),
    advocateMinReviews: z.number().min(1).optional(),
  }).optional(),
  automationEnabled: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  weeklyReport: z.boolean().optional(),
  ltvModel: z.enum(['simple', 'predictive', 'ml']).optional(),
});

router.put('/settings', async (req, res) => {
  try {
    const body = updateSettingsSchema.parse(req.body);

    logger.info('Customer lifecycle settings updated', body);

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

export { router as ebayCustomerLifecycleRouter };

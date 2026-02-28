
/**
 * eBayメッセージ自動応答API
 * Phase 125: AI自動応答、ルールベース応答、応答分析
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// トリガータイプ
const TRIGGER_TYPES = [
  { type: 'NEW_MESSAGE', name: '新規メッセージ受信', description: 'バイヤーからの新規メッセージ' },
  { type: 'ORDER_INQUIRY', name: '注文に関する問い合わせ', description: '注文状況・追跡の問い合わせ' },
  { type: 'SHIPPING_INQUIRY', name: '配送に関する問い合わせ', description: '配送日・配送方法の質問' },
  { type: 'RETURN_REQUEST', name: '返品リクエスト', description: '返品・返金の要求' },
  { type: 'PRODUCT_QUESTION', name: '商品に関する質問', description: '商品詳細・仕様の質問' },
  { type: 'OFFER_RECEIVED', name: 'オファー受信', description: '価格交渉オファー' },
  { type: 'NEGATIVE_FEEDBACK', name: 'ネガティブフィードバック', description: '低評価・クレーム' },
  { type: 'OUT_OF_OFFICE', name: '営業時間外', description: '営業時間外の自動応答' },
];

// 応答モード
const RESPONSE_MODES = [
  { mode: 'TEMPLATE', name: 'テンプレート', description: '定型文を使用' },
  { mode: 'AI_GENERATED', name: 'AI生成', description: 'AIが文脈に応じた返信を生成' },
  { mode: 'HYBRID', name: 'ハイブリッド', description: 'テンプレート＋AI補完' },
];

// 優先度
const PRIORITIES = [
  { priority: 'LOW', name: '低', responseTime: '24時間以内' },
  { priority: 'MEDIUM', name: '中', responseTime: '4時間以内' },
  { priority: 'HIGH', name: '高', responseTime: '1時間以内' },
  { priority: 'URGENT', name: '緊急', responseTime: '15分以内' },
];

// 自動応答テンプレート
const DEFAULT_TEMPLATES = [
  {
    id: 'shipping_status',
    name: '配送状況確認',
    trigger: 'SHIPPING_INQUIRY',
    subject: 'Re: Shipping Status - Order #{orderId}',
    body: `Dear {buyerName},

Thank you for contacting us regarding your order #{orderId}.

Your order was shipped on {shippedDate} via {shippingCarrier}.
Tracking Number: {trackingNumber}

You can track your package here: {trackingUrl}

Estimated delivery: {estimatedDelivery}

If you have any other questions, please don't hesitate to ask.

Best regards,
{storeName}`,
    variables: ['buyerName', 'orderId', 'shippedDate', 'shippingCarrier', 'trackingNumber', 'trackingUrl', 'estimatedDelivery', 'storeName'],
  },
  {
    id: 'order_confirmation',
    name: '注文確認',
    trigger: 'ORDER_INQUIRY',
    subject: 'Re: Order Status - #{orderId}',
    body: `Dear {buyerName},

Thank you for your inquiry about order #{orderId}.

Order Status: {orderStatus}
Items: {itemList}
Total: {orderTotal}

{additionalInfo}

Please let us know if you have any other questions.

Best regards,
{storeName}`,
    variables: ['buyerName', 'orderId', 'orderStatus', 'itemList', 'orderTotal', 'additionalInfo', 'storeName'],
  },
  {
    id: 'return_instructions',
    name: '返品手順',
    trigger: 'RETURN_REQUEST',
    subject: 'Re: Return Request - Order #{orderId}',
    body: `Dear {buyerName},

Thank you for reaching out about returning your order #{orderId}.

We understand you would like to return {itemTitle}.

Please follow these steps:
1. Pack the item securely in its original packaging
2. Include the original receipt or packing slip
3. Ship to: {returnAddress}

Once we receive the item, we will process your refund within 3-5 business days.

If you have any questions, please let us know.

Best regards,
{storeName}`,
    variables: ['buyerName', 'orderId', 'itemTitle', 'returnAddress', 'storeName'],
  },
  {
    id: 'product_info',
    name: '商品情報',
    trigger: 'PRODUCT_QUESTION',
    subject: 'Re: Product Question - {itemTitle}',
    body: `Dear {buyerName},

Thank you for your interest in {itemTitle}.

{aiGeneratedAnswer}

If you have any other questions, please feel free to ask.

Best regards,
{storeName}`,
    variables: ['buyerName', 'itemTitle', 'aiGeneratedAnswer', 'storeName'],
  },
  {
    id: 'out_of_office',
    name: '営業時間外',
    trigger: 'OUT_OF_OFFICE',
    subject: 'Re: {originalSubject}',
    body: `Dear {buyerName},

Thank you for your message.

Our office is currently closed. Our business hours are:
Monday - Friday: 9:00 AM - 6:00 PM (JST)
Saturday - Sunday: Closed

We will respond to your inquiry within 24 hours on the next business day.

Thank you for your patience.

Best regards,
{storeName}`,
    variables: ['buyerName', 'originalSubject', 'storeName'],
  },
  {
    id: 'offer_response',
    name: 'オファー応答',
    trigger: 'OFFER_RECEIVED',
    subject: 'Re: Your Offer on {itemTitle}',
    body: `Dear {buyerName},

Thank you for your offer of {offerAmount} on {itemTitle}.

{offerResponse}

{counterOfferText}

Best regards,
{storeName}`,
    variables: ['buyerName', 'offerAmount', 'itemTitle', 'offerResponse', 'counterOfferText', 'storeName'],
  },
];

// ダッシュボード
router.get('/dashboard', async (req, res) => {
  try {
    // 自動応答ルール数（設定から取得、ここではサンプル）
    const rules = await getAutoResponseRules();
    const enabledRules = rules.filter(r => r.enabled);

    // 過去7日間のメッセージ統計
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const messages = await prisma.customerMessage.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sentAt: true,
        marketplaceResponse: true,
      },
    });

    // 自動応答されたメッセージ
    const autoResponded = messages.filter((m: any) => (m.marketplaceResponse as any)?.autoResponded);
    const manualResponded = messages.filter((m: any) => !(m.marketplaceResponse as any)?.autoResponded && m.status === 'SENT');

    // 平均応答時間
    const responseTimes = messages
      .filter(m => m.sentAt && m.createdAt)
      .map(m => (new Date(m.sentAt!).getTime() - new Date(m.createdAt).getTime()) / 1000 / 60);
    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // トリガー別統計
    const triggerStats = TRIGGER_TYPES.map(t => ({
      ...t,
      count: autoResponded.filter((m: any) => m.metadata?.trigger === t.type).length,
    }));

    res.json({
      stats: {
        totalRules: rules.length,
        enabledRules: enabledRules.length,
        messagesLast7Days: messages.length,
        autoRespondedCount: autoResponded.length,
        manualRespondedCount: manualResponded.length,
        autoResponseRate: messages.length > 0
          ? ((autoResponded.length / messages.length) * 100).toFixed(1)
          : '0',
        avgResponseTimeMinutes: avgResponseTime.toFixed(1),
      },
      triggerStats: triggerStats.filter(t => t.count > 0),
      rules: enabledRules.slice(0, 5),
      templates: DEFAULT_TEMPLATES.slice(0, 5),
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// トリガータイプ一覧
router.get('/triggers', async (req, res) => {
  res.json({ triggers: TRIGGER_TYPES });
});

// 応答モード一覧
router.get('/modes', async (req, res) => {
  res.json({ modes: RESPONSE_MODES });
});

// 優先度一覧
router.get('/priorities', async (req, res) => {
  res.json({ priorities: PRIORITIES });
});

// テンプレート一覧
router.get('/templates', async (req, res) => {
  res.json({ templates: DEFAULT_TEMPLATES });
});

// 自動応答ルール作成スキーマ
const createRuleSchema = z.object({
  name: z.string().min(1),
  trigger: z.string(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['contains', 'equals', 'startsWith', 'endsWith', 'regex']),
    value: z.string(),
  })).optional(),
  responseMode: z.enum(['TEMPLATE', 'AI_GENERATED', 'HYBRID']),
  templateId: z.string().optional(),
  aiPrompt: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  enabled: z.boolean().default(true),
  schedule: z.object({
    enabled: z.boolean(),
    timezone: z.string().optional(),
    businessHours: z.object({
      start: z.string(),
      end: z.string(),
      days: z.array(z.number()),
    }).optional(),
  }).optional(),
});

// 自動応答ルール作成
router.post('/rules', async (req, res) => {
  try {
    const data = createRuleSchema.parse(req.body);

    const ruleId = `rule_${Date.now()}`;
    const rule = {
      id: ruleId,
      ...data,
      createdAt: new Date().toISOString(),
      stats: {
        triggered: 0,
        successful: 0,
        failed: 0,
      },
    };

    // 実際はDBに保存
    // ここではサンプルとして返す

    res.json({
      success: true,
      rule,
      message: '自動応答ルールを作成しました',
    });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// 自動応答ルール一覧
router.get('/rules', async (req, res) => {
  try {
    const rules = await getAutoResponseRules();
    res.json({ rules });
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

// ルール詳細取得
router.get('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const rules = await getAutoResponseRules();
    const rule = rules.find(r => r.id === ruleId);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({ rule });
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

// ルール更新
router.patch('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    // 実際はDBで更新

    res.json({
      success: true,
      message: 'ルールを更新しました',
    });
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// ルール削除
router.delete('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;

    // 実際はDBから削除

    res.json({
      success: true,
      message: 'ルールを削除しました',
    });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

// AI応答生成スキーマ
const generateResponseSchema = z.object({
  messageContent: z.string(),
  messageSubject: z.string().optional(),
  buyerName: z.string(),
  orderId: z.string().optional(),
  itemTitle: z.string().optional(),
  context: z.object({
    orderStatus: z.string().optional(),
    trackingNumber: z.string().optional(),
    previousMessages: z.array(z.string()).optional(),
  }).optional(),
  tone: z.enum(['professional', 'friendly', 'formal']).default('professional'),
  language: z.enum(['en', 'ja', 'de', 'fr', 'es']).default('en'),
});

// AI応答生成
router.post('/generate', async (req, res) => {
  try {
    const data = generateResponseSchema.parse(req.body);

    const systemPrompt = `You are a helpful customer service representative for an e-commerce store.
Your task is to respond to customer messages in a ${data.tone} tone.
Language: ${data.language === 'en' ? 'English' : data.language === 'ja' ? 'Japanese' : data.language}

Guidelines:
- Be helpful and empathetic
- Provide clear and accurate information
- Keep responses concise but complete
- Include relevant order/tracking information if available
- Never promise what you cannot deliver
- If you don't have enough information, politely ask for clarification`;

    const userPrompt = `Customer Name: ${data.buyerName}
${data.orderId ? `Order ID: ${data.orderId}` : ''}
${data.itemTitle ? `Product: ${data.itemTitle}` : ''}
${data.context?.orderStatus ? `Order Status: ${data.context.orderStatus}` : ''}
${data.context?.trackingNumber ? `Tracking: ${data.context.trackingNumber}` : ''}

Customer Message:
Subject: ${data.messageSubject || 'No subject'}
${data.messageContent}

${data.context?.previousMessages?.length ? `Previous conversation:\n${data.context.previousMessages.join('\n')}` : ''}

Please generate an appropriate response:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const generatedResponse = completion.choices[0]?.message?.content || '';

    // 応答を分析
    const analysis = analyzeResponse(data.messageContent);

    res.json({
      success: true,
      response: {
        subject: `Re: ${data.messageSubject || 'Your Inquiry'}`,
        body: generatedResponse,
      },
      analysis: {
        detectedIntent: analysis.intent,
        suggestedPriority: analysis.priority,
        confidence: analysis.confidence,
      },
      tokensUsed: completion.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error('Generate response error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// メッセージ分析スキーマ
const analyzeMessageSchema = z.object({
  messageContent: z.string(),
  messageSubject: z.string().optional(),
});

// メッセージ分析（インテント検出）
router.post('/analyze', async (req, res) => {
  try {
    const data = analyzeMessageSchema.parse(req.body);

    const analysis = analyzeResponse(data.messageContent);

    // キーワード抽出
    const keywords = extractKeywords(data.messageContent);

    res.json({
      analysis: {
        intent: analysis.intent,
        priority: analysis.priority,
        confidence: analysis.confidence,
        sentiment: analysis.sentiment,
        suggestedTrigger: analysis.trigger,
        keywords,
      },
      suggestedTemplate: DEFAULT_TEMPLATES.find(t => t.trigger === analysis.trigger),
    });
  } catch (error) {
    console.error('Analyze message error:', error);
    res.status(500).json({ error: 'Failed to analyze message' });
  }
});

// 一括自動応答テストスキーマ
const testAutoResponseSchema = z.object({
  ruleId: z.string(),
  testMessages: z.array(z.object({
    subject: z.string(),
    body: z.string(),
    buyerName: z.string(),
  })),
});

// 自動応答テスト
router.post('/test', async (req, res) => {
  try {
    const data = testAutoResponseSchema.parse(req.body);

    const rules = await getAutoResponseRules();
    const rule = rules.find(r => r.id === data.ruleId);

    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const results = [];

    for (const message of data.testMessages) {
      const wouldTrigger = checkRuleConditions(rule, message);
      let response = null;

      if (wouldTrigger && rule.responseMode !== 'AI_GENERATED') {
        const template = DEFAULT_TEMPLATES.find(t => t.id === rule.templateId);
        if (template) {
          response = {
            subject: replaceVariables(template.subject, { buyerName: message.buyerName }),
            body: replaceVariables(template.body, { buyerName: message.buyerName, storeName: 'Your Store' }),
          };
        }
      }

      results.push({
        message,
        wouldTrigger,
        response,
        matchedConditions: wouldTrigger ? rule.conditions : [],
      });
    }

    res.json({
      rule: { id: rule.id, name: rule.name },
      results,
      summary: {
        total: results.length,
        triggered: results.filter(r => r.wouldTrigger).length,
      },
    });
  } catch (error) {
    console.error('Test auto-response error:', error);
    res.status(500).json({ error: 'Failed to test auto-response' });
  }
});

// 応答統計
router.get('/stats', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period as string);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const messages = await prisma.customerMessage.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        sentAt: true,
        marketplaceResponse: true,
      },
    });

    // 日別統計
    const dailyStats: Record<string, { total: number; auto: number; manual: number }> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = { total: 0, auto: 0, manual: 0 };
    }

    messages.forEach((m: any) => {
      const dateStr = m.createdAt.toISOString().split('T')[0];
      if (dailyStats[dateStr]) {
        dailyStats[dateStr].total++;
        if (m.metadata?.autoResponded) {
          dailyStats[dateStr].auto++;
        } else if (m.status === 'SENT') {
          dailyStats[dateStr].manual++;
        }
      }
    });

    // 応答時間分布
    const responseTimes = messages
      .filter(m => m.sentAt && m.createdAt)
      .map(m => ({
        minutes: (new Date(m.sentAt!).getTime() - new Date(m.createdAt).getTime()) / 1000 / 60,
        isAuto: (m.marketplaceResponse as any)?.autoResponded || false,
      }));

    const autoResponseTimes = responseTimes.filter(r => r.isAuto);
    const manualResponseTimes = responseTimes.filter(r => !r.isAuto);

    res.json({
      period: days,
      overview: {
        totalMessages: messages.length,
        autoResponded: messages.filter((m: any) => m.metadata?.autoResponded).length,
        avgAutoResponseTime: autoResponseTimes.length > 0
          ? (autoResponseTimes.reduce((a, b) => a + b.minutes, 0) / autoResponseTimes.length).toFixed(1)
          : '0',
        avgManualResponseTime: manualResponseTimes.length > 0
          ? (manualResponseTimes.reduce((a, b) => a + b.minutes, 0) / manualResponseTimes.length).toFixed(1)
          : '0',
      },
      dailyStats: Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      responseTimeDistribution: {
        under5min: responseTimes.filter(r => r.minutes < 5).length,
        under15min: responseTimes.filter(r => r.minutes >= 5 && r.minutes < 15).length,
        under1hour: responseTimes.filter(r => r.minutes >= 15 && r.minutes < 60).length,
        under24hours: responseTimes.filter(r => r.minutes >= 60 && r.minutes < 1440).length,
        over24hours: responseTimes.filter(r => r.minutes >= 1440).length,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// 設定取得
router.get('/settings', async (req, res) => {
  // 実際はDBから取得
  res.json({
    autoResponseEnabled: true,
    defaultResponseMode: 'HYBRID',
    maxDailyAutoResponses: 100,
    businessHours: {
      enabled: true,
      timezone: 'Asia/Tokyo',
      start: '09:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5], // Mon-Fri
    },
    aiSettings: {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 500,
      defaultTone: 'professional',
      defaultLanguage: 'en',
    },
    notifications: {
      notifyOnAutoResponse: false,
      notifyOnFailure: true,
      notifyOnEscalation: true,
    },
  });
});

// 設定更新スキーマ
const updateSettingsSchema = z.object({
  autoResponseEnabled: z.boolean().optional(),
  defaultResponseMode: z.enum(['TEMPLATE', 'AI_GENERATED', 'HYBRID']).optional(),
  maxDailyAutoResponses: z.number().optional(),
  businessHours: z.object({
    enabled: z.boolean(),
    timezone: z.string(),
    start: z.string(),
    end: z.string(),
    days: z.array(z.number()),
  }).optional(),
  aiSettings: z.object({
    model: z.string(),
    temperature: z.number(),
    maxTokens: z.number(),
    defaultTone: z.string(),
    defaultLanguage: z.string(),
  }).optional(),
});

// 設定更新
router.patch('/settings', async (req, res) => {
  try {
    const data = updateSettingsSchema.parse(req.body);

    // 実際はDBに保存

    res.json({
      success: true,
      settings: data,
      message: '設定を更新しました',
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ヘルパー関数

async function getAutoResponseRules(): Promise<any[]> {
  // 実際はDBから取得
  return [
    {
      id: 'rule_1',
      name: '配送問い合わせ自動応答',
      trigger: 'SHIPPING_INQUIRY',
      conditions: [
        { field: 'body', operator: 'contains', value: 'shipping' },
        { field: 'body', operator: 'contains', value: 'tracking' },
      ],
      responseMode: 'TEMPLATE',
      templateId: 'shipping_status',
      priority: 'MEDIUM',
      enabled: true,
      stats: { triggered: 45, successful: 43, failed: 2 },
    },
    {
      id: 'rule_2',
      name: '商品質問AI応答',
      trigger: 'PRODUCT_QUESTION',
      conditions: [
        { field: 'body', operator: 'contains', value: 'product' },
      ],
      responseMode: 'AI_GENERATED',
      aiPrompt: 'Answer product questions helpfully',
      priority: 'LOW',
      enabled: true,
      stats: { triggered: 23, successful: 21, failed: 2 },
    },
    {
      id: 'rule_3',
      name: '営業時間外自動応答',
      trigger: 'OUT_OF_OFFICE',
      conditions: [],
      responseMode: 'TEMPLATE',
      templateId: 'out_of_office',
      priority: 'LOW',
      enabled: true,
      schedule: {
        enabled: true,
        businessHours: { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] },
      },
      stats: { triggered: 156, successful: 156, failed: 0 },
    },
  ];
}

function analyzeResponse(content: string): {
  intent: string;
  priority: string;
  confidence: number;
  sentiment: string;
  trigger: string;
} {
  const lowerContent = content.toLowerCase();

  // インテント検出
  let intent = 'GENERAL_INQUIRY';
  let trigger = 'NEW_MESSAGE';
  let priority = 'LOW';
  let sentiment = 'neutral';

  if (lowerContent.includes('tracking') || lowerContent.includes('shipping') || lowerContent.includes('delivery')) {
    intent = 'SHIPPING_INQUIRY';
    trigger = 'SHIPPING_INQUIRY';
    priority = 'MEDIUM';
  } else if (lowerContent.includes('return') || lowerContent.includes('refund')) {
    intent = 'RETURN_REQUEST';
    trigger = 'RETURN_REQUEST';
    priority = 'HIGH';
  } else if (lowerContent.includes('order') || lowerContent.includes('status')) {
    intent = 'ORDER_INQUIRY';
    trigger = 'ORDER_INQUIRY';
    priority = 'MEDIUM';
  } else if (lowerContent.includes('offer') || lowerContent.includes('price')) {
    intent = 'PRICE_NEGOTIATION';
    trigger = 'OFFER_RECEIVED';
    priority = 'MEDIUM';
  } else if (lowerContent.includes('product') || lowerContent.includes('item') || lowerContent.includes('size')) {
    intent = 'PRODUCT_QUESTION';
    trigger = 'PRODUCT_QUESTION';
    priority = 'LOW';
  }

  // センチメント分析（簡易版）
  const negativeWords = ['angry', 'frustrated', 'disappointed', 'terrible', 'worst', 'never', 'problem', 'issue'];
  const positiveWords = ['thank', 'great', 'excellent', 'happy', 'love', 'perfect', 'amazing'];

  const negativeCount = negativeWords.filter(w => lowerContent.includes(w)).length;
  const positiveCount = positiveWords.filter(w => lowerContent.includes(w)).length;

  if (negativeCount > positiveCount) {
    sentiment = 'negative';
    priority = 'HIGH';
  } else if (positiveCount > negativeCount) {
    sentiment = 'positive';
  }

  return {
    intent,
    priority,
    confidence: 0.85,
    sentiment,
    trigger,
  };
}

function extractKeywords(content: string): string[] {
  const words = content.toLowerCase().split(/\s+/);
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now', 'i', 'my', 'me', 'you', 'your', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'];

  const keywords = words
    .filter(w => w.length > 2 && !stopWords.includes(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)
    .slice(0, 10);

  return keywords;
}

function checkRuleConditions(rule: any, message: { subject: string; body: string }): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return true;
  }

  return rule.conditions.some((condition: any) => {
    const fieldValue = condition.field === 'subject' ? message.subject : message.body;
    const lowerFieldValue = fieldValue.toLowerCase();
    const lowerConditionValue = condition.value.toLowerCase();

    switch (condition.operator) {
      case 'contains':
        return lowerFieldValue.includes(lowerConditionValue);
      case 'equals':
        return lowerFieldValue === lowerConditionValue;
      case 'startsWith':
        return lowerFieldValue.startsWith(lowerConditionValue);
      case 'endsWith':
        return lowerFieldValue.endsWith(lowerConditionValue);
      case 'regex':
        return new RegExp(condition.value, 'i').test(fieldValue);
      default:
        return false;
    }
  });
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

export { router as ebayAutoMessagesRouter };

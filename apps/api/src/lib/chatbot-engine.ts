/**
 * AIチャットボットエンジン
 * Phase 74: 商品問い合わせ・注文確認の自動応答
 */

import { PrismaClient, ChatSessionStatus, ChatMessageRole } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// インテント定義
type ChatIntent =
  | 'ORDER_STATUS'       // 注文状況確認
  | 'TRACKING_INFO'      // 追跡情報
  | 'PRODUCT_INQUIRY'    // 商品問い合わせ
  | 'RETURN_REFUND'      // 返品・返金
  | 'SHIPPING_QUESTION'  // 発送に関する質問
  | 'GENERAL_QUESTION'   // 一般的な質問
  | 'COMPLAINT'          // 苦情
  | 'GREETING'           // 挨拶
  | 'THANK_YOU'          // お礼
  | 'UNKNOWN';           // 不明

// インテント検出結果
interface IntentDetectionResult {
  intent: ChatIntent;
  confidence: number;
  entities: {
    orderId?: string;
    productId?: string;
    trackingNumber?: string;
  };
}

// チャット応答
interface ChatResponse {
  message: string;
  messageEn?: string;
  intent: ChatIntent;
  confidence: number;
  suggestedActions?: string[];
  shouldEscalate: boolean;
  escalationReason?: string;
  referencedOrderId?: string;
  referencedProductId?: string;
}

// デフォルトのシステムプロンプト
const DEFAULT_SYSTEM_PROMPT = `You are a helpful customer support assistant for RAKUDA, a cross-border e-commerce platform that sells Japanese products internationally.

Your responsibilities:
1. Answer questions about orders, shipping, and products
2. Provide tracking information when requested
3. Help with return and refund inquiries
4. Be polite, professional, and helpful
5. If you cannot help, suggest contacting human support

Guidelines:
- Always be polite and empathetic
- Provide clear and concise answers
- If you don't have specific information, say so honestly
- For complex issues, suggest escalation to human support
- Respond in the customer's language when possible

Available information you may receive:
- Order details (ID, status, items, shipping info)
- Product information (title, description, price)
- Tracking information (carrier, tracking number, status)
`;

/**
 * インテントを検出する
 */
async function detectIntent(message: string): Promise<IntentDetectionResult> {
  const lowerMessage = message.toLowerCase();

  // キーワードベースの簡易インテント検出
  const intentPatterns: Array<{ intent: ChatIntent; keywords: string[]; confidence: number }> = [
    {
      intent: 'ORDER_STATUS',
      keywords: ['order', 'status', '注文', '状況', 'where is my', 'どこ'],
      confidence: 0.85,
    },
    {
      intent: 'TRACKING_INFO',
      keywords: ['tracking', 'track', '追跡', 'shipment', '配送', 'delivery'],
      confidence: 0.85,
    },
    {
      intent: 'PRODUCT_INQUIRY',
      keywords: ['product', 'item', '商品', 'about this', 'question about', 'available'],
      confidence: 0.8,
    },
    {
      intent: 'RETURN_REFUND',
      keywords: ['return', 'refund', '返品', '返金', 'money back', 'cancel'],
      confidence: 0.9,
    },
    {
      intent: 'SHIPPING_QUESTION',
      keywords: ['shipping', 'ship', '発送', 'how long', 'when will', 'いつ届く'],
      confidence: 0.8,
    },
    {
      intent: 'COMPLAINT',
      keywords: ['complaint', 'angry', 'upset', 'terrible', 'worst', '苦情', 'ひどい'],
      confidence: 0.9,
    },
    {
      intent: 'GREETING',
      keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'こんにちは', 'おはよう'],
      confidence: 0.95,
    },
    {
      intent: 'THANK_YOU',
      keywords: ['thank', 'thanks', 'appreciate', 'ありがとう', '感謝'],
      confidence: 0.95,
    },
  ];

  let detectedIntent: ChatIntent = 'UNKNOWN';
  let maxConfidence = 0;

  for (const pattern of intentPatterns) {
    const hasKeyword = pattern.keywords.some(kw => lowerMessage.includes(kw));
    if (hasKeyword && pattern.confidence > maxConfidence) {
      detectedIntent = pattern.intent;
      maxConfidence = pattern.confidence;
    }
  }

  // エンティティ抽出
  const entities: IntentDetectionResult['entities'] = {};

  // 注文ID抽出（例: ORD-XXXX, #12345）
  const orderIdMatch = message.match(/(?:ORD-|order[:\s#]*|注文[:\s#]*)([A-Z0-9-]+)/i);
  if (orderIdMatch) {
    entities.orderId = orderIdMatch[1];
  }

  // 追跡番号抽出（例: 一般的な追跡番号パターン）
  const trackingMatch = message.match(/(?:tracking[:\s#]*|追跡[:\s#]*)([A-Z0-9]{10,})/i);
  if (trackingMatch) {
    entities.trackingNumber = trackingMatch[1];
  }

  return {
    intent: detectedIntent,
    confidence: maxConfidence || 0.3,
    entities,
  };
}

/**
 * 注文情報を取得する
 */
async function getOrderInfo(orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: orderId },
        { externalOrderId: orderId },
      ],
    },
    include: {
      items: {
        include: {
          listing: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return {
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    totalAmount: order.totalAmount,
    currency: order.currency,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    items: order.items.map(item => ({
      title: item.listing?.product?.title || 'Unknown Product',
      quantity: item.quantity,
      price: item.price,
    })),
  };
}

/**
 * 商品情報を取得する
 */
async function getProductInfo(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) return null;

  return {
    productId: product.id,
    title: product.title,
    titleEn: product.titleEn,
    description: product.description,
    descriptionEn: product.descriptionEn,
    price: product.price,
    brand: product.brand,
    category: product.category,
    condition: product.condition,
    status: product.status,
  };
}

/**
 * AIで応答を生成する
 */
async function generateAIResponse(
  sessionId: string,
  userMessage: string,
  intent: IntentDetectionResult,
  context: Record<string, unknown>
): Promise<string> {
  // セッションの履歴を取得
  const recentMessages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // チャットボット設定を取得
  const config = await prisma.chatbotConfig.findFirst({
    where: { isActive: true },
  });

  const systemPrompt = config?.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  // コンテキスト情報を追加
  let contextInfo = '';
  if (context.orderInfo) {
    contextInfo += `\n\nOrder Information:\n${JSON.stringify(context.orderInfo, null, 2)}`;
  }
  if (context.productInfo) {
    contextInfo += `\n\nProduct Information:\n${JSON.stringify(context.productInfo, null, 2)}`;
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: systemPrompt + contextInfo,
    },
  ];

  // 履歴を追加（古い順）
  for (const msg of recentMessages.reverse()) {
    messages.push({
      role: msg.role === 'USER' ? 'user' : 'assistant',
      content: msg.content,
    });
  }

  // 現在のメッセージを追加
  messages.push({
    role: 'user',
    content: userMessage,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: config?.model || 'gpt-4o',
      messages,
      temperature: config?.temperature || 0.7,
      max_tokens: config?.maxTokens || 1000,
    });

    return completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'I apologize, but I encountered an error. Please try again or contact our support team.';
  }
}

/**
 * エスカレーションが必要か判定する
 */
async function shouldEscalate(
  sessionId: string,
  intent: ChatIntent,
  message: string
): Promise<{ escalate: boolean; reason?: string }> {
  const config = await prisma.chatbotConfig.findFirst({
    where: { isActive: true },
  });

  // 苦情は即座にエスカレーション
  if (intent === 'COMPLAINT') {
    return { escalate: true, reason: 'Customer complaint detected' };
  }

  // ネガティブなキーワードチェック
  const escalationKeywords = config?.escalationKeywords || ['refund', 'cancel', 'complaint', 'angry'];
  const hasEscalationKeyword = escalationKeywords.some(kw =>
    message.toLowerCase().includes(kw.toLowerCase())
  );

  if (hasEscalationKeyword && config?.autoEscalateOnNegativeSentiment) {
    return { escalate: true, reason: 'Escalation keyword detected' };
  }

  // メッセージ数チェック
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (session && config?.autoEscalateAfterMessages) {
    if (session.messageCount >= config.autoEscalateAfterMessages) {
      return { escalate: true, reason: 'Message limit reached' };
    }
  }

  return { escalate: false };
}

/**
 * チャットメッセージを処理して応答を生成する
 */
export async function processMessage(
  sessionId: string,
  message: string,
  locale: string = 'en'
): Promise<ChatResponse> {
  // セッションを取得または作成
  let session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return {
      message: 'Session not found. Please start a new conversation.',
      intent: 'UNKNOWN',
      confidence: 0,
      shouldEscalate: false,
    };
  }

  // インテント検出
  const intentResult = await detectIntent(message);

  // コンテキスト情報を収集
  const context: Record<string, unknown> = { ...session.context as Record<string, unknown> };

  // 注文情報を取得
  if (intentResult.entities.orderId || (context.orderId as string)) {
    const orderId = intentResult.entities.orderId || (context.orderId as string);
    const orderInfo = await getOrderInfo(orderId);
    if (orderInfo) {
      context.orderInfo = orderInfo;
      intentResult.entities.orderId = orderInfo.orderId;
    }
  }

  // 商品情報を取得
  if (intentResult.entities.productId || (context.productId as string)) {
    const productId = intentResult.entities.productId || (context.productId as string);
    const productInfo = await getProductInfo(productId);
    if (productInfo) {
      context.productInfo = productInfo;
    }
  }

  // ユーザーメッセージを保存
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: ChatMessageRole.USER,
      content: message,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: intentResult.entities,
      referencedOrderId: intentResult.entities.orderId,
      referencedProductId: intentResult.entities.productId,
    },
  });

  // エスカレーション判定
  const escalation = await shouldEscalate(sessionId, intentResult.intent, message);

  // AI応答を生成
  const aiResponse = await generateAIResponse(sessionId, message, intentResult, context);

  // 応答メッセージを保存
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: ChatMessageRole.ASSISTANT,
      content: aiResponse,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      isAutoReply: true,
      referencedOrderId: intentResult.entities.orderId,
      referencedProductId: intentResult.entities.productId,
    },
  });

  // セッションを更新
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: {
      lastMessageAt: new Date(),
      messageCount: { increment: 2 }, // ユーザー + AI
      context,
      isEscalated: escalation.escalate || undefined,
      escalatedAt: escalation.escalate ? new Date() : undefined,
      escalationReason: escalation.reason,
      status: escalation.escalate ? ChatSessionStatus.ESCALATED : ChatSessionStatus.ACTIVE,
    },
  });

  // サジェストアクションを生成
  const suggestedActions: string[] = [];
  if (intentResult.intent === 'ORDER_STATUS' && !intentResult.entities.orderId) {
    suggestedActions.push('Please provide your order ID');
  }
  if (intentResult.intent === 'RETURN_REFUND') {
    suggestedActions.push('View return policy');
    suggestedActions.push('Contact support');
  }

  return {
    message: aiResponse,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined,
    shouldEscalate: escalation.escalate,
    escalationReason: escalation.reason,
    referencedOrderId: intentResult.entities.orderId,
    referencedProductId: intentResult.entities.productId,
  };
}

/**
 * 新しいチャットセッションを作成する
 */
export async function createSession(data: {
  marketplace: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerLocale?: string;
  context?: Record<string, unknown>;
}) {
  const sessionKey = `${data.marketplace}_${data.customerId || Date.now()}`;

  // 既存のアクティブセッションをチェック
  const existingSession = await prisma.chatSession.findFirst({
    where: {
      sessionKey,
      status: { in: [ChatSessionStatus.ACTIVE, ChatSessionStatus.WAITING] },
    },
  });

  if (existingSession) {
    return existingSession;
  }

  const session = await prisma.chatSession.create({
    data: {
      sessionKey,
      marketplace: data.marketplace,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerLocale: data.customerLocale || 'en',
      context: data.context || {},
      status: ChatSessionStatus.ACTIVE,
    },
  });

  // ウェルカムメッセージを追加
  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: ChatMessageRole.SYSTEM,
      content: 'Welcome to RAKUDA support! How can I help you today?',
      isAutoReply: true,
    },
  });

  return session;
}

/**
 * セッションの履歴を取得する
 */
export async function getSessionHistory(sessionId: string, limit: number = 50) {
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  return messages;
}

/**
 * チャットボット統計を取得する
 */
export async function getChatbotStats() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalSessions,
    activeSessions,
    escalatedSessions,
    todayMessages,
    weekMessages,
    avgMessagesPerSession,
  ] = await Promise.all([
    prisma.chatSession.count(),
    prisma.chatSession.count({
      where: { status: ChatSessionStatus.ACTIVE },
    }),
    prisma.chatSession.count({
      where: { isEscalated: true, escalatedAt: { gte: oneWeekAgo } },
    }),
    prisma.chatMessage.count({
      where: { createdAt: { gte: oneDayAgo } },
    }),
    prisma.chatMessage.count({
      where: { createdAt: { gte: oneWeekAgo } },
    }),
    prisma.chatSession.aggregate({
      _avg: { messageCount: true },
    }),
  ]);

  // インテント別統計
  const intentStats = await prisma.chatMessage.groupBy({
    by: ['intent'],
    _count: { id: true },
    where: {
      intent: { not: null },
      createdAt: { gte: oneWeekAgo },
    },
  });

  // マーケットプレイス別統計
  const marketplaceStats = await prisma.chatSession.groupBy({
    by: ['marketplace'],
    _count: { id: true },
    where: { createdAt: { gte: oneWeekAgo } },
  });

  return {
    totalSessions,
    activeSessions,
    escalatedSessions,
    escalationRate: totalSessions > 0
      ? ((escalatedSessions / totalSessions) * 100).toFixed(1)
      : '0.0',
    todayMessages,
    weekMessages,
    avgMessagesPerSession: avgMessagesPerSession._avg.messageCount?.toFixed(1) || '0',
    intentStats: intentStats.map(item => ({
      intent: item.intent,
      count: item._count.id,
    })),
    marketplaceStats: marketplaceStats.map(item => ({
      marketplace: item.marketplace,
      count: item._count.id,
    })),
  };
}

/**
 * チャットボット設定を取得する
 */
export async function getChatbotConfig(marketplace?: string) {
  const config = await prisma.chatbotConfig.findFirst({
    where: marketplace ? { marketplace } : { marketplace: 'default' },
  });

  if (!config) {
    // デフォルト設定を返す
    return {
      marketplace: marketplace || 'default',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      defaultLanguage: 'en',
      supportedLanguages: ['en', 'ja'],
      autoEscalateOnNegativeSentiment: true,
      autoEscalateAfterMessages: 5,
      escalationKeywords: ['refund', 'cancel', 'complaint', 'angry'],
      maxMessagesPerSession: 50,
      sessionTimeoutMinutes: 60,
      isActive: true,
    };
  }

  return config;
}

/**
 * チャットボット設定を更新する
 */
export async function updateChatbotConfig(
  marketplace: string,
  data: Partial<{
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    defaultLanguage: string;
    supportedLanguages: string[];
    autoEscalateOnNegativeSentiment: boolean;
    autoEscalateAfterMessages: number;
    escalationKeywords: string[];
    maxMessagesPerSession: number;
    sessionTimeoutMinutes: number;
    isActive: boolean;
  }>
) {
  const existing = await prisma.chatbotConfig.findUnique({
    where: { marketplace },
  });

  if (existing) {
    return prisma.chatbotConfig.update({
      where: { marketplace },
      data,
    });
  }

  return prisma.chatbotConfig.create({
    data: {
      marketplace,
      systemPrompt: data.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      ...data,
    },
  });
}

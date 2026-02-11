/**
 * Phase 63-64: 顧客対応自動化エンジン
 *
 * 自動返信ルール、メッセージテンプレート、顧客対応トラッキング
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'customer-support-engine' });

// 自動返信ルールのトリガータイプ
export type TriggerType =
  | 'KEYWORD'        // キーワードマッチ
  | 'ORDER_STATUS'   // 注文ステータス変更時
  | 'NO_RESPONSE'    // 一定時間返信なし
  | 'FIRST_MESSAGE'  // 初回メッセージ
  | 'REFUND_REQUEST' // 返金リクエスト
  | 'SHIPPING_INQUIRY'; // 発送問い合わせ

// 自動返信ルール
export interface AutoReplyRule {
  id: string;
  name: string;
  triggerType: TriggerType;
  triggerCondition: {
    keywords?: string[];
    orderStatus?: string;
    delayMinutes?: number;
    marketplace?: 'JOOM' | 'EBAY' | 'ALL';
  };
  templateId: string;
  priority: number;
  isActive: boolean;
}

// メッセージテンプレート変数
export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

// 利用可能なテンプレート変数
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: '{{buyer_name}}', description: '購入者名', example: 'John Smith' },
  { name: '{{order_id}}', description: '注文ID', example: 'ORD-12345' },
  { name: '{{tracking_number}}', description: '追跡番号', example: 'JP123456789' },
  { name: '{{tracking_url}}', description: '追跡URL', example: 'https://...' },
  { name: '{{product_title}}', description: '商品名', example: 'Vintage Watch' },
  { name: '{{estimated_delivery}}', description: '配送予定日', example: '2026-02-20' },
  { name: '{{seller_name}}', description: '販売者名', example: 'RAKUDA Store' },
  { name: '{{support_email}}', description: 'サポートメール', example: 'support@example.com' },
  { name: '{{refund_amount}}', description: '返金額', example: '$25.00' },
  { name: '{{order_total}}', description: '注文合計', example: '$49.99' },
];

// デフォルトテンプレート
export const DEFAULT_TEMPLATES = [
  {
    name: '発送完了通知',
    nameEn: 'Shipping Notification',
    category: 'SHIPPING',
    subject: 'Your order has been shipped!',
    body: `Dear {{buyer_name}},

Great news! Your order ({{order_id}}) has been shipped.

Tracking Number: {{tracking_number}}
Tracking URL: {{tracking_url}}

Estimated Delivery: {{estimated_delivery}}

Thank you for shopping with us!

Best regards,
{{seller_name}}`,
    variables: ['buyer_name', 'order_id', 'tracking_number', 'tracking_url', 'estimated_delivery', 'seller_name'],
  },
  {
    name: '発送遅延お詫び',
    nameEn: 'Shipping Delay Apology',
    category: 'SHIPPING',
    subject: 'Update on your order',
    body: `Dear {{buyer_name}},

We apologize for the delay in shipping your order ({{order_id}}).

Due to high demand, your package will be shipped within the next 2-3 business days. We will send you the tracking information as soon as it's available.

Thank you for your patience and understanding.

Best regards,
{{seller_name}}`,
    variables: ['buyer_name', 'order_id', 'seller_name'],
  },
  {
    name: '返金完了通知',
    nameEn: 'Refund Confirmation',
    category: 'REFUND',
    subject: 'Your refund has been processed',
    body: `Dear {{buyer_name}},

Your refund for order {{order_id}} has been processed.

Refund Amount: {{refund_amount}}

The refund will appear in your account within 5-10 business days depending on your payment method.

If you have any questions, please don't hesitate to contact us.

Best regards,
{{seller_name}}`,
    variables: ['buyer_name', 'order_id', 'refund_amount', 'seller_name'],
  },
  {
    name: '配送状況問い合わせ返信',
    nameEn: 'Shipping Inquiry Response',
    category: 'INQUIRY',
    subject: 'Re: Shipping Status',
    body: `Dear {{buyer_name}},

Thank you for contacting us about your order ({{order_id}}).

Your package is currently in transit. Here are the tracking details:

Tracking Number: {{tracking_number}}
Tracking URL: {{tracking_url}}

International shipments typically take 10-20 business days for delivery. Please allow a few more days for your package to arrive.

If you have any other questions, feel free to reach out.

Best regards,
{{seller_name}}`,
    variables: ['buyer_name', 'order_id', 'tracking_number', 'tracking_url', 'seller_name'],
  },
  {
    name: '初回メッセージ自動返信',
    nameEn: 'First Message Auto-Reply',
    category: 'AUTO_REPLY',
    subject: 'Thank you for your message',
    body: `Dear {{buyer_name}},

Thank you for contacting us! We have received your message and will respond within 24 hours.

For order-related inquiries, please have your order number ready.

Best regards,
{{seller_name}}`,
    variables: ['buyer_name', 'seller_name'],
  },
];

// デフォルト自動返信ルール
export const DEFAULT_AUTO_REPLY_RULES: Omit<AutoReplyRule, 'id' | 'templateId'>[] = [
  {
    name: '発送問い合わせ自動返信',
    triggerType: 'KEYWORD',
    triggerCondition: {
      keywords: ['shipping', 'tracking', 'where is my order', 'delivery', 'shipped'],
      marketplace: 'ALL',
    },
    priority: 10,
    isActive: true,
  },
  {
    name: '返金リクエスト検知',
    triggerType: 'KEYWORD',
    triggerCondition: {
      keywords: ['refund', 'money back', 'return', 'cancel order'],
      marketplace: 'ALL',
    },
    priority: 20,
    isActive: true,
  },
  {
    name: '初回メッセージ自動返信',
    triggerType: 'FIRST_MESSAGE',
    triggerCondition: {
      marketplace: 'ALL',
    },
    priority: 100,
    isActive: true,
  },
  {
    name: '24時間未返信アラート',
    triggerType: 'NO_RESPONSE',
    triggerCondition: {
      delayMinutes: 1440, // 24時間
      marketplace: 'ALL',
    },
    priority: 5,
    isActive: true,
  },
];

/**
 * テンプレート変数を置換
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  }

  return result;
}

/**
 * メッセージからキーワードをマッチ
 */
export function matchKeywords(message: string, keywords: string[]): string[] {
  const lowerMessage = message.toLowerCase();
  return keywords.filter((keyword) => lowerMessage.includes(keyword.toLowerCase()));
}

/**
 * 自動返信ルールをマッチング
 */
export async function findMatchingRules(
  message: string,
  context: {
    marketplace: 'JOOM' | 'EBAY';
    isFirstMessage: boolean;
    orderId?: string;
    orderStatus?: string;
  }
): Promise<AutoReplyRule[]> {
  // DBから有効なルールを取得
  const rules = await prisma.autoReplyRule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  });

  const matchedRules: AutoReplyRule[] = [];

  for (const rule of rules) {
    const condition = rule.triggerCondition as AutoReplyRule['triggerCondition'];

    // マーケットプレイスフィルター
    if (condition.marketplace && condition.marketplace !== 'ALL' && condition.marketplace !== context.marketplace) {
      continue;
    }

    let matched = false;

    switch (rule.triggerType) {
      case 'KEYWORD':
        if (condition.keywords && condition.keywords.length > 0) {
          const matches = matchKeywords(message, condition.keywords);
          matched = matches.length > 0;
        }
        break;

      case 'FIRST_MESSAGE':
        matched = context.isFirstMessage;
        break;

      case 'ORDER_STATUS':
        matched = context.orderStatus === condition.orderStatus;
        break;

      case 'REFUND_REQUEST':
        const refundKeywords = ['refund', 'money back', 'return', 'cancel'];
        matched = matchKeywords(message, refundKeywords).length > 0;
        break;

      case 'SHIPPING_INQUIRY':
        const shippingKeywords = ['shipping', 'tracking', 'where', 'delivery', 'shipped'];
        matched = matchKeywords(message, shippingKeywords).length > 0;
        break;
    }

    if (matched) {
      matchedRules.push({
        id: rule.id,
        name: rule.name,
        triggerType: rule.triggerType as TriggerType,
        triggerCondition: condition,
        templateId: rule.templateId,
        priority: rule.priority,
        isActive: rule.isActive,
      });
    }
  }

  return matchedRules;
}

/**
 * 注文情報からテンプレート変数を生成
 */
export async function buildTemplateVariables(
  orderId: string,
  additionalVars: Record<string, string> = {}
): Promise<Record<string, string>> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { sales: true },
  });

  if (!order) {
    return {
      seller_name: process.env.SELLER_NAME || 'RAKUDA Store',
      support_email: process.env.SUPPORT_EMAIL || 'support@example.com',
      ...additionalVars,
    };
  }

  const productTitles = order.sales.map((s) => s.title).join(', ');

  // 配送予定日を計算（発送日から14日後）
  const estimatedDelivery = order.shippedAt
    ? new Date(new Date(order.shippedAt).getTime() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    : 'TBD';

  // 追跡URL生成
  const trackingUrl = order.trackingNumber && order.trackingCarrier
    ? generateTrackingUrl(order.trackingCarrier, order.trackingNumber)
    : '';

  return {
    buyer_name: order.buyerName || order.buyerUsername || 'Customer',
    order_id: order.marketplaceOrderId || order.id,
    tracking_number: order.trackingNumber || 'Not available yet',
    tracking_url: trackingUrl,
    product_title: productTitles || 'Your item',
    estimated_delivery: estimatedDelivery,
    seller_name: process.env.SELLER_NAME || 'RAKUDA Store',
    support_email: process.env.SUPPORT_EMAIL || 'support@example.com',
    order_total: `$${order.total.toFixed(2)}`,
    ...additionalVars,
  };
}

/**
 * 追跡URLを生成
 */
function generateTrackingUrl(carrier: string, trackingNumber: string): string {
  const carrierUrls: Record<string, string> = {
    'JAPAN_POST': `https://trackings.post.japanpost.jp/services/srv/search/?requestNo1=${trackingNumber}`,
    'YAMATO': `https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=${trackingNumber}`,
    'SAGAWA': `https://k2k.sagawa-exp.co.jp/p/web/okurijosearch.do?okurijoNo=${trackingNumber}`,
    'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
    'FEDEX': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
  };

  return carrierUrls[carrier.toUpperCase()] || `https://track24.net/?code=${trackingNumber}`;
}

/**
 * 自動返信メッセージを生成
 */
export async function generateAutoReply(
  rule: AutoReplyRule,
  orderId?: string,
  additionalVars: Record<string, string> = {}
): Promise<{ subject: string; body: string } | null> {
  // テンプレートを取得
  const template = await prisma.messageTemplate.findUnique({
    where: { id: rule.templateId },
  });

  if (!template) {
    log.warn({ ruleId: rule.id, templateId: rule.templateId }, 'Template not found');
    return null;
  }

  // 変数を構築
  const variables = orderId
    ? await buildTemplateVariables(orderId, additionalVars)
    : { seller_name: process.env.SELLER_NAME || 'RAKUDA Store', ...additionalVars };

  // テンプレートを適用
  const subject = replaceTemplateVariables(template.subject || '', variables);
  const body = replaceTemplateVariables(template.body, variables);

  return { subject, body };
}

/**
 * 顧客メッセージを分析
 */
export interface MessageAnalysis {
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  category: 'SHIPPING' | 'REFUND' | 'PRODUCT' | 'GENERAL' | 'COMPLAINT';
  suggestedAction: string;
  matchedRules: AutoReplyRule[];
}

export async function analyzeMessage(
  message: string,
  context: {
    marketplace: 'JOOM' | 'EBAY';
    isFirstMessage: boolean;
    orderId?: string;
  }
): Promise<MessageAnalysis> {
  const lowerMessage = message.toLowerCase();

  // センチメント分析（簡易版）
  const negativeWords = ['angry', 'upset', 'terrible', 'worst', 'scam', 'fraud', 'hate', 'disappointed'];
  const positiveWords = ['thank', 'great', 'excellent', 'love', 'perfect', 'amazing', 'happy'];

  const negativeCount = negativeWords.filter((w) => lowerMessage.includes(w)).length;
  const positiveCount = positiveWords.filter((w) => lowerMessage.includes(w)).length;

  let sentiment: MessageAnalysis['sentiment'] = 'NEUTRAL';
  if (negativeCount > positiveCount) sentiment = 'NEGATIVE';
  else if (positiveCount > negativeCount) sentiment = 'POSITIVE';

  // 緊急度判定
  const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'now', 'help'];
  const urgency: MessageAnalysis['urgency'] = urgentWords.some((w) => lowerMessage.includes(w))
    ? 'HIGH'
    : sentiment === 'NEGATIVE'
    ? 'MEDIUM'
    : 'LOW';

  // カテゴリ分類
  let category: MessageAnalysis['category'] = 'GENERAL';
  if (matchKeywords(message, ['shipping', 'tracking', 'delivery', 'where']).length > 0) {
    category = 'SHIPPING';
  } else if (matchKeywords(message, ['refund', 'return', 'money back', 'cancel']).length > 0) {
    category = 'REFUND';
  } else if (matchKeywords(message, ['broken', 'damaged', 'wrong', 'defective', 'quality']).length > 0) {
    category = 'PRODUCT';
  } else if (sentiment === 'NEGATIVE') {
    category = 'COMPLAINT';
  }

  // マッチするルールを検索
  const matchedRules = await findMatchingRules(message, context);

  // 推奨アクション
  let suggestedAction = 'Review and respond manually';
  if (matchedRules.length > 0) {
    suggestedAction = `Auto-reply available: ${matchedRules[0].name}`;
  } else if (category === 'REFUND') {
    suggestedAction = 'Review refund policy and respond with options';
  } else if (category === 'SHIPPING') {
    suggestedAction = 'Check tracking status and provide update';
  } else if (urgency === 'HIGH') {
    suggestedAction = 'Priority response required';
  }

  return {
    sentiment,
    urgency,
    category,
    suggestedAction,
    matchedRules,
  };
}

/**
 * 顧客対応統計を取得
 */
export async function getCustomerSupportStats(): Promise<{
  totalMessages: number;
  pendingMessages: number;
  avgResponseTime: number;
  autoReplySent: number;
  byCategory: Record<string, number>;
  bySentiment: Record<string, number>;
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // CustomerMessageテーブルがある場合の集計
  const messages = await prisma.customerMessage.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const pending = messages.filter((m) => m.status === 'PENDING').length;
  const autoReplied = messages.filter((m) => m.isAutoReply).length;

  // 平均返信時間を計算
  const respondedMessages = messages.filter((m) => m.respondedAt);
  const avgResponseTime =
    respondedMessages.length > 0
      ? respondedMessages.reduce((sum, m) => {
          const responseTime = new Date(m.respondedAt!).getTime() - new Date(m.createdAt).getTime();
          return sum + responseTime;
        }, 0) /
        respondedMessages.length /
        (60 * 1000) // 分単位
      : 0;

  // カテゴリ別集計
  const byCategory: Record<string, number> = {};
  const bySentiment: Record<string, number> = {};

  for (const msg of messages) {
    const cat = (msg.category as string) || 'GENERAL';
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    const sent = (msg.sentiment as string) || 'NEUTRAL';
    bySentiment[sent] = (bySentiment[sent] || 0) + 1;
  }

  return {
    totalMessages: messages.length,
    pendingMessages: pending,
    avgResponseTime: Math.round(avgResponseTime),
    autoReplySent: autoReplied,
    byCategory,
    bySentiment,
  };
}

/**
 * 未返信メッセージを取得
 */
export async function getPendingMessages(limit = 50): Promise<any[]> {
  return prisma.customerMessage.findMany({
    where: {
      status: 'PENDING',
    },
    orderBy: [
      { urgency: 'desc' },
      { createdAt: 'asc' },
    ],
    take: limit,
    include: {
      order: true,
    },
  });
}

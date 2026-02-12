/**
 * AIチャットボットAPI
 * Phase 74: 顧客対応自動化チャットボット
 */

import { Router } from 'express';
import { PrismaClient, ChatSessionStatus } from '@prisma/client';
import {
  processMessage,
  createSession,
  getSessionHistory,
  getChatbotStats,
  getChatbotConfig,
  updateChatbotConfig,
} from '../lib/chatbot-engine';

const router = Router();
const prisma = new PrismaClient();

/**
 * チャットボット統計を取得
 * GET /api/chatbot/stats
 */
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getChatbotStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching chatbot stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chatbot stats',
    });
  }
});

/**
 * チャットボット設定を取得
 * GET /api/chatbot/config
 */
router.get('/config', async (req, res) => {
  try {
    const { marketplace } = req.query;
    const config = await getChatbotConfig(marketplace as string);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching chatbot config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chatbot config',
    });
  }
});

/**
 * チャットボット設定を更新
 * PATCH /api/chatbot/config
 */
router.patch('/config', async (req, res) => {
  try {
    const { marketplace, ...data } = req.body;

    if (!marketplace) {
      return res.status(400).json({
        success: false,
        error: 'marketplace is required',
      });
    }

    const config = await updateChatbotConfig(marketplace, data);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error updating chatbot config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chatbot config',
    });
  }
});

/**
 * 新しいチャットセッションを作成
 * POST /api/chatbot/sessions
 */
router.post('/sessions', async (req, res) => {
  try {
    const { marketplace, customerId, customerName, customerEmail, customerLocale, context } = req.body;

    if (!marketplace) {
      return res.status(400).json({
        success: false,
        error: 'marketplace is required',
      });
    }

    const session = await createSession({
      marketplace,
      customerId,
      customerName,
      customerEmail,
      customerLocale,
      context,
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat session',
    });
  }
});

/**
 * チャットセッション一覧を取得
 * GET /api/chatbot/sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const {
      marketplace,
      status,
      isEscalated,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (marketplace) where.marketplace = marketplace;
    if (status) where.status = status;
    if (isEscalated !== undefined) where.isEscalated = isEscalated === 'true';

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.chatSession.count({ where }),
    ]);

    res.json({ success: true, data: { sessions, total } });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat sessions',
    });
  }
});

/**
 * チャットセッション詳細を取得
 * GET /api/chatbot/sessions/:id
 */
router.get('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.chatSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat session',
    });
  }
});

/**
 * セッションの履歴を取得
 * GET /api/chatbot/sessions/:id/messages
 */
router.get('/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = '50' } = req.query;

    const messages = await getSessionHistory(id, parseInt(limit as string));
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching session messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session messages',
    });
  }
});

/**
 * メッセージを送信して応答を取得
 * POST /api/chatbot/sessions/:id/messages
 */
router.post('/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, locale } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    const response = await processMessage(id, message, locale || 'en');
    res.json({ success: true, data: response });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message',
    });
  }
});

/**
 * セッションをエスカレーション
 * POST /api/chatbot/sessions/:id/escalate
 */
router.post('/sessions/:id/escalate', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const session = await prisma.chatSession.update({
      where: { id },
      data: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalationReason: reason || 'Manual escalation',
        status: ChatSessionStatus.ESCALATED,
      },
    });

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error escalating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to escalate session',
    });
  }
});

/**
 * セッションを解決済みにする
 * POST /api/chatbot/sessions/:id/resolve
 */
router.post('/sessions/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.chatSession.update({
      where: { id },
      data: {
        status: ChatSessionStatus.RESOLVED,
      },
    });

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Error resolving session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve session',
    });
  }
});

/**
 * セッションを閉じる
 * DELETE /api/chatbot/sessions/:id
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // メッセージを削除
    await prisma.chatMessage.deleteMany({
      where: { sessionId: id },
    });

    // セッションを削除
    await prisma.chatSession.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
    });
  }
});

/**
 * オペレーターメッセージを送信
 * POST /api/chatbot/sessions/:id/operator-message
 */
router.post('/sessions/:id/operator-message', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required',
      });
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId: id,
        role: 'OPERATOR',
        content: message,
        isAutoReply: false,
      },
    });

    // セッションを更新
    await prisma.chatSession.update({
      where: { id },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 1 },
      },
    });

    res.json({ success: true, data: chatMessage });
  } catch (error) {
    console.error('Error sending operator message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send operator message',
    });
  }
});

/**
 * インテント一覧を取得
 * GET /api/chatbot/intents
 */
router.get('/intents', (_req, res) => {
  const intents = [
    { value: 'ORDER_STATUS', label: '注文状況確認', labelEn: 'Order Status' },
    { value: 'TRACKING_INFO', label: '追跡情報', labelEn: 'Tracking Info' },
    { value: 'PRODUCT_INQUIRY', label: '商品問い合わせ', labelEn: 'Product Inquiry' },
    { value: 'RETURN_REFUND', label: '返品・返金', labelEn: 'Return/Refund' },
    { value: 'SHIPPING_QUESTION', label: '発送に関する質問', labelEn: 'Shipping Question' },
    { value: 'GENERAL_QUESTION', label: '一般的な質問', labelEn: 'General Question' },
    { value: 'COMPLAINT', label: '苦情', labelEn: 'Complaint' },
    { value: 'GREETING', label: '挨拶', labelEn: 'Greeting' },
    { value: 'THANK_YOU', label: 'お礼', labelEn: 'Thank You' },
    { value: 'UNKNOWN', label: '不明', labelEn: 'Unknown' },
  ];

  res.json({ success: true, data: intents });
});

/**
 * デフォルト設定をセットアップ
 * POST /api/chatbot/setup-defaults
 */
router.post('/setup-defaults', async (_req, res) => {
  try {
    // デフォルト設定が存在しなければ作成
    const existingConfig = await prisma.chatbotConfig.findFirst({
      where: { marketplace: 'default' },
    });

    if (existingConfig) {
      return res.json({
        success: true,
        data: { created: 0, message: 'Default config already exists' },
      });
    }

    const defaultConfig = await prisma.chatbotConfig.create({
      data: {
        marketplace: 'default',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 1000,
        systemPrompt: `You are a helpful customer support assistant for RAKUDA, a cross-border e-commerce platform that sells Japanese products internationally.

Your responsibilities:
1. Answer questions about orders, shipping, and products
2. Provide tracking information when requested
3. Help with return and refund inquiries
4. Be polite, professional, and helpful
5. If you cannot help, suggest contacting human support`,
        defaultLanguage: 'en',
        supportedLanguages: ['en', 'ja'],
        autoEscalateOnNegativeSentiment: true,
        autoEscalateAfterMessages: 5,
        escalationKeywords: ['refund', 'cancel', 'complaint', 'angry', 'terrible'],
        maxMessagesPerSession: 50,
        sessionTimeoutMinutes: 60,
        isActive: true,
      },
    });

    res.json({
      success: true,
      data: { created: 1, config: defaultConfig },
    });
  } catch (error) {
    console.error('Error setting up defaults:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup defaults',
    });
  }
});

export default router;


/**
 * 外部連携API
 * Phase 81: 外部連携強化
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import crypto from 'crypto';

const router = Router();

/**
 * @swagger
 * /api/external-integrations/stats:
 *   get:
 *     summary: 外部連携統計を取得
 *     tags: [ExternalIntegrations]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [total, active, byType, recentSyncs] = await Promise.all([
      prisma.externalIntegration.count(),
      prisma.externalIntegration.count({ where: { isEnabled: true } }),
      prisma.externalIntegration.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.integrationSyncLog.findMany({
        where: {
          startedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    ]);

    // 同期成功率
    const syncStats = await prisma.integrationSyncLog.groupBy({
      by: ['status'],
      _count: true,
      where: {
        startedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const totalSyncs = syncStats.reduce((sum, s) => sum + s._count, 0);
    const successSyncs = syncStats.find(s => s.status === 'COMPLETED')?._count || 0;
    const syncSuccessRate = totalSyncs > 0 ? (successSyncs / totalSyncs) * 100 : 0;

    res.json({
      total,
      active,
      inactive: total - active,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
      syncSuccessRate: Math.round(syncSuccessRate * 10) / 10,
      recentSyncs,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/types:
 *   get:
 *     summary: 連携タイプ一覧を取得
 *     tags: [ExternalIntegrations]
 */
router.get('/types', async (req, res) => {
  res.json({
    types: [
      {
        value: 'SHOPIFY',
        label: 'Shopify',
        description: 'Shopifyストアとの商品・在庫同期',
        features: ['商品同期', '在庫同期', '注文同期', 'Webhook'],
        authType: 'oauth',
      },
      {
        value: 'AMAZON',
        label: 'Amazon',
        description: 'Amazon出品者アカウントとの連携',
        features: ['商品同期', '在庫同期', '注文同期', 'FBA連携'],
        authType: 'oauth',
      },
      {
        value: 'FREEE',
        label: 'freee会計',
        description: 'freee会計との取引データ連携',
        features: ['売上登録', '仕入登録', '経費登録', '自動仕訳'],
        authType: 'oauth',
      },
      {
        value: 'MFCLOUD',
        label: 'MFクラウド',
        description: 'MFクラウド会計との取引データ連携',
        features: ['売上登録', '仕入登録', '経費登録'],
        authType: 'oauth',
      },
      {
        value: 'YAMATO',
        label: 'ヤマト運輸',
        description: 'ヤマト運輸B2クラウドとの連携',
        features: ['送り状発行', '追跡連携', '集荷依頼'],
        authType: 'api_key',
      },
      {
        value: 'SAGAWA',
        label: '佐川急便',
        description: '佐川急便e飛伝との連携',
        features: ['送り状発行', '追跡連携'],
        authType: 'api_key',
      },
      {
        value: 'JAPAN_POST',
        label: '日本郵便',
        description: '日本郵便Webゆうパックプリントとの連携',
        features: ['送り状発行', '追跡連携', '国際郵便'],
        authType: 'api_key',
      },
      {
        value: 'CUSTOM_API',
        label: 'カスタムAPI',
        description: 'カスタムAPIエンドポイントとの連携',
        features: ['Webhook送信', 'Webhook受信', 'カスタムマッピング'],
        authType: 'custom',
      },
    ],
    statuses: [
      { value: 'INACTIVE', label: '未接続' },
      { value: 'CONNECTING', label: '接続中' },
      { value: 'ACTIVE', label: '接続済み' },
      { value: 'ERROR', label: 'エラー' },
      { value: 'SUSPENDED', label: '一時停止' },
    ],
  });
});

/**
 * @swagger
 * /api/external-integrations:
 *   get:
 *     summary: 外部連携一覧を取得
 *     tags: [ExternalIntegrations]
 */
router.get('/', async (req, res, next) => {
  try {
    const { type, search, page = '1', limit = '20' } = req.query;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [integrations, total] = await Promise.all([
      prisma.externalIntegration.findMany({
        where,
        include: {
          _count: {
            select: {
              syncLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.externalIntegration.count({ where }),
    ]);

    // 認証情報をマスク (config may contain sensitive info)
    const maskedIntegrations = integrations.map(integration => ({
      ...integration,
      config: '***',
    }));

    res.json({
      data: maskedIntegrations,
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
 * /api/external-integrations:
 *   post:
 *     summary: 外部連携を作成
 *     tags: [ExternalIntegrations]
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      type,
      name,
      displayName,
      description,
      provider,
      config,
      webhookUrl,
      scopes,
    } = req.body;

    if (!type || !name) {
      return res.status(400).json({ error: 'type and name are required' });
    }

    const integration = await prisma.externalIntegration.create({
      data: {
        type,
        name,
        displayName: displayName || name,
        description,
        provider: provider || type.toLowerCase(),
        config: config || {},
        webhookUrl,
        scopes: scopes || [],
      },
    });

    logger.info(`External integration created: ${integration.id} - ${integration.name}`);

    res.status(201).json(integration);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/{id}:
 *   get:
 *     summary: 外部連携詳細を取得
 *     tags: [ExternalIntegrations]
 */
router.get('/:id', async (req, res, next) => {
  try {
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: req.params.id },
      include: {
        syncLogs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        credentials: true,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    res.json({
      ...integration,
      config: '***',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/{id}:
 *   patch:
 *     summary: 外部連携を更新
 *     tags: [ExternalIntegrations]
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name,
      displayName,
      description,
      config,
      webhookUrl,
      scopes,
      isEnabled,
      isConfigured,
    } = req.body;

    const integration = await prisma.externalIntegration.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(displayName && { displayName }),
        ...(description !== undefined && { description }),
        ...(config && { config }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(scopes && { scopes }),
        ...(isEnabled !== undefined && { isEnabled }),
        ...(isConfigured !== undefined && { isConfigured }),
      },
    });

    res.json({
      ...integration,
      config: '***',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/{id}:
 *   delete:
 *     summary: 外部連携を削除
 *     tags: [ExternalIntegrations]
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.externalIntegration.delete({
      where: { id: req.params.id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/{id}/connect:
 *   post:
 *     summary: 外部連携を接続
 *     tags: [ExternalIntegrations]
 */
router.post('/:id/connect', async (req, res, next) => {
  try {
    const integration = await prisma.externalIntegration.update({
      where: { id: req.params.id },
      data: {
        isEnabled: true,
        isConfigured: true,
        healthStatus: 'HEALTHY',
      },
    });

    logger.info(`Integration connected: ${integration.id}`);

    res.json({
      id: integration.id,
      isEnabled: integration.isEnabled,
      message: '接続が完了しました',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/{id}/disconnect:
 *   post:
 *     summary: 外部連携を切断
 *     tags: [ExternalIntegrations]
 */
router.post('/:id/disconnect', async (req, res, next) => {
  try {
    const integration = await prisma.externalIntegration.update({
      where: { id: req.params.id },
      data: {
        isEnabled: false,
        healthStatus: 'UNKNOWN',
      },
    });

    logger.info(`Integration disconnected: ${integration.id}`);

    res.json({
      id: integration.id,
      isEnabled: integration.isEnabled,
      message: '切断が完了しました',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/{id}/sync:
 *   post:
 *     summary: 手動同期を実行
 *     tags: [ExternalIntegrations]
 */
router.post('/:id/sync', async (req, res, next) => {
  try {
    const { syncType = 'INCREMENTAL', direction = 'BIDIRECTIONAL' } = req.body;

    const integration = await prisma.externalIntegration.findUnique({
      where: { id: req.params.id },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    if (!integration.isEnabled) {
      return res.status(400).json({ error: 'Integration is not active' });
    }

    // 同期ログを作成
    const syncLog = await prisma.integrationSyncLog.create({
      data: {
        integrationId: integration.id,
        syncType,
        direction,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    // 実際の同期処理はバックグラウンドジョブで実行
    // ここでは同期ログを返す
    logger.info(`Manual sync started: ${syncLog.id}`);

    // 統計更新
    await prisma.externalIntegration.update({
      where: { id: req.params.id },
      data: {
        totalSyncs: { increment: 1 },
      },
    });

    res.json({
      syncLogId: syncLog.id,
      status: 'IN_PROGRESS',
      message: '同期を開始しました',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/{id}/sync-logs:
 *   get:
 *     summary: 同期ログを取得
 *     tags: [ExternalIntegrations]
 */
router.get('/:id/sync-logs', async (req, res, next) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [logs, total] = await Promise.all([
      prisma.integrationSyncLog.findMany({
        where: { integrationId: req.params.id },
        orderBy: { startedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.integrationSyncLog.count({
        where: { integrationId: req.params.id },
      }),
    ]);

    res.json({
      data: logs,
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
 * /api/external-integrations/{id}/webhook:
 *   post:
 *     summary: Webhookを受信
 *     tags: [ExternalIntegrations]
 */
router.post('/:id/webhook', async (req, res, next) => {
  try {
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: req.params.id },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // 署名検証（オプション）
    const signature = req.headers['x-webhook-signature'];
    const configData = integration.config as Record<string, unknown> | null;
    const webhookSecret = configData?.webhookSecret as string | undefined;
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== `sha256=${expectedSignature}`) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Webhookログを記録
    const webhookLog = await prisma.integrationWebhookLog.create({
      data: {
        integrationId: integration.id,
        eventType: req.body.event || req.body.type || 'unknown',
        payload: req.body,
        headers: req.headers as any,
        status: 'PENDING',
      },
    });

    logger.info(`Webhook received: ${webhookLog.id} for integration ${integration.id}`);

    // 非同期で処理（バックグラウンドジョブ）
    // ここではすぐにレスポンスを返す
    res.status(200).json({ received: true, logId: webhookLog.id });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/external-integrations/freee/transactions:
 *   get:
 *     summary: freee取引一覧を取得
 *     tags: [ExternalIntegrations]
 */
router.get('/freee/transactions', async (req, res, next) => {
  try {
    const { status, type, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.transactionType = type;

    const [transactions, total] = await Promise.all([
      prisma.freeeTransaction.findMany({
        where,
        orderBy: { issueDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.freeeTransaction.count({ where }),
    ]);

    res.json({
      data: transactions,
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
 * /api/external-integrations/shopify/products:
 *   get:
 *     summary: Shopify商品一覧を取得
 *     tags: [ExternalIntegrations]
 */
router.get('/shopify/products', async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [products, total] = await Promise.all([
      prisma.shopifyProduct.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.shopifyProduct.count({ where }),
    ]);

    res.json({
      data: products,
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

export { router as externalIntegrationsRouter };

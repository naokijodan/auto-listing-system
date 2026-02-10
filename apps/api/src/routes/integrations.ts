import { Router } from 'express';
import {
  prisma,
  IntegrationType,
  IntegrationAuthType,
  IntegrationSyncType,
  IntegrationSyncStatus,
  AccountingExportType,
  AccountingFormat,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'integrations' });

/**
 * 外部連携一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { type, provider, isEnabled } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (provider) where.provider = provider;
    if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true';

    const integrations = await prisma.externalIntegration.findMany({
      where,
      include: {
        _count: {
          select: {
            credentials: true,
            syncLogs: true,
            analyticsEvents: true,
            accountingExports: true,
          },
        },
      },
      orderBy: { displayName: 'asc' },
    });

    res.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 外部連携詳細取得
 */
router.get('/:id', async (req, res, next) => {
  try {
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: req.params.id },
      include: {
        credentials: {
          select: {
            id: true,
            authType: true,
            tokenType: true,
            scope: true,
            expiresAt: true,
            accountId: true,
            isValid: true,
            lastValidatedAt: true,
            lastRefreshedAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        syncLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            analyticsEvents: true,
            accountingExports: true,
          },
        },
      },
    });

    if (!integration) {
      throw new AppError(404, 'Integration not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: integration,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 外部連携作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      displayName,
      description,
      type,
      provider,
      config = {},
      webhookUrl,
      scopes = [],
    } = req.body;

    if (!name || !displayName || !type || !provider) {
      throw new AppError(
        400,
        'name, displayName, type, and provider are required',
        'INVALID_INPUT'
      );
    }

    const validTypes = Object.values(IntegrationType);
    if (!validTypes.includes(type)) {
      throw new AppError(400, `Invalid type: ${type}`, 'INVALID_INPUT');
    }

    const integration = await prisma.externalIntegration.create({
      data: {
        name,
        displayName,
        description,
        type,
        provider,
        config,
        webhookUrl,
        scopes,
      },
    });

    log.info({ integrationId: integration.id, name }, 'Integration created');

    res.status(201).json({
      success: true,
      data: integration,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 外部連携更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      displayName,
      description,
      config,
      webhookUrl,
      scopes,
      isEnabled,
    } = req.body;

    const integration = await prisma.externalIntegration.update({
      where: { id: req.params.id },
      data: {
        ...(displayName !== undefined && { displayName }),
        ...(description !== undefined && { description }),
        ...(config !== undefined && { config }),
        ...(webhookUrl !== undefined && { webhookUrl }),
        ...(scopes !== undefined && { scopes }),
        ...(isEnabled !== undefined && { isEnabled }),
      },
    });

    res.json({
      success: true,
      data: integration,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 認証情報を保存
 */
router.post('/:id/credentials', async (req, res, next) => {
  try {
    const {
      authType,
      accessToken,
      refreshToken,
      tokenType,
      scope,
      expiresAt,
      apiKey,
      apiSecret,
      username,
      password,
      accountId,
      metadata = {},
    } = req.body;

    if (!authType) {
      throw new AppError(400, 'authType is required', 'INVALID_INPUT');
    }

    const validAuthTypes = Object.values(IntegrationAuthType);
    if (!validAuthTypes.includes(authType)) {
      throw new AppError(400, `Invalid authType: ${authType}`, 'INVALID_INPUT');
    }

    // 既存の認証情報を無効化
    await prisma.integrationCredential.updateMany({
      where: { integrationId: req.params.id },
      data: { isValid: false },
    });

    const credential = await prisma.integrationCredential.create({
      data: {
        integrationId: req.params.id,
        authType,
        accessToken,
        refreshToken,
        tokenType,
        scope,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        apiKey,
        apiSecret,
        username,
        password,
        accountId,
        metadata,
        isValid: true,
        lastValidatedAt: new Date(),
      },
    });

    // 連携を設定済みとしてマーク
    await prisma.externalIntegration.update({
      where: { id: req.params.id },
      data: { isConfigured: true },
    });

    log.info({ integrationId: req.params.id, credentialId: credential.id }, 'Credential saved');

    res.status(201).json({
      success: true,
      data: {
        id: credential.id,
        authType: credential.authType,
        isValid: credential.isValid,
        expiresAt: credential.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ヘルスチェック
 */
router.post('/:id/health-check', async (req, res, next) => {
  try {
    const integration = await prisma.externalIntegration.findUnique({
      where: { id: req.params.id },
      include: {
        credentials: {
          where: { isValid: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!integration) {
      throw new AppError(404, 'Integration not found', 'NOT_FOUND');
    }

    let healthStatus = 'UNKNOWN';
    let message = '';

    if (!integration.isConfigured || integration.credentials.length === 0) {
      healthStatus = 'UNHEALTHY';
      message = 'Integration is not configured';
    } else {
      const credential = integration.credentials[0];

      if (credential.expiresAt && credential.expiresAt < new Date()) {
        healthStatus = 'DEGRADED';
        message = 'Access token has expired';
      } else {
        healthStatus = 'HEALTHY';
        message = 'Integration is healthy';
      }
    }

    await prisma.externalIntegration.update({
      where: { id: req.params.id },
      data: {
        healthStatus: healthStatus as any,
        lastHealthCheck: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        healthStatus,
        message,
        lastHealthCheck: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 同期ログ一覧取得
 */
router.get('/:id/sync-logs', async (req, res, next) => {
  try {
    const { status, syncType, limit = '20', offset = '0' } = req.query;

    const where: any = { integrationId: req.params.id };
    if (status) where.status = status;
    if (syncType) where.syncType = syncType;

    const [logs, total] = await Promise.all([
      prisma.integrationSyncLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.integrationSyncLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アナリティクスイベント一覧取得
 */
router.get('/:id/analytics-events', async (req, res, next) => {
  try {
    const { status, eventName, limit = '50', offset = '0' } = req.query;

    const where: any = { integrationId: req.params.id };
    if (status) where.status = status;
    if (eventName) where.eventName = eventName;

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * アナリティクスイベントを記録
 */
router.post('/:id/analytics-events', async (req, res, next) => {
  try {
    const {
      eventName,
      eventCategory,
      eventLabel,
      eventValue,
      parameters = {},
      userId,
      sessionId,
      clientId,
    } = req.body;

    if (!eventName) {
      throw new AppError(400, 'eventName is required', 'INVALID_INPUT');
    }

    const event = await prisma.analyticsEvent.create({
      data: {
        integrationId: req.params.id,
        eventName,
        eventCategory,
        eventLabel,
        eventValue,
        parameters,
        userId,
        sessionId,
        clientId,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 会計エクスポート一覧取得
 */
router.get('/:id/accounting-exports', async (req, res, next) => {
  try {
    const { status, exportType, limit = '20', offset = '0' } = req.query;

    const where: any = { integrationId: req.params.id };
    if (status) where.status = status;
    if (exportType) where.exportType = exportType;

    const [exports, total] = await Promise.all([
      prisma.accountingExport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.accountingExport.count({ where }),
    ]);

    res.json({
      success: true,
      data: exports,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 会計エクスポートを作成
 */
router.post('/:id/accounting-exports', async (req, res, next) => {
  try {
    const {
      exportType,
      periodStart,
      periodEnd,
      format = 'CSV',
      includeOrders = true,
      includeRefunds = true,
      includeShipping = true,
      includeFees = true,
    } = req.body;

    if (!exportType || !periodStart || !periodEnd) {
      throw new AppError(
        400,
        'exportType, periodStart, and periodEnd are required',
        'INVALID_INPUT'
      );
    }

    const validExportTypes = Object.values(AccountingExportType);
    if (!validExportTypes.includes(exportType)) {
      throw new AppError(400, `Invalid exportType: ${exportType}`, 'INVALID_INPUT');
    }

    const validFormats = Object.values(AccountingFormat);
    if (!validFormats.includes(format)) {
      throw new AppError(400, `Invalid format: ${format}`, 'INVALID_INPUT');
    }

    const exportJob = await prisma.accountingExport.create({
      data: {
        integrationId: req.params.id,
        exportType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        format,
        includeOrders,
        includeRefunds,
        includeShipping,
        includeFees,
        status: 'PENDING',
      },
    });

    log.info({ exportId: exportJob.id, exportType }, 'Accounting export created');

    res.status(201).json({
      success: true,
      data: exportJob,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 会計マッピング一覧取得
 */
router.get('/accounting-mappings', async (req, res, next) => {
  try {
    const { provider } = req.query;

    const where: any = { isActive: true };
    if (provider) where.provider = provider;

    const mappings = await prisma.accountingMapping.findMany({
      where,
      orderBy: { sourceField: 'asc' },
    });

    res.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 会計マッピングを作成/更新
 */
router.post('/accounting-mappings', async (req, res, next) => {
  try {
    const {
      provider,
      sourceField,
      targetField,
      transformation,
      categoryType,
      categoryCode,
      categoryName,
    } = req.body;

    if (!provider || !sourceField || !targetField) {
      throw new AppError(
        400,
        'provider, sourceField, and targetField are required',
        'INVALID_INPUT'
      );
    }

    const mapping = await prisma.accountingMapping.upsert({
      where: {
        provider_sourceField: { provider, sourceField },
      },
      update: {
        targetField,
        transformation,
        categoryType,
        categoryCode,
        categoryName,
      },
      create: {
        provider,
        sourceField,
        targetField,
        transformation,
        categoryType,
        categoryCode,
        categoryName,
      },
    });

    res.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 連携統計
 */
router.get('/stats/overview', async (_req, res, next) => {
  try {
    const [
      totalIntegrations,
      enabledIntegrations,
      healthyIntegrations,
      recentSyncs,
      pendingEvents,
    ] = await Promise.all([
      prisma.externalIntegration.count(),
      prisma.externalIntegration.count({ where: { isEnabled: true } }),
      prisma.externalIntegration.count({ where: { healthStatus: 'HEALTHY' } }),
      prisma.integrationSyncLog.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      prisma.analyticsEvent.count({ where: { status: 'PENDING' } }),
    ]);

    // プロバイダ別集計
    const byProvider = await prisma.externalIntegration.groupBy({
      by: ['provider'],
      _count: true,
    });

    // タイプ別集計
    const byType = await prisma.externalIntegration.groupBy({
      by: ['type'],
      _count: true,
    });

    res.json({
      success: true,
      data: {
        totalIntegrations,
        enabledIntegrations,
        healthyIntegrations,
        recentSyncs,
        pendingEvents,
        byProvider: byProvider.reduce((acc, item) => {
          acc[item.provider] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 連携タイプ一覧
 */
router.get('/types', async (_req, res, next) => {
  try {
    const types = Object.values(IntegrationType).map((type) => ({
      value: type,
      label: getIntegrationTypeLabel(type),
    }));

    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 認証タイプ一覧
 */
router.get('/auth-types', async (_req, res, next) => {
  try {
    const authTypes = Object.values(IntegrationAuthType).map((type) => ({
      value: type,
      label: getAuthTypeLabel(type),
    }));

    res.json({
      success: true,
      data: authTypes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 同期タイプ一覧
 */
router.get('/sync-types', async (_req, res, next) => {
  try {
    const syncTypes = Object.values(IntegrationSyncType).map((type) => ({
      value: type,
      label: getSyncTypeLabel(type),
    }));

    res.json({
      success: true,
      data: syncTypes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 同期ステータス一覧
 */
router.get('/sync-statuses', async (_req, res, next) => {
  try {
    const statuses = Object.values(IntegrationSyncStatus).map((status) => ({
      value: status,
      label: getSyncStatusLabel(status),
    }));

    res.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function getIntegrationTypeLabel(type: IntegrationType): string {
  const labels: Record<IntegrationType, string> = {
    ANALYTICS: '分析ツール',
    ACCOUNTING: '会計ソフト',
    MARKETING: 'マーケティング',
    SHIPPING: '配送',
    PAYMENT: '決済',
    CRM: '顧客管理',
    CUSTOM: 'カスタム',
  };
  return labels[type] || type;
}

function getAuthTypeLabel(type: IntegrationAuthType): string {
  const labels: Record<IntegrationAuthType, string> = {
    OAUTH2: 'OAuth 2.0',
    API_KEY: 'APIキー',
    BASIC: 'Basic認証',
    BEARER: 'Bearerトークン',
    CUSTOM: 'カスタム',
  };
  return labels[type] || type;
}

function getSyncTypeLabel(type: IntegrationSyncType): string {
  const labels: Record<IntegrationSyncType, string> = {
    FULL: '全件同期',
    INCREMENTAL: '差分同期',
    MANUAL: '手動同期',
    WEBHOOK: 'Webhook',
    SCHEDULED: 'スケジュール同期',
  };
  return labels[type] || type;
}

function getSyncStatusLabel(status: IntegrationSyncStatus): string {
  const labels: Record<IntegrationSyncStatus, string> = {
    PENDING: '待機中',
    IN_PROGRESS: '実行中',
    COMPLETED: '完了',
    FAILED: '失敗',
    CANCELLED: 'キャンセル',
    PARTIAL: '一部成功',
  };
  return labels[status] || status;
}

export { router as integrationsRouter };

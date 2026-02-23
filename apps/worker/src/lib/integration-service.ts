/**
 * 外部連携サービス
 * Phase 34: 外部連携強化
 */

import {
  prisma,
  IntegrationType,
  IntegrationAuthType,
  IntegrationSyncType,
  SyncDirection,
  IntegrationSyncStatus,
  IntegrationHealthStatus,
  AnalyticsEventStatus,
  AccountingExportType,
  AccountingFormat,
  AccountingExportStatus,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as crypto from 'crypto';

const log = logger.child({ module: 'integration-service' });

// 暗号化設定
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// ========================================
// 外部連携管理
// ========================================

export interface CreateIntegrationParams {
  name: string;
  displayName: string;
  description?: string;
  type: IntegrationType;
  provider: string;
  config?: Record<string, unknown>;
  webhookUrl?: string;
  scopes?: string[];
}

/**
 * 外部連携を作成
 */
export async function createIntegration(params: CreateIntegrationParams): Promise<{ id: string }> {
  const integration = await prisma.externalIntegration.create({
    data: {
      name: params.name,
      displayName: params.displayName,
      description: params.description,
      type: params.type,
      provider: params.provider,
      config: (params.config || {}) as any,
      webhookUrl: params.webhookUrl,
      scopes: params.scopes || [],
    },
  });

  log.info({ integrationId: integration.id, name: params.name }, 'Integration created');

  return { id: integration.id };
}

/**
 * 外部連携一覧を取得
 */
export async function getIntegrations(params?: {
  type?: IntegrationType;
  provider?: string;
  isEnabled?: boolean;
}): Promise<unknown[]> {
  const where: Record<string, unknown> = {};

  if (params?.type) where.type = params.type;
  if (params?.provider) where.provider = params.provider;
  if (params?.isEnabled !== undefined) where.isEnabled = params.isEnabled;

  return prisma.externalIntegration.findMany({
    where: where as any,
    include: {
      _count: {
        select: {
          credentials: true,
          syncLogs: true,
        },
      },
    },
    orderBy: { displayName: 'asc' },
  });
}

/**
 * 外部連携のヘルスチェック
 */
export async function checkIntegrationHealth(integrationId: string): Promise<IntegrationHealthStatus> {
  const integration = await prisma.externalIntegration.findUnique({
    where: { id: integrationId },
    include: {
      credentials: {
        where: { isValid: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!integration) {
    return 'UNKNOWN';
  }

  if (!integration.isConfigured || integration.credentials.length === 0) {
    return 'UNHEALTHY';
  }

  const credential = integration.credentials[0];

  // トークンの有効期限チェック
  if (credential.expiresAt && credential.expiresAt < new Date()) {
    await prisma.externalIntegration.update({
      where: { id: integrationId },
      data: {
        healthStatus: 'DEGRADED',
        lastHealthCheck: new Date(),
      },
    });
    return 'DEGRADED';
  }

  // 実際のヘルスチェックはプロバイダごとに実装
  // ここでは簡略化
  await prisma.externalIntegration.update({
    where: { id: integrationId },
    data: {
      healthStatus: 'HEALTHY',
      lastHealthCheck: new Date(),
    },
  });

  return 'HEALTHY';
}

// ========================================
// 認証情報管理
// ========================================

export interface SaveCredentialParams {
  integrationId: string;
  authType: IntegrationAuthType;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: Date;
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  accountId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 認証情報を保存
 */
export async function saveCredential(params: SaveCredentialParams): Promise<{ id: string }> {
  // 既存の認証情報を無効化
  await prisma.integrationCredential.updateMany({
    where: { integrationId: params.integrationId },
    data: { isValid: false },
  });

  // 暗号化して保存
  const credential = await prisma.integrationCredential.create({
    data: {
      integrationId: params.integrationId,
      authType: params.authType,
      accessToken: params.accessToken ? encrypt(params.accessToken) : null,
      refreshToken: params.refreshToken ? encrypt(params.refreshToken) : null,
      tokenType: params.tokenType,
      scope: params.scope,
      expiresAt: params.expiresAt,
      apiKey: params.apiKey ? encrypt(params.apiKey) : null,
      apiSecret: params.apiSecret ? encrypt(params.apiSecret) : null,
      username: params.username,
      password: params.password ? encrypt(params.password) : null,
      accountId: params.accountId,
      metadata: (params.metadata || {}) as any,
      isValid: true,
      lastValidatedAt: new Date(),
    },
  });

  // 連携を設定済みとしてマーク
  await prisma.externalIntegration.update({
    where: { id: params.integrationId },
    data: { isConfigured: true },
  });

  log.info({ integrationId: params.integrationId, credentialId: credential.id }, 'Credential saved');

  return { id: credential.id };
}

/**
 * 認証情報を取得（復号化済み）
 */
export async function getCredential(integrationId: string): Promise<{
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  username?: string;
  password?: string;
  expiresAt?: Date;
  accountId?: string;
} | null> {
  const credential = await prisma.integrationCredential.findFirst({
    where: {
      integrationId,
      isValid: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!credential) {
    return null;
  }

  return {
    accessToken: credential.accessToken ? decrypt(credential.accessToken) : undefined,
    refreshToken: credential.refreshToken ? decrypt(credential.refreshToken) : undefined,
    apiKey: credential.apiKey ? decrypt(credential.apiKey) : undefined,
    apiSecret: credential.apiSecret ? decrypt(credential.apiSecret) : undefined,
    username: credential.username || undefined,
    password: credential.password ? decrypt(credential.password) : undefined,
    expiresAt: credential.expiresAt || undefined,
    accountId: credential.accountId || undefined,
  };
}

/**
 * OAuthトークンをリフレッシュ
 */
export async function refreshOAuthToken(
  integrationId: string,
  newAccessToken: string,
  newRefreshToken?: string,
  expiresAt?: Date
): Promise<void> {
  const credential = await prisma.integrationCredential.findFirst({
    where: { integrationId, isValid: true },
  });

  if (!credential) {
    throw new Error('No valid credential found');
  }

  await prisma.integrationCredential.update({
    where: { id: credential.id },
    data: {
      accessToken: encrypt(newAccessToken),
      refreshToken: newRefreshToken ? encrypt(newRefreshToken) : credential.refreshToken,
      expiresAt,
      lastRefreshedAt: new Date(),
    },
  });

  log.info({ integrationId }, 'OAuth token refreshed');
}

// ========================================
// 同期ログ管理
// ========================================

export interface StartSyncParams {
  integrationId: string;
  syncType: IntegrationSyncType;
  direction: SyncDirection;
  entityType?: string;
}

/**
 * 同期を開始
 */
export async function startSync(params: StartSyncParams): Promise<{ syncLogId: string }> {
  const syncLog = await prisma.integrationSyncLog.create({
    data: {
      integrationId: params.integrationId,
      syncType: params.syncType,
      direction: params.direction,
      entityType: params.entityType,
      status: 'IN_PROGRESS',
    },
  });

  return { syncLogId: syncLog.id };
}

/**
 * 同期を完了
 */
export async function completeSync(
  syncLogId: string,
  result: {
    successCount: number;
    failureCount: number;
    skippedCount: number;
    entityCount: number;
  }
): Promise<void> {
  const syncLog = await prisma.integrationSyncLog.findUnique({
    where: { id: syncLogId },
  });

  if (!syncLog) {
    throw new Error('Sync log not found');
  }

  const status: IntegrationSyncStatus =
    result.failureCount === 0
      ? 'COMPLETED'
      : result.successCount > 0
        ? 'PARTIAL'
        : 'FAILED';

  const duration = Date.now() - syncLog.startedAt.getTime();

  await prisma.integrationSyncLog.update({
    where: { id: syncLogId },
    data: {
      status,
      completedAt: new Date(),
      duration,
      successCount: result.successCount,
      failureCount: result.failureCount,
      skippedCount: result.skippedCount,
      entityCount: result.entityCount,
    },
  });

  // 統計を更新
  await prisma.externalIntegration.update({
    where: { id: syncLog.integrationId },
    data: {
      totalSyncs: { increment: 1 },
      successfulSyncs: status === 'COMPLETED' ? { increment: 1 } : undefined,
      failedSyncs: status === 'FAILED' ? { increment: 1 } : undefined,
    },
  });
}

/**
 * 同期をエラーで終了
 */
export async function failSync(
  syncLogId: string,
  error: {
    code?: string;
    message: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const syncLog = await prisma.integrationSyncLog.findUnique({
    where: { id: syncLogId },
  });

  if (!syncLog) {
    throw new Error('Sync log not found');
  }

  const duration = Date.now() - syncLog.startedAt.getTime();
  const shouldRetry = syncLog.retryCount < syncLog.maxRetries;

  await prisma.integrationSyncLog.update({
    where: { id: syncLogId },
    data: {
      status: shouldRetry ? 'PENDING' : 'FAILED',
      completedAt: new Date(),
      duration,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details as any,
      retryCount: { increment: 1 },
      nextRetryAt: shouldRetry ? new Date(Date.now() + 60000 * Math.pow(2, syncLog.retryCount)) : null,
    },
  });

  // 統計を更新
  await prisma.externalIntegration.update({
    where: { id: syncLog.integrationId },
    data: {
      totalSyncs: { increment: 1 },
      failedSyncs: { increment: 1 },
    },
  });

  log.error({ syncLogId, error }, 'Sync failed');
}

/**
 * 同期ログを取得
 */
export async function getSyncLogs(params: {
  integrationId?: string;
  status?: IntegrationSyncStatus;
  syncType?: IntegrationSyncType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: unknown[]; total: number }> {
  const where: Record<string, unknown> = {};

  if (params.integrationId) where.integrationId = params.integrationId;
  if (params.status) where.status = params.status;
  if (params.syncType) where.syncType = params.syncType;

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) (where.createdAt as Record<string, Date>).gte = params.startDate;
    if (params.endDate) (where.createdAt as Record<string, Date>).lte = params.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.integrationSyncLog.findMany({
      where: where as any,
      include: {
        ExternalIntegration: { select: { name: true, displayName: true, provider: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
    }),
    prisma.integrationSyncLog.count({ where: where as any }),
  ]);

  return { logs, total };
}

// ========================================
// アナリティクスイベント
// ========================================

export interface TrackEventParams {
  integrationId: string;
  eventName: string;
  eventCategory?: string;
  eventLabel?: string;
  eventValue?: number;
  parameters?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  clientId?: string;
}

/**
 * アナリティクスイベントを記録
 */
export async function trackEvent(params: TrackEventParams): Promise<{ eventId: string }> {
  const event = await prisma.analyticsEvent.create({
    data: {
      integrationId: params.integrationId,
      eventName: params.eventName,
      eventCategory: params.eventCategory,
      eventLabel: params.eventLabel,
      eventValue: params.eventValue,
      parameters: (params.parameters || {}) as any,
      userId: params.userId,
      sessionId: params.sessionId,
      clientId: params.clientId,
      status: 'PENDING',
    },
  });

  return { eventId: event.id };
}

/**
 * 保留中のイベントを送信
 */
export async function sendPendingEvents(integrationId: string, batchSize: number = 100): Promise<{
  sent: number;
  failed: number;
}> {
  const events = await prisma.analyticsEvent.findMany({
    where: {
      integrationId,
      status: { in: ['PENDING', 'RETRYING'] },
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  const integration = await prisma.externalIntegration.findUnique({
    where: { id: integrationId },
  });

  if (!integration) {
    throw new Error('Integration not found');
  }

  let sent = 0;
  let failed = 0;

  for (const event of events) {
    try {
      // プロバイダ固有の送信処理
      await sendEventToProvider(integration.provider, event);

      await prisma.analyticsEvent.update({
        where: { id: event.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      sent++;
    } catch (error) {
      const maxRetries = 3;
      const shouldRetry = event.retryCount < maxRetries;

      await prisma.analyticsEvent.update({
        where: { id: event.id },
        data: {
          status: shouldRetry ? 'RETRYING' : 'FAILED',
          retryCount: { increment: 1 },
          errorMessage: (error as Error).message,
        },
      });

      failed++;
    }
  }

  log.info({ integrationId, sent, failed }, 'Analytics events processed');

  return { sent, failed };
}

/**
 * プロバイダにイベントを送信（実装例）
 */
async function sendEventToProvider(provider: string, event: any): Promise<void> {
  switch (provider) {
    case 'google':
      // Google Analytics 4 Measurement Protocol
      // 実際の実装では fetch を使用
      log.debug({ eventId: event.id, eventName: event.eventName }, 'Sending to GA4');
      break;
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ========================================
// 会計エクスポート
// ========================================

export interface CreateAccountingExportParams {
  integrationId: string;
  exportType: AccountingExportType;
  periodStart: Date;
  periodEnd: Date;
  format?: AccountingFormat;
  includeOrders?: boolean;
  includeRefunds?: boolean;
  includeShipping?: boolean;
  includeFees?: boolean;
}

/**
 * 会計エクスポートを作成
 */
export async function createAccountingExport(params: CreateAccountingExportParams): Promise<{ exportId: string }> {
  const exportJob = await prisma.accountingExport.create({
    data: {
      integrationId: params.integrationId,
      exportType: params.exportType,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      format: params.format || 'CSV',
      includeOrders: params.includeOrders ?? true,
      includeRefunds: params.includeRefunds ?? true,
      includeShipping: params.includeShipping ?? true,
      includeFees: params.includeFees ?? true,
      status: 'PENDING',
    },
  });

  return { exportId: exportJob.id };
}

/**
 * 会計エクスポートを実行
 */
export async function executeAccountingExport(exportId: string): Promise<{
  totalRecords: number;
  totalAmount: number;
  fileUrl?: string;
}> {
  const exportJob = await prisma.accountingExport.findUnique({
    where: { id: exportId },
    include: { ExternalIntegration: true },
  });

  if (!exportJob) {
    throw new Error('Export job not found');
  }

  await prisma.accountingExport.update({
    where: { id: exportId },
    data: {
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  try {
    // 注文データを取得
    const orders = exportJob.includeOrders
      ? await prisma.order.findMany({
          where: {
            createdAt: {
              gte: exportJob.periodStart,
              lte: exportJob.periodEnd,
            },
          },
        })
      : [];

    // 集計
    const totalRecords = orders.length;
    const orderTotal = orders.reduce((sum: number, order) => sum + order.total, 0);
    const totalAmount = orderTotal;

    // フォーマットに応じてファイルを生成
    // 実際の実装では、CSV/JSON/XML等を生成してS3にアップロード
    const fileUrl = `exports/accounting/${exportId}.${exportJob.format.toLowerCase()}`;

    await prisma.accountingExport.update({
      where: { id: exportId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalRecords,
        totalAmount,
        fileUrl,
      },
    });

    log.info({ exportId, totalRecords, totalAmount }, 'Accounting export completed');

    return { totalRecords, totalAmount, fileUrl };
  } catch (error) {
    await prisma.accountingExport.update({
      where: { id: exportId },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
      },
    });

    throw error;
  }
}

/**
 * 会計マッピングを取得
 */
export async function getAccountingMappings(provider: string): Promise<unknown[]> {
  return prisma.accountingMapping.findMany({
    where: { provider, isActive: true },
  });
}

/**
 * 会計マッピングを作成/更新
 */
export async function upsertAccountingMapping(params: {
  provider: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  categoryType?: string;
  categoryCode?: string;
  categoryName?: string;
}): Promise<void> {
  await prisma.accountingMapping.upsert({
    where: {
      provider_sourceField: {
        provider: params.provider,
        sourceField: params.sourceField,
      },
    },
    update: {
      targetField: params.targetField,
      transformation: params.transformation,
      categoryType: params.categoryType as any,
      categoryCode: params.categoryCode,
      categoryName: params.categoryName,
    },
    create: {
      provider: params.provider,
      sourceField: params.sourceField,
      targetField: params.targetField,
      transformation: params.transformation,
      categoryType: params.categoryType as any,
      categoryCode: params.categoryCode,
      categoryName: params.categoryName,
    },
  });
}

// ========================================
// 抽象基底クラス（SDK）
// ========================================

/**
 * 外部連携サービスの基底クラス
 */
export abstract class BaseIntegrationService {
  protected integrationId: string;
  protected integration: any;
  protected credential: any;

  constructor(integrationId: string) {
    this.integrationId = integrationId;
  }

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    this.integration = await prisma.externalIntegration.findUnique({
      where: { id: this.integrationId },
    });

    if (!this.integration) {
      throw new Error('Integration not found');
    }

    this.credential = await getCredential(this.integrationId);
  }

  /**
   * ヘルスチェック
   */
  abstract healthCheck(): Promise<{ success: boolean; message: string }>;

  /**
   * 実行
   */
  abstract execute(payload: unknown): Promise<void>;

  /**
   * トークンリフレッシュ
   */
  async refreshToken?(): Promise<void>;

  /**
   * ログ付き実行
   */
  protected async executeWithLogging<T>(
    syncType: IntegrationSyncType,
    direction: SyncDirection,
    entityType: string,
    logic: () => Promise<T>
  ): Promise<T> {
    const { syncLogId } = await startSync({
      integrationId: this.integrationId,
      syncType,
      direction,
      entityType,
    });

    try {
      const result = await logic();

      await completeSync(syncLogId, {
        successCount: 1,
        failureCount: 0,
        skippedCount: 0,
        entityCount: 1,
      });

      return result;
    } catch (error) {
      await failSync(syncLogId, {
        message: (error as Error).message,
      });
      throw error;
    }
  }
}

// ========================================
// Google Analytics 4 連携サービス
// ========================================

export class GoogleAnalyticsService extends BaseIntegrationService {
  private measurementId?: string;
  private apiSecret?: string;

  async initialize(): Promise<void> {
    await super.initialize();

    const config = this.integration.config as Record<string, string>;
    this.measurementId = config.measurementId;
    this.apiSecret = this.credential?.apiSecret;
  }

  async healthCheck(): Promise<{ success: boolean; message: string }> {
    if (!this.measurementId || !this.apiSecret) {
      return { success: false, message: 'Missing measurement ID or API secret' };
    }

    // 実際のヘルスチェック実装
    return { success: true, message: 'Google Analytics connection is healthy' };
  }

  async execute(payload: {
    eventName: string;
    clientId: string;
    params?: Record<string, unknown>;
  }): Promise<void> {
    await this.executeWithLogging('MANUAL', 'OUTBOUND', 'analytics_event', async () => {
      // GA4 Measurement Protocol
      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

      const body = {
        client_id: payload.clientId,
        events: [
          {
            name: payload.eventName,
            params: payload.params || {},
          },
        ],
      };

      // 実際のfetch呼び出し
      log.info({ eventName: payload.eventName }, 'Sending event to GA4');

      // await fetch(url, {
      //   method: 'POST',
      //   body: JSON.stringify(body),
      // });
    });
  }

  /**
   * Eコマースイベントを送信
   */
  async trackPurchase(params: {
    clientId: string;
    transactionId: string;
    value: number;
    currency: string;
    items: Array<{
      itemId: string;
      itemName: string;
      price: number;
      quantity: number;
    }>;
  }): Promise<void> {
    await this.execute({
      eventName: 'purchase',
      clientId: params.clientId,
      params: {
        transaction_id: params.transactionId,
        value: params.value,
        currency: params.currency,
        items: params.items.map((item) => ({
          item_id: item.itemId,
          item_name: item.itemName,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    });
  }
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * 文字列を暗号化
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 文字列を復号化
 */
function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

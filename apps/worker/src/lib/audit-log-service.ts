import { prisma, Prisma, ActorType, AuditEntityType, AuditAction, AuditSeverity } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'audit-log-service' });

export interface AuditLogInput {
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  ipAddress?: string;
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  action: AuditAction;
  description: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changedFields?: string[];
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
}

/**
 * 監査ログを記録
 */
export async function createAuditLog(input: AuditLogInput): Promise<string> {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId,
        actorName: input.actorName,
        ipAddress: input.ipAddress,
        entityType: input.entityType,
        entityId: input.entityId,
        entityName: input.entityName,
        action: input.action,
        description: input.description,
        previousValue: input.previousValue as any,
        newValue: input.newValue as any,
        changedFields: input.changedFields || [],
        metadata: input.metadata as any || {},
        severity: input.severity || 'INFO',
      },
    });

    log.debug({
      auditLogId: auditLog.id,
      entityType: input.entityType,
      action: input.action,
    }, 'Audit log created');

    return auditLog.id;
  } catch (error) {
    log.error({ error, input }, 'Failed to create audit log');
    throw error;
  }
}

/**
 * エンティティの変更を検出してログに記録
 */
export async function logEntityChange<T extends Record<string, any>>(options: {
  actorType: ActorType;
  actorId?: string;
  actorName?: string;
  ipAddress?: string;
  entityType: AuditEntityType;
  entityId: string;
  entityName?: string;
  action: AuditAction;
  previousValue?: T;
  newValue?: T;
  description?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const changedFields: string[] = [];

  // 変更されたフィールドを検出
  if (options.previousValue && options.newValue) {
    const allKeys = new Set([
      ...Object.keys(options.previousValue),
      ...Object.keys(options.newValue),
    ]);

    for (const key of allKeys) {
      const prev = options.previousValue[key];
      const next = options.newValue[key];

      if (JSON.stringify(prev) !== JSON.stringify(next)) {
        changedFields.push(key);
      }
    }
  }

  const description = options.description || generateDescription(
    options.action,
    options.entityType,
    options.entityName || options.entityId,
    changedFields
  );

  return createAuditLog({
    actorType: options.actorType,
    actorId: options.actorId,
    actorName: options.actorName,
    ipAddress: options.ipAddress,
    entityType: options.entityType,
    entityId: options.entityId,
    entityName: options.entityName,
    action: options.action,
    description,
    previousValue: options.previousValue,
    newValue: options.newValue,
    changedFields,
    metadata: options.metadata,
    severity: getSeverityForAction(options.action),
  });
}

/**
 * システム操作をログに記録
 */
export async function logSystemAction(options: {
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  action: AuditAction;
  description: string;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
}): Promise<string> {
  return createAuditLog({
    actorType: 'SYSTEM',
    actorName: 'System',
    ...options,
  });
}

/**
 * スケジューラー操作をログに記録
 */
export async function logSchedulerAction(options: {
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  action: AuditAction;
  description: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  return createAuditLog({
    actorType: 'SCHEDULER',
    actorName: 'Scheduler',
    ...options,
    severity: 'INFO',
  });
}

/**
 * Webhook操作をログに記録
 */
export async function logWebhookAction(options: {
  entityType: AuditEntityType;
  entityId?: string;
  entityName?: string;
  action: AuditAction;
  description: string;
  webhookSource?: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  return createAuditLog({
    actorType: 'WEBHOOK',
    actorName: options.webhookSource || 'Webhook',
    entityType: options.entityType,
    entityId: options.entityId,
    entityName: options.entityName,
    action: options.action,
    description: options.description,
    metadata: {
      ...options.metadata,
      webhookSource: options.webhookSource,
    },
    severity: 'INFO',
  });
}

/**
 * 監査ログを検索
 */
export async function searchAuditLogs(options: {
  entityType?: AuditEntityType;
  entityId?: string;
  actorType?: ActorType;
  actorId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ logs: any[]; total: number }> {
  const where: any = {};

  if (options.entityType) where.entityType = options.entityType;
  if (options.entityId) where.entityId = options.entityId;
  if (options.actorType) where.actorType = options.actorType;
  if (options.actorId) where.actorId = options.actorId;
  if (options.action) where.action = options.action;
  if (options.severity) where.severity = options.severity;

  if (options.startDate || options.endDate) {
    where.createdAt = {};
    if (options.startDate) where.createdAt.gte = options.startDate;
    if (options.endDate) where.createdAt.lte = options.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      take: options.limit || 50,
      skip: options.offset || 0,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * エンティティの変更履歴を取得
 */
export async function getEntityHistory(
  entityType: AuditEntityType,
  entityId: string,
  limit: number = 20
): Promise<any[]> {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * 監査ログの統計を取得
 */
export async function getAuditStats(options: {
  startDate: Date;
  endDate: Date;
}): Promise<{
  totalLogs: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  bySeverity: Record<string, number>;
}> {
  const where = {
    createdAt: {
      gte: options.startDate,
      lte: options.endDate,
    },
  };

  const [totalLogs, byAction, byEntityType, bySeverity] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    }),
    prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: true,
    }),
    prisma.auditLog.groupBy({
      by: ['severity'],
      where,
      _count: true,
    }),
  ]);

  return {
    totalLogs,
    byAction: byAction.reduce((acc, item) => {
      acc[item.action] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byEntityType: byEntityType.reduce((acc, item) => {
      acc[item.entityType] = item._count;
      return acc;
    }, {} as Record<string, number>),
    bySeverity: bySeverity.reduce((acc, item) => {
      acc[item.severity] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}

/**
 * 古い監査ログを削除（アーカイブ用）
 */
export async function cleanupOldAuditLogs(retentionDays: number = 90): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await prisma.auditLog.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      severity: { in: ['DEBUG', 'INFO'] }, // 重要度の低いログのみ削除
    },
  });

  log.info({
    deletedCount: result.count,
    retentionDays,
    cutoffDate,
  }, 'Old audit logs cleaned up');

  return result.count;
}

// ヘルパー関数

function generateDescription(
  action: AuditAction,
  entityType: AuditEntityType,
  entityName: string | undefined,
  changedFields: string[]
): string {
  const actionVerbs: Record<AuditAction, string> = {
    CREATE: '作成',
    UPDATE: '更新',
    DELETE: '削除',
    PUBLISH: '公開',
    UNPUBLISH: '非公開化',
    PAUSE: '一時停止',
    RESUME: '再開',
    APPROVE: '承認',
    REJECT: '拒否',
    EXPORT: 'エクスポート',
    IMPORT: 'インポート',
    SYNC: '同期',
    SEND: '送信',
    LOGIN: 'ログイン',
    LOGOUT: 'ログアウト',
  };

  const entityNames: Record<AuditEntityType, string> = {
    PRODUCT: '商品',
    LISTING: '出品',
    ORDER: '注文',
    SALE: '売上',
    INVENTORY_ALERT: '在庫アラート',
    WEBHOOK_EVENT: 'Webhookイベント',
    CUSTOMER_MESSAGE: '顧客メッセージ',
    PRICE_RECOMMENDATION: '価格推奨',
    EXPORT_JOB: 'エクスポートジョブ',
    SETTINGS: '設定',
    MARKETPLACE_CREDENTIAL: 'マーケットプレイス認証',
  };

  const verb = actionVerbs[action] || action;
  const entity = entityNames[entityType] || entityType;
  const name = entityName ? `「${entityName}」` : '';
  const fields = changedFields.length > 0 ? `（${changedFields.join(', ')}）` : '';

  return `${entity}${name}を${verb}しました${fields}`;
}

function getSeverityForAction(action: AuditAction): AuditSeverity {
  const criticalActions: AuditAction[] = ['DELETE'];
  const warningActions: AuditAction[] = ['PAUSE', 'UNPUBLISH', 'REJECT'];

  if (criticalActions.includes(action)) return 'WARNING';
  if (warningActions.includes(action)) return 'WARNING';
  return 'INFO';
}

import { z } from 'zod';

// アラートイベントタイプ
export const AlertEventType = z.enum([
  'INVENTORY_OUT_OF_STOCK',
  'PRICE_DROP_DETECTED',
  'LISTING_FAILED',
  'COMPETITOR_PRICE_CHANGE',
  'ORDER_RECEIVED',
  'SCRAPE_ERROR',
]);
export type AlertEventType = z.infer<typeof AlertEventType>;

// アラート重要度
export const AlertSeverity = z.enum(['critical', 'warning', 'info']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

// 通知チャネル
export const NotificationChannelName = z.enum(['email', 'slack']);
export type NotificationChannelName = z.infer<typeof NotificationChannelName>;

// アラート条件演算子
export const AlertConditionOperator = z.enum([
  'eq',      // equal
  'ne',      // not equal
  'gt',      // greater than
  'lt',      // less than
  'gte',     // greater than or equal
  'lte',     // less than or equal
  'contains', // contains string
]);
export type AlertConditionOperator = z.infer<typeof AlertConditionOperator>;

// アラート条件
export const AlertCondition = z.object({
  field: z.string(),
  operator: AlertConditionOperator,
  value: z.union([z.string(), z.number(), z.boolean()]),
});
export type AlertCondition = z.infer<typeof AlertCondition>;

// アラートイベント
export const AlertEvent = z.object({
  type: AlertEventType,
  productId: z.string().optional(),
  listingId: z.string().optional(),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});
export type AlertEvent = z.infer<typeof AlertEvent>;

// アラートルール（Prismaモデル対応）
export const AlertRuleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  eventType: AlertEventType,
  conditions: z.array(AlertCondition).default([]),
  severity: AlertSeverity,
  channels: z.array(NotificationChannelName),
  cooldownMinutes: z.number().int().min(0).default(30),
  batchWindowMinutes: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;

// アラートルール作成
export const CreateAlertRuleSchema = z.object({
  name: z.string().min(1),
  eventType: AlertEventType,
  conditions: z.array(AlertCondition).default([]),
  severity: AlertSeverity.default('info'),
  channels: z.array(NotificationChannelName).min(1),
  cooldownMinutes: z.number().int().min(0).default(30),
  batchWindowMinutes: z.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
});
export type CreateAlertRule = z.infer<typeof CreateAlertRuleSchema>;

// アラートルール更新
export const UpdateAlertRuleSchema = CreateAlertRuleSchema.partial();
export type UpdateAlertRule = z.infer<typeof UpdateAlertRuleSchema>;

// アラートログステータス
export const AlertLogStatus = z.enum(['pending', 'sent', 'failed', 'batched', 'throttled']);
export type AlertLogStatus = z.infer<typeof AlertLogStatus>;

// アラートログ
export const AlertLogSchema = z.object({
  id: z.string(),
  ruleId: z.string().nullable(),
  eventType: z.string(),
  severity: z.string(),
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  channels: z.array(z.string()),
  status: AlertLogStatus,
  batchId: z.string().nullable(),
  sentAt: z.date().nullable(),
  errorMsg: z.string().nullable(),
  createdAt: z.date(),
});
export type AlertLog = z.infer<typeof AlertLogSchema>;

// 通知ジョブペイロード
export const NotificationJobPayload = z.object({
  channel: NotificationChannelName,
  template: z.string(),
  data: z.record(z.string(), z.unknown()),
  deepLink: z.string().optional(),
  alertLogId: z.string().optional(),
  batchId: z.string().optional(),
});
export type NotificationJobPayload = z.infer<typeof NotificationJobPayload>;

// バッチアラート
export const BatchedAlert = z.object({
  batchId: z.string(),
  eventType: AlertEventType,
  count: z.number(),
  alerts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
  })),
  createdAt: z.string(),
});
export type BatchedAlert = z.infer<typeof BatchedAlert>;

// 手動通知送信
export const SendManualAlertSchema = z.object({
  eventType: AlertEventType,
  title: z.string(),
  message: z.string(),
  severity: AlertSeverity.default('info'),
  channels: z.array(NotificationChannelName).min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type SendManualAlert = z.infer<typeof SendManualAlertSchema>;

// アラート統計
export const AlertStatsSchema = z.object({
  totalSent: z.number(),
  totalFailed: z.number(),
  totalBatched: z.number(),
  totalThrottled: z.number(),
  byChannel: z.record(z.string(), z.number()),
  byEventType: z.record(z.string(), z.number()),
  bySeverity: z.record(z.string(), z.number()),
  successRate: z.number(),
  period: z.object({
    from: z.string(),
    to: z.string(),
  }),
});
export type AlertStats = z.infer<typeof AlertStatsSchema>;

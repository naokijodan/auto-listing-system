import { z } from 'zod';

// リアルタイムイベントタイプ
export const RealTimeEventType = z.enum([
  'INVENTORY_CHANGE',
  'ORDER_RECEIVED',
  'PRICE_CHANGE',
  'LISTING_UPDATE',
]);
export type RealTimeEventType = z.infer<typeof RealTimeEventType>;

// イベントアクション
export const EventAction = z.enum(['created', 'updated', 'deleted']);
export type EventAction = z.infer<typeof EventAction>;

// リアルタイムイベントペイロード
export const RealTimeEventPayload = z.object({
  id: z.string(),
  action: EventAction,
  data: z.record(z.string(), z.unknown()).optional(),
});
export type RealTimeEventPayload = z.infer<typeof RealTimeEventPayload>;

// リアルタイムイベント
export const RealTimeEvent = z.object({
  type: RealTimeEventType,
  payload: RealTimeEventPayload,
  timestamp: z.string(),
});
export type RealTimeEvent = z.infer<typeof RealTimeEvent>;

// バッチイベント（デバウンス後）
export const BatchedRealTimeEvent = z.object({
  type: z.literal('BATCHED'),
  events: z.array(RealTimeEvent),
  count: z.number(),
  timestamp: z.string(),
});
export type BatchedRealTimeEvent = z.infer<typeof BatchedRealTimeEvent>;

// SSE接続ステータス
export const SSEConnectionStatus = z.object({
  connected: z.boolean(),
  clientId: z.string().optional(),
  connectedAt: z.string().optional(),
  lastEventAt: z.string().optional(),
});
export type SSEConnectionStatus = z.infer<typeof SSEConnectionStatus>;

// リアルタイム統計
export const RealTimeStats = z.object({
  activeConnections: z.number(),
  totalConnections: z.number(),
  eventsPublished: z.number(),
  eventsDelivered: z.number(),
  byEventType: z.record(z.string(), z.number()),
  averageLatencyMs: z.number().optional(),
  period: z.object({
    from: z.string(),
    to: z.string(),
  }),
});
export type RealTimeStats = z.infer<typeof RealTimeStats>;

// SSEメッセージタイプ
export type SSEMessage =
  | { type: 'event'; data: RealTimeEvent }
  | { type: 'batch'; data: BatchedRealTimeEvent }
  | { type: 'heartbeat'; timestamp: string }
  | { type: 'connected'; clientId: string };

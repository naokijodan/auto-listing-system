/**
 * リアルタイムイベントAPI（SSE）
 *
 * Phase 27: リアルタイムダッシュボード
 */

import { Router, Request, Response, NextFunction } from 'express';
import IORedis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@rakuda/logger';
import { EVENT_CHANNELS, SSE_CONFIG } from '@rakuda/config';
import { RealTimeEvent } from '@rakuda/schema';

const router = Router();
const log = logger.child({ route: 'realtime' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// アクティブな接続を追跡
const activeConnections = new Map<string, {
  res: Response;
  subscriberId: string;
  connectedAt: Date;
  lastEventAt: Date | null;
}>();

// 接続統計
let totalConnections = 0;

// デバウンスバッファ
const eventBuffer: Map<string, RealTimeEvent[]> = new Map();
let debounceTimer: NodeJS.Timeout | null = null;

/**
 * @swagger
 * /api/realtime/events:
 *   get:
 *     tags: [Realtime]
 *     summary: SSEイベントストリーム
 *     description: Server-Sent Eventsでリアルタイムイベントを受信
 *     responses:
 *       200:
 *         description: SSEストリーム
 */
router.get('/events', async (req: Request, res: Response) => {
  if (!SSE_CONFIG.enabled) {
    return res.status(503).json({
      success: false,
      error: 'Realtime events are disabled',
    });
  }

  const clientId = uuidv4();

  // SSEヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx用
  res.flushHeaders();

  // 接続メッセージ送信
  sendSSEMessage(res, {
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString(),
  });

  // 接続を登録
  activeConnections.set(clientId, {
    res,
    subscriberId: clientId,
    connectedAt: new Date(),
    lastEventAt: null,
  });
  totalConnections++;

  log.info({
    type: 'sse_connected',
    clientId,
    activeConnections: activeConnections.size,
  });

  // Redis Pub/Subを購読
  const subscriber = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  // 全チャネルを購読
  await subscriber.psubscribe(EVENT_CHANNELS.ALL);

  subscriber.on('pmessage', (_pattern, channel, message) => {
    try {
      const event: RealTimeEvent = JSON.parse(message);

      // デバウンス処理
      addToBuffer(clientId, event);
    } catch (error) {
      log.error({ type: 'sse_message_parse_error', error, channel });
    }
  });

  // ハートビート
  const heartbeatInterval = setInterval(() => {
    if (activeConnections.has(clientId)) {
      sendSSEMessage(res, {
        type: 'heartbeat',
        timestamp: new Date().toISOString(),
      });
    }
  }, SSE_CONFIG.heartbeatInterval);

  // 接続終了時のクリーンアップ
  const cleanup = async () => {
    clearInterval(heartbeatInterval);
    activeConnections.delete(clientId);
    eventBuffer.delete(clientId);

    try {
      await subscriber.punsubscribe();
      await subscriber.quit();
    } catch (error) {
      log.error({ type: 'sse_cleanup_error', error, clientId });
    }

    log.info({
      type: 'sse_disconnected',
      clientId,
      activeConnections: activeConnections.size,
    });
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('error', cleanup);
});

/**
 * イベントをバッファに追加（デバウンス用）
 */
function addToBuffer(clientId: string, event: RealTimeEvent): void {
  if (!eventBuffer.has(clientId)) {
    eventBuffer.set(clientId, []);
  }
  eventBuffer.get(clientId)!.push(event);

  // デバウンスタイマーをリセット
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    flushBuffers();
  }, SSE_CONFIG.debounceWindow);
}

/**
 * バッファをフラッシュしてイベントを送信
 */
function flushBuffers(): void {
  eventBuffer.forEach((events, clientId) => {
    const connection = activeConnections.get(clientId);
    if (!connection || events.length === 0) {
      return;
    }

    // イベントが1件の場合はそのまま送信
    if (events.length === 1) {
      sendSSEMessage(connection.res, {
        type: 'event',
        data: events[0],
      });
    } else {
      // 複数イベントはバッチとして送信
      sendSSEMessage(connection.res, {
        type: 'batch',
        data: {
          type: 'BATCHED',
          events,
          count: events.length,
          timestamp: new Date().toISOString(),
        },
      });
    }

    // 最終イベント時刻を更新
    connection.lastEventAt = new Date();

    // 統計を更新
    incrementDeliveredStats(events.length);
  });

  // バッファをクリア
  eventBuffer.clear();
}

/**
 * SSEメッセージを送信
 */
function sendSSEMessage(res: Response, data: any): void {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (error) {
    log.error({ type: 'sse_write_error', error });
  }
}

/**
 * 配信統計を更新
 */
async function incrementDeliveredStats(count: number): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `rakuda:realtime:stats:${today}`;
    await redis.hincrby(key, 'delivered', count);
    await redis.expire(key, 60 * 60 * 24 * 30);
  } catch (error) {
    log.error({ type: 'stats_update_error', error });
  }
}

/**
 * @swagger
 * /api/realtime/status:
 *   get:
 *     tags: [Realtime]
 *     summary: 接続ステータス
 *     responses:
 *       200:
 *         description: 接続ステータス
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      enabled: SSE_CONFIG.enabled,
      activeConnections: activeConnections.size,
      totalConnections,
      heartbeatInterval: SSE_CONFIG.heartbeatInterval,
      debounceWindow: SSE_CONFIG.debounceWindow,
      timestamp: new Date().toISOString(),
    },
  });
});

/**
 * @swagger
 * /api/realtime/stats:
 *   get:
 *     tags: [Realtime]
 *     summary: 配信統計
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: 配信統計
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    const stats: Record<string, Record<string, number>> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `rakuda:realtime:stats:${dateStr}`;

      const dayStats = await redis.hgetall(key);
      if (Object.keys(dayStats).length > 0) {
        stats[dateStr] = Object.fromEntries(
          Object.entries(dayStats).map(([k, v]) => [k, parseInt(v, 10)])
        );
      }
    }

    // 合計を計算
    let totalPublished = 0;
    let totalDelivered = 0;

    Object.values(stats).forEach((dayStat) => {
      totalPublished += dayStat.published || 0;
      totalDelivered += dayStat.delivered || 0;
    });

    res.json({
      success: true,
      data: {
        activeConnections: activeConnections.size,
        totalConnections,
        totalPublished,
        totalDelivered,
        deliveryRate: totalPublished > 0
          ? Math.round((totalDelivered / totalPublished) * 100) / 100
          : 1,
        byDate: stats,
        period: {
          from: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
          days,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/realtime/connections:
 *   get:
 *     tags: [Realtime]
 *     summary: アクティブ接続一覧
 *     responses:
 *       200:
 *         description: 接続一覧
 */
router.get('/connections', (_req: Request, res: Response) => {
  const connections = Array.from(activeConnections.entries()).map(([id, conn]) => ({
    clientId: id,
    connectedAt: conn.connectedAt.toISOString(),
    lastEventAt: conn.lastEventAt?.toISOString() || null,
    durationMs: Date.now() - conn.connectedAt.getTime(),
  }));

  res.json({
    success: true,
    data: {
      count: connections.length,
      connections,
    },
  });
});

/**
 * @swagger
 * /api/realtime/test:
 *   post:
 *     tags: [Realtime]
 *     summary: テストイベント送信
 *     responses:
 *       200:
 *         description: テストイベント送信結果
 */
router.post('/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const testEvent: RealTimeEvent = {
      type: 'LISTING_UPDATE',
      payload: {
        id: 'test-' + Date.now(),
        action: 'updated',
        data: { message: 'This is a test event' },
      },
      timestamp: new Date().toISOString(),
    };

    // 全チャネルにテストイベントを発行
    await redis.publish(EVENT_CHANNELS.LISTINGS, JSON.stringify(testEvent));

    log.info({ type: 'test_event_published', event: testEvent });

    res.json({
      success: true,
      message: 'Test event published',
      event: testEvent,
      activeConnections: activeConnections.size,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// Phase 46: キュー監視SSE
// ========================================

import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@rakuda/config';

// キューインスタンス
const queues: Map<string, Queue> = new Map();

// キュー初期化（遅延初期化）
function initQueues(): void {
  if (queues.size > 0) return;

  const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

  Object.values(QUEUE_NAMES).forEach((name) => {
    queues.set(name, new Queue(name, { connection }));
  });
}

/**
 * @swagger
 * /api/realtime/queue-stats:
 *   get:
 *     tags: [Realtime]
 *     summary: キュー統計（SSE）
 *     description: Server-Sent Eventsでキュー統計をリアルタイム配信
 *     responses:
 *       200:
 *         description: SSEストリーム
 */
router.get('/queue-stats', async (req: Request, res: Response) => {
  initQueues();

  const clientId = uuidv4();
  const interval = parseInt(req.query.interval as string, 10) || 3000;

  // SSEヘッダー設定
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // 初期メッセージ
  sendSSEMessage(res, {
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString(),
  });

  log.info({ type: 'queue_sse_connected', clientId });

  // 定期的にキュー統計を送信
  const statsInterval = setInterval(async () => {
    try {
      const stats = await getQueueStatsAll();
      sendSSEMessage(res, {
        type: 'queue-stats',
        data: stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      log.error({ type: 'queue_stats_error', error, clientId });
    }
  }, interval);

  // クリーンアップ
  const cleanup = () => {
    clearInterval(statsInterval);
    log.info({ type: 'queue_sse_disconnected', clientId });
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('error', cleanup);
});

/**
 * 全キューの統計を取得
 */
async function getQueueStatsAll(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {};

  for (const [name, queue] of queues) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats[name] = { waiting, active, completed, failed, delayed };
    } catch (error) {
      stats[name] = { error: (error as Error).message };
    }
  }

  return stats;
}

/**
 * @swagger
 * /api/realtime/queue-stats/snapshot:
 *   get:
 *     tags: [Realtime]
 *     summary: キュー統計スナップショット
 *     responses:
 *       200:
 *         description: キュー統計
 */
router.get('/queue-stats/snapshot', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    initQueues();
    const stats = await getQueueStatsAll();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export { router as realtimeRouter };

import IORedis, { Redis } from 'ioredis';
import { logger } from '@rakuda/logger';
import { EVENT_CHANNELS } from '@rakuda/config';
import { RealTimeEvent, RealTimeEventType } from '@rakuda/schema';

const log = logger.child({ module: 'EventBus' });

type EventHandler = (event: RealTimeEvent) => void;

const STATS_KEY = 'rakuda:realtime:stats';

class EventBus {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private isInitialized = false;

  /**
   * EventBusを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Pub/Sub用に2つの接続を作成
    this.publisher = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.subscriber = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    // 接続確認
    await this.publisher.ping();
    await this.subscriber.ping();

    // メッセージハンドラー設定
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    this.subscriber.on('pmessage', (pattern, channel, message) => {
      this.handleMessage(channel, message);
    });

    this.isInitialized = true;
    log.info({ type: 'event_bus_initialized' });
  }

  /**
   * イベントを発行
   */
  async publish(channel: string, event: RealTimeEvent): Promise<void> {
    if (!this.publisher) {
      log.warn({ type: 'event_bus_not_initialized' });
      return;
    }

    try {
      const message = JSON.stringify(event);
      await this.publisher.publish(channel, message);

      // 統計を更新
      await this.incrementStats('published', event.type);

      log.debug({
        type: 'event_published',
        channel,
        eventType: event.type,
        payloadId: event.payload.id,
      });
    } catch (error) {
      log.error({ type: 'event_publish_error', error, channel });
    }
  }

  /**
   * 便利メソッド: 在庫変動イベント発行
   */
  async publishInventoryChange(
    productId: string,
    action: 'created' | 'updated' | 'deleted',
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(EVENT_CHANNELS.INVENTORY, {
      type: 'INVENTORY_CHANGE',
      payload: { id: productId, action, data },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 便利メソッド: 注文受付イベント発行
   */
  async publishOrderReceived(
    orderId: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(EVENT_CHANNELS.ORDERS, {
      type: 'ORDER_RECEIVED',
      payload: { id: orderId, action: 'created', data },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 便利メソッド: 価格変動イベント発行
   */
  async publishPriceChange(
    listingId: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(EVENT_CHANNELS.PRICING, {
      type: 'PRICE_CHANGE',
      payload: { id: listingId, action: 'updated', data },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 便利メソッド: 出品更新イベント発行
   */
  async publishListingUpdate(
    listingId: string,
    action: 'created' | 'updated' | 'deleted',
    data?: Record<string, unknown>
  ): Promise<void> {
    await this.publish(EVENT_CHANNELS.LISTINGS, {
      type: 'LISTING_UPDATE',
      payload: { id: listingId, action, data },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * チャネルを購読
   */
  async subscribe(channel: string, handler: EventHandler): Promise<void> {
    if (!this.subscriber) {
      log.warn({ type: 'event_bus_not_initialized' });
      return;
    }

    // ハンドラーを登録
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);

    // ワイルドカードチャネルの場合はpsubscribe
    if (channel.includes('*')) {
      await this.subscriber.psubscribe(channel);
    } else {
      await this.subscriber.subscribe(channel);
    }

    log.info({ type: 'channel_subscribed', channel });
  }

  /**
   * 購読を解除
   */
  async unsubscribe(channel: string, handler?: EventHandler): Promise<void> {
    if (!this.subscriber) {
      return;
    }

    if (handler) {
      // 特定のハンドラーのみ解除
      this.handlers.get(channel)?.delete(handler);
    } else {
      // チャネルの全ハンドラーを解除
      this.handlers.delete(channel);
    }

    // ハンドラーがなくなったら購読解除
    if (!this.handlers.has(channel) || this.handlers.get(channel)!.size === 0) {
      if (channel.includes('*')) {
        await this.subscriber.punsubscribe(channel);
      } else {
        await this.subscriber.unsubscribe(channel);
      }
      log.info({ type: 'channel_unsubscribed', channel });
    }
  }

  /**
   * メッセージを処理
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const event: RealTimeEvent = JSON.parse(message);

      // 完全一致のハンドラー
      this.handlers.get(channel)?.forEach((handler) => {
        try {
          handler(event);
        } catch (error) {
          log.error({ type: 'handler_error', error, channel });
        }
      });

      // ワイルドカードハンドラー
      this.handlers.forEach((handlers, pattern) => {
        if (pattern.includes('*') && this.matchPattern(pattern, channel)) {
          handlers.forEach((handler) => {
            try {
              handler(event);
            } catch (error) {
              log.error({ type: 'handler_error', error, channel, pattern });
            }
          });
        }
      });

      // 統計を更新
      this.incrementStats('delivered', event.type);
    } catch (error) {
      log.error({ type: 'message_parse_error', error, channel });
    }
  }

  /**
   * ワイルドカードパターンマッチング
   */
  private matchPattern(pattern: string, channel: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(channel);
  }

  /**
   * 統計を更新
   */
  private async incrementStats(
    type: 'published' | 'delivered',
    eventType: RealTimeEventType
  ): Promise<void> {
    if (!this.publisher) return;

    const today = new Date().toISOString().split('T')[0];
    const key = `${STATS_KEY}:${today}`;

    await this.publisher.hincrby(key, type, 1);
    await this.publisher.hincrby(key, `${type}:${eventType}`, 1);
    await this.publisher.expire(key, 60 * 60 * 24 * 30); // 30日間保持
  }

  /**
   * 統計を取得
   */
  async getStats(days: number = 7): Promise<Record<string, Record<string, number>>> {
    if (!this.publisher) {
      return {};
    }

    const stats: Record<string, Record<string, number>> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${STATS_KEY}:${dateStr}`;

      const dayStats = await this.publisher.hgetall(key);
      if (Object.keys(dayStats).length > 0) {
        stats[dateStr] = Object.fromEntries(
          Object.entries(dayStats).map(([k, v]) => [k, parseInt(v, 10)])
        );
      }
    }

    return stats;
  }

  /**
   * 接続を閉じる
   */
  async close(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.publisher) {
      await this.publisher.quit();
      this.publisher = null;
    }
    this.handlers.clear();
    this.isInitialized = false;
    log.info({ type: 'event_bus_closed' });
  }

  /**
   * 初期化済みかどうか
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Publisherを取得（SSE用）
   */
  getPublisher(): Redis | null {
    return this.publisher;
  }

  /**
   * 新しいSubscriberを作成（SSE用）
   */
  async createSubscriber(): Promise<Redis> {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const subscriber = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    await subscriber.ping();
    return subscriber;
  }
}

// シングルトンインスタンス
export const eventBus = new EventBus();

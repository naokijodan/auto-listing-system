/**
 * リアルタイムイベント処理（Phase 27）
 *
 * SSE接続とSWRキャッシュ自動更新
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { mutate } from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// イベント型定義
export type RealTimeEventType =
  | 'INVENTORY_CHANGE'
  | 'ORDER_RECEIVED'
  | 'PRICE_CHANGE'
  | 'LISTING_UPDATE';

export interface RealTimeEvent {
  type: RealTimeEventType;
  payload: {
    id: string;
    action: 'created' | 'updated' | 'deleted';
    data?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface SSEMessage {
  type: 'connected' | 'heartbeat' | 'event' | 'batch';
  clientId?: string;
  timestamp?: string;
  data?: RealTimeEvent | {
    type: 'BATCHED';
    events: RealTimeEvent[];
    count: number;
    timestamp: string;
  };
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface RealtimeState {
  status: ConnectionStatus;
  clientId: string | null;
  lastEventAt: Date | null;
  eventCount: number;
  error: string | null;
}

// SWRキャッシュ無効化マッピング
const EVENT_TO_CACHE_KEYS: Record<RealTimeEventType, string[]> = {
  INVENTORY_CHANGE: ['/api/products', '/api/analytics/kpi', '/api/inventory'],
  ORDER_RECEIVED: ['/api/orders', '/api/analytics/kpi', '/api/analytics/financial'],
  PRICE_CHANGE: ['/api/products', '/api/listings', '/api/pricing'],
  LISTING_UPDATE: ['/api/listings', '/api/products', '/api/analytics/kpi'],
};

/**
 * リアルタイムイベント購読フック
 */
export function useRealtimeEvents(options?: {
  enabled?: boolean;
  onEvent?: (event: RealTimeEvent) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}) {
  const { enabled = true, onEvent, onStatusChange } = options || {};

  const [state, setState] = useState<RealtimeState>({
    status: 'disconnected',
    clientId: null,
    lastEventAt: null,
    eventCount: 0,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_BASE_DELAY = 1000;

  // イベント処理
  const handleEvent = useCallback((event: RealTimeEvent) => {
    // SWRキャッシュを無効化
    const cacheKeys = EVENT_TO_CACHE_KEYS[event.type] || [];
    cacheKeys.forEach(key => {
      // パターンマッチングで関連するすべてのキーを無効化
      mutate(
        (currentKey: string) => typeof currentKey === 'string' && currentKey.startsWith(key),
        undefined,
        { revalidate: true }
      );
    });

    // コールバック呼び出し
    onEvent?.(event);

    setState(prev => ({
      ...prev,
      lastEventAt: new Date(),
      eventCount: prev.eventCount + 1,
    }));
  }, [onEvent]);

  // SSE接続
  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 既存の接続をクリーンアップ
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setState(prev => ({ ...prev, status: 'connecting', error: null }));
    onStatusChange?.('connecting');

    const eventSource = new EventSource(`${API_BASE}/api/realtime/events`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (e) => {
      try {
        const message: SSEMessage = JSON.parse(e.data);

        switch (message.type) {
          case 'connected':
            setState(prev => ({
              ...prev,
              status: 'connected',
              clientId: message.clientId || null,
              error: null,
            }));
            onStatusChange?.('connected');
            break;

          case 'heartbeat':
            // ハートビートは状態更新のみ
            break;

          case 'event':
            if (message.data && 'type' in message.data && message.data.type !== 'BATCHED') {
              handleEvent(message.data as RealTimeEvent);
            }
            break;

          case 'batch':
            if (message.data && 'events' in message.data) {
              const batchData = message.data as { events: RealTimeEvent[] };
              batchData.events.forEach(handleEvent);
            }
            break;
        }
      } catch (error) {
        console.error('SSE message parse error:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();

      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Connection lost',
      }));
      onStatusChange?.('error');

      // 再接続ロジック
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        setState(prev => ({
          ...prev,
          status: 'disconnected',
          error: 'Max reconnect attempts reached',
        }));
        onStatusChange?.('disconnected');
      }
    };
  }, [enabled, handleEvent, onStatusChange]);

  // 手動再接続
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // 接続開始/終了
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [enabled, connect]);

  return {
    ...state,
    reconnect,
    isConnected: state.status === 'connected',
  };
}

/**
 * リアルタイムステータス取得フック
 */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<{
    enabled: boolean;
    activeConnections: number;
    totalConnections: number;
    heartbeatInterval: number;
    debounceWindow: number;
  } | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/realtime/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStatus(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch realtime status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

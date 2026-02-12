/**
 * 強化リアルタイム通知システム
 * Phase 72: WebSocket + ブラウザ通知 + サウンド通知
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { mutate } from 'swr';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const WS_BASE = API_BASE.replace('http', 'ws');

// イベント型拡張
export type EnhancedEventType =
  | 'ORDER_RECEIVED'
  | 'ORDER_PAID'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'INVENTORY_CHANGE'
  | 'INVENTORY_LOW'
  | 'OUT_OF_STOCK'
  | 'PRICE_CHANGE'
  | 'LISTING_UPDATE'
  | 'LISTING_PUBLISHED'
  | 'LISTING_ERROR'
  | 'JOB_COMPLETED'
  | 'JOB_FAILED'
  | 'CUSTOMER_MESSAGE'
  | 'SHIPMENT_DEADLINE'
  | 'SYSTEM_ALERT';

export interface EnhancedEvent {
  id: string;
  type: EnhancedEventType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  payload: Record<string, unknown>;
  timestamp: string;
  read: boolean;
}

export type ConnectionType = 'websocket' | 'sse' | 'polling';
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  eventTypes: EnhancedEventType[];
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  browserNotifications: true,
  soundEnabled: true,
  soundVolume: 0.5,
  eventTypes: [
    'ORDER_RECEIVED',
    'ORDER_PAID',
    'OUT_OF_STOCK',
    'LISTING_ERROR',
    'JOB_FAILED',
    'SHIPMENT_DEADLINE',
    'SYSTEM_ALERT',
  ],
};

const STORAGE_KEY = 'rakuda_notification_settings';

// 通知設定を取得
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // エラー時はデフォルト設定を返す
  }
  return DEFAULT_SETTINGS;
}

// 通知設定を保存
export function saveNotificationSettings(settings: Partial<NotificationSettings>): void {
  if (typeof window === 'undefined') return;

  const current = getNotificationSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

// ブラウザ通知許可をリクエスト
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
}

// ブラウザ通知を表示
function showBrowserNotification(event: EnhancedEvent): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const settings = getNotificationSettings();
  if (!settings.browserNotifications) return;
  if (!settings.eventTypes.includes(event.type)) return;

  const notification = new Notification(event.title, {
    body: event.message,
    icon: '/favicon.ico',
    tag: event.id,
    requireInteraction: event.severity === 'error',
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    // イベントに応じたページに遷移
    navigateToEvent(event);
  };

  // 自動クローズ
  setTimeout(() => {
    notification.close();
  }, 10000);
}

// イベントに応じたナビゲーション
function navigateToEvent(event: EnhancedEvent): void {
  const routes: Partial<Record<EnhancedEventType, string>> = {
    ORDER_RECEIVED: '/orders',
    ORDER_PAID: '/orders',
    ORDER_SHIPPED: '/orders',
    INVENTORY_LOW: '/products',
    OUT_OF_STOCK: '/products',
    LISTING_ERROR: '/listings',
    JOB_FAILED: '/jobs',
    CUSTOMER_MESSAGE: '/customer-support',
    SHIPMENT_DEADLINE: '/shipments',
  };

  const route = routes[event.type];
  if (route) {
    window.location.href = route;
  }
}

// 通知音を再生
function playNotificationSound(severity: EnhancedEvent['severity']): void {
  const settings = getNotificationSettings();
  if (!settings.soundEnabled) return;

  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    const audioContext = new AudioContext();

    // シンプルなビープ音を生成
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 重大度に応じて周波数を変更
    const frequencies: Record<typeof severity, number> = {
      success: 880,  // 高い音
      info: 660,     // 中程度
      warning: 440,  // 低め
      error: 330,    // 低い音
    };

    oscillator.frequency.value = frequencies[severity];
    oscillator.type = 'sine';

    gainNode.gain.value = settings.soundVolume * 0.3;
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch {
    // オーディオ再生に失敗してもエラーにしない
  }
}

// SWRキャッシュ無効化マッピング（拡張版）
const EVENT_TO_CACHE_KEYS: Partial<Record<EnhancedEventType, string[]>> = {
  ORDER_RECEIVED: ['/api/orders', '/api/analytics/kpi', '/api/dashboard-widgets/data'],
  ORDER_PAID: ['/api/orders', '/api/analytics/financial'],
  ORDER_SHIPPED: ['/api/orders', '/api/shipments'],
  INVENTORY_CHANGE: ['/api/products', '/api/inventory', '/api/sales-forecast'],
  INVENTORY_LOW: ['/api/products', '/api/inventory-alerts'],
  OUT_OF_STOCK: ['/api/products', '/api/inventory', '/api/listings'],
  PRICE_CHANGE: ['/api/products', '/api/listings', '/api/pricing'],
  LISTING_UPDATE: ['/api/listings', '/api/products'],
  LISTING_PUBLISHED: ['/api/listings', '/api/analytics/kpi'],
  LISTING_ERROR: ['/api/listings', '/api/notifications'],
  JOB_COMPLETED: ['/api/jobs'],
  JOB_FAILED: ['/api/jobs', '/api/notifications'],
  CUSTOMER_MESSAGE: ['/api/customer-support/messages', '/api/notifications'],
  SHIPMENT_DEADLINE: ['/api/shipments', '/api/notifications'],
};

// WebSocket接続を管理
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: ((event: EnhancedEvent) => void)[] = [];
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.updateStatus('connecting');

    try {
      this.ws = new WebSocket(`${WS_BASE}/api/realtime/ws`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'event' && data.data) {
            this.handleEvent(data.data);
          } else if (data.type === 'batch' && data.events) {
            data.events.forEach((e: EnhancedEvent) => this.handleEvent(e));
          }
        } catch {
          // パースエラーは無視
        }
      };

      this.ws.onclose = () => {
        this.updateStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.updateStatus('error');
      };
    } catch {
      this.updateStatus('error');
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
  }

  private handleEvent(event: EnhancedEvent): void {
    // SWRキャッシュを無効化
    const cacheKeys = EVENT_TO_CACHE_KEYS[event.type] || [];
    cacheKeys.forEach(key => {
      mutate(
        (currentKey: string) => typeof currentKey === 'string' && currentKey.startsWith(key),
        undefined,
        { revalidate: true }
      );
    });

    // ブラウザ通知
    showBrowserNotification(event);

    // サウンド通知
    const settings = getNotificationSettings();
    if (settings.eventTypes.includes(event.type)) {
      playNotificationSound(event.severity);
    }

    // リスナーに通知
    this.listeners.forEach(listener => listener(event));
  }

  private updateStatus(status: ConnectionStatus): void {
    this.statusListeners.forEach(listener => listener(status));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  onEvent(listener: (event: EnhancedEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}

// シングルトンインスタンス
let wsManager: WebSocketManager | null = null;

function getWSManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager();
  }
  return wsManager;
}

// フック: 拡張リアルタイムイベント
export function useEnhancedRealtime(options?: {
  enabled?: boolean;
  onEvent?: (event: EnhancedEvent) => void;
  preferWebSocket?: boolean;
}) {
  const { enabled = true, onEvent, preferWebSocket = false } = options || {};

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionType, setConnectionType] = useState<ConnectionType>('sse');
  const [eventCount, setEventCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<EnhancedEvent | null>(null);

  // WebSocket接続（preferWebSocketがtrueの場合）
  useEffect(() => {
    if (!enabled || !preferWebSocket) return;

    const manager = getWSManager();
    manager.connect();

    const unsubEvent = manager.onEvent((event) => {
      setEventCount(c => c + 1);
      setLastEvent(event);
      onEvent?.(event);
    });

    const unsubStatus = manager.onStatusChange((s) => {
      setStatus(s);
      if (s === 'connected') {
        setConnectionType('websocket');
      }
    });

    return () => {
      unsubEvent();
      unsubStatus();
    };
  }, [enabled, preferWebSocket, onEvent]);

  return {
    status,
    connectionType,
    eventCount,
    lastEvent,
    isConnected: status === 'connected',
  };
}

// フック: 通知設定
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setSettings(getNotificationSettings());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<NotificationSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  }, [settings]);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  return {
    settings,
    permission,
    updateSettings,
    requestPermission,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
  };
}

// フック: 未読通知カウント
export function useUnreadNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/unread-count`);
        if (res.ok) {
          const data = await res.json();
          setCount(data.data?.count || 0);
        }
      } catch {
        // エラー時は無視
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);

    return () => clearInterval(interval);
  }, []);

  return count;
}

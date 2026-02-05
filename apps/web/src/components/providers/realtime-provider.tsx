'use client';

/**
 * リアルタイムイベントプロバイダー（Phase 27）
 *
 * アプリ全体でSSE接続を管理し、イベント通知機能を提供
 */

import { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { useRealtimeEvents, RealTimeEvent, ConnectionStatus } from '@/lib/realtime';
import { addToast } from '../ui/toast';

interface RealtimeContextValue {
  status: ConnectionStatus;
  isConnected: boolean;
  eventCount: number;
  lastEventAt: Date | null;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: ReactNode;
  showNotifications?: boolean;
}

export function RealtimeProvider({
  children,
  showNotifications = true,
}: RealtimeProviderProps) {
  const [notificationEnabled] = useState(showNotifications);

  const handleEvent = useCallback((event: RealTimeEvent) => {
    if (!notificationEnabled) return;

    // 重要なイベントのみトースト通知
    switch (event.type) {
      case 'ORDER_RECEIVED':
        addToast({
          type: 'success',
          message: `New order received: ${event.payload.id}`,
        });
        break;

      case 'INVENTORY_CHANGE':
        if (event.payload.data?.status === 'out_of_stock') {
          addToast({
            type: 'info',
            message: `${event.payload.data?.title || 'Item'} is now out of stock`,
          });
        }
        break;

      case 'LISTING_UPDATE':
        if (event.payload.data?.status === 'error') {
          addToast({
            type: 'error',
            message: `Listing error: ${event.payload.data?.error || 'Unknown error'}`,
          });
        }
        break;

      // PRICE_CHANGEは頻繁に発生するためトースト通知しない
      default:
        break;
    }
  }, [notificationEnabled]);

  const handleStatusChange = useCallback((status: ConnectionStatus) => {
    if (status === 'error' && notificationEnabled) {
      addToast({
        type: 'info',
        message: 'Real-time updates disconnected. Attempting to reconnect...',
      });
    }
  }, [notificationEnabled]);

  const realtimeState = useRealtimeEvents({
    enabled: true,
    onEvent: handleEvent,
    onStatusChange: handleStatusChange,
  });

  const contextValue: RealtimeContextValue = {
    status: realtimeState.status,
    isConnected: realtimeState.isConnected,
    eventCount: realtimeState.eventCount,
    lastEventAt: realtimeState.lastEventAt,
    reconnect: realtimeState.reconnect,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
}

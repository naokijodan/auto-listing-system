'use client';

/**
 * アプリケーションプロバイダー（Phase 27）
 *
 * クライアントサイドのプロバイダーをまとめて管理
 */

import { ReactNode } from 'react';
import { RealtimeProvider } from './realtime-provider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <RealtimeProvider showNotifications={true}>
      {children}
    </RealtimeProvider>
  );
}

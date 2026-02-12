'use client';

/**
 * アプリケーションプロバイダー（Phase 27, 71）
 *
 * クライアントサイドのプロバイダーをまとめて管理
 */

import { ReactNode } from 'react';
import { RealtimeProvider } from './realtime-provider';
import { I18nProvider } from '@/lib/i18n';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <I18nProvider>
      <RealtimeProvider showNotifications={true}>
        {children}
      </RealtimeProvider>
    </I18nProvider>
  );
}

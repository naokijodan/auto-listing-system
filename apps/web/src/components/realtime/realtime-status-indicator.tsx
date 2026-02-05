'use client';

/**
 * リアルタイム接続ステータスインジケーター（Phase 27）
 */

import { useRealtime } from '../providers/realtime-provider';
import { ConnectionStatus } from '@/lib/realtime';
import { cn } from '@/lib/utils';

interface RealtimeStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const statusConfig: Record<ConnectionStatus, {
  color: string;
  bgColor: string;
  label: string;
  pulse: boolean;
}> = {
  connecting: {
    color: 'bg-amber-500',
    bgColor: 'bg-amber-500/20',
    label: 'Connecting...',
    pulse: true,
  },
  connected: {
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-500/20',
    label: 'Live',
    pulse: true,
  },
  disconnected: {
    color: 'bg-zinc-400',
    bgColor: 'bg-zinc-400/20',
    label: 'Offline',
    pulse: false,
  },
  error: {
    color: 'bg-red-500',
    bgColor: 'bg-red-500/20',
    label: 'Error',
    pulse: false,
  },
};

export function RealtimeStatusIndicator({
  className,
  showDetails = false,
}: RealtimeStatusIndicatorProps) {
  const { status, eventCount, lastEventAt, reconnect } = useRealtime();

  const config = statusConfig[status];

  const formatLastEvent = () => {
    if (!lastEventAt) return 'No events yet';
    const diff = Date.now() - lastEventAt.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return `${Math.floor(diff / 3600000)}h ago`;
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* ステータスドット */}
      <div className="relative flex items-center justify-center">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            config.color
          )}
        />
        {config.pulse && (
          <span
            className={cn(
              'absolute h-2 w-2 rounded-full animate-ping',
              config.color,
              'opacity-75'
            )}
          />
        )}
      </div>

      {/* ラベル */}
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {config.label}
      </span>

      {/* 詳細情報（オプション） */}
      {showDetails && status === 'connected' && (
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          ({eventCount} events, {formatLastEvent()})
        </span>
      )}

      {/* エラー表示と再接続ボタン */}
      {(status === 'error' || status === 'disconnected') && (
        <button
          onClick={reconnect}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Reconnect
        </button>
      )}
    </div>
  );
}

/**
 * コンパクトなステータスインジケーター（ヘッダー用）
 */
export function RealtimeStatusDot() {
  const { status } = useRealtime();
  const config = statusConfig[status];

  return (
    <div
      className="relative flex items-center justify-center"
      title={`Realtime: ${config.label}`}
    >
      <span className={cn('h-2 w-2 rounded-full', config.color)} />
      {config.pulse && (
        <span
          className={cn(
            'absolute h-2 w-2 rounded-full animate-ping',
            config.color,
            'opacity-75'
          )}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, patchApi, deleteApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Bell,
  CheckCheck,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Package,
  ShoppingCart,
  Loader2,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  productId?: string;
  listingId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

interface NotificationsResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  unreadCount: number;
}

const severityConfig = {
  INFO: {
    icon: Info,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  WARNING: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconColor: 'text-amber-500',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  ERROR: {
    icon: AlertCircle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    iconColor: 'text-red-500',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  SUCCESS: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
};

const typeLabels: Record<string, string> = {
  SCRAPE_COMPLETE: 'スクレイピング完了',
  SCRAPE_FAILED: 'スクレイピング失敗',
  TRANSLATE_COMPLETE: '翻訳完了',
  TRANSLATE_FAILED: '翻訳失敗',
  IMAGE_COMPLETE: '画像処理完了',
  IMAGE_FAILED: '画像処理失敗',
  PUBLISH_COMPLETE: '出品完了',
  PUBLISH_FAILED: '出品失敗',
  OUT_OF_STOCK: '在庫切れ',
  PRICE_CHANGE: '価格変動',
  SYSTEM: 'システム',
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('');

  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    `/api/notifications?unreadOnly=${filter === 'unread'}&limit=100${typeFilter ? `&type=${typeFilter}` : ''}`,
    fetcher,
    { refreshInterval: 30000 } // 30秒ごとに更新
  );

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  // 既読にする
  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await patchApi(`/api/notifications/${id}/read`, {});
        mutate();
      } catch (error) {
        console.error('Failed to mark as read:', error);
      }
    },
    [mutate]
  );

  // 全て既読にする
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await patchApi('/api/notifications/read-all', {});
      mutate();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  }, [mutate]);

  // 通知を削除
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteApi(`/api/notifications/${id}`);
        mutate();
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    },
    [mutate]
  );

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return '今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}日前`;

    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">通知</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {unreadCount > 0 ? `${unreadCount}件の未読` : 'すべて既読'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            すべて既読
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            )}
          >
            すべて
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={cn(
              'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === 'unread'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
            )}
          >
            未読
            {unreadCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべての種類</option>
          <option value="SCRAPE_COMPLETE">スクレイピング完了</option>
          <option value="SCRAPE_FAILED">スクレイピング失敗</option>
          <option value="TRANSLATE_COMPLETE">翻訳完了</option>
          <option value="PUBLISH_COMPLETE">出品完了</option>
          <option value="OUT_OF_STOCK">在庫切れ</option>
          <option value="PRICE_CHANGE">価格変動</option>
          <option value="SYSTEM">システム</option>
        </select>
      </div>

      {/* Notifications List */}
      <Card className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="ml-2 text-sm text-zinc-500">読み込み中...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="mt-2 text-sm text-red-500">通知の取得に失敗しました</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
                <RefreshCw className="h-4 w-4" />
                再試行
              </Button>
            </div>
          )}

          {!isLoading && !error && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-500">通知はありません</p>
            </div>
          )}

          {!isLoading && !error && notifications.length > 0 && (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.map((notification) => {
                const config = severityConfig[notification.severity];
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 p-4 transition-colors',
                      !notification.isRead && 'bg-amber-50/50 dark:bg-amber-900/10',
                      'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full',
                        config.bgColor
                      )}
                    >
                      <Icon className={cn('h-5 w-5', config.iconColor)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {notification.title}
                            </span>
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              {typeLabels[notification.type] || notification.type}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                            {notification.message}
                          </p>
                        </div>

                        <div className="ml-4 flex items-center gap-1">
                          <span className="text-xs text-zinc-400">
                            {formatDate(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="ml-2 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                              title="既読にする"
                            >
                              <CheckCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                            title="削除"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* 関連リンク */}
                      {(notification.productId || notification.listingId) && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          {notification.productId && (
                            <a
                              href={`/products?id=${notification.productId}`}
                              className="flex items-center gap-1 text-amber-600 hover:underline"
                            >
                              <Package className="h-3 w-3" />
                              商品を見る
                            </a>
                          )}
                          {notification.listingId && (
                            <a
                              href={`/listings?id=${notification.listingId}`}
                              className="flex items-center gap-1 text-amber-600 hover:underline"
                            >
                              <ShoppingCart className="h-3 w-3" />
                              出品を見る
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 未読インジケーター */}
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, deleteApi, patchApi, putApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  Webhook,
  RefreshCw,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  RotateCcw,
  Shield,
  Key,
  Send,
  BarChart3,
  Filter,
} from 'lucide-react';
import Link from 'next/link';

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  status: string;
  successRate: number;
  totalDeliveries: number;
  failedDeliveries: number;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface DeliveryLog {
  id: string;
  webhookId: string;
  webhookName: string;
  event: string;
  status: string;
  statusCode: number;
  duration: number;
  retryCount: number;
  errorMessage: string | null;
  triggeredAt: string;
}

type TabType = 'webhooks' | 'logs' | 'events' | 'settings';

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  ACTIVE: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  PAUSED: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Pause },
  SUCCESS: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  FAILED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function EbayWebhookManagerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('webhooks');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // データ取得
  const { data: statsData, mutate: mutateStats } = useSWR('/api/ebay-webhook-manager/stats', fetcher);
  const stats = statsData?.data;

  const { data: webhooksData, mutate: mutateWebhooks, isLoading: isLoadingWebhooks } = useSWR(
    activeTab === 'webhooks' ? `/api/ebay-webhook-manager/webhooks?page=${page}&limit=10` : null,
    fetcher
  );

  const { data: logsData, isLoading: isLoadingLogs } = useSWR(
    activeTab === 'logs' ? `/api/ebay-webhook-manager/delivery-logs?page=${page}&limit=20` : null,
    fetcher
  );

  const { data: eventTypesData } = useSWR('/api/ebay-webhook-manager/event-types', fetcher);

  // アクション
  const handleToggleWebhook = async (id: string) => {
    try {
      await patchApi(`/api/ebay-webhook-manager/webhooks/${id}/toggle`, {});
      addToast({ type: 'success', message: 'Webhookのステータスを変更しました' });
      mutateWebhooks();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '操作に失敗しました' });
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('このWebhookを削除しますか？')) return;
    try {
      await deleteApi(`/api/ebay-webhook-manager/webhooks/${id}`);
      addToast({ type: 'success', message: 'Webhookを削除しました' });
      mutateWebhooks();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      await postApi(`/api/ebay-webhook-manager/webhooks/${id}/test`, {});
      addToast({ type: 'success', message: 'テストイベントを送信しました' });
    } catch {
      addToast({ type: 'error', message: 'テストに失敗しました' });
    }
  };

  const handleRetryDelivery = async (id: string) => {
    try {
      await postApi(`/api/ebay-webhook-manager/delivery-logs/${id}/retry`, {});
      addToast({ type: 'success', message: '再試行を開始しました' });
    } catch {
      addToast({ type: 'error', message: '再試行に失敗しました' });
    }
  };

  const handleCreateWebhook = async (data: { name: string; url: string; events: string[] }) => {
    try {
      await postApi('/api/ebay-webhook-manager/webhooks', data);
      addToast({ type: 'success', message: 'Webhookを作成しました' });
      mutateWebhooks();
      mutateStats();
      setShowCreateModal(false);
    } catch {
      addToast({ type: 'error', message: '作成に失敗しました' });
    }
  };

  const tabs: { id: TabType; label: string; icon: typeof Webhook }[] = [
    { id: 'webhooks', label: 'Webhook', icon: Webhook },
    { id: 'logs', label: '配信ログ', icon: BarChart3 },
    { id: 'events', label: 'イベント', icon: Send },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ebay" className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <Webhook className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Webhook管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Webhookエンドポイントと配信ログ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規Webhook
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { mutateStats(); mutateWebhooks(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-4 grid grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Webhook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">総Webhook</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {stats.totalWebhooks}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブ</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.activeWebhooks}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <Send className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">総配信数</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalDeliveries.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <BarChart3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">成功率</p>
                <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {stats.successRate}%
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">応答時間</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.avgResponseTime}ms
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingWebhooks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                webhooksData?.data?.webhooks?.map((webhook: WebhookItem) => {
                  const statusCfg = statusConfig[webhook.status] || statusConfig.PAUSED;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <Card key={webhook.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-2 rounded-lg', statusCfg.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {webhook.name}
                            </span>
                            <span className={cn('text-xs px-2 py-0.5 rounded', statusCfg.color)}>
                              {webhook.status}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 truncate mb-2">
                            {webhook.url}
                          </p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {webhook.events.slice(0, 3).map((event) => (
                              <span
                                key={event}
                                className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                              >
                                {event}
                              </span>
                            ))}
                            {webhook.events.length > 3 && (
                              <span className="text-xs text-zinc-400">
                                +{webhook.events.length - 3} more
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>配信: {webhook.totalDeliveries}</span>
                            <span>成功率: {webhook.successRate}%</span>
                            {webhook.lastTriggeredAt && (
                              <span>最終: {new Date(webhook.lastTriggeredAt).toLocaleString('ja-JP')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestWebhook(webhook.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={webhook.status === 'ACTIVE' ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => handleToggleWebhook(webhook.id)}
                          >
                            {webhook.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWebhook(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {webhooksData?.data?.pagination && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  {webhooksData.data.pagination.total}件中{' '}
                  {(page - 1) * 10 + 1}-{Math.min(page * 10, webhooksData.data.pagination.total)}件
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {page} / {webhooksData.data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= webhooksData.data.pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                logsData?.data?.logs?.map((log: DeliveryLog) => {
                  const statusCfg = statusConfig[log.status] || statusConfig.FAILED;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <Card key={log.id} className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-1.5 rounded', statusCfg.color)}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-zinc-900 dark:text-white">
                              {log.event}
                            </span>
                            <span className="text-xs text-zinc-400">
                              → {log.webhookName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span>HTTP {log.statusCode}</span>
                            <span>{log.duration}ms</span>
                            {log.retryCount > 0 && (
                              <span className="text-amber-500">{log.retryCount}回再試行</span>
                            )}
                            <span>{new Date(log.triggeredAt).toLocaleString('ja-JP')}</span>
                          </div>
                          {log.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">{log.errorMessage}</p>
                          )}
                        </div>
                        {log.status === 'FAILED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryDelivery(log.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && eventTypesData?.data && (
          <div className="space-y-4">
            {['orders', 'listings', 'inventory', 'messaging', 'feedback', 'returns', 'pricing'].map((category) => {
              const events = eventTypesData.data.filter((e: { category: string }) => e.category === category);
              if (events.length === 0) return null;

              return (
                <Card key={category} className="p-4">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white capitalize mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {events.map((event: { id: string; name: string; description: string }) => (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <p className="font-medium text-sm text-zinc-900 dark:text-white">
                          {event.name}
                        </p>
                        <p className="text-xs text-zinc-500">{event.id}</p>
                        <p className="text-xs text-zinc-400 mt-1">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  シグネチャ検証
                </h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">シグネチャ検証を有効化</p>
                    <p className="text-sm text-zinc-500">受信したリクエストのシグネチャを検証します</p>
                  </div>
                  <div className="w-12 h-6 rounded-full bg-blue-500 relative">
                    <span className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    アルゴリズム
                  </label>
                  <select className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3">
                    <option>HMAC-SHA256</option>
                    <option>HMAC-SHA512</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Key className="h-5 w-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  IPホワイトリスト
                </h3>
              </div>
              <p className="text-sm text-zinc-500 mb-4">
                指定したIPアドレスからのリクエストのみ許可します
              </p>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <code className="text-sm">192.168.1.0/24</code><br />
                <code className="text-sm">10.0.0.1</code>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              新規Webhook作成
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateWebhook({
                  name: formData.get('name') as string,
                  url: formData.get('url') as string,
                  events: ['ORDER_CREATED', 'ORDER_SHIPPED'],
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  名前
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                  placeholder="My Webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  URL
                </label>
                <input
                  name="url"
                  type="url"
                  required
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                  placeholder="https://example.com/webhooks"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  キャンセル
                </Button>
                <Button variant="primary" type="submit">
                  作成
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Plug,
  RefreshCw,
  Plus,
  Link2,
  Link2Off,
  Play,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Webhook,
  Globe,
  Trash2,
  TestTube,
  History,
  Activity,
} from 'lucide-react';

type Tab = 'integrations' | 'webhooks' | 'apis' | 'logs' | 'marketplaces';

export default function IntegrationHubPage() {
  const [activeTab, setActiveTab] = useState<Tab>('integrations');
  const [selectedCategory, setSelectedCategory] = useState('');

  // データ取得
  const { data: integrationsData, mutate: mutateIntegrations } = useSWR<any>(
    `/api/ebay-integration-hub/integrations${selectedCategory ? `?category=${selectedCategory}` : ''}`,
    fetcher
  );
  const { data: webhooksData, mutate: mutateWebhooks } = useSWR<any>('/api/ebay-integration-hub/webhooks', fetcher);
  const { data: apisData } = useSWR<any>('/api/ebay-integration-hub/api-connections', fetcher);
  const { data: logsData, mutate: mutateLogs } = useSWR<any>('/api/ebay-integration-hub/sync-logs', fetcher);
  const { data: marketplacesData, mutate: mutateMarketplaces } = useSWR<any>('/api/ebay-integration-hub/marketplaces', fetcher);
  const { data: dashboardData } = useSWR<any>('/api/ebay-integration-hub/dashboard', fetcher);

  const integrations = integrationsData?.integrations ?? [];
  const webhooks = webhooksData?.webhooks ?? [];
  const apis = apisData?.connections ?? [];
  const logs = logsData?.logs ?? [];
  const marketplaces = marketplacesData?.marketplaces ?? [];
  const dashboard = dashboardData ?? { summary: {}, healthStatus: {} };

  const handleConnect = async (integrationId: string) => {
    try {
      const result = await postApi(`/api/ebay-integration-hub/integrations/${integrationId}/connect`, {}) as any;
      if (result.authUrl) {
        window.open(result.authUrl, '_blank');
      }
      addToast({ type: 'success', message: '認証ページにリダイレクトします' });
    } catch {
      addToast({ type: 'error', message: '接続に失敗しました' });
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('この統合を切断しますか？')) return;
    try {
      await postApi(`/api/ebay-integration-hub/integrations/${integrationId}/disconnect`, {});
      addToast({ type: 'success', message: '統合を切断しました' });
      mutateIntegrations();
    } catch {
      addToast({ type: 'error', message: '切断に失敗しました' });
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      await postApi(`/api/ebay-integration-hub/integrations/${integrationId}/sync`, {});
      addToast({ type: 'success', message: '同期を開始しました' });
      mutateLogs();
    } catch {
      addToast({ type: 'error', message: '同期に失敗しました' });
    }
  };

  const handleTestIntegration = async (integrationId: string) => {
    try {
      const result = await postApi(`/api/ebay-integration-hub/integrations/${integrationId}/test`, {}) as any;
      addToast({ type: result.testResult === 'SUCCESS' ? 'success' : 'error', message: result.message });
    } catch {
      addToast({ type: 'error', message: 'テストに失敗しました' });
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    try {
      const result = await postApi(`/api/ebay-integration-hub/webhooks/${webhookId}/test`, {}) as any;
      addToast({ type: 'success', message: result.message });
    } catch {
      addToast({ type: 'error', message: 'Webhookテストに失敗しました' });
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('このWebhookを削除しますか？')) return;
    try {
      await deleteApi(`/api/ebay-integration-hub/webhooks/${webhookId}`);
      addToast({ type: 'success', message: 'Webhookを削除しました' });
      mutateWebhooks();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const handleActivateMarketplace = async (marketplaceId: string) => {
    try {
      await postApi(`/api/ebay-integration-hub/marketplaces/${marketplaceId}/activate`, {});
      addToast({ type: 'success', message: 'マーケットプレイスを有効化しました' });
      mutateMarketplaces();
    } catch {
      addToast({ type: 'error', message: '有効化に失敗しました' });
    }
  };

  const tabs = [
    { id: 'integrations', label: '統合', icon: Plug },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'apis', label: 'API接続', icon: Activity },
    { id: 'logs', label: '同期ログ', icon: History },
    { id: 'marketplaces', label: 'マーケットプレイス', icon: Globe },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
      case 'ACTIVE':
      case 'HEALTHY':
      case 'SUCCESS':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" />{status === 'CONNECTED' ? '接続中' : status === 'ACTIVE' ? '有効' : status === 'HEALTHY' ? '正常' : '成功'}</span>;
      case 'DISCONNECTED':
      case 'INACTIVE':
      case 'FAILED':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600"><XCircle className="h-3 w-3" />{status === 'DISCONNECTED' ? '未接続' : status === 'INACTIVE' ? '無効' : '失敗'}</span>;
      case 'ERROR':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"><AlertCircle className="h-3 w-3" />エラー</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"><Clock className="h-3 w-3" />保留中</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600">{status}</span>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Plug className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">統合ハブ</h1>
            <p className="text-sm text-zinc-500">
              {dashboard.summary.connectedIntegrations ?? 0}/{dashboard.summary.totalIntegrations ?? 0} 統合接続中
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => mutateIntegrations()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">接続中</p>
              <p className="text-2xl font-bold text-cyan-600">{dashboard.summary.connectedIntegrations ?? 0}</p>
            </div>
            <Link2 className="h-8 w-8 text-cyan-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">同期数（24h）</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard.summary.totalSyncs24h ?? 0}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">成功率</p>
              <p className="text-2xl font-bold text-emerald-600">{dashboard.summary.successRate ?? 0}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">ヘルス</p>
              <p className="text-2xl font-bold text-emerald-600">{dashboard.healthStatus.apis ?? 'N/A'}</p>
            </div>
            <Activity className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
      </div>

      {/* タブ */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'integrations' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">すべてのカテゴリ</option>
                <option value="NOTIFICATION">通知</option>
                <option value="DATA_EXPORT">データエクスポート</option>
                <option value="MARKETPLACE">マーケットプレイス</option>
                <option value="FINANCE">会計</option>
                <option value="LOGISTICS">物流</option>
                <option value="WORKFLOW">ワークフロー</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {integrations.map((integration: any) => (
                <Card key={integration.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-zinc-100 flex items-center justify-center text-2xl">
                        {integration.icon === 'slack' && '💬'}
                        {integration.icon === 'google-sheets' && '📊'}
                        {integration.icon === 'shopify' && '🛒'}
                        {integration.icon === 'quickbooks' && '📒'}
                        {integration.icon === 'shippo' && '📦'}
                        {integration.icon === 'zapier' && '⚡'}
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">{integration.name}</h3>
                        <p className="text-sm text-zinc-500">{integration.description}</p>
                      </div>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>

                  {integration.status === 'CONNECTED' && integration.lastSync && (
                    <p className="text-xs text-zinc-400 mb-3">
                      最終同期: {new Date(integration.lastSync).toLocaleString('ja-JP')}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                    {integration.status === 'CONNECTED' ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleSync(integration.id)}>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          同期
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleTestIntegration(integration.id)}>
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDisconnect(integration.id)} className="text-red-500">
                          <Link2Off className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => handleConnect(integration.id)}>
                        <Link2 className="h-4 w-4 mr-1" />
                        接続
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'webhooks' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Webhook追加
              </Button>
            </div>

            <div className="space-y-2">
              {webhooks.map((webhook: any) => (
                <Card key={webhook.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Webhook className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">{webhook.name}</h3>
                        <p className="text-xs text-zinc-500 font-mono">{webhook.url}</p>
                        <div className="flex gap-1 mt-1">
                          {webhook.events.map((event: string) => (
                            <span key={event} className="px-1.5 py-0.5 rounded text-xs bg-zinc-100 text-zinc-600">
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-emerald-600">{webhook.successRate}%</p>
                        <p className="text-xs text-zinc-400">成功率</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleTestWebhook(webhook.id)}>
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteWebhook(webhook.id)} className="text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'apis' && (
          <div className="space-y-2">
            {apis.map((api: any) => (
              <Card key={api.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      api.status === 'HEALTHY' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      <Activity className={`h-5 w-5 ${
                        api.status === 'HEALTHY' ? 'text-emerald-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-white">{api.name}</h3>
                      <p className="text-xs text-zinc-500 font-mono">{api.baseUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {getStatusBadge(api.status)}
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{api.latency}ms</p>
                      <p className="text-xs text-zinc-400">レイテンシ</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-emerald-600">{api.uptime}%</p>
                      <p className="text-xs text-zinc-400">アップタイム</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-2">
            {logs.map((log: any) => (
              <Card key={log.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded flex items-center justify-center ${
                      log.status === 'SUCCESS' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{log.integrationName}</p>
                      <p className="text-xs text-zinc-500">
                        {log.recordsProcessed}件処理 • {log.recordsCreated}作成 • {log.recordsUpdated}更新
                        {log.recordsFailed > 0 && <span className="text-red-500"> • {log.recordsFailed}失敗</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">{new Date(log.startedAt).toLocaleString('ja-JP')}</p>
                    <span className={`text-xs ${log.type === 'AUTO' ? 'text-blue-500' : 'text-amber-500'}`}>
                      {log.type === 'AUTO' ? '自動' : '手動'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'marketplaces' && (
          <div className="grid grid-cols-3 gap-4">
            {marketplaces.map((marketplace: any) => (
              <Card key={marketplace.id} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-zinc-900 dark:text-white">{marketplace.name}</h3>
                  {getStatusBadge(marketplace.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div className="p-2 bg-zinc-50 rounded">
                    <span className="text-zinc-500">出品数</span>
                    <p className="font-medium">{marketplace.listingsCount.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded">
                    <span className="text-zinc-500">注文数</span>
                    <p className="font-medium">{marketplace.ordersCount.toLocaleString()}</p>
                  </div>
                </div>
                {marketplace.status !== 'ACTIVE' && (
                  <Button variant="primary" size="sm" className="w-full" onClick={() => handleActivateMarketplace(marketplace.id)}>
                    有効化
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

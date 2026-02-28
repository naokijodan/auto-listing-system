
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  RefreshCw,
  Store,
  Link2,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Pause,
  Trash2,
  Package,
  DollarSign,
  History,
  Zap,
  Globe,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';

type TabType = 'dashboard' | 'marketplaces' | 'sync' | 'inventory' | 'prices' | 'errors';

export default function MarketplaceSyncPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const { data: dashboard } = useSWR<any>('/api/ebay-marketplace-sync/dashboard', fetcher);
  const { data: marketplaces } = useSWR<any>('/api/ebay-marketplace-sync/marketplaces', fetcher);
  const { data: syncHistory } = useSWR<any>('/api/ebay-marketplace-sync/sync/history', fetcher);
  const { data: syncSchedule } = useSWR<any>('/api/ebay-marketplace-sync/sync/schedule', fetcher);
  const { data: inventoryStatus } = useSWR<any>('/api/ebay-marketplace-sync/inventory/status', fetcher);
  const { data: pricesStatus } = useSWR<any>('/api/ebay-marketplace-sync/prices/status', fetcher);
  const { data: errors } = useSWR<any>('/api/ebay-marketplace-sync/errors', fetcher);
  const { data: settings } = useSWR<any>('/api/ebay-marketplace-sync/settings', fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: Store },
    { id: 'marketplaces' as TabType, label: 'マーケットプレイス', icon: Globe },
    { id: 'sync' as TabType, label: '同期', icon: RefreshCw },
    { id: 'inventory' as TabType, label: '在庫', icon: Package },
    { id: 'prices' as TabType, label: '価格', icon: DollarSign },
    { id: 'errors' as TabType, label: 'エラー', icon: AlertTriangle },
  ];

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'warning': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default: return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500">
            <ArrowRightLeft className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">マーケットプレイス同期</h1>
            <p className="text-sm text-zinc-500">在庫・価格・出品の同期管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Link2 className="h-4 w-4 mr-1" />
            接続追加
          </Button>
          <Button variant="primary" size="sm">
            <RefreshCw className="h-4 w-4 mr-1" />
            今すぐ同期
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === 'errors' && errors?.total > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {errors.total}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">接続済み</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.connectedMarketplaces}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">同期済み出品</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.totalSyncedListings?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">保留中</p>
              <p className="text-2xl font-bold text-amber-600">
                {dashboard.pendingSync}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">エラー</p>
              <p className="text-2xl font-bold text-red-600">
                {dashboard.syncErrors}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">今日の同期</h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                <div className="p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{dashboard.stats?.today?.synced}</p>
                  <p className="text-xs text-zinc-500">同期</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg dark:bg-emerald-900/20">
                  <p className="text-lg font-bold text-emerald-600">{dashboard.stats?.today?.created}</p>
                  <p className="text-xs text-zinc-500">作成</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                  <p className="text-lg font-bold text-blue-600">{dashboard.stats?.today?.updated}</p>
                  <p className="text-xs text-zinc-500">更新</p>
                </div>
                <div className="p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                  <p className="text-lg font-bold text-zinc-600">{dashboard.stats?.today?.deleted}</p>
                  <p className="text-xs text-zinc-500">削除</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg dark:bg-red-900/20">
                  <p className="text-lg font-bold text-red-600">{dashboard.stats?.today?.errors}</p>
                  <p className="text-xs text-zinc-500">エラー</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">同期状態</h3>
              <div className="flex items-center justify-center gap-4">
                <div className={`px-4 py-2 rounded-full ${getHealthColor(dashboard.syncHealth)}`}>
                  {dashboard.syncHealth === 'healthy' ? <CheckCircle className="h-5 w-5" /> :
                   dashboard.syncHealth === 'warning' ? <AlertCircle className="h-5 w-5" /> :
                   <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {dashboard.syncHealth === 'healthy' ? '正常' :
                     dashboard.syncHealth === 'warning' ? '警告' : 'エラー'}
                  </p>
                  <p className="text-sm text-zinc-500">
                    最終同期: {new Date(dashboard.lastSyncAt).toLocaleString('ja-JP')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Marketplaces Tab */}
      {activeTab === 'marketplaces' && marketplaces && (
        <div className="space-y-4">
          {marketplaces.marketplaces?.map((mp: any) => (
            <Card key={mp.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    mp.status === 'connected' ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                    <Store className={`h-5 w-5 ${
                      mp.status === 'connected' ? 'text-indigo-600' : 'text-zinc-500'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{mp.name}</p>
                    <p className="text-sm text-zinc-500">{mp.platform} • {mp.region}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{mp.listings}件</p>
                    <p className="text-xs text-zinc-500">
                      {mp.lastSync ? `最終: ${new Date(mp.lastSync).toLocaleTimeString('ja-JP')}` : '未同期'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${getHealthColor(mp.health)}`}>
                    {mp.health === 'healthy' ? '正常' :
                     mp.health === 'warning' ? '警告' :
                     mp.health === 'disconnected' ? '未接続' : 'エラー'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Sync Tab */}
      {activeTab === 'sync' && syncHistory && syncSchedule && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">スケジュール</h3>
            <div className="space-y-3">
              {syncSchedule.schedules?.map((schedule: any) => (
                <div key={schedule.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${schedule.enabled ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{schedule.description}</p>
                      <p className="text-sm text-zinc-500">{schedule.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-zinc-600 dark:text-zinc-400">次回: {new Date(schedule.nextRun).toLocaleString('ja-JP')}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {schedule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">同期履歴</h3>
            <div className="space-y-3">
              {syncHistory.history?.map((sync: any) => (
                <div key={sync.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      sync.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'
                    }`}>
                      {sync.status === 'completed' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{sync.type}</p>
                      <p className="text-sm text-zinc-500">
                        {new Date(sync.startedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-zinc-700 dark:text-zinc-300">{sync.processed}件処理</p>
                      {sync.errors > 0 && (
                        <p className="text-red-600">{sync.errors}件エラー</p>
                      )}
                    </div>
                    <span className="text-sm text-zinc-500">{sync.duration}秒</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && inventoryStatus && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">商品数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {inventoryStatus.totalProducts}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">同期済み</p>
              <p className="text-2xl font-bold text-emerald-600">
                {inventoryStatus.inSync}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">差分あり</p>
              <p className="text-2xl font-bold text-amber-600">
                {inventoryStatus.outOfSync}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">保留中</p>
              <p className="text-2xl font-bold text-blue-600">
                {inventoryStatus.pending}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">マーケットプレイス別</h3>
            <div className="space-y-3">
              {inventoryStatus.byMarketplace?.map((mp: any) => (
                <div key={mp.marketplace} className="flex items-center justify-between py-2">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{mp.marketplace}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-emerald-600">{mp.inSync}同期</span>
                    <span className="text-sm text-amber-600">{mp.outOfSync}差分</span>
                    <span className="text-sm text-blue-600">{mp.pending}保留</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Prices Tab */}
      {activeTab === 'prices' && pricesStatus && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">商品数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {pricesStatus.totalProducts}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">同期済み</p>
              <p className="text-2xl font-bold text-emerald-600">
                {pricesStatus.inSync}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">差分あり</p>
              <p className="text-2xl font-bold text-amber-600">
                {pricesStatus.outOfSync}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">保留中</p>
              <p className="text-2xl font-bold text-blue-600">
                {pricesStatus.pending}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">価格ルール</h3>
            <div className="space-y-3">
              {pricesStatus.priceRules?.rules?.map((rule: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{rule.marketplace}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">
                      {rule.adjustment === 'multiply' ? '×' : rule.adjustment === 'percentage' ? '%' : '$'}
                      {rule.value}
                    </span>
                    <span className="text-sm text-zinc-400">{rule.currency}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && errors && (
        <div className="space-y-4">
          {errors.errors?.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-zinc-900 dark:text-white">エラーはありません</p>
              <p className="text-sm text-zinc-500">すべての同期が正常に完了しています</p>
            </Card>
          ) : (
            errors.errors?.map((error: any) => (
              <Card key={error.id} className={`p-4 ${error.resolved ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      error.type === 'validation' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      error.type === 'api_error' ? 'bg-red-100 dark:bg-red-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 ${
                        error.type === 'validation' ? 'text-amber-600' :
                        error.type === 'api_error' ? 'text-red-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{error.message}</p>
                      <p className="text-sm text-zinc-500">
                        {error.marketplace} • {error.listingId} • {new Date(error.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  {!error.resolved && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        再試行
                      </Button>
                      <Button variant="ghost" size="sm">
                        無視
                      </Button>
                    </div>
                  )}
                  {error.resolved && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
                      解決済み
                    </span>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

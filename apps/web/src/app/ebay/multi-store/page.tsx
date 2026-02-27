// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Store,
  RefreshCw,
  Plus,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Globe,
  Package,
  ShoppingCart,
  DollarSign,
  Star,
  ArrowRightLeft,
  Copy,
  BarChart3,
  Trash2,
  Edit3,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Sync,
  MoreVertical,
} from 'lucide-react';

interface StoreSummary {
  id: string;
  name: string;
  ebayUserId: string;
  email: string;
  country: string;
  status: string;
  subscriptionLevel: string;
  feedbackScore: number;
  feedbackCount: number;
  sellerLevel: string;
  totalListings: number;
  activeListings: number;
  monthlySales: number;
  monthlyOrders: number;
  lastSync: string | null;
  isPrimary: boolean;
}

interface Dashboard {
  summary: {
    totalStores: number;
    activeStores: number;
    totalListings: number;
    totalActiveListings: number;
    totalMonthlySales: number;
    totalMonthlyOrders: number;
    averageFeedback: string;
  };
  storesByStatus: Record<string, number>;
  storesByCountry: Record<string, number>;
  topPerformingStore: StoreSummary;
  recentActivity: Array<{
    type: string;
    store: string;
    message: string;
    timestamp: string;
  }>;
}

interface SubscriptionLevel {
  id: string;
  name: string;
  listingLimit: number;
  monthlyFee: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  ACTIVE: { label: 'アクティブ', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  SUSPENDED: { label: '停止中', color: 'bg-red-100 text-red-700', icon: XCircle },
  PENDING: { label: '認証待ち', color: 'bg-amber-100 text-amber-700', icon: Clock },
  LIMITED: { label: '制限中', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
};

const countryFlags: Record<string, string> = {
  US: '🇺🇸',
  GB: '🇬🇧',
  DE: '🇩🇪',
  AU: '🇦🇺',
  JP: '🇯🇵',
  CA: '🇨🇦',
  FR: '🇫🇷',
  IT: '🇮🇹',
};

export default function EbayMultiStorePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'stores' | 'compare' | 'settings'>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeStoreMenu, setActiveStoreMenu] = useState<string | null>(null);

  // Form state
  const [newStore, setNewStore] = useState({
    name: '',
    ebayUserId: '',
    email: '',
    country: 'US',
    subscriptionLevel: 'BASIC',
  });

  const { data: dashboard, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<Dashboard>(
    '/api/ebay-multi-store/dashboard',
    fetcher
  );

  const { data: storesData, mutate: mutateStores } = useSWR<{ stores: StoreSummary[] }>(
    '/api/ebay-multi-store/stores',
    fetcher
  );

  const { data: subscriptionLevels } = useSWR<SubscriptionLevel[]>(
    '/api/ebay-multi-store/subscription-levels',
    fetcher
  );

  const { data: comparisonData } = useSWR(
    selectedStores.size >= 2 ? `/api/ebay-multi-store/compare?storeIds=${Array.from(selectedStores).join(',')}` : null,
    fetcher
  );

  const stores = storesData?.stores || [];

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      await postApi('/api/ebay-multi-store/sync-all', { syncType: 'all' });
      addToast({ type: 'success', message: '全ストアの同期を開始しました' });
      mutateDashboard();
      mutateStores();
    } catch {
      addToast({ type: 'error', message: '同期の開始に失敗しました' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncStore = async (storeId: string) => {
    try {
      await postApi(`/api/ebay-multi-store/stores/${storeId}/sync`, { syncType: 'all' });
      addToast({ type: 'success', message: '同期を開始しました' });
      mutateStores();
    } catch {
      addToast({ type: 'error', message: '同期の開始に失敗しました' });
    }
  };

  const handleAddStore = async () => {
    try {
      const result = await postApi('/api/ebay-multi-store/stores', newStore);
      addToast({ type: 'success', message: (result as { message: string }).message });
      setShowAddModal(false);
      setNewStore({ name: '', ebayUserId: '', email: '', country: 'US', subscriptionLevel: 'BASIC' });
      mutateStores();
    } catch {
      addToast({ type: 'error', message: 'ストアの追加に失敗しました' });
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('このストアを削除しますか？')) return;

    try {
      await deleteApi(`/api/ebay-multi-store/stores/${storeId}`);
      addToast({ type: 'success', message: 'ストアを削除しました' });
      mutateStores();
    } catch {
      addToast({ type: 'error', message: 'ストアの削除に失敗しました' });
    }
  };

  const toggleStoreSelection = (storeId: string) => {
    setSelectedStores(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  };

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: BarChart3 },
    { id: 'stores', name: 'ストア一覧', icon: Store },
    { id: 'compare', name: 'ストア比較', icon: ArrowRightLeft },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">マルチストア管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {stores.length}ストア管理中
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            ストア追加
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            全ストア同期
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">総ストア</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.totalStores}</p>
                </div>
                <Store className="h-6 w-6 text-indigo-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">月間売上</p>
                  <p className="text-2xl font-bold">${dashboard?.summary.totalMonthlySales.toLocaleString()}</p>
                </div>
                <DollarSign className="h-6 w-6 text-emerald-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">月間注文</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.totalMonthlyOrders}</p>
                </div>
                <ShoppingCart className="h-6 w-6 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">総出品数</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.totalListings}</p>
                </div>
                <Package className="h-6 w-6 text-purple-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">アクティブ出品</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.totalActiveListings}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">平均評価</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.averageFeedback}%</p>
                </div>
                <Star className="h-6 w-6 text-amber-500" />
              </div>
            </Card>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Store Cards */}
            <div className="col-span-2 space-y-4">
              <h3 className="font-semibold">ストア概要</h3>
              <div className="grid grid-cols-2 gap-4">
                {stores.map((store) => {
                  const status = statusConfig[store.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <Card key={store.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{countryFlags[store.country] || '🌍'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{store.name}</h4>
                              {store.isPrimary && (
                                <span className="px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">
                                  プライマリ
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500">@{store.ebayUserId}</p>
                          </div>
                        </div>
                        <span className={cn('flex items-center gap-1 px-2 py-0.5 text-xs rounded', status.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div>
                          <p className="text-lg font-semibold">${(store.monthlySales / 1000).toFixed(1)}K</p>
                          <p className="text-xs text-zinc-500">売上</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{store.monthlyOrders}</p>
                          <p className="text-xs text-zinc-500">注文</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold">{store.activeListings}</p>
                          <p className="text-xs text-zinc-500">出品</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          {store.feedbackScore}%
                        </span>
                        <span>{store.sellerLevel}</span>
                        <span>
                          {store.lastSync ? `同期: ${new Date(store.lastSync).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}` : '未同期'}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Activity & Stats */}
            <div className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">最近のアクティビティ</h3>
                <div className="space-y-3">
                  {dashboard?.recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full',
                        activity.type === 'sync' ? 'bg-blue-100' :
                        activity.type === 'order' ? 'bg-emerald-100' :
                        activity.type === 'listing' ? 'bg-purple-100' :
                        'bg-amber-100'
                      )}>
                        {activity.type === 'sync' && <Sync className="h-4 w-4 text-blue-600" />}
                        {activity.type === 'order' && <ShoppingCart className="h-4 w-4 text-emerald-600" />}
                        {activity.type === 'listing' && <Package className="h-4 w-4 text-purple-600" />}
                        {activity.type === 'alert' && <AlertTriangle className="h-4 w-4 text-amber-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-zinc-500">{activity.store}</p>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {new Date(activity.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">トップストア</h3>
                {dashboard?.topPerformingStore && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-2xl">{countryFlags[dashboard.topPerformingStore.country]}</span>
                      <h4 className="text-lg font-semibold">{dashboard.topPerformingStore.name}</h4>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 mb-1">
                      ${dashboard.topPerformingStore.monthlySales.toLocaleString()}
                    </p>
                    <p className="text-sm text-zinc-500">月間売上</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Stores Tab */}
      {activeTab === 'stores' && (
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ストア</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">プラン</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">出品</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">月間売上</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">評価</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">最終同期</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => {
                  const status = statusConfig[store.status] || statusConfig.PENDING;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={store.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{countryFlags[store.country] || '🌍'}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{store.name}</span>
                              {store.isPrimary && (
                                <span className="px-1 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded">P</span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-500">@{store.ebayUserId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('flex items-center gap-1 px-2 py-0.5 text-xs rounded w-fit', status.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{store.subscriptionLevel}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        {store.activeListings} / {store.totalListings}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        ${store.monthlySales.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className="flex items-center justify-end gap-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          {store.feedbackScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {store.lastSync ? new Date(store.lastSync).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSyncStore(store.id)}
                            title="同期"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveStoreMenu(activeStoreMenu === store.id ? null : store.id)}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            {activeStoreMenu === store.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 z-50">
                                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-700">
                                  <Edit3 className="h-4 w-4" />
                                  編集
                                </button>
                                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-700">
                                  <Copy className="h-4 w-4" />
                                  出品コピー
                                </button>
                                <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-zinc-50 dark:hover:bg-zinc-700">
                                  <ExternalLink className="h-4 w-4" />
                                  eBayで開く
                                </button>
                                {!store.isPrimary && (
                                  <button
                                    onClick={() => { handleDeleteStore(store.id); setActiveStoreMenu(null); }}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    削除
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">比較するストアを選択</h3>
            <div className="flex flex-wrap gap-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => toggleStoreSelection(store.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
                    selectedStores.has(store.id)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-zinc-200 hover:border-zinc-300'
                  )}
                >
                  <span>{countryFlags[store.country]}</span>
                  <span>{store.name}</span>
                  {selectedStores.has(store.id) && <CheckCircle className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </Card>

          {selectedStores.size >= 2 && comparisonData && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4">比較結果</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-zinc-500">指標</th>
                      {(comparisonData as { stores: Array<{ id: string; name: string; country: string }> }).stores.map((store: { id: string; name: string; country: string }) => (
                        <th key={store.id} className="px-4 py-2 text-center text-sm font-medium">
                          {countryFlags[store.country]} {store.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">月間売上</td>
                      {(comparisonData as { metrics: { monthlySales: Array<{ storeId: string; value: number }> } }).metrics.monthlySales.map((item: { storeId: string; value: number }) => (
                        <td key={item.storeId} className="px-4 py-3 text-center font-semibold">
                          ${item.value.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">月間注文</td>
                      {(comparisonData as { metrics: { monthlyOrders: Array<{ storeId: string; value: number }> } }).metrics.monthlyOrders.map((item: { storeId: string; value: number }) => (
                        <td key={item.storeId} className="px-4 py-3 text-center font-semibold">
                          {item.value}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">アクティブ出品</td>
                      {(comparisonData as { metrics: { activeListings: Array<{ storeId: string; value: number }> } }).metrics.activeListings.map((item: { storeId: string; value: number }) => (
                        <td key={item.storeId} className="px-4 py-3 text-center font-semibold">
                          {item.value}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">評価スコア</td>
                      {(comparisonData as { metrics: { feedbackScore: Array<{ storeId: string; value: number }> } }).metrics.feedbackScore.map((item: { storeId: string; value: number }) => (
                        <td key={item.storeId} className="px-4 py-3 text-center font-semibold">
                          {item.value}%
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">平均注文額</td>
                      {(comparisonData as { metrics: { averageOrderValue: Array<{ storeId: string; value: string | number }> } }).metrics.averageOrderValue.map((item: { storeId: string; value: string | number }) => (
                        <td key={item.storeId} className="px-4 py-3 text-center font-semibold">
                          ${item.value}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t bg-zinc-50 dark:bg-zinc-800">
                      <td className="px-4 py-3 text-sm font-medium">売上成長率</td>
                      {(comparisonData as { trends: { salesGrowth: Array<{ storeId: string; value: string }> } }).trends.salesGrowth.map((item: { storeId: string; value: string }) => (
                        <td key={item.storeId} className="px-4 py-3 text-center">
                          <span className={cn(
                            'flex items-center justify-center gap-1 font-semibold',
                            parseFloat(item.value) >= 0 ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            {parseFloat(item.value) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                            {item.value}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">同期設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動同期</p>
                  <p className="text-sm text-zinc-500">定期的にストアデータを同期</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">同期間隔</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option value="15">15分</option>
                  <option value="30">30分</option>
                  <option value="60">1時間</option>
                  <option value="360">6時間</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">価格同期</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">在庫同期</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">注文同期</span>
                </label>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">クロスリスティング設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動翻訳</p>
                  <p className="text-sm text-zinc-500">出品コピー時に自動翻訳</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">国別価格調整</label>
                <div className="space-y-2">
                  {['GB', 'DE', 'AU'].map((country) => (
                    <div key={country} className="flex items-center gap-2">
                      <span className="w-8">{countryFlags[country]}</span>
                      <input
                        type="number"
                        defaultValue={country === 'GB' ? 5 : country === 'DE' ? 8 : 10}
                        className="w-20 px-2 py-1 border rounded text-right"
                      />
                      <span className="text-sm text-zinc-500">%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Store Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold mb-4">新規ストア追加</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ストア名</label>
                <input
                  type="text"
                  value={newStore.name}
                  onChange={(e) => setNewStore(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例: Main Store"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">eBayユーザーID</label>
                <input
                  type="text"
                  value={newStore.ebayUserId}
                  onChange={(e) => setNewStore(prev => ({ ...prev, ebayUserId: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例: seller_2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={newStore.email}
                  onChange={(e) => setNewStore(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="例: store@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">国</label>
                <select
                  value={newStore.country}
                  onChange={(e) => setNewStore(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="US">🇺🇸 アメリカ</option>
                  <option value="GB">🇬🇧 イギリス</option>
                  <option value="DE">🇩🇪 ドイツ</option>
                  <option value="AU">🇦🇺 オーストラリア</option>
                  <option value="CA">🇨🇦 カナダ</option>
                  <option value="JP">🇯🇵 日本</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">サブスクリプション</label>
                <select
                  value={newStore.subscriptionLevel}
                  onChange={(e) => setNewStore(prev => ({ ...prev, subscriptionLevel: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {subscriptionLevels?.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name} - ${level.monthlyFee}/月 ({level.listingLimit}出品)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={handleAddStore}>
                追加
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {activeStoreMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setActiveStoreMenu(null)} />
      )}
    </div>
  );
}

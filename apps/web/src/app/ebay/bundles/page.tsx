'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Package,
  Gift,
  Layers,
  TrendingDown,
  GitBranch,
  Shuffle,
  Plus,
  RefreshCw,
  Search,
  CheckCircle,
  Pause,
  Archive,
  AlertTriangle,
  XCircle,
  Play,
  Copy,
  Trash2,
  Edit3,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Percent,
  ShoppingCart,
  Settings,
  Sparkles,
  Clock,
  Eye,
  MoreHorizontal,
  X,
  ChevronRight,
  Calendar,
  Target,
  Loader2,
  Save,
} from 'lucide-react';

interface BundleDashboard {
  summary: {
    totalBundles: number;
    activeBundles: number;
    totalSold: number;
    totalRevenue: number;
    averageDiscount: number;
    conversionRate: number;
  };
  performance: {
    today: { sold: number; revenue: number };
    thisWeek: { sold: number; revenue: number };
    thisMonth: { sold: number; revenue: number };
  };
  topBundles: Array<{
    id: string;
    name: string;
    type: string;
    soldCount: number;
    revenue: number;
    conversionRate: number;
  }>;
  byType: Array<{
    type: string;
    count: number;
    soldCount: number;
    revenue: number;
  }>;
  alerts: Array<{
    type: string;
    bundleId: string;
    bundleName: string;
    message: string;
  }>;
}

interface Bundle {
  id: string;
  name: string;
  description: string;
  type: string;
  itemCount: number;
  items: Array<{
    listingId: string;
    title: string;
    quantity: number;
    price: number;
  }>;
  originalPrice: number;
  bundlePrice: number;
  discountType: string;
  discountValue: number;
  savingsAmount: number;
  savingsPercent: number;
  soldCount: number;
  revenue: number;
  stockQuantity: number;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeConfig: Record<string, { name: string; icon: typeof Package; color: string }> = {
  FIXED: { name: '固定セット', icon: Package, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  MIX_MATCH: { name: 'ミックス&マッチ', icon: Shuffle, color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  BOGO: { name: 'BOGO', icon: Gift, color: 'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  QUANTITY: { name: '数量割引', icon: Layers, color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  TIERED: { name: '階層型', icon: TrendingDown, color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  CROSS_SELL: { name: 'クロスセル', icon: GitBranch, color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
};

const statusConfig: Record<string, { name: string; icon: typeof CheckCircle; color: string }> = {
  DRAFT: { name: '下書き', icon: Archive, color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400' },
  ACTIVE: { name: '有効', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  SCHEDULED: { name: '予約済み', icon: Clock, color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  PAUSED: { name: '一時停止', icon: Pause, color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ENDED: { name: '終了', icon: XCircle, color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400' },
  SOLD_OUT: { name: '売り切れ', icon: AlertTriangle, color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function EbayBundlesPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bundles' | 'templates' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: dashboard, mutate: mutateDashboard } = useSWR<BundleDashboard>(
    '/api/ebay-bundles/dashboard',
    fetcher
  );

  const { data: bundlesData, mutate: mutateBundles } = useSWR<{ bundles: Bundle[] }>(
    '/api/ebay-bundles/bundles',
    fetcher
  );

  const { data: templatesData } = useSWR<{ templates: Array<{ id: string; name: string; type: string; description: string }> }>(
    '/api/ebay-bundles/templates',
    fetcher
  );

  const bundles = bundlesData?.bundles || [];
  const templates = templatesData?.templates || [];

  const handleRefresh = () => {
    mutateDashboard();
    mutateBundles();
  };

  const handleActivate = async (bundleId: string) => {
    try {
      await postApi(`/api/ebay-bundles/bundles/${bundleId}/activate`, {});
      addToast({ type: 'success', message: 'バンドルを有効化しました' });
      mutateBundles();
    } catch {
      addToast({ type: 'error', message: '有効化に失敗しました' });
    }
  };

  const handlePause = async (bundleId: string) => {
    try {
      await postApi(`/api/ebay-bundles/bundles/${bundleId}/pause`, {});
      addToast({ type: 'success', message: 'バンドルを一時停止しました' });
      mutateBundles();
    } catch {
      addToast({ type: 'error', message: '一時停止に失敗しました' });
    }
  };

  const handleDuplicate = async (bundleId: string) => {
    try {
      await postApi(`/api/ebay-bundles/bundles/${bundleId}/duplicate`, {});
      addToast({ type: 'success', message: 'バンドルを複製しました' });
      mutateBundles();
    } catch {
      addToast({ type: 'error', message: '複製に失敗しました' });
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: TrendingUp },
    { id: 'bundles', label: 'バンドル', icon: Package },
    { id: 'templates', label: 'テンプレート', icon: Sparkles },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
            <Gift className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">バンドル販売</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              セット商品・まとめ売り管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規バンドル
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600 dark:text-pink-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-50 dark:bg-pink-900/30">
                    <Package className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">総バンドル</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                      {dashboard.summary.totalBundles}
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
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">有効</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {dashboard.summary.activeBundles}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">販売数</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                      {dashboard.summary.totalSold.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">売上</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${dashboard.summary.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/30">
                    <Percent className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">平均割引</p>
                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      {dashboard.summary.averageDiscount}%
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                    <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">CVR</p>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {dashboard.summary.conversionRate}%
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Performance */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">今日</h3>
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.performance.today.sold}</p>
                    <p className="text-xs text-zinc-500">販売</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">${dashboard.performance.today.revenue.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">売上</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">今週</h3>
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.performance.thisWeek.sold}</p>
                    <p className="text-xs text-zinc-500">販売</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">${dashboard.performance.thisWeek.revenue.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">売上</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">今月</h3>
                <div className="flex items-baseline gap-4">
                  <div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.performance.thisMonth.sold}</p>
                    <p className="text-xs text-zinc-500">販売</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">${dashboard.performance.thisMonth.revenue.toLocaleString()}</p>
                    <p className="text-xs text-zinc-500">売上</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Top Bundles */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-pink-500" />
                  トップバンドル
                </h3>
                <div className="space-y-3">
                  {dashboard.topBundles.map((bundle, index) => {
                    const config = typeConfig[bundle.type] || typeConfig.FIXED;
                    const TypeIcon = config.icon;
                    return (
                      <div
                        key={bundle.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pink-100 text-xs font-medium text-pink-700 dark:bg-pink-900/50 dark:text-pink-400">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">
                              {bundle.name}
                            </p>
                            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs', config.color)}>
                              <TypeIcon className="h-3 w-3" />
                              {config.name}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {bundle.soldCount}個
                          </p>
                          <p className="text-xs text-green-600">
                            ${bundle.revenue.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* By Type */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-pink-500" />
                  タイプ別実績
                </h3>
                <div className="space-y-3">
                  {dashboard.byType.map((item) => {
                    const config = typeConfig[item.type] || typeConfig.FIXED;
                    const TypeIcon = config.icon;
                    const percentage = (item.revenue / dashboard.summary.totalRevenue) * 100;
                    return (
                      <div key={item.type} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded', config.color)}>
                            <TypeIcon className="h-3 w-3" />
                            {config.name}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {item.count}件 / ${item.revenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Alerts */}
            {dashboard.alerts.length > 0 && (
              <Card className="p-4 border-amber-200 dark:border-amber-800">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  アラート
                </h3>
                <div className="space-y-2">
                  {dashboard.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20"
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          <strong>{alert.bundleName}</strong>: {alert.message}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Bundles Tab */}
        {activeTab === 'bundles' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="バンドルを検索..."
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">すべてのタイプ</option>
                {Object.entries(typeConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">すべてのステータス</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.name}</option>
                ))}
              </select>
            </div>

            {/* Bundles List */}
            <div className="space-y-3">
              {bundles.map((bundle) => {
                const typeConf = typeConfig[bundle.type] || typeConfig.FIXED;
                const statusConf = statusConfig[bundle.status] || statusConfig.DRAFT;
                const TypeIcon = typeConf.icon;
                const StatusIcon = statusConf.icon;

                return (
                  <Card key={bundle.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', typeConf.color)}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                              {bundle.name}
                            </h4>
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', statusConf.color)}>
                              <StatusIcon className="h-3 w-3" />
                              {statusConf.name}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {bundle.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-zinc-500">
                              {bundle.itemCount}商品
                            </span>
                            <span className="text-xs text-zinc-500">
                              在庫: {bundle.stockQuantity}
                            </span>
                            {bundle.endDate && (
                              <span className="text-xs text-amber-600 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(bundle.endDate).toLocaleDateString('ja-JP')}まで
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-zinc-500 line-through">${bundle.originalPrice.toFixed(2)}</p>
                          <p className="text-lg font-bold text-zinc-900 dark:text-white">${bundle.bundlePrice.toFixed(2)}</p>
                          <p className="text-xs text-green-600">-{bundle.savingsPercent.toFixed(1)}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-zinc-900 dark:text-white">{bundle.soldCount}</p>
                          <p className="text-xs text-zinc-500">販売数</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">${bundle.revenue.toLocaleString()}</p>
                          <p className="text-xs text-zinc-500">売上</p>
                        </div>

                        <div className="flex items-center gap-1">
                          {bundle.status === 'DRAFT' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivate(bundle.id)}
                              title="有効化"
                            >
                              <Play className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          {bundle.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePause(bundle.id)}
                              title="一時停止"
                            >
                              <Pause className="h-4 w-4 text-amber-600" />
                            </Button>
                          )}
                          {bundle.status === 'PAUSED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleActivate(bundle.id)}
                              title="再開"
                            >
                              <Play className="h-4 w-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicate(bundle.id)}
                            title="複製"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="編集">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="削除">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2 overflow-x-auto">
                        {bundle.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex-shrink-0 px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 text-xs"
                          >
                            {item.title} {item.quantity > 1 && `x${item.quantity}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-3 gap-4">
            {templates.map((template) => {
              const config = typeConfig[template.type] || typeConfig.FIXED;
              const TypeIcon = config.icon;
              return (
                <Card key={template.id} className="p-4 hover:border-pink-300 dark:hover:border-pink-700 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', config.color)}>
                      <TypeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                        {template.name}
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    <Plus className="h-4 w-4 mr-1" />
                    このテンプレートを使用
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">デフォルト設定</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      デフォルト割引タイプ
                    </label>
                    <select className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                      <option value="PERCENTAGE">パーセント割引</option>
                      <option value="FIXED_AMOUNT">固定金額割引</option>
                      <option value="FIXED_PRICE">セット価格</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      デフォルト割引率
                    </label>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">1バンドルあたりの最大商品数</p>
                    <p className="text-xs text-zinc-500">バンドルに含められる商品の上限</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={10}
                    className="w-20 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">自動化設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">在庫切れ時に自動終了</p>
                    <p className="text-xs text-zinc-500">在庫がなくなったらバンドルを自動終了</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">作成時にeBayに自動同期</p>
                    <p className="text-xs text-zinc-500">バンドル作成後すぐにeBayに出品</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">通知設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">低在庫通知</p>
                    <p className="text-xs text-zinc-500">在庫が少なくなったら通知</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">低在庫しきい値</p>
                    <p className="text-xs text-zinc-500">この数量以下で通知</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={5}
                    className="w-20 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">表示設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">出品ページに節約額を表示</p>
                    <p className="text-xs text-zinc-500">バンドル購入時の節約額を表示</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">ミックス&マッチを許可</p>
                    <p className="text-xs text-zinc-500">購入者が商品を選べるバンドル</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button variant="primary">
                <Save className="h-4 w-4 mr-1" />
                設定を保存
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-zinc-800 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                新規バンドル作成
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  バンドル名
                </label>
                <input
                  type="text"
                  placeholder="例: Complete Camera Kit"
                  className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  説明
                </label>
                <textarea
                  placeholder="バンドルの説明..."
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  バンドルタイプ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(typeConfig).map(([key, config]) => {
                    const TypeIcon = config.icon;
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <input type="radio" name="bundleType" value={key} className="hidden peer" />
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg peer-checked:ring-2 peer-checked:ring-pink-500', config.color)}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <span className="text-sm">{config.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    割引タイプ
                  </label>
                  <select className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                    <option value="PERCENTAGE">パーセント割引</option>
                    <option value="FIXED_AMOUNT">固定金額割引</option>
                    <option value="FIXED_PRICE">セット価格</option>
                    <option value="FREE_ITEM">無料アイテム</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    割引値
                  </label>
                  <input
                    type="number"
                    placeholder="15"
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  商品を追加
                </label>
                <div className="p-4 rounded-lg border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-center">
                  <Package className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm text-zinc-500">
                    商品を検索して追加
                  </p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    商品を追加
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => { setShowCreateModal(false); addToast({ type: 'success', message: 'バンドルを作成しました' }); }}>
                <Plus className="h-4 w-4 mr-1" />
                作成
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

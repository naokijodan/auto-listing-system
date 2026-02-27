// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Layers,
  Package,
  Palette,
  Ruler,
  Grid3X3,
  Plus,
  RefreshCw,
  Search,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit3,
  Trash2,
  Download,
  Upload,
  ArrowUpDown,
  Settings,
  Eye,
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  Archive,
  Loader2,
  Save,
  X,
} from 'lucide-react';

interface VariationDashboard {
  summary: {
    totalGroups: number;
    totalVariations: number;
    activeVariations: number;
    outOfStockVariations: number;
    lowStockVariations: number;
    totalInventoryValue: number;
  };
  topSellingVariations: Array<{
    id: string;
    listingTitle: string;
    attributes: Record<string, string>;
    soldCount: number;
    revenue: number;
  }>;
  stockAlerts: Array<{
    id: string;
    listingTitle: string;
    attributes: Record<string, string>;
    quantity: number;
    status: string;
  }>;
  attributeDistribution: Array<{
    attribute: string;
    count: number;
    percentage: number;
  }>;
}

interface VariationGroup {
  id: string;
  listingId: string;
  listingTitle: string;
  name: string;
  attributes: Array<{ type: string; optionCount: number }>;
  variationCount: number;
  activeCount: number;
  outOfStockCount: number;
  totalQuantity: number;
  basePrice: number;
  priceRange: { min: number; max: number };
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface VariationAttribute {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  examples: string[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  ACTIVE: { label: '有効', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  INACTIVE: { label: '無効', color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', icon: Archive },
  OUT_OF_STOCK: { label: '在庫切れ', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  LOW_STOCK: { label: '在庫少', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
};

export default function EbayVariationsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'groups' | 'matrix' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: dashboard, mutate: mutateDashboard } = useSWR<VariationDashboard>(
    '/api/ebay-variations/dashboard',
    fetcher
  );

  const { data: groupsData, mutate: mutateGroups } = useSWR<{ groups: VariationGroup[] }>(
    '/api/ebay-variations/groups',
    fetcher
  );

  const { data: attributesData } = useSWR<{ attributes: VariationAttribute[] }>(
    '/api/ebay-variations/attributes',
    fetcher
  );

  const { data: matrixData } = useSWR(
    selectedGroupId ? `/api/ebay-variations/matrix/${selectedGroupId}` : null,
    fetcher
  );

  const groups = groupsData?.groups || [];
  const attributes = attributesData?.attributes || [];

  const handleRefresh = () => {
    mutateDashboard();
    mutateGroups();
  };

  const handleSyncToEbay = async (groupId: string) => {
    try {
      await postApi(`/api/ebay-variations/sync/${groupId}`, {});
      addToast({ type: 'success', message: 'eBayへの同期を開始しました' });
    } catch {
      addToast({ type: 'error', message: '同期に失敗しました' });
    }
  };

  const handleExport = async (groupId: string) => {
    try {
      window.open(`/api/ebay-variations/export/${groupId}?format=csv`, '_blank');
      addToast({ type: 'success', message: 'エクスポートを開始しました' });
    } catch {
      addToast({ type: 'error', message: 'エクスポートに失敗しました' });
    }
  };

  const formatAttributes = (attrs: Record<string, string>) => {
    return Object.entries(attrs).map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  const tabs = [
    { id: 'dashboard', label: 'ダッシュボード', icon: Grid3X3 },
    { id: 'groups', label: 'グループ', icon: Layers },
    { id: 'matrix', label: 'マトリックス', icon: Grid3X3 },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">商品バリエーション</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              カラー・サイズなどのバリエーション管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規グループ
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
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
                    <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">グループ数</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                      {dashboard.summary.totalGroups}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">総バリエーション</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">
                      {dashboard.summary.totalVariations.toLocaleString()}
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
                      {dashboard.summary.activeVariations.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">在庫切れ</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {dashboard.summary.outOfStockVariations}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">在庫少</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                      {dashboard.summary.lowStockVariations}
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
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">在庫総額</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      ${dashboard.summary.totalInventoryValue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Top Selling Variations */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  売上上位バリエーション
                </h3>
                <div className="space-y-3">
                  {dashboard.topSellingVariations.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[200px]">
                            {item.listingTitle}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatAttributes(item.attributes)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {item.soldCount}個
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                          ${item.revenue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Stock Alerts */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  在庫アラート
                </h3>
                <div className="space-y-3">
                  {dashboard.stockAlerts.map((item) => {
                    const config = statusConfig[item.status] || statusConfig.ACTIVE;
                    const StatusIcon = config.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <StatusIcon className={cn('h-5 w-5', item.status === 'OUT_OF_STOCK' ? 'text-red-500' : 'text-amber-500')} />
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate max-w-[200px]">
                              {item.listingTitle}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatAttributes(item.attributes)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
                            {item.quantity}個
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Attribute Distribution */}
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Palette className="h-4 w-4 text-violet-500" />
                属性分布
              </h3>
              <div className="space-y-3">
                {dashboard.attributeDistribution.map((attr) => (
                  <div key={attr.attribute} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-zinc-600 dark:text-zinc-400">{attr.attribute}</div>
                    <div className="flex-1">
                      <div className="h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
                          style={{ width: `${attr.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm">
                      <span className="font-medium text-zinc-900 dark:text-white">{attr.count.toLocaleString()}</span>
                      <span className="text-zinc-500 ml-1">({attr.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Groups Tab */}
        {activeTab === 'groups' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="グループを検索..."
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>

            {/* Groups List */}
            <div className="space-y-3">
              {groups.map((group) => (
                <Card key={group.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
                        <Layers className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-zinc-900 dark:text-white">
                          {group.listingTitle}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {group.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {group.attributes.map((attr) => (
                            <span
                              key={attr.type}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            >
                              {attr.type === 'COLOR' && <Palette className="h-3 w-3" />}
                              {attr.type === 'SIZE' && <Ruler className="h-3 w-3" />}
                              {attr.type}: {attr.optionCount}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{group.variationCount}</p>
                        <p className="text-xs text-zinc-500">バリエーション</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600">{group.activeCount}</p>
                        <p className="text-xs text-zinc-500">有効</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">{group.outOfStockCount}</p>
                        <p className="text-xs text-zinc-500">在庫切れ</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-zinc-900 dark:text-white">{group.totalQuantity}</p>
                        <p className="text-xs text-zinc-500">在庫総数</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          ${group.priceRange.min.toFixed(2)} - ${group.priceRange.max.toFixed(2)}
                        </p>
                        <p className="text-xs text-zinc-500">価格帯</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedGroupId(group.id)}
                          title="マトリックス表示"
                        >
                          <Grid3X3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncToEbay(group.id)}
                          title="eBayに同期"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExport(group.id)}
                          title="エクスポート"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="編集">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Matrix Tab */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            {!selectedGroupId ? (
              <Card className="p-8">
                <div className="text-center">
                  <Grid3X3 className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
                  <p className="text-zinc-500 dark:text-zinc-400">
                    グループを選択して在庫マトリックスを表示
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setActiveTab('groups')}
                  >
                    グループを選択
                  </Button>
                </div>
              </Card>
            ) : matrixData ? (
              <Card className="p-4 overflow-x-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white">
                    在庫マトリックス
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedGroupId(null)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    閉じる
                  </Button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2 bg-zinc-50 dark:bg-zinc-800 font-medium">
                        {matrixData.rowAttribute} / {matrixData.columnAttribute}
                      </th>
                      {matrixData.columns.map((col: string) => (
                        <th key={col} className="text-center p-2 bg-zinc-50 dark:bg-zinc-800 font-medium">
                          {col}
                        </th>
                      ))}
                      <th className="text-center p-2 bg-zinc-100 dark:bg-zinc-700 font-medium">合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixData.rows.map((row: string, rowIndex: number) => (
                      <tr key={row}>
                        <td className="p-2 font-medium bg-zinc-50 dark:bg-zinc-800">{row}</td>
                        {matrixData.cells[rowIndex].map((cell: { variationId: string; quantity: number; price: number; status: string }, colIndex: number) => {
                          const bgColor = cell.status === 'OUT_OF_STOCK'
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : cell.status === 'LOW_STOCK'
                            ? 'bg-amber-50 dark:bg-amber-900/20'
                            : 'bg-white dark:bg-zinc-900';
                          return (
                            <td key={colIndex} className={cn('text-center p-2 border border-zinc-200 dark:border-zinc-700', bgColor)}>
                              <div className="font-medium">{cell.quantity}</div>
                              <div className="text-xs text-zinc-500">${cell.price.toFixed(2)}</div>
                            </td>
                          );
                        })}
                        <td className="text-center p-2 bg-zinc-100 dark:bg-zinc-700 font-medium">
                          {matrixData.totals.byRow[rowIndex]}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2 font-medium bg-zinc-100 dark:bg-zinc-700">合計</td>
                      {matrixData.totals.byColumn.map((total: number, index: number) => (
                        <td key={index} className="text-center p-2 bg-zinc-100 dark:bg-zinc-700 font-medium">
                          {total}
                        </td>
                      ))}
                      <td className="text-center p-2 bg-violet-100 dark:bg-violet-900/30 font-bold text-violet-700 dark:text-violet-400">
                        {matrixData.totals.total}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            ) : (
              <Card className="p-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">在庫設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">低在庫しきい値</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      この数量以下で低在庫アラート
                    </p>
                  </div>
                  <input
                    type="number"
                    defaultValue={5}
                    className="w-20 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">在庫切れ時に自動無効化</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      在庫がなくなったバリエーションを自動で無効にする
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-violet-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">更新時にeBayに自動同期</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      バリエーションを変更したら自動的にeBayに反映
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">SKU設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    デフォルトSKUフォーマット
                  </label>
                  <input
                    type="text"
                    defaultValue="{BASE}-{COLOR}-{SIZE}"
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    利用可能な変数: {'{BASE}'}, {'{COLOR}'}, {'{SIZE}'}, {'{MATERIAL}'}, {'{INDEX}'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">通知設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">低在庫通知</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      低在庫になったら通知を受け取る
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-violet-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">在庫切れ通知</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      在庫切れになったら通知を受け取る
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">制限設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">リスティングあたり最大バリエーション</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      eBayの制限: 250
                    </p>
                  </div>
                  <input
                    type="number"
                    defaultValue={250}
                    className="w-20 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">最大属性数</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      1バリエーションあたりの属性数上限
                    </p>
                  </div>
                  <input
                    type="number"
                    defaultValue={3}
                    className="w-20 h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-right dark:border-zinc-700 dark:bg-zinc-900"
                  />
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
                新規バリエーショングループ
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  出品を選択
                </label>
                <select className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <option value="">出品を選択してください</option>
                  <option value="lst-001">Vintage Denim Jacket</option>
                  <option value="lst-002">Leather Crossbody Bag</option>
                  <option value="lst-003">Cotton T-Shirt</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  グループ名
                </label>
                <input
                  type="text"
                  placeholder="例: Size & Color Variations"
                  className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                  属性を選択
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {attributes.slice(0, 6).map((attr) => (
                    <label
                      key={attr.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-zinc-200 cursor-pointer hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{attr.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    基本価格
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    基本SKU
                  </label>
                  <input
                    type="text"
                    placeholder="例: VDJ-2026"
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="generateCombinations" defaultChecked className="rounded" />
                <label htmlFor="generateCombinations" className="text-sm text-zinc-700 dark:text-zinc-300">
                  すべての組み合わせを自動生成
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => { setShowCreateModal(false); addToast({ type: 'success', message: 'グループを作成しました' }); }}>
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

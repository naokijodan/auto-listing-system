
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Warehouse,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Package,
  RefreshCw,
  Loader2,
  Settings,
  Brain,
  AlertTriangle,
  MapPin,
  Truck,
  BarChart3,
  Zap,
  Check,
  Clock,
  Globe,
} from 'lucide-react';

interface DashboardData {
  success: boolean;
  stats: {
    totalSKUs: number;
    totalUnits: number;
    totalValue: number;
    warehouseUtilization: number;
    averageTurnoverRate: number;
    stockoutRisk: number;
    overstockItems: number;
  };
  warehouseStats: Array<{
    code: string;
    name: string;
    country: string;
    capacity: number;
    currentStock: number;
    utilization: number;
    inbound: number;
    outbound: number;
    pendingTransfers: number;
  }>;
  healthScore: {
    overall: number;
    distribution: number;
    turnover: number;
    stockLevel: number;
    demandAlignment: number;
  };
  optimizationSummary: {
    pendingRecommendations: number;
    potentialSavings: number;
    potentialSpeedImprovement: number;
    urgentActions: number;
  };
}

interface Strategy {
  code: string;
  name: string;
  description: string;
}

const statusColors: Record<string, string> = {
  OPTIMAL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  OVERSTOCKED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  UNDERSTOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  UNBALANCED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const transferStatusColors: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  IN_TRANSIT: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-amber-100 text-amber-700',
};

export default function EbayInventoryOptimizationPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'distribution' | 'optimization' | 'abc' | 'history' | 'settings'>('dashboard');
  const [selectedStrategy, setSelectedStrategy] = useState('BALANCED');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<DashboardData>(
    '/api/ebay-inventory-optimization/dashboard',
    fetcher
  );

  // Strategies
  const { data: strategiesData } = useSWR<{ success: boolean; strategies: Strategy[] }>(
    '/api/ebay-inventory-optimization/strategies',
    fetcher
  );

  // Distribution
  const { data: distributionData, isLoading: distributionLoading } = useSWR<{ success: boolean; distribution: any[]; summary: any }>(
    activeTab === 'distribution' ? '/api/ebay-inventory-optimization/distribution' : null,
    fetcher
  );

  // ABC Analysis
  const { data: abcData, isLoading: abcLoading } = useSWR<{ success: boolean; items: any[]; summary: any; recommendations: any[] }>(
    activeTab === 'abc' ? '/api/ebay-inventory-optimization/abc-analysis' : null,
    fetcher
  );

  // Transfer History
  const { data: historyData, isLoading: historyLoading } = useSWR<{ success: boolean; history: any[] }>(
    activeTab === 'history' ? '/api/ebay-inventory-optimization/transfer-history' : null,
    fetcher
  );

  // Settings
  const { data: settingsData } = useSWR<{ success: boolean; settings: any }>(
    activeTab === 'settings' ? '/api/ebay-inventory-optimization/settings' : null,
    fetcher
  );

  const stats = dashboardData?.stats;
  const warehouseStats = dashboardData?.warehouseStats || [];
  const healthScore = dashboardData?.healthScore;
  const optimizationSummary = dashboardData?.optimizationSummary;
  const strategies = strategiesData?.strategies || [];
  const distribution = distributionData?.distribution || [];
  const distributionSummary = distributionData?.summary;
  const abcItems = abcData?.items || [];
  const abcSummary = abcData?.summary;
  const abcRecommendations = abcData?.recommendations || [];
  const history = historyData?.history || [];
  const settings = settingsData?.settings;

  // 最適化分析実行
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await postApi('/api/ebay-inventory-optimization/analyze', {
        strategy: selectedStrategy,
        includeTransferCosts: true,
        forecastPeriod: 30,
      });
      addToast({ type: 'success', message: '最適化分析を完了しました' });
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '分析に失敗しました' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
            <Warehouse className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">在庫配置最適化</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              倉庫間配置・需要ベース最適化
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-sm"
          >
            {strategies.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            最適化分析
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutateDashboard()}
            disabled={dashboardLoading}
          >
            <RefreshCw className={cn('h-4 w-4', dashboardLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {[
          { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
          { id: 'distribution', label: '在庫分布', icon: MapPin },
          { id: 'optimization', label: '最適化提案', icon: Brain },
          { id: 'abc', label: 'ABC分析', icon: BarChart3 },
          { id: 'history', label: '移動履歴', icon: Truck },
          { id: 'settings', label: '設定', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-7 gap-3">
            <Card className="p-3">
              <p className="text-xs text-zinc-500">総SKU</p>
              <p className="text-xl font-bold">{stats?.totalSKUs || 0}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">総在庫数</p>
              <p className="text-xl font-bold">{stats?.totalUnits?.toLocaleString() || 0}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">在庫価値</p>
              <p className="text-xl font-bold">${((stats?.totalValue ?? 0) / 1000).toFixed(0) || 0}K</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">倉庫稼働率</p>
              <p className="text-xl font-bold">{stats?.warehouseUtilization || 0}%</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">回転率</p>
              <p className="text-xl font-bold">{stats?.averageTurnoverRate || 0}x</p>
            </Card>
            <Card className="p-3 border-l-4 border-l-red-500">
              <p className="text-xs text-zinc-500">欠品リスク</p>
              <p className="text-xl font-bold text-red-600">{stats?.stockoutRisk || 0}</p>
            </Card>
            <Card className="p-3 border-l-4 border-l-amber-500">
              <p className="text-xs text-zinc-500">過剰在庫</p>
              <p className="text-xl font-bold text-amber-600">{stats?.overstockItems || 0}</p>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Health Score */}
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                在庫健全性スコア
              </h3>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                    <circle
                      cx="64" cy="64" r="56" fill="none"
                      stroke={(healthScore?.overall ?? 0) >= 80 ? '#10b981' : (healthScore?.overall ?? 0) >= 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      strokeDasharray={`${(healthScore?.overall || 0) * 3.52} 352`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {healthScore?.overall || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: '分布', value: healthScore?.distribution },
                  { label: '回転率', value: healthScore?.turnover },
                  { label: '在庫レベル', value: healthScore?.stockLevel },
                  { label: '需要整合', value: healthScore?.demandAlignment },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-20">{item.label}</span>
                    <div className="flex-1 h-2 bg-zinc-200 rounded dark:bg-zinc-700">
                      <div
                        className={cn(
                          'h-full rounded',
                          (item.value || 0) >= 80 ? 'bg-emerald-500' : (item.value || 0) >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${item.value || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-8 text-right">{item.value || 0}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Optimization Summary */}
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                最適化サマリー
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">保留中の提案</span>
                  </div>
                  <span className="text-xl font-bold">{optimizationSummary?.pendingRecommendations || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg dark:bg-emerald-900/20">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">削減可能コスト</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-600">${optimizationSummary?.potentialSavings?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg dark:bg-blue-900/20">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">速度向上</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">+{optimizationSummary?.potentialSpeedImprovement || 0}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg dark:bg-red-900/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">緊急対応</span>
                  </div>
                  <span className="text-xl font-bold text-red-600">{optimizationSummary?.urgentActions || 0}</span>
                </div>
              </div>
            </Card>

            {/* Warehouse Overview */}
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                倉庫概要
              </h3>
              <div className="space-y-3">
                {warehouseStats.slice(0, 5).map((wh) => (
                  <div key={wh.code} className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-zinc-400" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{wh.name}</span>
                        <span className="text-zinc-500">{wh.utilization}%</span>
                      </div>
                      <div className="h-2 bg-zinc-200 rounded dark:bg-zinc-700">
                        <div
                          className={cn(
                            'h-full rounded',
                            wh.utilization >= 90 ? 'bg-red-500' : wh.utilization >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                          )}
                          style={{ width: `${wh.utilization}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Warehouse Details */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              倉庫詳細
            </h3>
            <div className="grid grid-cols-6 gap-3">
              {warehouseStats.map((wh) => (
                <div key={wh.code} className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Warehouse className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">{wh.name}</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">在庫</span>
                      <span>{wh.currentStock.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">稼働率</span>
                      <span className={wh.utilization >= 90 ? 'text-red-600' : ''}>{wh.utilization}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">入庫</span>
                      <span className="text-emerald-600">+{wh.inbound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">出庫</span>
                      <span className="text-blue-600">-{wh.outbound}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">転送待</span>
                      <span className="text-amber-600">{wh.pendingTransfers}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Summary */}
          {distributionSummary && (
            <div className="mb-4 grid grid-cols-4 gap-4">
              <Card className="p-3 border-l-4 border-l-emerald-500">
                <p className="text-sm text-zinc-500">最適</p>
                <p className="text-2xl font-bold text-emerald-600">{distributionSummary.optimal}</p>
              </Card>
              <Card className="p-3 border-l-4 border-l-amber-500">
                <p className="text-sm text-zinc-500">過剰</p>
                <p className="text-2xl font-bold text-amber-600">{distributionSummary.overstocked}</p>
              </Card>
              <Card className="p-3 border-l-4 border-l-red-500">
                <p className="text-sm text-zinc-500">不足</p>
                <p className="text-2xl font-bold text-red-600">{distributionSummary.understocked}</p>
              </Card>
              <Card className="p-3 border-l-4 border-l-purple-500">
                <p className="text-sm text-zinc-500">不均衡</p>
                <p className="text-2xl font-bold text-purple-600">{distributionSummary.unbalanced}</p>
              </Card>
            </div>
          )}

          {/* Distribution Table */}
          <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
              <div className="w-16">SKU</div>
              <div className="flex-1">商品名</div>
              <div className="w-20 text-right">総在庫</div>
              <div className="w-24 text-center">ステータス</div>
              <div className="w-20 text-right">回転率</div>
              <div className="w-24 text-right">供給日数</div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
              {distributionLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
              ) : (
                distribution.map((item) => (
                  <div key={item.listingId} className="flex items-center border-b border-zinc-100 px-3 py-2">
                    <div className="w-16 text-sm font-mono text-zinc-600">{item.sku}</div>
                    <div className="flex-1 truncate text-sm">{item.title}</div>
                    <div className="w-20 text-right text-sm font-medium">{item.totalStock}</div>
                    <div className="w-24 text-center">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', statusColors[item.status])}>
                        {item.status === 'OPTIMAL' ? '最適' : item.status === 'OVERSTOCKED' ? '過剰' : item.status === 'UNDERSTOCKED' ? '不足' : '不均衡'}
                      </span>
                    </div>
                    <div className="w-20 text-right text-sm">{item.turnoverRate}x</div>
                    <div className="w-24 text-right text-sm">{item.daysOfSupply}日</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABC Analysis Tab */}
      {activeTab === 'abc' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* ABC Summary */}
          {abcSummary && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 border-l-4 border-l-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">クラスA（上位80%）</p>
                    <p className="text-3xl font-bold text-emerald-600">{abcSummary.A.count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">売上</p>
                    <p className="text-lg font-semibold">${abcSummary.A.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">クラスB（次の15%）</p>
                    <p className="text-3xl font-bold text-amber-600">{abcSummary.B.count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">売上</p>
                    <p className="text-lg font-semibold">${abcSummary.B.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 border-l-4 border-l-zinc-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">クラスC（残り5%）</p>
                    <p className="text-3xl font-bold text-zinc-600">{abcSummary.C.count}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500">売上</p>
                    <p className="text-lg font-semibold">${abcSummary.C.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Recommendations */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">推奨アクション</h3>
            <div className="grid grid-cols-3 gap-3">
              {abcRecommendations.map((rec) => (
                <div key={rec.class} className={cn(
                  'p-3 rounded-lg',
                  rec.class === 'A' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                  rec.class === 'B' ? 'bg-amber-50 dark:bg-amber-900/20' :
                  'bg-zinc-50 dark:bg-zinc-800/50'
                )}>
                  <span className={cn(
                    'text-lg font-bold',
                    rec.class === 'A' ? 'text-emerald-600' : rec.class === 'B' ? 'text-amber-600' : 'text-zinc-600'
                  )}>
                    クラス{rec.class}
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{rec.action}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* ABC Items Table */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">ABC分類結果</h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white dark:bg-zinc-900">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">SKU</th>
                    <th className="text-left py-2 px-2">商品名</th>
                    <th className="text-right py-2 px-2">売上</th>
                    <th className="text-right py-2 px-2">売上%</th>
                    <th className="text-right py-2 px-2">累積%</th>
                    <th className="text-center py-2 px-2">クラス</th>
                  </tr>
                </thead>
                <tbody>
                  {abcItems.slice(0, 30).map((item) => (
                    <tr key={item.listingId} className="border-b border-zinc-100">
                      <td className="py-2 px-2 font-mono text-zinc-600">{item.sku}</td>
                      <td className="py-2 px-2 truncate max-w-xs">{item.title}</td>
                      <td className="py-2 px-2 text-right">${item.revenue.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right">{item.revenuePercent}%</td>
                      <td className="py-2 px-2 text-right">{item.cumulativePercent}%</td>
                      <td className="py-2 px-2 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-bold',
                          item.classification === 'A' ? 'bg-emerald-100 text-emerald-700' :
                          item.classification === 'B' ? 'bg-amber-100 text-amber-700' :
                          'bg-zinc-100 text-zinc-600'
                        )}>
                          {item.classification}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
            <div className="w-24">日付</div>
            <div className="w-20">SKU</div>
            <div className="w-28">From</div>
            <div className="w-8 text-center">→</div>
            <div className="w-28">To</div>
            <div className="w-16 text-right">数量</div>
            <div className="w-20 text-right">コスト</div>
            <div className="w-24 text-center">ステータス</div>
            <div className="flex-1">理由</div>
          </div>
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} className="flex items-center border-b border-zinc-100 px-3 py-2 text-sm">
                  <div className="w-24 text-zinc-500">
                    {new Date(item.date).toLocaleDateString('ja-JP')}
                  </div>
                  <div className="w-20 font-mono">{item.sku}</div>
                  <div className="w-28">{item.from}</div>
                  <div className="w-8 text-center">
                    <ArrowRight className="h-4 w-4 text-zinc-400 inline" />
                  </div>
                  <div className="w-28">{item.to}</div>
                  <div className="w-16 text-right font-medium">{item.quantity}</div>
                  <div className="w-20 text-right">${item.cost}</div>
                  <div className="w-24 text-center">
                    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', transferStatusColors[item.status])}>
                      {item.status === 'COMPLETED' ? '完了' : item.status === 'IN_TRANSIT' ? '輸送中' : '保留'}
                    </span>
                  </div>
                  <div className="flex-1 text-zinc-500 truncate">{item.reason}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              最適化設定
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  デフォルト戦略
                </label>
                <select
                  value={settings.defaultStrategy}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                >
                  {strategies.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  最適化頻度
                </label>
                <select
                  value={settings.optimizeFrequency}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                >
                  <option value="daily">毎日</option>
                  <option value="weekly">毎週</option>
                  <option value="monthly">毎月</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  最小転送数量
                </label>
                <input
                  type="number"
                  value={settings.minTransferQuantity}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  安全在庫日数
                </label>
                <input
                  type="number"
                  value={settings.safetyStockDays}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  目標サービスレベル (%)
                </label>
                <input
                  type="number"
                  value={settings.targetServiceLevel}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  最大転送コスト/単位 ($)
                </label>
                <input
                  type="number"
                  value={settings.maxTransferCostPerUnit}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { key: 'autoOptimize', label: '自動最適化', desc: '定期的に最適化を自動実行' },
                { key: 'enableAlerts', label: 'アラート通知', desc: '在庫異常時に通知' },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50"
                >
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{item.label}</p>
                    <p className="text-sm text-zinc-500">{item.desc}</p>
                  </div>
                  <div
                    className={cn(
                      'w-12 h-6 rounded-full cursor-pointer transition-colors',
                      settings[item.key] ? 'bg-orange-500' : 'bg-zinc-300'
                    )}
                  >
                    <div
                      className={cn(
                        'w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5',
                        settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Optimization Tab Placeholder */}
      {activeTab === 'optimization' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Brain className="h-16 w-16 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500">「最適化分析」ボタンをクリックして</p>
            <p className="text-zinc-500">AI最適化提案を生成してください</p>
          </div>
        </div>
      )}
    </div>
  );
}

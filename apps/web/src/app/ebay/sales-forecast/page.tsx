'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  RefreshCw,
  Loader2,
  Settings,
  Brain,
  AlertTriangle,
  Package,
  DollarSign,
  Target,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

interface DashboardData {
  success: boolean;
  stats: {
    currentMonthSales: number;
    forecastedMonthSales: number;
    growthRate: number;
    accuracy: number;
    confidenceLevel: number;
    lastUpdated: string;
  };
  dailyForecast: Array<{
    date: string;
    actual: number | null;
    forecast: number;
    lowerBound: number;
    upperBound: number;
    isHistorical: boolean;
  }>;
  categoryForecast: Array<{
    category: string;
    currentSales: number;
    forecastSales: number;
    growth: number;
    trend: string;
  }>;
  seasonality: {
    weeklyPattern: Array<{ day: string; factor: number }>;
    monthlyPattern: Array<{ month: string; factor: number }>;
    upcomingEvents: Array<{ event: string; date: string; expectedImpact: string }>;
  };
}

interface ForecastModel {
  code: string;
  name: string;
  description: string;
}

export default function EbaySalesForecastPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'forecast' | 'trends' | 'inventory' | 'settings'>('dashboard');
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecastHorizon, setForecastHorizon] = useState(30);
  const [selectedModel, setSelectedModel] = useState('AI_ENSEMBLE');

  // Dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<DashboardData>(
    '/api/ebay-sales-forecast/dashboard',
    fetcher
  );

  // Forecast models
  const { data: modelsData } = useSWR<{ success: boolean; models: ForecastModel[] }>(
    '/api/ebay-sales-forecast/models',
    fetcher
  );

  // Trends
  const { data: trendsData, isLoading: trendsLoading } = useSWR<{ success: boolean; trends: any }>(
    activeTab === 'trends' ? '/api/ebay-sales-forecast/trends' : null,
    fetcher
  );

  // Anomalies
  const { data: anomaliesData } = useSWR<{ success: boolean; anomalies: any[] }>(
    activeTab === 'dashboard' ? '/api/ebay-sales-forecast/anomalies' : null,
    fetcher
  );

  // Accuracy
  const { data: accuracyData } = useSWR<{ success: boolean; accuracy: any }>(
    activeTab === 'dashboard' ? '/api/ebay-sales-forecast/accuracy' : null,
    fetcher
  );

  // Inventory Plan
  const { data: inventoryData, isLoading: inventoryLoading, mutate: mutateInventory } = useSWR<{ success: boolean; inventoryPlan: any[]; summary: any }>(
    activeTab === 'inventory' ? '/api/ebay-sales-forecast/inventory-plan' : null,
    fetcher
  );

  // Settings
  const { data: settingsData } = useSWR<{ success: boolean; settings: any }>(
    activeTab === 'settings' ? '/api/ebay-sales-forecast/settings' : null,
    fetcher
  );

  const stats = dashboardData?.stats;
  const dailyForecast = dashboardData?.dailyForecast || [];
  const categoryForecast = dashboardData?.categoryForecast || [];
  const seasonality = dashboardData?.seasonality;
  const models = modelsData?.models || [];
  const trends = trendsData?.trends;
  const anomalies = anomaliesData?.anomalies || [];
  const accuracy = accuracyData?.accuracy;
  const inventoryPlan = inventoryData?.inventoryPlan || [];
  const inventorySummary = inventoryData?.summary;
  const settings = settingsData?.settings;

  // 予測生成
  const handleGenerateForecast = async () => {
    setIsGenerating(true);
    try {
      await postApi('/api/ebay-sales-forecast/generate', {
        period: 'WEEKLY',
        horizon: forecastHorizon,
        model: selectedModel,
        includeSeasonality: true,
      });
      addToast({ type: 'success', message: '予測を生成しました' });
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '予測生成に失敗しました' });
    } finally {
      setIsGenerating(false);
    }
  };

  // チャートの最大値を計算
  const maxForecast = Math.max(...dailyForecast.map(f => f.upperBound || f.forecast));

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <LineChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">売上予測</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              AI予測・トレンド分析・在庫計画
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateForecast}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Zap className="h-4 w-4 mr-1" />
            )}
            予測を生成
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
          { id: 'forecast', label: '予測設定', icon: LineChart },
          { id: 'trends', label: 'トレンド', icon: TrendingUp },
          { id: 'inventory', label: '在庫計画', icon: Package },
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
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
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
          <div className="grid grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-6 w-6 text-blue-500" />
                <div>
                  <p className="text-sm text-zinc-500">今月売上</p>
                  <p className="text-2xl font-bold">${stats?.currentMonthSales.toLocaleString() || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Target className="h-6 w-6 text-purple-500" />
                <div>
                  <p className="text-sm text-zinc-500">予測売上</p>
                  <p className="text-2xl font-bold">${stats?.forecastedMonthSales.toLocaleString() || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                {(stats?.growthRate || 0) >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-zinc-500">成長率</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    (stats?.growthRate || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {(stats?.growthRate || 0) >= 0 ? '+' : ''}{stats?.growthRate || 0}%
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6 text-indigo-500" />
                <div>
                  <p className="text-sm text-zinc-500">予測精度</p>
                  <p className="text-2xl font-bold">{stats?.accuracy || 0}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="text-sm text-zinc-500">信頼度</p>
                  <p className="text-2xl font-bold">{((stats?.confidenceLevel || 0) * 100).toFixed(0)}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Forecast Chart */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              売上予測チャート（14日履歴 + 14日予測）
            </h3>
            <div className="h-64 flex items-end gap-1">
              {dailyForecast.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full relative" style={{ height: '200px' }}>
                    {/* 信頼区間 */}
                    {!day.isHistorical && (
                      <div
                        className="absolute w-full bg-indigo-100 dark:bg-indigo-900/30 rounded"
                        style={{
                          bottom: `${(day.lowerBound / maxForecast) * 100}%`,
                          height: `${((day.upperBound - day.lowerBound) / maxForecast) * 100}%`,
                        }}
                      />
                    )}
                    {/* 実績値 */}
                    {day.actual !== null && (
                      <div
                        className="absolute w-full bg-emerald-500 rounded-t"
                        style={{
                          bottom: 0,
                          height: `${(day.actual / maxForecast) * 100}%`,
                        }}
                      />
                    )}
                    {/* 予測値 */}
                    {!day.isHistorical && (
                      <div
                        className="absolute w-3/4 left-1/2 -translate-x-1/2 bg-indigo-500 rounded-t"
                        style={{
                          bottom: 0,
                          height: `${(day.forecast / maxForecast) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 mt-1 rotate-45 origin-left">
                    {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-xs text-zinc-500">実績</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-500 rounded" />
                <span className="text-xs text-zinc-500">予測</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-100 rounded" />
                <span className="text-xs text-zinc-500">信頼区間</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            {/* Category Forecast */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                カテゴリ別予測
              </h3>
              <div className="space-y-3">
                {categoryForecast.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {cat.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-500">
                            ${cat.currentSales.toLocaleString()} → ${cat.forecastSales.toLocaleString()}
                          </span>
                          <span className={cn(
                            'flex items-center text-xs font-medium',
                            cat.trend === 'up' ? 'text-emerald-600' : cat.trend === 'down' ? 'text-red-600' : 'text-zinc-500'
                          )}>
                            {cat.trend === 'up' ? <ArrowUp className="h-3 w-3" /> : cat.trend === 'down' ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            {Math.abs(cat.growth)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-zinc-200 rounded dark:bg-zinc-700 overflow-hidden">
                        <div className="h-full flex">
                          <div
                            className="bg-blue-400"
                            style={{ width: `${(cat.currentSales / 20000) * 100}%` }}
                          />
                          <div
                            className={cn(
                              cat.growth >= 0 ? 'bg-emerald-400' : 'bg-red-400'
                            )}
                            style={{ width: `${(Math.abs(cat.forecastSales - cat.currentSales) / 20000) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Anomalies & Events */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                イベント & 異常検出
              </h3>
              {/* Upcoming Events */}
              {seasonality?.upcomingEvents && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    予定イベント
                  </p>
                  <div className="space-y-2">
                    {seasonality.upcomingEvents.map((event, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-blue-50 rounded dark:bg-blue-900/20">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{event.event}</span>
                        </div>
                        <span className="text-sm font-medium text-emerald-600">{event.expectedImpact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Anomalies */}
              {anomalies.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    検出された異常
                  </p>
                  <div className="space-y-2">
                    {anomalies.slice(0, 3).map((anomaly, i) => (
                      <div key={i} className={cn(
                        'flex items-center justify-between p-2 rounded',
                        anomaly.type === 'spike' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                      )}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={cn(
                            'h-4 w-4',
                            anomaly.type === 'spike' ? 'text-emerald-500' : 'text-red-500'
                          )} />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">{anomaly.date}</span>
                        </div>
                        <span className={cn(
                          'text-sm font-medium',
                          anomaly.type === 'spike' ? 'text-emerald-600' : 'text-red-600'
                        )}>
                          {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Seasonality Patterns */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              季節性パターン
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {/* Weekly Pattern */}
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
                  曜日別
                </p>
                <div className="flex items-end gap-2 h-24">
                  {seasonality?.weeklyPattern.map((day) => (
                    <div key={day.day} className="flex-1 flex flex-col items-center">
                      <div
                        className={cn(
                          'w-full rounded-t',
                          day.factor >= 1.1 ? 'bg-emerald-500' : day.factor >= 1 ? 'bg-blue-500' : 'bg-amber-500'
                        )}
                        style={{ height: `${day.factor * 60}%` }}
                      />
                      <span className="text-xs text-zinc-500 mt-1">{day.day}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Monthly Pattern */}
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
                  月別
                </p>
                <div className="flex items-end gap-1 h-24">
                  {seasonality?.monthlyPattern.map((month) => (
                    <div key={month.month} className="flex-1 flex flex-col items-center">
                      <div
                        className={cn(
                          'w-full rounded-t',
                          month.factor >= 1.2 ? 'bg-emerald-500' : month.factor >= 1 ? 'bg-blue-500' : 'bg-amber-500'
                        )}
                        style={{ height: `${month.factor * 50}%` }}
                      />
                      <span className="text-xs text-zinc-500 mt-1">{month.month.slice(0, 2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              予測設定
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  予測モデル
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                >
                  {models.map((model) => (
                    <option key={model.code} value={model.code}>
                      {model.name} - {model.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  予測期間（日数）: {forecastHorizon}日
                </label>
                <input
                  type="range"
                  min="7"
                  max="90"
                  value={forecastHorizon}
                  onChange={(e) => setForecastHorizon(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
            <Button
              variant="primary"
              className="mt-6"
              onClick={handleGenerateForecast}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              予測を生成
            </Button>
          </Card>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && trends && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              全体トレンド
            </h3>
            <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
              {trends.overall.direction === 'up' ? (
                <TrendingUp className="h-8 w-8 text-emerald-500" />
              ) : trends.overall.direction === 'down' ? (
                <TrendingDown className="h-8 w-8 text-red-500" />
              ) : (
                <Minus className="h-8 w-8 text-zinc-500" />
              )}
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {trends.overall.changePercent > 0 ? '+' : ''}{trends.overall.changePercent}%
                </p>
                <p className="text-sm text-zinc-500">{trends.overall.description}</p>
              </div>
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                trends.overall.momentum === 'strong' ? 'bg-emerald-100 text-emerald-700' :
                trends.overall.momentum === 'moderate' ? 'bg-amber-100 text-amber-700' :
                'bg-zinc-100 text-zinc-600'
              )}>
                {trends.overall.momentum === 'strong' ? '強い' : trends.overall.momentum === 'moderate' ? '中程度' : '弱い'}モメンタム
              </span>
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">
                成長中の商品
              </h3>
              <div className="space-y-2">
                {trends.topGrowing.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-emerald-50 rounded dark:bg-emerald-900/20">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.title}</span>
                    <span className="text-sm font-medium text-emerald-600">+{item.growth}%</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-3">
                減少中の商品
              </h3>
              <div className="space-y-2">
                {trends.declining.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded dark:bg-red-900/20">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.title}</span>
                    <span className="text-sm font-medium text-red-600">{item.decline}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Summary */}
          {inventorySummary && (
            <div className="mb-4 grid grid-cols-4 gap-4">
              <Card className="p-3">
                <p className="text-sm text-zinc-500">総商品数</p>
                <p className="text-xl font-bold">{inventorySummary.totalItems}</p>
              </Card>
              <Card className="p-3 border-l-4 border-l-amber-500">
                <p className="text-sm text-zinc-500">要発注</p>
                <p className="text-xl font-bold text-amber-600">{inventorySummary.needsReorder}</p>
              </Card>
              <Card className="p-3 border-l-4 border-l-red-500">
                <p className="text-sm text-zinc-500">在庫リスク</p>
                <p className="text-xl font-bold text-red-600">{inventorySummary.atRisk}</p>
              </Card>
              <Card className="p-3">
                <p className="text-sm text-zinc-500">発注コスト</p>
                <p className="text-xl font-bold">${inventorySummary.totalReorderValue.toLocaleString()}</p>
              </Card>
            </div>
          )}

          {/* Inventory Table */}
          <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
              <div className="flex-1">商品名</div>
              <div className="w-20 text-right">現在庫</div>
              <div className="w-20 text-right">予測需要</div>
              <div className="w-24 text-right">推奨在庫</div>
              <div className="w-20 text-right">発注点</div>
              <div className="w-24 text-center">状態</div>
              <div className="w-24 text-right">発注数</div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
              {inventoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                inventoryPlan.map((item) => (
                  <div key={item.listingId} className="flex items-center border-b border-zinc-100 px-3 py-2">
                    <div className="flex-1 truncate text-sm text-zinc-900 dark:text-white">
                      {item.title}
                    </div>
                    <div className="w-20 text-right text-sm">{item.currentStock}</div>
                    <div className="w-20 text-right text-sm">{item.forecastedDemand}</div>
                    <div className="w-24 text-right text-sm">{item.recommendedStock}</div>
                    <div className="w-20 text-right text-sm">{item.reorderPoint}</div>
                    <div className="w-24 text-center">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        item.daysUntilStockout <= 7
                          ? 'bg-red-100 text-red-700'
                          : item.needsReorder
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      )}>
                        {item.daysUntilStockout <= 7 ? `${item.daysUntilStockout}日` : item.needsReorder ? '要発注' : '正常'}
                      </span>
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      {item.reorderQuantity > 0 ? item.reorderQuantity : '-'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              予測設定
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  デフォルトモデル
                </label>
                <select
                  value={settings.defaultModel}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                >
                  {models.map((model) => (
                    <option key={model.code} value={model.code}>{model.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  デフォルト予測期間（日）
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.defaultHorizon}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  信頼度レベル
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={settings.confidenceLevel}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  更新間隔（時間）
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={settings.refreshInterval}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {[
                { key: 'includeSeasonality', label: '季節性を考慮', desc: '週次・月次パターンを予測に反映' },
                { key: 'autoRefresh', label: '自動更新', desc: '定期的に予測を再計算' },
                { key: 'alertOnAnomaly', label: '異常検出アラート', desc: '異常値を検出した場合に通知' },
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
                      settings[item.key] ? 'bg-indigo-500' : 'bg-zinc-300'
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
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Activity,
  RefreshCw,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  BarChart3,
  Bell,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertOctagon,
  Timer,
  Server,
  Gauge,
  ChevronRight,
} from 'lucide-react';

interface ApiStatus {
  id: string;
  category: string;
  endpoint: string;
  status: string;
  latency: number;
  successRate: number;
  callsToday: number;
  callsLimit: number;
  lastCall: string | null;
  lastError: {
    code: string;
    message: string;
    timestamp: string;
  } | null;
}

interface Dashboard {
  summary: {
    totalEndpoints: number;
    operational: number;
    degraded: number;
    down: number;
    overallHealth: string;
  };
  metrics: {
    totalCallsToday: number;
    averageLatency: number;
    averageSuccessRate: string;
    peakCallsHour: number;
    errorCount24h: number;
  };
  rateLimits: Record<string, { used: number; limit: number; percentage: number }>;
  recentErrors: Array<{
    endpoint: string;
    code: string;
    message: string;
    timestamp: string;
    count: number;
  }>;
  uptime: {
    today: number;
    week: number;
    month: number;
  };
}

interface Alert {
  id: string;
  level: string;
  title: string;
  message: string;
  endpoint: string | null;
  category: string | null;
  metric: string;
  threshold: number;
  currentValue: number;
  createdAt: string;
  acknowledged: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  duration: number;
  level: string;
  enabled: boolean;
  channels: string[];
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  operational: { label: '正常', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  degraded: { label: '低下', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  down: { label: '停止', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const levelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  INFO: { label: '情報', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  WARNING: { label: '警告', color: 'text-amber-600', bgColor: 'bg-amber-50' },
  ERROR: { label: 'エラー', color: 'text-red-600', bgColor: 'bg-red-50' },
  CRITICAL: { label: 'クリティカル', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export default function EbayApiMonitorPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'status' | 'errors' | 'alerts' | 'settings'>('dashboard');
  const [isRunningHealthCheck, setIsRunningHealthCheck] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: dashboard, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<Dashboard>(
    '/api/ebay-api-monitor/dashboard',
    fetcher
  );

  const { data: statusData, mutate: mutateStatus } = useSWR<{ apis: ApiStatus[] }>(
    '/api/ebay-api-monitor/status',
    fetcher
  );

  const { data: alertsData, mutate: mutateAlerts } = useSWR<{ alerts: Alert[]; summary: { unacknowledged: number } }>(
    '/api/ebay-api-monitor/alerts',
    fetcher
  );

  const { data: alertRules } = useSWR<AlertRule[]>(
    '/api/ebay-api-monitor/alert-rules',
    fetcher
  );

  const { data: latencyData } = useSWR<{ history: Array<{ timestamp: string; average: number; p95: number }> }>(
    '/api/ebay-api-monitor/latency?period=24h',
    fetcher
  );

  const apis = statusData?.apis || [];
  const alerts = alertsData?.alerts || [];

  const handleHealthCheck = async () => {
    setIsRunningHealthCheck(true);
    try {
      const result = await postApi('/api/ebay-api-monitor/health-check', {});
      addToast({ type: 'success', message: (result as { message: string }).message });
      mutateDashboard();
      mutateStatus();
    } catch {
      addToast({ type: 'error', message: 'ヘルスチェックに失敗しました' });
    } finally {
      setIsRunningHealthCheck(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await postApi(`/api/ebay-api-monitor/alerts/${alertId}/acknowledge`, {});
      addToast({ type: 'success', message: 'アラートを確認しました' });
      mutateAlerts();
    } catch {
      addToast({ type: 'error', message: 'アラートの確認に失敗しました' });
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await putApi(`/api/ebay-api-monitor/alert-rules/${ruleId}`, { enabled });
      addToast({ type: 'success', message: `ルールを${enabled ? '有効' : '無効'}にしました` });
    } catch {
      addToast({ type: 'error', message: 'ルールの更新に失敗しました' });
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: BarChart3 },
    { id: 'status', name: 'APIステータス', icon: Server },
    { id: 'errors', name: 'エラーログ', icon: AlertOctagon },
    { id: 'alerts', name: 'アラート', icon: Bell, count: alertsData?.summary.unacknowledged },
    { id: 'settings', name: '設定', icon: Settings },
  ];

  const filteredApis = selectedCategory
    ? apis.filter(a => a.category === selectedCategory)
    : apis;

  const categories = [...new Set(apis.map(a => a.category))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">API監視</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              eBay APIヘルスモニタリング
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleHealthCheck}
            disabled={isRunningHealthCheck}
          >
            {isRunningHealthCheck ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Shield className="h-4 w-4 mr-1" />
            )}
            ヘルスチェック
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { mutateDashboard(); mutateStatus(); }}
            disabled={dashboardLoading}
          >
            <RefreshCw className={cn('h-4 w-4', dashboardLoading && 'animate-spin')} />
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
                  ? 'border-cyan-500 text-cyan-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Health Overview */}
          <div className="grid grid-cols-5 gap-4">
            <Card className={cn(
              'p-4 col-span-1',
              dashboard?.summary.overallHealth === 'healthy' ? 'border-emerald-200 bg-emerald-50' :
              dashboard?.summary.overallHealth === 'warning' ? 'border-amber-200 bg-amber-50' :
              'border-red-200 bg-red-50'
            )}>
              <div className="flex items-center gap-3">
                {dashboard?.summary.overallHealth === 'healthy' && <CheckCircle className="h-8 w-8 text-emerald-600" />}
                {dashboard?.summary.overallHealth === 'warning' && <AlertTriangle className="h-8 w-8 text-amber-600" />}
                {dashboard?.summary.overallHealth === 'critical' && <XCircle className="h-8 w-8 text-red-600" />}
                <div>
                  <p className="text-sm text-zinc-600">全体ステータス</p>
                  <p className="text-lg font-bold">
                    {dashboard?.summary.overallHealth === 'healthy' ? '正常' :
                     dashboard?.summary.overallHealth === 'warning' ? '注意' : '異常'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">正常</p>
                  <p className="text-2xl font-bold text-emerald-600">{dashboard?.summary.operational}</p>
                </div>
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">低下</p>
                  <p className="text-2xl font-bold text-amber-600">{dashboard?.summary.degraded}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">停止</p>
                  <p className="text-2xl font-bold text-red-600">{dashboard?.summary.down}</p>
                </div>
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">エラー(24h)</p>
                  <p className="text-2xl font-bold">{dashboard?.metrics.errorCount24h}</p>
                </div>
                <AlertOctagon className="h-6 w-6 text-zinc-500" />
              </div>
            </Card>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-zinc-500">今日のAPI呼び出し</p>
                  <p className="text-2xl font-bold">{dashboard?.metrics.totalCallsToday.toLocaleString()}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Timer className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-zinc-500">平均レイテンシ</p>
                  <p className="text-2xl font-bold">{dashboard?.metrics.averageLatency}ms</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-sm text-zinc-500">成功率</p>
                  <p className="text-2xl font-bold">{dashboard?.metrics.averageSuccessRate}%</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm text-zinc-500">稼働率（月）</p>
                  <p className="text-2xl font-bold">{dashboard?.uptime.month}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Rate Limits & Latency */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">レート制限状況</h3>
              <div className="space-y-3">
                {dashboard?.rateLimits && Object.entries(dashboard.rateLimits).map(([key, limit]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{key}</span>
                      <span className={cn(
                        limit.percentage > 80 ? 'text-red-600' :
                        limit.percentage > 60 ? 'text-amber-600' : 'text-zinc-600'
                      )}>
                        {limit.used} / {limit.limit} ({limit.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full',
                          limit.percentage > 80 ? 'bg-red-500' :
                          limit.percentage > 60 ? 'bg-amber-500' : 'bg-blue-500'
                        )}
                        style={{ width: `${limit.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-4">レイテンシ推移（24時間）</h3>
              <div className="h-32 flex items-end gap-1">
                {latencyData?.history.slice(-24).map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-cyan-500 rounded-t hover:bg-cyan-600 transition-colors"
                    style={{ height: `${Math.min((point.average / 1000) * 100, 100)}%` }}
                    title={`${new Date(point.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit' })}: ${point.average}ms`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-zinc-500 mt-2">
                <span>24時間前</span>
                <span>現在</span>
              </div>
            </Card>
          </div>

          {/* Recent Errors */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">最近のエラー</h3>
            {dashboard?.recentErrors.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">エラーはありません</p>
            ) : (
              <div className="space-y-2">
                {dashboard?.recentErrors.map((error, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertOctagon className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium text-red-700">{error.code}</p>
                        <p className="text-sm text-red-600">{error.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600">{error.endpoint}</p>
                      <p className="text-xs text-red-500">{error.count}回</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Status Tab */}
      {activeTab === 'status' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                selectedCategory === null
                  ? 'bg-cyan-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              )}
            >
              すべて
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-lg transition-colors',
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* API Status Table */}
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">エンドポイント</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ステータス</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">レイテンシ</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">成功率</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">今日の呼び出し</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">最終呼び出し</th>
                </tr>
              </thead>
              <tbody>
                {filteredApis.map((api) => {
                  const status = statusConfig[api.status] || statusConfig.down;
                  const StatusIcon = status.icon;
                  return (
                    <tr key={api.id} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{api.endpoint}</span>
                          <span className="ml-2 text-xs text-zinc-500">{api.category}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('flex items-center gap-1 px-2 py-0.5 text-xs rounded w-fit', status.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'font-medium',
                          api.latency > 1000 ? 'text-red-600' :
                          api.latency > 500 ? 'text-amber-600' : 'text-zinc-900'
                        )}>
                          {api.latency}ms
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn(
                          'font-medium',
                          api.successRate < 95 ? 'text-red-600' :
                          api.successRate < 99 ? 'text-amber-600' : 'text-emerald-600'
                        )}>
                          {api.successRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <span className="font-medium">{api.callsToday}</span>
                          <span className="text-xs text-zinc-500"> / {api.callsLimit}</span>
                        </div>
                        <div className="w-full h-1 bg-zinc-100 rounded-full mt-1">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(api.callsToday / api.callsLimit) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {api.lastCall ? new Date(api.lastCall).toLocaleString('ja-JP', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">エラーログ</h3>
          <p className="text-sm text-zinc-500 text-center py-8">
            エラーログの詳細表示は設定タブで有効にできます
          </p>
        </Card>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Active Alerts */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">アクティブなアラート</h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">アクティブなアラートはありません</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const level = levelConfig[alert.level] || levelConfig.INFO;
                  return (
                    <div key={alert.id} className={cn('p-4 rounded-lg border', level.bgColor)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn('h-5 w-5 mt-0.5', level.color)} />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className={cn('font-medium', level.color)}>{alert.title}</h4>
                              <span className={cn('px-1.5 py-0.5 text-xs rounded', level.color, level.bgColor)}>
                                {level.label}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-600 mt-1">{alert.message}</p>
                            <p className="text-xs text-zinc-500 mt-2">
                              {new Date(alert.createdAt).toLocaleString('ja-JP')}
                            </p>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            確認
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Alert Rules */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">アラートルール</h3>
            <div className="space-y-3">
              {alertRules?.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                      className="h-4 w-4"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{rule.name}</span>
                        <span className={cn(
                          'px-1.5 py-0.5 text-xs rounded',
                          levelConfig[rule.level]?.color,
                          levelConfig[rule.level]?.bgColor
                        )}>
                          {levelConfig[rule.level]?.label}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">{rule.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">閾値: {rule.threshold}</p>
                    <p className="text-xs text-zinc-500">{rule.channels.join(', ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">監視設定</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">監視を有効にする</p>
                  <p className="text-sm text-zinc-500">APIの状態を定期的にチェック</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">監視間隔</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option value="30">30秒</option>
                  <option value="60">1分</option>
                  <option value="300">5分</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">データ保持期間</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option value="7">7日</option>
                  <option value="30">30日</option>
                  <option value="90">90日</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">閾値設定</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">レイテンシ警告 (ms)</label>
                <input
                  type="number"
                  defaultValue={500}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">レイテンシ重大 (ms)</label>
                <input
                  type="number"
                  defaultValue={2000}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">エラー率警告 (%)</label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">レート制限警告 (%)</label>
                <input
                  type="number"
                  defaultValue={70}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

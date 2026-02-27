// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  Activity,
  RefreshCw,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  ChevronLeft,
  Loader2,
  Bell,
  BarChart3,
  Gauge,
  FileText,
  Settings,
} from 'lucide-react';
import Link from 'next/link';

interface ServiceHealth {
  name: string;
  status: string;
  uptime: number;
  lastCheck: string;
  responseTime: number;
  details: Record<string, unknown>;
}

interface ApiMetric {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestCount: number;
  errorRate: number;
  successRate: number;
}

interface ActiveAlert {
  id: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: string;
  startedAt: string;
  acknowledged: boolean;
}

type TabType = 'overview' | 'services' | 'api' | 'system' | 'alerts';

const healthColors: Record<string, { bg: string; text: string; icon: typeof CheckCircle }> = {
  HEALTHY: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle },
  DEGRADED: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', icon: AlertTriangle },
  UNHEALTHY: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
  UNKNOWN: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-400', icon: Clock },
};

export default function EbayPerformanceMonitorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // データ取得
  const { data: overviewData, mutate: mutateOverview, isLoading: isLoadingOverview } = useSWR(
    '/api/ebay-performance-monitor/overview',
    fetcher,
    { refreshInterval: 30000 }
  );
  const overview = overviewData?.data;

  const { data: healthData, isLoading: isLoadingHealth } = useSWR(
    activeTab === 'services' ? '/api/ebay-performance-monitor/health' : null,
    fetcher
  );

  const { data: apiMetricsData, isLoading: isLoadingApi } = useSWR(
    activeTab === 'api' ? '/api/ebay-performance-monitor/api-metrics' : null,
    fetcher
  );

  const { data: systemData, isLoading: isLoadingSystem } = useSWR(
    activeTab === 'system' ? '/api/ebay-performance-monitor/system-metrics' : null,
    fetcher
  );

  const { data: alertsData, mutate: mutateAlerts, isLoading: isLoadingAlerts } = useSWR(
    activeTab === 'alerts' ? '/api/ebay-performance-monitor/active-alerts' : null,
    fetcher
  );

  // アクション
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await postApi(`/api/ebay-performance-monitor/active-alerts/${alertId}/acknowledge`, {});
      addToast({ type: 'success', message: 'アラートを確認済みにしました' });
      mutateAlerts();
    } catch {
      addToast({ type: 'error', message: '操作に失敗しました' });
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await postApi(`/api/ebay-performance-monitor/active-alerts/${alertId}/resolve`, {});
      addToast({ type: 'success', message: 'アラートを解決しました' });
      mutateAlerts();
      mutateOverview();
    } catch {
      addToast({ type: 'error', message: '操作に失敗しました' });
    }
  };

  const tabs: { id: TabType; label: string; icon: typeof Activity }[] = [
    { id: 'overview', label: '概要', icon: Gauge },
    { id: 'services', label: 'サービス', icon: Server },
    { id: 'api', label: 'API', icon: Zap },
    { id: 'system', label: 'システム', icon: Cpu },
    { id: 'alerts', label: 'アラート', icon: Bell },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ebay" className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">パフォーマンスモニター</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              システムヘルスとパフォーマンス監視
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overview && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full',
              healthColors[overview.overallHealth]?.bg,
              healthColors[overview.overallHealth]?.text
            )}>
              {overview.overallHealth === 'HEALTHY' ? (
                <CheckCircle className="h-4 w-4" />
              ) : overview.overallHealth === 'DEGRADED' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{overview.overallHealth}</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => mutateOverview()}>
            <RefreshCw className={cn('h-4 w-4', isLoadingOverview && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {overview && (
        <div className="mb-4 grid grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Server className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">サービス</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {overview.healthyServices}/{overview.totalServices}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">応答時間</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {overview.avgResponseTime}ms
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">リクエスト (24h)</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {overview.totalRequests24h.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                overview.cpu.status === 'WARNING' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-cyan-50 dark:bg-cyan-900/30'
              )}>
                <Cpu className={cn(
                  'h-5 w-5',
                  overview.cpu.status === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'
                )} />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">CPU</p>
                <p className={cn(
                  'text-xl font-bold',
                  overview.cpu.status === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'
                )}>
                  {overview.cpu.current}%
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                overview.memory.status === 'WARNING' ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'
              )}>
                <HardDrive className={cn(
                  'h-5 w-5',
                  overview.memory.status === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                )} />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">メモリ</p>
                <p className={cn(
                  'text-xl font-bold',
                  overview.memory.status === 'WARNING' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'
                )}>
                  {overview.memory.current}%
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                overview.activeAlerts > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-zinc-50 dark:bg-zinc-800'
              )}>
                <Bell className={cn(
                  'h-5 w-5',
                  overview.activeAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'
                )} />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">アラート</p>
                <p className={cn(
                  'text-xl font-bold',
                  overview.activeAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-500'
                )}>
                  {overview.activeAlerts}
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
              onClick={() => setActiveTab(tab.id)}
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
        {/* Overview Tab */}
        {activeTab === 'overview' && overview && (
          <div className="h-full overflow-y-auto space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  システム稼働時間
                </h3>
                <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                  {overview.uptime}
                </div>
                <p className="text-sm text-zinc-500">最終更新: {new Date(overview.lastUpdated).toLocaleString('ja-JP')}</p>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  エラー率
                </h3>
                <div className={cn(
                  'text-4xl font-bold mb-2',
                  parseFloat(overview.errorRate) > 2 ? 'text-red-600' :
                  parseFloat(overview.errorRate) > 1 ? 'text-amber-600' : 'text-emerald-600'
                )}>
                  {overview.errorRate}%
                </div>
                <p className="text-sm text-zinc-500">過去24時間</p>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                リソース使用率
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">CPU</span>
                    <span className="font-medium">{overview.cpu.current}%</span>
                  </div>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        overview.cpu.current > 80 ? 'bg-red-500' :
                        overview.cpu.current > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${overview.cpu.current}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">メモリ</span>
                    <span className="font-medium">{overview.memory.current}%</span>
                  </div>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        overview.memory.current > 85 ? 'bg-red-500' :
                        overview.memory.current > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${overview.memory.current}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-600 dark:text-zinc-400">ディスク</span>
                    <span className="font-medium">{overview.disk.current}%</span>
                  </div>
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        overview.disk.current > 80 ? 'bg-red-500' :
                        overview.disk.current > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${overview.disk.current}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="h-full overflow-y-auto">
            {isLoadingHealth ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {healthData?.data?.map((service: ServiceHealth) => {
                  const statusCfg = healthColors[service.status] || healthColors.UNKNOWN;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <Card key={service.name} className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg', statusCfg.bg, statusCfg.text)}>
                            <StatusIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium text-zinc-900 dark:text-white">
                              {service.name}
                            </h3>
                            <p className="text-xs text-zinc-500">{service.responseTime}ms</p>
                          </div>
                        </div>
                        <span className={cn('text-xs px-2 py-1 rounded', statusCfg.bg, statusCfg.text)}>
                          {service.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">稼働率</span>
                          <span className="font-medium">{service.uptime}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-500">最終チェック</span>
                          <span className="text-xs">{new Date(service.lastCheck).toLocaleTimeString('ja-JP')}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="h-full overflow-y-auto">
            {isLoadingApi ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {apiMetricsData?.data?.metrics?.map((metric: ApiMetric) => (
                  <Card key={metric.endpoint} className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <span className={cn(
                          'text-xs font-medium px-2 py-1 rounded',
                          metric.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                          metric.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                          metric.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {metric.method}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white truncate">
                          {metric.endpoint}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-zinc-500 text-xs">平均</p>
                          <p className="font-medium">{metric.avgResponseTime}ms</p>
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-500 text-xs">P95</p>
                          <p className="font-medium">{metric.p95ResponseTime}ms</p>
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-500 text-xs">リクエスト</p>
                          <p className="font-medium">{metric.requestCount.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-zinc-500 text-xs">成功率</p>
                          <p className={cn(
                            'font-medium',
                            metric.successRate >= 99 ? 'text-emerald-600' :
                            metric.successRate >= 95 ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {metric.successRate}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="h-full overflow-y-auto">
            {isLoadingSystem ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : systemData?.data && (
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">CPU</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">現在</span>
                      <span className="font-medium">{systemData.data.cpu.current}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">1時間平均</span>
                      <span className="font-medium">{systemData.data.cpu.avg1h}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">24時間平均</span>
                      <span className="font-medium">{systemData.data.cpu.avg24h}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">ピーク</span>
                      <span className="font-medium text-amber-600">{systemData.data.cpu.peak}%</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      <HardDrive className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">メモリ</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">使用中</span>
                      <span className="font-medium">
                        {(systemData.data.memory.used / 1024).toFixed(1)} GB / {(systemData.data.memory.total / 1024).toFixed(0)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">使用率</span>
                      <span className="font-medium">{systemData.data.memory.current}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">ピーク</span>
                      <span className="font-medium text-amber-600">{systemData.data.memory.peak}%</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      <Database className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">ディスク</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">使用中</span>
                      <span className="font-medium">
                        {(systemData.data.disk.used / 1024).toFixed(0)} GB / {(systemData.data.disk.total / 1024).toFixed(0)} GB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Read IOPS</span>
                      <span className="font-medium">{systemData.data.disk.readIops}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Write IOPS</span>
                      <span className="font-medium">{systemData.data.disk.writeIops}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Wifi className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">ネットワーク</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">受信</span>
                      <span className="font-medium">{systemData.data.network.inbound} MB/s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">送信</span>
                      <span className="font-medium">{systemData.data.network.outbound} MB/s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">接続数</span>
                      <span className="font-medium">{systemData.data.network.connections}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="h-full overflow-y-auto">
            {isLoadingAlerts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : alertsData?.data?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
                <p className="text-zinc-500">アクティブなアラートはありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alertsData?.data?.map((alert: ActiveAlert) => (
                  <Card key={alert.id} className={cn(
                    'p-4 border-l-4',
                    alert.severity === 'CRITICAL' ? 'border-l-red-500' :
                    alert.severity === 'WARNING' ? 'border-l-amber-500' : 'border-l-blue-500'
                  )}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          alert.severity === 'WARNING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        )}>
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {alert.metric}
                          </p>
                          <p className="text-sm text-zinc-500">
                            現在値: {alert.currentValue} (閾値: {alert.threshold})
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            開始: {new Date(alert.startedAt).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            確認
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          解決
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

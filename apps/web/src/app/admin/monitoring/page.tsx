'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  Bell,
  BellOff,
  TrendingUp,
  TrendingDown,
  Zap,
  Server,
  BarChart3,
} from 'lucide-react';

interface QueueMetrics {
  queueName: string;
  completed: number;
  failed: number;
  active: number;
  waiting: number;
  delayed: number;
  successRate: number;
  avgProcessingTime: number;
  errorsByType: Record<string, number>;
}

interface Alert {
  id: string;
  type: 'error_rate' | 'queue_depth' | 'processing_time' | 'consecutive_errors';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  queueName?: string;
  value: number;
  threshold: number;
  createdAt: string;
  acknowledged: boolean;
}

interface MetricsResponse {
  success: boolean;
  data: {
    timestamp: number;
    queues: QueueMetrics[];
    totalJobs: {
      completed: number;
      failed: number;
      active: number;
      waiting: number;
    };
    alerts: Alert[];
    period: {
      hours: number;
      from: string;
      to: string;
    };
  };
}

interface HealthResponse {
  success: boolean;
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: string;
    queues: { name: string; status: string }[];
    timestamp: string;
  };
}

interface ErrorLog {
  id: string;
  queueName: string;
  jobName: string;
  failedReason: string;
  stacktrace: string[];
  attemptsMade: number;
  timestamp: number;
  finishedOn: number;
}

interface ErrorsResponse {
  success: boolean;
  data: ErrorLog[];
}

const queueLabels: Record<string, string> = {
  scrape: 'スクレイピング',
  translate: '翻訳',
  image: '画像処理',
  publish: '出品',
  inventory: '在庫チェック',
};

const severityColors = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const severityIcons = {
  info: Bell,
  warning: AlertTriangle,
  critical: XCircle,
};

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'errors'>('overview');
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);

  // Fetch metrics
  const { data: metricsResponse, isLoading, mutate } = useSWR<MetricsResponse>(
    '/api/monitoring/metrics?hours=24',
    fetcher,
    { refreshInterval: 10000 } // 10秒ごとに更新
  );

  // Fetch health
  const { data: healthResponse } = useSWR<HealthResponse>(
    '/api/monitoring/health',
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch errors
  const { data: errorsResponse, mutate: mutateErrors } = useSWR<ErrorsResponse>(
    '/api/monitoring/errors?limit=50',
    fetcher,
    { refreshInterval: 30000 }
  );

  const metrics = metricsResponse?.data;
  const health = healthResponse?.data;
  const errors = errorsResponse?.data || [];
  const alerts = metrics?.alerts || [];

  // Acknowledge alert
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/monitoring/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      if (res.ok) {
        mutate();
      }
    } catch (error) {
      addToast({ type: 'error', message: 'アラートの確認に失敗しました' });
    }
  };

  // Acknowledge all alerts
  const acknowledgeAllAlerts = async () => {
    try {
      const res = await fetch('/api/monitoring/alerts/acknowledge-all', {
        method: 'POST',
      });
      if (res.ok) {
        mutate();
      }
    } catch (error) {
      addToast({ type: 'error', message: '全アラートの確認に失敗しました' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
      case 'degraded':
        return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
      default:
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">システム監視</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            ジョブ処理状況とアラートを監視
          </p>
        </div>
        <div className="flex items-center gap-2">
          {health && (
            <span className={cn('rounded-full px-3 py-1 text-sm font-medium', getStatusColor(health.status))}>
              {health.status === 'healthy' ? '正常' : health.status === 'degraded' ? '一部異常' : '異常'}
            </span>
          )}
          <button
            onClick={() => mutate()}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            更新
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: 'overview', label: '概要', icon: BarChart3 },
          { id: 'alerts', label: `アラート (${alerts.length})`, icon: Bell },
          { id: 'errors', label: `エラーログ (${errors.length})`, icon: XCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      ) : activeTab === 'overview' ? (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">完了（24h）</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {metrics?.totalJobs.completed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">失敗（24h）</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {metrics?.totalJobs.failed.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">処理中</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {metrics?.totalJobs.active.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">待機中</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {metrics?.totalJobs.waiting.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Queue Stats */}
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                <Server className="h-5 w-5" />
                キュー別状況
              </h2>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {metrics?.queues.map((queue) => (
                <div key={queue.queueName} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {queueLabels[queue.queueName] || queue.queueName}
                      </span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        queue.successRate >= 95 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        queue.successRate >= 80 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        成功率 {queue.successRate}%
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-emerald-600">{queue.completed}</p>
                        <p className="text-xs text-zinc-500">完了</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-red-600">{queue.failed}</p>
                        <p className="text-xs text-zinc-500">失敗</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-blue-600">{queue.active}</p>
                        <p className="text-xs text-zinc-500">処理中</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-amber-600">{queue.waiting}</p>
                        <p className="text-xs text-zinc-500">待機</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-zinc-600 dark:text-zinc-400">{queue.avgProcessingTime}ms</p>
                        <p className="text-xs text-zinc-500">平均処理時間</p>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className={cn(
                        'h-full transition-all',
                        queue.successRate >= 95 ? 'bg-emerald-500' :
                        queue.successRate >= 80 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                      style={{ width: `${queue.successRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : activeTab === 'alerts' ? (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
              <Bell className="h-5 w-5" />
              アラート
            </h2>
            {alerts.length > 0 && (
              <button
                onClick={acknowledgeAllAlerts}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <BellOff className="h-4 w-4" />
                すべて確認済みにする
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
              <p className="mt-4 text-zinc-500">アラートはありません</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {alerts.map((alert) => {
                const Icon = severityIcons[alert.severity];
                return (
                  <div key={alert.id} className="flex items-center gap-4 p-4">
                    <div className={cn('rounded-full p-2', severityColors[alert.severity])}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-white">{alert.message}</p>
                      <p className="text-sm text-zinc-500">
                        {new Date(alert.createdAt).toLocaleString('ja-JP')}
                        {alert.queueName && ` · ${queueLabels[alert.queueName] || alert.queueName}`}
                      </p>
                    </div>
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="rounded-lg border border-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                    >
                      確認
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
              <XCircle className="h-5 w-5" />
              エラーログ
            </h2>
          </div>
          {errors.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
              <p className="mt-4 text-zinc-500">エラーはありません</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {errors.map((error) => (
                <div key={error.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {queueLabels[error.queueName] || error.queueName}
                      </span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {error.jobName}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(error.finishedOn).toLocaleString('ja-JP')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error.failedReason}
                  </p>
                  {error.stacktrace && error.stacktrace.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-zinc-500">スタックトレース</summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-zinc-100 p-2 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {error.stacktrace.join('\n')}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

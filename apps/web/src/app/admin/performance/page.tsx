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
  Zap,
  Server,
  BarChart3,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Inbox,
  RotateCcw,
  Trash2,
} from 'lucide-react';

// ========================================
// Types
// ========================================

interface CircuitBreakerInfo {
  name: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailure?: string;
  lastStateChange?: string;
}

interface JobSuccessRate {
  total: number;
  failed: number;
  successRate: number;
}

interface ResponseTime {
  sampleCount: number;
  avg: number;
  p95: number;
  p99: number;
}

interface ErrorTrendItem {
  hour: string;
  totalJobs: number;
  failedJobs: number;
  errorRate: number;
}

interface DLQJob {
  id: string;
  name: string;
  originalQueue?: string;
  failedReason?: string;
  createdAt?: string;
}

interface DeadLetterQueue {
  count: number;
  waiting: number;
  failed: number;
  recentJobs: DLQJob[];
}

interface QueueStat {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  successRate: number;
}

interface PerformanceData {
  success: boolean;
  data: {
    timestamp: string;
    health: {
      status: 'healthy' | 'degraded' | 'critical';
      issues: string[];
    };
    circuitBreakers: CircuitBreakerInfo[];
    jobSuccessRate: {
      lastHour: JobSuccessRate;
      lastDay: JobSuccessRate;
    };
    responseTime: ResponseTime;
    errorTrend: ErrorTrendItem[];
    deadLetterQueue: DeadLetterQueue;
    queueStats: QueueStat[];
  };
}

// ========================================
// Component
// ========================================

const circuitBreakerLabels: Record<string, string> = {
  'joom-api': 'Joom API',
  'ebay-api': 'eBay API',
  'openai-api': 'OpenAI API',
  'translation': '翻訳',
};

const queueLabels: Record<string, string> = {
  'scrape-queue': 'スクレイピング',
  'translate-queue': '翻訳',
  'image-queue': '画像処理',
  'publish-queue': '出品',
  'inventory-queue': '在庫チェック',
  'notification-queue': '通知',
  'pricing-queue': '価格最適化',
  'competitor-queue': '競合監視',
  'dead-letter-queue': 'DLQ',
};

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'circuit' | 'dlq'>('overview');
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const { data: response, isLoading, mutate } = useSWR<PerformanceData>(
    '/api/admin/performance',
    fetcher,
    { refreshInterval: 10000 }
  );

  const data = response?.data;

  // Reset circuit breaker
  const resetCircuitBreaker = async (name: string) => {
    setIsResetting(name);
    try {
      const res = await fetch(`/api/admin/performance/circuit-breaker/${name}/reset`, {
        method: 'POST',
      });
      if (res.ok) {
        addToast({ type: 'success', message: `サーキットブレーカー "${name}" をリセットしました` });
        mutate();
      } else {
        throw new Error('Reset failed');
      }
    } catch {
      addToast({ type: 'error', message: 'リセットに失敗しました' });
    } finally {
      setIsResetting(null);
    }
  };

  // Retry DLQ jobs
  const retryDLQJobs = async (jobIds?: string[]) => {
    setIsRetrying(true);
    try {
      const res = await fetch('/api/admin/performance/dlq/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobIds }),
      });
      if (res.ok) {
        const result = await res.json();
        addToast({
          type: 'success',
          message: `${result.data.retriedCount}件のジョブを再試行キューに追加しました`,
        });
        mutate();
      } else {
        throw new Error('Retry failed');
      }
    } catch {
      addToast({ type: 'error', message: '再試行に失敗しました' });
    } finally {
      setIsRetrying(false);
    }
  };

  // Clear DLQ
  const clearDLQ = async () => {
    if (!confirm('DLQ内のすべてのジョブを削除しますか？この操作は取り消せません。')) {
      return;
    }
    setIsClearing(true);
    try {
      const res = await fetch('/api/admin/performance/dlq', {
        method: 'DELETE',
      });
      if (res.ok) {
        addToast({ type: 'success', message: 'DLQをクリアしました' });
        mutate();
      } else {
        throw new Error('Clear failed');
      }
    } catch {
      addToast({ type: 'error', message: 'クリアに失敗しました' });
    } finally {
      setIsClearing(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
      case 'degraded':
        return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
      default:
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
    }
  };

  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30';
      case 'HALF_OPEN':
        return 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30';
      case 'OPEN':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default:
        return 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800';
    }
  };

  const getCircuitBreakerIcon = (state: string) => {
    switch (state) {
      case 'CLOSED':
        return ShieldCheck;
      case 'HALF_OPEN':
        return Shield;
      case 'OPEN':
        return ShieldAlert;
      default:
        return Shield;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-emerald-600';
    if (rate >= 80) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">パフォーマンス監視</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            サーキットブレーカー、API応答時間、エラー率を監視
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.health && (
            <span className={cn('rounded-full px-3 py-1 text-sm font-medium', getHealthColor(data.health.status))}>
              {data.health.status === 'healthy' ? '正常' : data.health.status === 'degraded' ? '一部異常' : '異常'}
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

      {/* Health Issues */}
      {data?.health.issues && data.health.issues.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">システムに問題が検出されています</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700 dark:text-amber-300">
                {data.health.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: 'overview', label: '概要', icon: BarChart3 },
          { id: 'circuit', label: 'サーキットブレーカー', icon: Shield },
          { id: 'dlq', label: `Dead Letter Queue (${data?.deadLetterQueue.count || 0})`, icon: Inbox },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'circuit' | 'dlq')}
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
            {/* Success Rate - Last Hour */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">成功率（1時間）</p>
                  <p className={cn('text-xl font-bold', getSuccessRateColor(data?.jobSuccessRate.lastHour.successRate || 0))}>
                    {data?.jobSuccessRate.lastHour.successRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {data?.jobSuccessRate.lastHour.total.toLocaleString()}件中
                {data?.jobSuccessRate.lastHour.failed.toLocaleString()}件失敗
              </p>
            </div>

            {/* Success Rate - Last Day */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">成功率（24時間）</p>
                  <p className={cn('text-xl font-bold', getSuccessRateColor(data?.jobSuccessRate.lastDay.successRate || 0))}>
                    {data?.jobSuccessRate.lastDay.successRate.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {data?.jobSuccessRate.lastDay.total.toLocaleString()}件中
                {data?.jobSuccessRate.lastDay.failed.toLocaleString()}件失敗
              </p>
            </div>

            {/* Response Time */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">応答時間（平均）</p>
                  <p className="text-xl font-bold text-zinc-900 dark:text-white">
                    {data?.responseTime.avg.toLocaleString()}ms
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                <span>P95: {data?.responseTime.p95.toLocaleString()}ms</span>
                <span>P99: {data?.responseTime.p99.toLocaleString()}ms</span>
              </div>
            </div>

            {/* DLQ Count */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  (data?.deadLetterQueue.count || 0) > 0
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                )}>
                  <Inbox className={cn(
                    'h-5 w-5',
                    (data?.deadLetterQueue.count || 0) > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  )} />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">DLQ件数</p>
                  <p className={cn(
                    'text-xl font-bold',
                    (data?.deadLetterQueue.count || 0) > 0 ? 'text-red-600' : 'text-zinc-900 dark:text-white'
                  )}>
                    {data?.deadLetterQueue.count.toLocaleString()}件
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Trend Chart */}
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                <TrendingDown className="h-5 w-5" />
                エラー率トレンド（過去24時間）
              </h2>
            </div>
            <div className="p-4">
              <div className="flex h-40 items-end gap-1">
                {data?.errorTrend.map((item, index) => {
                  const maxRate = Math.max(...(data?.errorTrend.map(t => t.errorRate) || [1]), 1);
                  const height = item.errorRate > 0 ? Math.max((item.errorRate / maxRate) * 100, 5) : 0;
                  const hour = new Date(item.hour).getHours();

                  return (
                    <div
                      key={index}
                      className="group relative flex-1"
                      title={`${hour}時: ${item.errorRate.toFixed(1)}% (${item.failedJobs}/${item.totalJobs}件)`}
                    >
                      <div
                        className={cn(
                          'w-full rounded-t transition-all',
                          item.errorRate > 10
                            ? 'bg-red-500'
                            : item.errorRate > 5
                            ? 'bg-amber-500'
                            : item.errorRate > 0
                            ? 'bg-blue-500'
                            : 'bg-zinc-200 dark:bg-zinc-700'
                        )}
                        style={{ height: `${height}%`, minHeight: item.totalJobs > 0 ? '4px' : '2px' }}
                      />
                      <div className="absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-xs text-white group-hover:block dark:bg-zinc-700">
                        {hour}時: {item.errorRate.toFixed(1)}%
                        <br />
                        {item.failedJobs}/{item.totalJobs}件
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between text-xs text-zinc-500">
                <span>24時間前</span>
                <span>現在</span>
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-sm text-zinc-500 dark:border-zinc-800">
                    <th className="px-4 py-3 font-medium">キュー</th>
                    <th className="px-4 py-3 font-medium text-right">待機</th>
                    <th className="px-4 py-3 font-medium text-right">処理中</th>
                    <th className="px-4 py-3 font-medium text-right">完了</th>
                    <th className="px-4 py-3 font-medium text-right">失敗</th>
                    <th className="px-4 py-3 font-medium text-right">成功率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {data?.queueStats.map((queue) => (
                    <tr key={queue.name}>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">
                        {queueLabels[queue.name] || queue.name}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600">{queue.waiting}</td>
                      <td className="px-4 py-3 text-right text-blue-600">{queue.active}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{queue.completed}</td>
                      <td className="px-4 py-3 text-right text-red-600">{queue.failed}</td>
                      <td className={cn('px-4 py-3 text-right font-medium', getSuccessRateColor(queue.successRate))}>
                        {queue.successRate}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'circuit' ? (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
              <Shield className="h-5 w-5" />
              サーキットブレーカー状態
            </h2>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data?.circuitBreakers.map((cb) => {
              const Icon = getCircuitBreakerIcon(cb.state);
              return (
                <div key={cb.name} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={cn('rounded-full p-2', getCircuitBreakerColor(cb.state))}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">
                        {circuitBreakerLabels[cb.name] || cb.name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-zinc-500">
                        <span className={cn('font-medium', getCircuitBreakerColor(cb.state).split(' ')[0])}>
                          {cb.state}
                        </span>
                        {cb.failureCount > 0 && (
                          <span>失敗: {cb.failureCount}回</span>
                        )}
                        {cb.lastFailure && (
                          <span>最終失敗: {new Date(cb.lastFailure).toLocaleString('ja-JP')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {cb.state !== 'CLOSED' && (
                    <button
                      onClick={() => resetCircuitBreaker(cb.name)}
                      disabled={isResetting === cb.name}
                      className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      {isResetting === cb.name ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      リセット
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>CLOSED: 正常（リクエスト許可）</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                <span>HALF_OPEN: テスト中（一部許可）</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                <span>OPEN: 遮断中（リクエスト拒否）</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* DLQ Actions */}
          {(data?.deadLetterQueue.count || 0) > 0 && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => retryDLQJobs()}
                disabled={isRetrying}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                すべて再試行
              </button>
              <button
                onClick={clearDLQ}
                disabled={isClearing}
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-transparent dark:hover:bg-red-900/20"
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                すべて削除
              </button>
            </div>
          )}

          {/* DLQ Summary */}
          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
                <Inbox className="h-5 w-5" />
                Dead Letter Queue
              </h2>
            </div>
            {(data?.deadLetterQueue.count || 0) === 0 ? (
              <div className="py-12 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
                <p className="mt-4 text-zinc-500">DLQにジョブはありません</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 p-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-sm text-zinc-500">合計</p>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {data?.deadLetterQueue.count}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-sm text-zinc-500">待機中</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {data?.deadLetterQueue.waiting}
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                    <p className="text-sm text-zinc-500">失敗</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data?.deadLetterQueue.failed}
                    </p>
                  </div>
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-800">
                  <div className="px-4 py-3">
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">最近のジョブ</h3>
                  </div>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {data?.deadLetterQueue.recentJobs.map((job) => (
                      <div key={job.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                              {queueLabels[job.originalQueue || ''] || job.originalQueue || 'unknown'}
                            </span>
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                              {job.name}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500">
                            {job.createdAt && new Date(job.createdAt).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        {job.failedReason && (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {job.failedReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

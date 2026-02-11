'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Play,
  XCircle,
  BarChart3,
  Trash2,
  RotateCcw,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface FailedJob {
  id: string;
  queueName: string;
  jobId: string;
  jobName: string;
  error: string;
  attemptsMade: number;
  maxAttempts: number;
  canRetry: boolean;
  retryAfter?: string;
  createdAt: string;
  status: 'PENDING' | 'RETRIED' | 'ABANDONED';
}

interface RecoveryStats {
  pending: number;
  retried: number;
  abandoned: number;
  byQueue: Record<string, { pending: number; retried: number }>;
}

export default function BatchDashboardPage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);

  const { data: enrichmentStats, mutate: mutateEnrichment } = useSWR<QueueStats>(
    '/api/enrichment/queue-stats',
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: joomStats, mutate: mutateJoom } = useSWR<QueueStats>(
    '/api/joom/queue-stats',
    fetcher,
    { refreshInterval: 5000 }
  );

  const { data: failedJobs, mutate: mutateFailedJobs } = useSWR<FailedJob[]>(
    '/api/jobs/failed',
    fetcher,
    { refreshInterval: 10000 }
  );

  const { data: recoveryStats, mutate: mutateRecoveryStats } = useSWR<RecoveryStats>(
    '/api/jobs/recovery-stats',
    fetcher,
    { refreshInterval: 10000 }
  );

  const refreshAll = useCallback(() => {
    mutateEnrichment();
    mutateJoom();
    mutateFailedJobs();
    mutateRecoveryStats();
  }, [mutateEnrichment, mutateJoom, mutateFailedJobs, mutateRecoveryStats]);

  const handleRetryBatch = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch('/api/jobs/retry-batch', { method: 'POST' });
      if (response.ok) {
        refreshAll();
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/retry/${jobId}`, { method: 'POST' });
      if (response.ok) {
        mutateFailedJobs();
        mutateRecoveryStats();
      }
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  const handleAbandonJob = async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/abandon/${jobId}`, { method: 'POST' });
      if (response.ok) {
        mutateFailedJobs();
        mutateRecoveryStats();
      }
    } catch (error) {
      console.error('Abandon failed:', error);
    }
  };

  const renderStatCard = (
    title: string,
    stats: QueueStats | undefined,
    color: string
  ) => (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className={`text-lg font-semibold ${color}`}>{title}</h3>
      {stats ? (
        <div className="mt-4 grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.waiting}</div>
            <div className="text-xs text-zinc-500">待機中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.active}</div>
            <div className="text-xs text-zinc-500">処理中</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-zinc-500">完了</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-xs text-zinc-500">失敗</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.delayed}</div>
            <div className="text-xs text-zinc-500">遅延</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex h-20 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}
    </div>
  );

  const getStatusBadge = (status: FailedJob['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            待機中
          </span>
        );
      case 'RETRIED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            リトライ済み
          </span>
        );
      case 'ABANDONED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            諦め
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            バッチ処理ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            ジョブキューの状態監視とリカバリー管理
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            更新
          </button>
          <button
            onClick={handleRetryBatch}
            disabled={isRetrying || !recoveryStats?.pending}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRetrying ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            失敗ジョブを再試行
          </button>
        </div>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 gap-6">
        {renderStatCard('Enrichment Queue', enrichmentStats, 'text-blue-600 dark:text-blue-400')}
        {renderStatCard('Joom Publish Queue', joomStats, 'text-purple-600 dark:text-purple-400')}
      </div>

      {/* Recovery Stats */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            リカバリー統計
          </h3>
        </div>
        {recoveryStats ? (
          <div className="mt-4 grid grid-cols-3 gap-6">
            <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
              <div className="text-3xl font-bold text-amber-600">{recoveryStats.pending}</div>
              <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                リトライ待ち
              </div>
            </div>
            <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
              <div className="text-3xl font-bold text-green-600">{recoveryStats.retried}</div>
              <div className="mt-1 text-sm text-green-700 dark:text-green-400">
                リトライ済み
              </div>
            </div>
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <div className="text-3xl font-bold text-red-600">{recoveryStats.abandoned}</div>
              <div className="mt-1 text-sm text-red-700 dark:text-red-400">
                諦め
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex h-20 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}
      </div>

      {/* Failed Jobs List */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              失敗ジョブ一覧
            </h3>
          </div>
          <div className="flex gap-2">
            {['all', 'enrichment', 'joom-publish'].map((queue) => (
              <button
                key={queue}
                onClick={() => setSelectedQueue(queue === 'all' ? null : queue)}
                className={`rounded-lg px-3 py-1 text-sm font-medium ${
                  (queue === 'all' && !selectedQueue) || selectedQueue === queue
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {queue === 'all' ? '全て' : queue === 'enrichment' ? 'Enrichment' : 'Joom'}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {failedJobs && failedJobs.length > 0 ? (
            failedJobs
              .filter((job) => !selectedQueue || job.queueName === selectedQueue)
              .slice(0, 20)
              .map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-zinc-500">
                        {job.jobId.slice(0, 8)}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {job.jobName}
                      </span>
                      {getStatusBadge(job.status)}
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {job.queueName}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {job.error.slice(0, 100)}
                      {job.error.length > 100 ? '...' : ''}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      試行: {job.attemptsMade}/{job.maxAttempts} |{' '}
                      {new Date(job.createdAt).toLocaleString('ja-JP')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {job.status === 'PENDING' && job.canRetry && (
                      <>
                        <button
                          onClick={() => handleRetryJob(job.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                        >
                          <Play className="h-3 w-3" />
                          再試行
                        </button>
                        <button
                          onClick={() => handleAbandonJob(job.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        >
                          <Trash2 className="h-3 w-3" />
                          諦め
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <div className="flex h-40 items-center justify-center text-zinc-500">
              <div className="text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                <p className="mt-2">失敗ジョブはありません</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

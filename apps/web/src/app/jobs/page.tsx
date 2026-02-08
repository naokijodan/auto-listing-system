'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { addToast } from '@/components/ui/toast';
import { cn, getRelativeTime } from '@/lib/utils';
import { useJobLogs, useQueueStats } from '@/lib/hooks';
import { postApi } from '@/lib/api';
import {
  RefreshCw,
  Pause,
  Play,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Filter,
  X,
  Store,
} from 'lucide-react';

type StatusFilter = 'all' | 'completed' | 'failed' | 'active' | 'waiting';
type QueueFilter = 'all' | string;

const jobTypeLabels: Record<string, string> = {
  scrape: 'スクレイピング',
  translate: '翻訳',
  image: '画像処理',
  publish: '出品',
  inventory: '在庫',
  pricing: '価格',
  joom: 'Joom',
  ebay: 'eBay',
  notification: '通知',
};

const jobTypeColors: Record<string, string> = {
  scrape: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  translate: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  image: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  publish: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  inventory: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400',
  pricing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  joom: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  ebay: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  notification: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
};

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // Fetch real data
  const { data: jobLogsResponse, isLoading: jobsLoading, mutate: mutateJobs } = useJobLogs({
    limit: 50,
    status: statusFilter === 'all' ? undefined : statusFilter,
    queueName: queueFilter === 'all' ? undefined : queueFilter,
  });
  const { data: queueStatsResponse, isLoading: statsLoading, mutate: mutateStats } = useQueueStats();

  const jobs = jobLogsResponse?.data || [];
  const queueStats = queueStatsResponse?.data || [];

  // Get unique queue names from stats
  const queueNames = useMemo(() => {
    return queueStats.map(q => q.name);
  }, [queueStats]);

  // Filter jobs by marketplace if Joom or eBay is selected
  const filteredJobs = useMemo(() => {
    if (queueFilter === 'joom') {
      return jobs.filter(j =>
        j.queueName === 'joom' ||
        (j.result && typeof j.result === 'object' && (j.result as { marketplace?: string }).marketplace === 'JOOM')
      );
    }
    if (queueFilter === 'ebay') {
      return jobs.filter(j =>
        j.queueName === 'ebay' ||
        (j.result && typeof j.result === 'object' && (j.result as { marketplace?: string }).marketplace === 'EBAY')
      );
    }
    return jobs;
  }, [jobs, queueFilter]);

  // Calculate totals
  const totalWaiting = queueStats.reduce((sum, q) => sum + q.waiting, 0);
  const totalActive = queueStats.reduce((sum, q) => sum + q.active, 0);
  const totalCompleted = queueStats.reduce((sum, q) => sum + q.completed, 0);
  const totalFailed = queueStats.reduce((sum, q) => sum + q.failed, 0);

  // Refresh data
  const handleRefresh = () => {
    mutateJobs();
    mutateStats();
    addToast({ type: 'info', message: 'データを更新しました' });
  };

  // Retry failed job
  const handleRetry = async (jobId: string) => {
    setIsRetrying(jobId);
    try {
      await postApi(`/api/jobs/${jobId}/retry`);
      addToast({ type: 'success', message: 'ジョブを再試行しました' });
      mutateJobs();
    } catch (error) {
      addToast({ type: 'error', message: 'リトライに失敗しました' });
    } finally {
      setIsRetrying(null);
    }
  };

  const isLoading = jobsLoading || statsLoading;

  // Get failed jobs for error panel
  const failedJobs = filteredJobs.filter(j => j.status === 'failed' || j.status === 'FAILED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ジョブ監視</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            バックグラウンドジョブの状態を監視
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            更新
          </Button>
        </div>
      </div>

      {/* Queue Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{totalWaiting}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">待機中</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{totalActive}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">実行中</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{totalCompleted}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">完了</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn(
          'border-zinc-200 dark:border-zinc-800',
          totalFailed > 0 && 'border-red-200 dark:border-red-800'
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg',
                totalFailed > 0
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-zinc-100 dark:bg-zinc-800'
              )}>
                <AlertTriangle className={cn(
                  'h-5 w-5',
                  totalFailed > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-zinc-400'
                )} />
              </div>
              <div>
                <p className={cn(
                  'text-2xl font-bold',
                  totalFailed > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-zinc-900 dark:text-white'
                )}>{totalFailed}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">失敗</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Details */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {queueStats.map((queue) => (
          <div
            key={queue.name}
            className="cursor-pointer"
            onClick={() => setQueueFilter(queueFilter === queue.name ? 'all' : queue.name)}
          >
            <Card
              className={cn(
                'transition-colors',
                queueFilter === queue.name
                  ? 'border-amber-500 bg-amber-50 dark:border-amber-600 dark:bg-amber-900/20'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${jobTypeColors[queue.name] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                    {jobTypeLabels[queue.name] || queue.name}
                  </span>
                  {queueFilter === queue.name && (
                    <X className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">{queue.waiting}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">待機</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{queue.active}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">実行</p>
                  </div>
                </div>
                {queue.failed > 0 && (
                  <div className="mt-2 text-center">
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {queue.failed}件失敗
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
      </div>

      {/* Marketplace Quick Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400" />
        <span className="text-sm text-zinc-500">マーケットプレイス:</span>
        <Button
          variant={queueFilter === 'joom' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setQueueFilter(queueFilter === 'joom' ? 'all' : 'joom')}
          className={queueFilter === 'joom' ? 'bg-amber-500 hover:bg-amber-600' : ''}
        >
          <Store className="h-4 w-4 mr-1" />
          Joom
        </Button>
        <Button
          variant={queueFilter === 'ebay' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setQueueFilter(queueFilter === 'ebay' ? 'all' : 'ebay')}
          className={queueFilter === 'ebay' ? 'bg-blue-500 hover:bg-blue-600' : ''}
        >
          <Store className="h-4 w-4 mr-1" />
          eBay
        </Button>
        {queueFilter !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQueueFilter('all')}
          >
            <X className="h-4 w-4 mr-1" />
            クリア
          </Button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">ステータス:</span>
        {(['all', 'completed', 'failed', 'active', 'waiting'] as StatusFilter[]).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === 'all' ? '全て' :
             status === 'completed' ? '完了' :
             status === 'failed' ? '失敗' :
             status === 'active' ? '実行中' : '待機中'}
          </Button>
        ))}
      </div>

      {/* Job List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>ジョブ履歴</span>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredJobs.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              {isLoading ? 'データを読み込み中...' : 'ジョブがありません'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      ジョブID
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      キュー
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      タイプ
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      試行
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      作成日時
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      アクション
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="py-3 px-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                        {job.jobId.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${jobTypeColors[job.queueName] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                          {jobTypeLabels[job.queueName] || job.queueName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-900 dark:text-white">
                        {job.jobType}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status.toLowerCase()} />
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                        {job.attempts}
                      </td>
                      <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400">
                        {getRelativeTime(job.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {(job.status === 'failed' || job.status === 'FAILED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="リトライ"
                              onClick={() => handleRetry(job.id)}
                              disabled={isRetrying === job.id}
                            >
                              {isRetrying === job.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Error Panel */}
          {failedJobs.length > 0 && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <h4 className="flex items-center gap-2 font-medium text-red-800 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                エラー詳細 ({failedJobs.length}件)
              </h4>
              <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                {failedJobs.map((job) => (
                  <div key={job.id} className="rounded border border-red-200 bg-white p-2 dark:border-red-800 dark:bg-red-900/10">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-red-600 dark:text-red-400">
                        {job.jobId.slice(0, 12)}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-xs ${jobTypeColors[job.queueName] || 'bg-zinc-100 text-zinc-800'}`}>
                        {jobTypeLabels[job.queueName] || job.queueName}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                      {job.errorMessage || 'エラー詳細なし'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

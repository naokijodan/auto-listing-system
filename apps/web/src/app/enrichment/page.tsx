'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Sparkles,
  Package,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Play,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Languages,
  Search,
  ChevronRight,
  Upload,
  Zap,
} from 'lucide-react';

// ステータス設定
const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: '待機中', color: 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', icon: Clock },
  PROCESSING: { label: '処理中', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Loader2 },
  READY_TO_REVIEW: { label: 'レビュー待ち', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Eye },
  APPROVED: { label: '承認済み', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  REJECTED: { label: '却下', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  PUBLISHED: { label: '出品済み', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Sparkles },
  FAILED: { label: 'エラー', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

interface EnrichmentTask {
  id: string;
  productId: string;
  status: string;
  priority: number;
  validationResult?: string;
  translations?: {
    en?: { title?: string; description?: string };
    zh?: { title?: string; description?: string };
  };
  pricing?: {
    costJpy: number;
    finalPriceUsd: number;
    profitRate: number;
  };
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    title: string;
    price: number;
    brand?: string;
    images?: string[];
  };
}

interface QueueStats {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

interface EnrichmentStats {
  total: number;
  pending: number;
  processing: number;
  approved: number;
  rejected: number;
  readyToReview: number;
  published: number;
  failed: number;
}

export default function EnrichmentPage() {
  const [selectedTask, setSelectedTask] = useState<EnrichmentTask | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // タスク一覧を取得
  const { data: tasksData, error, isLoading, mutate } = useSWR<{ tasks: EnrichmentTask[]; total: number }>(
    `/api/enrichment/tasks?${statusFilter ? `status=${statusFilter}&` : ''}limit=100`,
    fetcher
  );

  // 統計情報を取得
  const { data: statsData } = useSWR<EnrichmentStats>(
    '/api/enrichment/stats',
    fetcher,
    { refreshInterval: 30000 }
  );

  // キュー統計を取得
  const { data: queueStats } = useSWR<QueueStats>(
    '/api/enrichment/queue/stats',
    fetcher,
    { refreshInterval: 5000 }
  );

  const tasks = tasksData?.tasks ?? [];
  const stats = statsData ?? { total: 0, pending: 0, processing: 0, approved: 0, rejected: 0, readyToReview: 0, published: 0, failed: 0 };

  // タスク承認
  const handleApprove = useCallback(async (taskId: string) => {
    setIsProcessing(true);
    try {
      await postApi(`/api/enrichment/tasks/${taskId}/approve`, {});
      addToast({ type: 'success', message: 'タスクを承認しました' });
      mutate();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      addToast({ type: 'error', message: '承認に失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [mutate, selectedTask]);

  // タスク却下
  const handleReject = useCallback(async (taskId: string) => {
    setIsProcessing(true);
    try {
      await postApi(`/api/enrichment/tasks/${taskId}/reject`, { reason: 'Manual rejection' });
      addToast({ type: 'success', message: 'タスクを却下しました' });
      mutate();
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
    } catch (error) {
      addToast({ type: 'error', message: '却下に失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [mutate, selectedTask]);

  // タスクリトライ
  const handleRetry = useCallback(async (taskId: string) => {
    setIsProcessing(true);
    try {
      await postApi(`/api/enrichment/tasks/${taskId}/retry`, {});
      addToast({ type: 'success', message: 'タスクをリトライしました' });
      mutate();
    } catch (error) {
      addToast({ type: 'error', message: 'リトライに失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [mutate]);

  // 完全ワークフロー実行
  const handleFullWorkflow = useCallback(async (productId: string) => {
    setIsProcessing(true);
    try {
      const response = await postApi('/api/enrichment/queue/full-workflow', {
        productId,
        autoPublish: false,
      }) as { jobId: string };
      addToast({ type: 'success', message: `ワークフローを開始しました (Job: ${response.jobId.slice(0, 8)})` });
      mutate();
    } catch (error) {
      addToast({ type: 'error', message: 'ワークフロー開始に失敗しました' });
    } finally {
      setIsProcessing(false);
    }
  }, [mutate]);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">エンリッチメント</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {isLoading ? '読み込み中...' : `${tasksData?.total ?? 0} 件のタスク`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-4 grid grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800">
              <Package className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">合計</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">レビュー待ち</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.readyToReview}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">処理中</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.processing}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">承認済み</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.approved}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">出品済み</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.published}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">エラー</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Queue Stats */}
      {queueStats && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
              <Activity className="h-4 w-4" />
              キュー状況 ({queueStats.queueName})
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                待機: {queueStats.waiting}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                処理中: {queueStats.active}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                完了: {queueStats.completed}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                失敗: {queueStats.failed}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-purple-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのステータス</option>
          <option value="PENDING">待機中</option>
          <option value="PROCESSING">処理中</option>
          <option value="READY_TO_REVIEW">レビュー待ち</option>
          <option value="APPROVED">承認済み</option>
          <option value="REJECTED">却下</option>
          <option value="PUBLISHED">出品済み</option>
          <option value="FAILED">エラー</option>
        </select>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left: Task List */}
        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Table Header */}
          <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
            <div className="w-16">画像</div>
            <div className="flex-1 min-w-0">商品名</div>
            <div className="w-24 text-right">仕入価格</div>
            <div className="w-24 text-right">出品価格</div>
            <div className="w-28">ステータス</div>
            <div className="w-28">更新日時</div>
            <div className="w-24">操作</div>
          </div>

          {/* Table Body */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <p className="mt-2 text-sm text-red-500">データの取得に失敗しました</p>
              </div>
            )}

            {!isLoading && !error && tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-zinc-300" />
                <p className="mt-4 text-sm text-zinc-500">タスクがありません</p>
              </div>
            )}

            {tasks.map((task) => {
              const config = statusConfig[task.status] || statusConfig.PENDING;
              const StatusIcon = config.icon;
              const imageUrl = task.product?.images?.[0] || 'https://placehold.co/64x64/27272a/a855f7?text=N';
              const isSelected = selectedTask?.id === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={cn(
                    'flex items-center border-b border-zinc-100 px-3 py-2 cursor-pointer transition-colors dark:border-zinc-800',
                    isSelected && 'bg-purple-50 dark:bg-purple-900/20',
                    !isSelected && 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                  )}
                >
                  <div className="w-16">
                    <div className="h-12 w-12 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                      {task.translations?.en?.title || task.product?.title || 'Unknown Product'}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {task.product?.brand || 'ノーブランド'} | ID: {task.productId.slice(0, 8)}
                    </p>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-sm text-zinc-900 dark:text-white">
                      ¥{task.product?.price?.toLocaleString() || '-'}
                    </span>
                  </div>
                  <div className="w-24 text-right">
                    {task.pricing ? (
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        ${task.pricing.finalPriceUsd.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400">-</span>
                    )}
                  </div>
                  <div className="w-28">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
                      <StatusIcon className={cn('h-3 w-3', task.status === 'PROCESSING' && 'animate-spin')} />
                      {config.label}
                    </span>
                  </div>
                  <div className="w-28">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(task.updatedAt).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <div className="w-24 flex items-center gap-1">
                    {task.status === 'READY_TO_REVIEW' && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(task.id); }}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded dark:hover:bg-emerald-900/20"
                          title="承認"
                          disabled={isProcessing}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(task.id); }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20"
                          title="却下"
                          disabled={isProcessing}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {task.status === 'FAILED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRetry(task.id); }}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded dark:hover:bg-blue-900/20"
                        title="リトライ"
                        disabled={isProcessing}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}
                    {task.status === 'APPROVED' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFullWorkflow(task.productId); }}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded dark:hover:bg-purple-900/20"
                        title="Joom出品"
                        disabled={isProcessing}
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="w-96 flex-shrink-0 overflow-y-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {selectedTask ? (
            <div className="p-4">
              {/* Product Image */}
              <div className="mb-4 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={selectedTask.product?.images?.[0] || 'https://placehold.co/400x400/27272a/a855f7?text=No+Image'}
                  alt={selectedTask.product?.title}
                  className="h-48 w-full object-contain"
                />
              </div>

              {/* Status & Actions */}
              <div className="mb-4 flex items-center justify-between">
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
                  statusConfig[selectedTask.status]?.color || statusConfig.PENDING.color
                )}>
                  {statusConfig[selectedTask.status]?.label || selectedTask.status}
                </span>
                <div className="flex gap-2">
                  {selectedTask.status === 'READY_TO_REVIEW' && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(selectedTask.id)}
                        disabled={isProcessing}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        承認
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(selectedTask.id)}
                        disabled={isProcessing}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        却下
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400">元タイトル</label>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {selectedTask.product?.title}
                  </p>
                </div>

                {selectedTask.translations?.en?.title && (
                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Languages className="h-3 w-3" />
                      英語タイトル
                    </label>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {selectedTask.translations.en.title}
                    </p>
                  </div>
                )}

                {selectedTask.translations?.en?.description && (
                  <div>
                    <label className="text-xs text-zinc-500 dark:text-zinc-400">英語説明</label>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 line-clamp-4">
                      {selectedTask.translations.en.description}
                    </p>
                  </div>
                )}

                {/* Pricing Info */}
                {selectedTask.pricing && (
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                      価格情報
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">仕入価格</span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          ¥{selectedTask.pricing.costJpy.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">出品価格</span>
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          ${selectedTask.pricing.finalPriceUsd.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">利益率</span>
                        <span className={cn(
                          'text-sm font-medium',
                          selectedTask.pricing.profitRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        )}>
                          {selectedTask.pricing.profitRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Info */}
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700">
                  <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                    タスク情報
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">タスクID</span>
                      <span className="font-mono text-xs text-zinc-900 dark:text-white">
                        {selectedTask.id.slice(0, 12)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">優先度</span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {selectedTask.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">作成日時</span>
                      <span className="text-xs text-zinc-900 dark:text-white">
                        {new Date(selectedTask.createdAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">更新日時</span>
                      <span className="text-xs text-zinc-900 dark:text-white">
                        {new Date(selectedTask.updatedAt).toLocaleString('ja-JP')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              タスクを選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

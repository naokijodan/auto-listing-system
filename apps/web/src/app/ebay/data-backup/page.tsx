// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, deleteApi, patchApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  HardDrive,
  RefreshCw,
  Download,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  Trash2,
  Calendar,
  Server,
  Shield,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings,
  Plus,
  Eye,
  RotateCcw,
  FileArchive,
  Cloud,
  Database,
} from 'lucide-react';
import Link from 'next/link';

interface Backup {
  id: string;
  name: string;
  type: string;
  status: string;
  target: string;
  storageType: string;
  storagePath: string;
  sizeBytes: number;
  recordCount: number;
  compressed: boolean;
  encrypted: boolean;
  progress: number;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

interface Schedule {
  id: string;
  name: string;
  type: string;
  target: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  retentionDays: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

interface RestoreJob {
  id: string;
  backupId: string;
  status: string;
  targetEnvironment: string;
  progress: number;
  restoredRecords: number;
  skippedRecords: number;
  failedRecords: number;
  startedAt: string;
  completedAt: string | null;
}

interface StorageConfig {
  id: string;
  name: string;
  type: string;
  endpoint: string;
  bucket: string;
  region: string;
  isDefault: boolean;
  totalSize: number;
  usedSize: number;
  backupCount: number;
}

type TabType = 'backups' | 'schedules' | 'restore' | 'storage';

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  COMPLETED: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  RUNNING: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: RefreshCw },
  PENDING: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  FAILED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  CANCELLED: { color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400', icon: Pause },
};

const typeColors: Record<string, string> = {
  FULL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INCREMENTAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DIFFERENTIAL: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  SELECTIVE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function EbayDataBackupPage() {
  const [activeTab, setActiveTab] = useState<TabType>('backups');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);

  // データ取得
  const { data: statsData, mutate: mutateStats } = useSWR('/api/ebay-data-backup/stats', fetcher);
  const stats = statsData?.data;

  const { data: backupsData, mutate: mutateBackups, isLoading: isLoadingBackups } = useSWR(
    activeTab === 'backups' ? `/api/ebay-data-backup/backups?page=${page}&limit=10` : null,
    fetcher
  );

  const { data: schedulesData, mutate: mutateSchedules, isLoading: isLoadingSchedules } = useSWR(
    activeTab === 'schedules' ? '/api/ebay-data-backup/schedules' : null,
    fetcher
  );

  const { data: restoreData, isLoading: isLoadingRestore } = useSWR(
    activeTab === 'restore' ? `/api/ebay-data-backup/restore-jobs?page=${page}&limit=10` : null,
    fetcher
  );

  const { data: storageData, isLoading: isLoadingStorage } = useSWR(
    activeTab === 'storage' ? '/api/ebay-data-backup/storage-configs' : null,
    fetcher
  );

  // アクション
  const handleCreateBackup = async (type: string, target: string) => {
    try {
      await postApi('/api/ebay-data-backup/backups', { type, target });
      addToast({ type: 'success', message: 'バックアップを開始しました' });
      mutateBackups();
      mutateStats();
      setShowCreateModal(false);
    } catch {
      addToast({ type: 'error', message: 'バックアップの開始に失敗しました' });
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('このバックアップを削除しますか？')) return;
    try {
      await deleteApi(`/api/ebay-data-backup/backups/${id}`);
      addToast({ type: 'success', message: 'バックアップを削除しました' });
      mutateBackups();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      await patchApi(`/api/ebay-data-backup/schedules/${id}/toggle`, {});
      addToast({ type: 'success', message: 'スケジュールを更新しました' });
      mutateSchedules();
    } catch {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  };

  const handleRunNow = async (scheduleId: string) => {
    try {
      await postApi(`/api/ebay-data-backup/schedules/${scheduleId}/run-now`, {});
      addToast({ type: 'success', message: 'バックアップを開始しました' });
      mutateBackups();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '実行に失敗しました' });
    }
  };

  const handleRestore = async (backupId: string) => {
    try {
      await postApi('/api/ebay-data-backup/restore', { backupId });
      addToast({ type: 'success', message: 'リストアを開始しました' });
      setShowRestoreModal(false);
      setSelectedBackupId(null);
    } catch {
      addToast({ type: 'error', message: 'リストアの開始に失敗しました' });
    }
  };

  const tabs: { id: TabType; label: string; icon: typeof HardDrive }[] = [
    { id: 'backups', label: 'バックアップ', icon: FileArchive },
    { id: 'schedules', label: 'スケジュール', icon: Calendar },
    { id: 'restore', label: 'リストア', icon: RotateCcw },
    { id: 'storage', label: 'ストレージ', icon: Cloud },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ebay" className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
            <HardDrive className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">データバックアップ</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              出品データのバックアップとリストア
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規バックアップ
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { mutateStats(); mutateBackups(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-4 grid grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <FileArchive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">総バックアップ</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {stats.totalBackups}
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
                <p className="text-sm text-zinc-500 dark:text-zinc-400">成功</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.completedBackups}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <RefreshCw className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">実行中</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.runningBackups}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">使用容量</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalSizeFormatted}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブスケジュール</p>
                <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {stats.activeSchedules}
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
              onClick={() => { setActiveTab(tab.id); setPage(1); }}
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
        {/* Backups Tab */}
        {activeTab === 'backups' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {isLoadingBackups ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {backupsData?.data?.backups?.map((backup: Backup) => {
                    const statusCfg = statusConfig[backup.status] || statusConfig.PENDING;
                    const StatusIcon = statusCfg.icon;

                    return (
                      <Card key={backup.id} className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={cn('p-2 rounded-lg', statusCfg.color)}>
                            <StatusIcon className={cn('h-5 w-5', backup.status === 'RUNNING' && 'animate-spin')} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-zinc-900 dark:text-white">
                                {backup.name}
                              </span>
                              <span className={cn('text-xs px-2 py-0.5 rounded', typeColors[backup.type])}>
                                {backup.type}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                                {backup.target}
                              </span>
                              {backup.encrypted && (
                                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                              <span>{formatBytes(backup.sizeBytes)}</span>
                              <span>{backup.recordCount.toLocaleString()} レコード</span>
                              <span>{new Date(backup.createdAt).toLocaleString('ja-JP')}</span>
                            </div>
                            {backup.status === 'RUNNING' && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-zinc-500">進捗</span>
                                  <span className="font-medium">{backup.progress}%</span>
                                </div>
                                <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 transition-all"
                                    style={{ width: `${backup.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {backup.status === 'COMPLETED' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedBackupId(backup.id);
                                    setShowRestoreModal(true);
                                  }}
                                >
                                  <RotateCcw className="h-4 w-4 mr-1" />
                                  リストア
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBackup(backup.id)}
                              disabled={backup.status === 'RUNNING'}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {backupsData?.data?.pagination && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  {backupsData.data.pagination.total}件中{' '}
                  {(page - 1) * 10 + 1}-{Math.min(page * 10, backupsData.data.pagination.total)}件
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {page} / {backupsData.data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= backupsData.data.pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="h-full overflow-y-auto">
            {isLoadingSchedules ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {schedulesData?.data?.map((schedule: Schedule) => (
                  <Card key={schedule.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-2 rounded-lg',
                        schedule.enabled
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                      )}>
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-zinc-900 dark:text-white">
                            {schedule.name}
                          </span>
                          <span className={cn('text-xs px-2 py-0.5 rounded', typeColors[schedule.type])}>
                            {schedule.type}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {schedule.target}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                          <span>Cron: {schedule.cronExpression}</span>
                          <span>保持: {schedule.retentionDays}日</span>
                          {schedule.lastRunAt && (
                            <span>最終実行: {new Date(schedule.lastRunAt).toLocaleString('ja-JP')}</span>
                          )}
                          {schedule.nextRunAt && (
                            <span className="text-emerald-600">次回: {new Date(schedule.nextRunAt).toLocaleString('ja-JP')}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRunNow(schedule.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          今すぐ実行
                        </Button>
                        <Button
                          variant={schedule.enabled ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleSchedule(schedule.id)}
                        >
                          {schedule.enabled ? '無効化' : '有効化'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Restore Tab */}
        {activeTab === 'restore' && (
          <div className="h-full overflow-y-auto">
            {isLoadingRestore ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-2">
                {restoreData?.data?.restoreJobs?.map((restore: RestoreJob) => {
                  const statusCfg = statusConfig[restore.status] || statusConfig.PENDING;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <Card key={restore.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-2 rounded-lg', statusCfg.color)}>
                          <StatusIcon className={cn('h-5 w-5', restore.status === 'RUNNING' && 'animate-spin')} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-zinc-900 dark:text-white">
                              リストアジョブ {restore.id}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                              {restore.targetEnvironment}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>バックアップ: {restore.backupId}</span>
                            <span className="text-emerald-600">{restore.restoredRecords.toLocaleString()} 復元</span>
                            <span className="text-amber-600">{restore.skippedRecords} スキップ</span>
                            <span className="text-red-600">{restore.failedRecords} 失敗</span>
                            <span>{new Date(restore.startedAt).toLocaleString('ja-JP')}</span>
                          </div>
                          {restore.status === 'RUNNING' && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-zinc-500">進捗</span>
                                <span className="font-medium">{restore.progress}%</span>
                              </div>
                              <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 transition-all"
                                  style={{ width: `${restore.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Storage Tab */}
        {activeTab === 'storage' && (
          <div className="h-full overflow-y-auto">
            {isLoadingStorage ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {storageData?.data?.map((storage: StorageConfig) => (
                  <Card key={storage.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <Cloud className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-zinc-900 dark:text-white">
                            {storage.name}
                          </h3>
                          <p className="text-xs text-zinc-500">{storage.type}</p>
                        </div>
                      </div>
                      {storage.isDefault && (
                        <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          デフォルト
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-zinc-500">使用量</span>
                          <span className="font-medium">
                            {formatBytes(storage.usedSize)} / {formatBytes(storage.totalSize)}
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              (storage.usedSize / storage.totalSize) > 0.8 ? 'bg-red-500' :
                              (storage.usedSize / storage.totalSize) > 0.6 ? 'bg-amber-500' : 'bg-emerald-500'
                            )}
                            style={{ width: `${(storage.usedSize / storage.totalSize) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">バックアップ数</span>
                        <span className="font-medium">{storage.backupCount}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">バケット</span>
                        <span className="font-medium">{storage.bucket}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">リージョン</span>
                        <span className="font-medium">{storage.region}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings className="h-4 w-4 mr-1" />
                        設定
                      </Button>
                      <Button variant="outline" size="sm">
                        接続テスト
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              新規バックアップ
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  バックアップタイプ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'SELECTIVE'].map(type => (
                    <button
                      key={type}
                      onClick={() => handleCreateBackup(type, 'ALL')}
                      className={cn(
                        'px-4 py-3 rounded-lg text-sm font-medium border transition-colors',
                        'hover:bg-zinc-50 dark:hover:bg-zinc-700',
                        'border-zinc-200 dark:border-zinc-600'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                キャンセル
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && selectedBackupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                リストア確認
              </h3>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              バックアップID: {selectedBackupId} からデータをリストアします。
              この操作は既存データを上書きする可能性があります。
            </p>

            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-4">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                リストア前に現在のデータのバックアップを取ることをお勧めします。
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowRestoreModal(false); setSelectedBackupId(null); }}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={() => handleRestore(selectedBackupId)}>
                リストア開始
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

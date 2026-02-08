'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Search,
  RefreshCw,
  Loader2,
  Download,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  FileText,
  BarChart3,
  Clock,
  TrendingUp,
} from 'lucide-react';

// ========================================
// Types
// ========================================

interface LogEntry {
  timestamp: string;
  level: string;
  module?: string;
  message?: string;
  jobId?: string;
  queueName?: string;
  requestId?: string;
  type?: string;
  duration?: number;
  error?: string;
  [key: string]: unknown;
}

interface LogSearchResult {
  entries: LogEntry[];
  total: number;
  hasMore: boolean;
}

interface LogStats {
  totalEntries: number;
  byLevel: Record<string, number>;
  byModule: Record<string, number>;
  byHour: Array<{ hour: string; count: number; errors: number }>;
  errorRate: number;
  topErrors: Array<{ message: string; count: number }>;
}

interface LogSearchResponse {
  success: boolean;
  data: LogSearchResult;
}

interface LogStatsResponse {
  success: boolean;
  data: LogStats;
}

// ========================================
// Constants
// ========================================

const levelColors: Record<string, string> = {
  debug: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800',
  info: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
  warn: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
  error: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
};

const levelIcons: Record<string, typeof Info> = {
  debug: Bug,
  info: Info,
  warn: AlertTriangle,
  error: AlertCircle,
};

const moduleLabels: Record<string, string> = {
  'api': 'API',
  'worker': 'Worker',
  'scheduler': 'スケジューラ',
  'ebay-api': 'eBay API',
  'joom-api': 'Joom API',
  'translation': '翻訳',
  'image': '画像処理',
  'notification': '通知',
};

// ========================================
// Component
// ========================================

export default function LogViewerPage() {
  const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('logs');
  const [filters, setFilters] = useState({
    level: '',
    module: '',
    search: '',
    hours: 24,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.level) params.set('level', filters.level);
    if (filters.module) params.set('module', filters.module);
    if (filters.search) params.set('search', filters.search);
    params.set('limit', '100');

    const now = new Date();
    const startTime = new Date(now.getTime() - filters.hours * 3600000);
    params.set('startTime', startTime.toISOString());

    return params.toString();
  }, [filters]);

  // Fetch logs
  const { data: logsResponse, isLoading: logsLoading, mutate: mutateLogs } = useSWR<LogSearchResponse>(
    `/api/monitoring/logs?${buildQueryString()}`,
    fetcher,
    { refreshInterval: 10000 }
  );

  // Fetch stats
  const { data: statsResponse, isLoading: statsLoading, mutate: mutateStats } = useSWR<LogStatsResponse>(
    `/api/monitoring/logs/stats?hours=${filters.hours}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const logs = logsResponse?.data;
  const stats = statsResponse?.data;

  // Toggle log expansion
  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  // Export logs
  const handleExport = async (format: 'json' | 'csv' | 'ndjson') => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.level) params.set('level', filters.level);
      if (filters.module) params.set('module', filters.module);
      params.set('format', format);

      const now = new Date();
      const startTime = new Date(now.getTime() - filters.hours * 3600000);
      params.set('startTime', startTime.toISOString());

      const response = await fetch(`/api/monitoring/logs/export?${params.toString()}`);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rakuda-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Refresh
  const handleRefresh = () => {
    mutateLogs();
    mutateStats();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ログビューア</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            システムログの検索・分析・エクスポート
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <RefreshCw className="h-4 w-4" />
            更新
          </button>
          <div className="relative">
            <button
              onClick={() => setIsExporting(!isExporting)}
              disabled={isExporting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              エクスポート
            </button>
            {!isExporting && (
              <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block">
                <div className="rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  <button
                    onClick={() => handleExport('json')}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  >
                    CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {[
          { id: 'logs', label: 'ログ一覧', icon: FileText },
          { id: 'stats', label: '統計', icon: BarChart3 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'logs' | 'stats')}
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

      {/* Filters */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-500" />
            <span className="font-medium text-zinc-900 dark:text-white">フィルター</span>
            {(filters.level || filters.module || filters.search) && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                適用中
              </span>
            )}
          </div>
          {showFilters ? (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-zinc-500" />
          )}
        </button>

        {showFilters && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div>
                <label className="mb-1 block text-sm text-zinc-500">検索</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="キーワード検索..."
                    className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  />
                </div>
              </div>

              {/* Level */}
              <div>
                <label className="mb-1 block text-sm text-zinc-500">レベル</label>
                <select
                  value={filters.level}
                  onChange={(e) => setFilters({ ...filters, level: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">すべて</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              {/* Module */}
              <div>
                <label className="mb-1 block text-sm text-zinc-500">モジュール</label>
                <select
                  value={filters.module}
                  onChange={(e) => setFilters({ ...filters, module: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value="">すべて</option>
                  {Object.entries(moduleLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div>
                <label className="mb-1 block text-sm text-zinc-500">期間</label>
                <select
                  value={filters.hours}
                  onChange={(e) => setFilters({ ...filters, hours: Number(e.target.value) })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                >
                  <option value={1}>過去1時間</option>
                  <option value={6}>過去6時間</option>
                  <option value={24}>過去24時間</option>
                  <option value={72}>過去3日間</option>
                  <option value={168}>過去1週間</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setFilters({ level: '', module: '', search: '', hours: 24 })}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                リセット
              </button>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'logs' ? (
        /* Logs List */
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-500">
                {logs?.total.toLocaleString() || 0} 件のログ
                {logs?.hasMore && ' (さらにあり)'}
              </span>
            </div>
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : logs?.entries.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-zinc-500">ログが見つかりません</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {logs?.entries.map((entry, index) => {
                const LevelIcon = levelIcons[entry.level] || Info;
                const isExpanded = expandedLogs.has(index);

                return (
                  <div key={index} className="p-4">
                    <div
                      className="flex cursor-pointer items-start gap-3"
                      onClick={() => toggleExpand(index)}
                    >
                      <div className={cn('rounded-full p-1', levelColors[entry.level])}>
                        <LevelIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium uppercase', levelColors[entry.level])}>
                            {entry.level}
                          </span>
                          {entry.module && (
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              {moduleLabels[entry.module] || entry.module}
                            </span>
                          )}
                          {entry.type && (
                            <span className="text-xs text-zinc-500">{entry.type}</span>
                          )}
                          <span className="text-xs text-zinc-400">
                            {new Date(entry.timestamp).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-zinc-900 dark:text-white">
                          {entry.message || entry.error || JSON.stringify(entry).slice(0, 100)}
                        </p>
                        {entry.duration && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="h-3 w-3" />
                            {entry.duration}ms
                          </span>
                        )}
                      </div>
                      <ChevronRight className={cn(
                        'h-4 w-4 text-zinc-400 transition-transform',
                        isExpanded && 'rotate-90'
                      )} />
                    </div>

                    {isExpanded && (
                      <div className="mt-3 ml-8 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                        <pre className="overflow-x-auto text-xs text-zinc-600 dark:text-zinc-400">
                          {JSON.stringify(entry, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Stats */
        <div className="space-y-6">
          {statsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">総ログ数</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {stats.totalEntries.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">エラー率</p>
                      <p className={cn(
                        'text-xl font-bold',
                        stats.errorRate > 5 ? 'text-red-600' : stats.errorRate > 1 ? 'text-amber-600' : 'text-emerald-600'
                      )}>
                        {stats.errorRate}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">警告数</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {(stats.byLevel['warn'] || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                      <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">モジュール数</p>
                      <p className="text-xl font-bold text-zinc-900 dark:text-white">
                        {Object.keys(stats.byModule).length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Level Distribution */}
              <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">レベル別分布</h2>
                </div>
                <div className="p-4">
                  <div className="flex h-8 overflow-hidden rounded-lg">
                    {Object.entries(stats.byLevel).map(([level, count]) => {
                      const percentage = (count / stats.totalEntries) * 100;
                      return (
                        <div
                          key={level}
                          className={cn(
                            'flex items-center justify-center text-xs font-medium text-white',
                            level === 'error' ? 'bg-red-500' :
                            level === 'warn' ? 'bg-amber-500' :
                            level === 'info' ? 'bg-blue-500' : 'bg-zinc-400'
                          )}
                          style={{ width: `${percentage}%` }}
                          title={`${level}: ${count.toLocaleString()} (${percentage.toFixed(1)}%)`}
                        >
                          {percentage > 10 && level}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4">
                    {Object.entries(stats.byLevel).map(([level, count]) => (
                      <div key={level} className="flex items-center gap-2">
                        <span className={cn(
                          'h-3 w-3 rounded-full',
                          level === 'error' ? 'bg-red-500' :
                          level === 'warn' ? 'bg-amber-500' :
                          level === 'info' ? 'bg-blue-500' : 'bg-zinc-400'
                        )} />
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {level}: {count.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Errors */}
              {stats.topErrors.length > 0 && (
                <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                    <h2 className="font-semibold text-zinc-900 dark:text-white">頻出エラー</h2>
                  </div>
                  <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {stats.topErrors.map((error, index) => (
                      <div key={index} className="flex items-center justify-between p-4">
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate flex-1 mr-4">
                          {error.message}
                        </p>
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          {error.count}回
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Module Stats */}
              <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">モジュール別ログ数</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {Object.entries(stats.byModule)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 10)
                      .map(([module, count]) => {
                        const percentage = (count / stats.totalEntries) * 100;
                        return (
                          <div key={module}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                {moduleLabels[module] || module}
                              </span>
                              <span className="text-sm text-zinc-500">
                                {count.toLocaleString()} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

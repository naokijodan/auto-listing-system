
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
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  FileText,
  ShoppingCart,
  MessageSquare,
  Package,
  DollarSign,
  Star,
  RotateCcw,
  Globe,
  Server,
  User,
  Search,
  Download,
  Filter,
  Eye,
  CheckSquare,
  Shield,
  Monitor,
  Trash2,
  Settings,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface ActivityItem {
  id: string;
  type: string;
  category: string;
  severity: string;
  description: string;
  entityType: string;
  entityId: string | null;
  userId: string;
  userName: string;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
  isRead: boolean;
}

interface AuditTrail {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  userName: string;
  changes: { before: Record<string, unknown>; after: Record<string, unknown> };
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
  errorMessage: string | null;
}

interface SessionLog {
  id: string;
  userId: string;
  userName: string;
  loginTime: string;
  logoutTime: string | null;
  ipAddress: string;
  userAgent: string;
  location: string;
  deviceType: string;
  activityCount: number;
  isActive: boolean;
}

interface ErrorLog {
  id: string;
  errorType: string;
  errorCode: string;
  message: string;
  stackTrace: string;
  context: Record<string, unknown>;
  severity: string;
  isResolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  timestamp: string;
}

type TabType = 'activities' | 'audit' | 'sessions' | 'errors' | 'settings';

const categoryIcons: Record<string, typeof Activity> = {
  LISTING: FileText,
  ORDER: ShoppingCart,
  MESSAGING: MessageSquare,
  INVENTORY: Package,
  PRICING: DollarSign,
  FEEDBACK: Star,
  RETURNS: RotateCcw,
  API: Globe,
  SYSTEM: Server,
  USER: User,
};

const severityConfig: Record<string, { color: string; icon: typeof Info }> = {
  INFO: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Info },
  SUCCESS: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  WARNING: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangle },
  ERROR: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

export default function EbayActivityLogPage() {
  const [activeTab, setActiveTab] = useState<TabType>('activities');
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // データ取得
  const { data: statsData, mutate: mutateStats } = useSWR<any>('/api/ebay-activity-log/stats', fetcher);
  const stats = statsData?.data;

  const activitiesUrl = `/api/ebay-activity-log/activities?page=${page}&limit=20${categoryFilter ? `&category=${categoryFilter}` : ''}${severityFilter ? `&severity=${severityFilter}` : ''}${searchQuery ? `&search=${searchQuery}` : ''}`;
  const { data: activitiesData, mutate: mutateActivities, isLoading: isLoadingActivities } = useSWR<any>(
    activeTab === 'activities' ? activitiesUrl : null,
    fetcher
  );

  const { data: auditData, isLoading: isLoadingAudit } = useSWR<any>(
    activeTab === 'audit' ? `/api/ebay-activity-log/audit-trails?page=${page}&limit=20` : null,
    fetcher
  );

  const { data: sessionsData, isLoading: isLoadingSessions } = useSWR<any>(
    activeTab === 'sessions' ? `/api/ebay-activity-log/sessions?page=${page}&limit=20` : null,
    fetcher
  );

  const { data: errorsData, mutate: mutateErrors, isLoading: isLoadingErrors } = useSWR<any>(
    activeTab === 'errors' ? `/api/ebay-activity-log/errors?page=${page}&limit=20` : null,
    fetcher
  );

  const { data: retentionData } = useSWR<any>(
    activeTab === 'settings' ? '/api/ebay-activity-log/retention-settings' : null,
    fetcher
  );

  // アクション
  const handleMarkAllRead = async () => {
    try {
      await postApi('/api/ebay-activity-log/activities/mark-all-read', {});
      addToast({ type: 'success', message: '全て既読にしました' });
      mutateActivities();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '操作に失敗しました' });
    }
  };

  const handleResolveError = async (errorId: string) => {
    try {
      await postApi(`/api/ebay-activity-log/errors/${errorId}/resolve`, {});
      addToast({ type: 'success', message: 'エラーを解決済みにしました' });
      mutateErrors();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '操作に失敗しました' });
    }
  };

  const handleExport = async (dataType: string) => {
    try {
      await postApi('/api/ebay-activity-log/export', { format: 'CSV', dataType });
      addToast({ type: 'success', message: 'エクスポートを開始しました' });
    } catch {
      addToast({ type: 'error', message: 'エクスポートに失敗しました' });
    }
  };

  const tabs: { id: TabType; label: string; icon: typeof Activity }[] = [
    { id: 'activities', label: 'アクティビティ', icon: Activity },
    { id: 'audit', label: '監査ログ', icon: Shield },
    { id: 'sessions', label: 'セッション', icon: Monitor },
    { id: 'errors', label: 'エラーログ', icon: AlertCircle },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ebay" className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">アクティビティログ</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              システムアクティビティと監査トレイル
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport(activeTab)}>
            <Download className="h-4 w-4 mr-1" />
            エクスポート
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              mutateStats();
              mutateActivities();
            }}
          >
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
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">総アクティビティ</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {stats.totalActivities.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">今日</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.todayCount}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">未読</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.unreadCount}
                </p>
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
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {stats.errorCount}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <Monitor className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブセッション</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.activeSessions}
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
        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="h-full flex flex-col">
            {/* Filters */}
            <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm"
              >
                <option value="">全カテゴリ</option>
                <option value="LISTING">出品</option>
                <option value="ORDER">注文</option>
                <option value="MESSAGING">メッセージ</option>
                <option value="INVENTORY">在庫</option>
                <option value="PRICING">価格</option>
                <option value="FEEDBACK">評価</option>
                <option value="RETURNS">返品</option>
                <option value="API">API</option>
                <option value="SYSTEM">システム</option>
                <option value="USER">ユーザー</option>
              </select>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm"
              >
                <option value="">全レベル</option>
                <option value="INFO">INFO</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                <CheckSquare className="h-4 w-4 mr-1" />
                全て既読
              </Button>
            </div>

            {/* Activities List */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingActivities ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {activitiesData?.data?.activities?.map((activity: ActivityItem) => {
                    const CategoryIcon = categoryIcons[activity.category] || Activity;
                    const severityCfg = severityConfig[activity.severity] || severityConfig.INFO;
                    const SeverityIcon = severityCfg.icon;

                    return (
                      <Card
                        key={activity.id}
                        className={cn(
                          'p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors',
                          !activity.isRead && 'border-l-4 border-l-blue-500'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn('p-2 rounded-lg', severityCfg.color)}>
                            <SeverityIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <CategoryIcon className="h-4 w-4 text-zinc-400" />
                              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {activity.category}
                              </span>
                              <span className="text-xs text-zinc-400">•</span>
                              <span className="text-xs text-zinc-400">{activity.type}</span>
                            </div>
                            <p className="text-sm text-zinc-900 dark:text-white">
                              {activity.description}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-zinc-400">
                                {new Date(activity.timestamp).toLocaleString('ja-JP')}
                              </span>
                              {activity.entityId && (
                                <span className="text-xs text-zinc-400">
                                  ID: {activity.entityId}
                                </span>
                              )}
                              {activity.ipAddress && (
                                <span className="text-xs text-zinc-400">
                                  IP: {activity.ipAddress}
                                </span>
                              )}
                            </div>
                          </div>
                          {!activity.isRead && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination */}
            {activitiesData?.data?.pagination && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  {activitiesData.data.pagination.total}件中{' '}
                  {(page - 1) * 20 + 1}-{Math.min(page * 20, activitiesData.data.pagination.total)}件
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
                    {page} / {activitiesData.data.pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= activitiesData.data.pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Tab */}
        {activeTab === 'audit' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {isLoadingAudit ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {auditData?.data?.auditTrails?.map((audit: AuditTrail) => (
                    <Card key={audit.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          audit.success
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        )}>
                          <Shield className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              'text-xs font-medium px-2 py-0.5 rounded',
                              audit.action === 'CREATE' && 'bg-emerald-100 text-emerald-700',
                              audit.action === 'UPDATE' && 'bg-blue-100 text-blue-700',
                              audit.action === 'DELETE' && 'bg-red-100 text-red-700',
                              audit.action === 'VIEW' && 'bg-zinc-100 text-zinc-700',
                              audit.action === 'EXPORT' && 'bg-purple-100 text-purple-700'
                            )}>
                              {audit.action}
                            </span>
                            <span className="text-sm text-zinc-700 dark:text-zinc-300">
                              {audit.resourceType}
                            </span>
                            <span className="text-xs text-zinc-400">
                              {audit.resourceId}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            実行者: {audit.userName}
                          </p>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-zinc-400">
                              {new Date(audit.timestamp).toLocaleString('ja-JP')}
                            </span>
                            <span className="text-xs text-zinc-400">
                              IP: {audit.ipAddress}
                            </span>
                          </div>
                          {audit.errorMessage && (
                            <p className="text-xs text-red-500 mt-1">{audit.errorMessage}</p>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {sessionsData?.data?.sessions?.map((session: SessionLog) => (
                    <Card key={session.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          session.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                        )}>
                          <Monitor className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                              {session.userName}
                            </span>
                            {session.isActive && (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                アクティブ
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>{session.location}</span>
                            <span>{session.deviceType}</span>
                            <span>IP: {session.ipAddress}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
                            <span>ログイン: {new Date(session.loginTime).toLocaleString('ja-JP')}</span>
                            {session.logoutTime && (
                              <span>ログアウト: {new Date(session.logoutTime).toLocaleString('ja-JP')}</span>
                            )}
                            <span>アクティビティ: {session.activityCount}件</span>
                          </div>
                        </div>
                        {session.isActive && (
                          <Button variant="outline" size="sm" className="text-red-600">
                            強制終了
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {isLoadingErrors ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {errorsData?.data?.errors?.map((error: ErrorLog) => (
                    <Card key={error.id} className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          error.severity === 'CRITICAL' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          error.severity === 'HIGH' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                          error.severity === 'MEDIUM' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                          error.severity === 'LOW' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        )}>
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                              {error.errorType}
                            </span>
                            <span className="text-xs text-zinc-400">{error.errorCode}</span>
                            {error.isResolved && (
                              <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                解決済み
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-900 dark:text-white">
                            {error.message}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
                            <span>{new Date(error.timestamp).toLocaleString('ja-JP')}</span>
                            {error.resolvedBy && (
                              <span>解決者: {error.resolvedBy}</span>
                            )}
                          </div>
                        </div>
                        {!error.isResolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveError(error.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            解決
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && retentionData?.data && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                データ保持設定
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(retentionData.data).map(([key, value]: [string, unknown]) => {
                  const settings = value as { retentionDays: number; autoDelete: boolean };
                  return (
                    <div key={key} className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                      <h4 className="font-medium text-zinc-900 dark:text-white capitalize mb-2">
                        {key === 'activities' ? 'アクティビティ' :
                         key === 'auditTrails' ? '監査ログ' :
                         key === 'sessions' ? 'セッション' : 'エラーログ'}
                      </h4>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-500">保持期間</span>
                        <span className="font-medium">{settings.retentionDays}日</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-zinc-500">自動削除</span>
                        <span className={cn(
                          'font-medium',
                          settings.autoDelete ? 'text-emerald-600' : 'text-zinc-400'
                        )}>
                          {settings.autoDelete ? '有効' : '無効'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                データクリーンアップ
              </h3>
              <div className="flex items-center gap-4">
                <Button variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  古いアクティビティを削除
                </Button>
                <Button variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  解決済みエラーを削除
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

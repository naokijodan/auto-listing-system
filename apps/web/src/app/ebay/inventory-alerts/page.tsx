
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Loader2,
  Check,
  X,
  Clock,
  Settings,
  Package,
  TrendingDown,
  TrendingUp,
  Pause,
  Play,
  Eye,
  EyeOff,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertOctagon,
  Archive,
  Zap,
  BarChart3,
} from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  severity: string;
  status: string;
  itemId: string;
  itemTitle: string;
  sku: string;
  currentStock: number | null;
  threshold: number | null;
  message: string;
  recommendation: string;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  snoozedUntil: string | null;
}

interface Rule {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  triggeredCount: number;
  lastTriggered: string | null;
}

const typeLabels: Record<string, string> = {
  LOW_STOCK: '低在庫',
  OUT_OF_STOCK: '在庫切れ',
  OVERSTOCK: '過剰在庫',
  SLOW_MOVING: '滞留在庫',
  EXPIRING: '期限切れ',
  PRICE_DROP: '価格下落',
  REORDER_POINT: '再発注点',
  SYNC_ERROR: '同期エラー',
};

const typeIcons: Record<string, any> = {
  LOW_STOCK: TrendingDown,
  OUT_OF_STOCK: XCircle,
  OVERSTOCK: TrendingUp,
  SLOW_MOVING: Clock,
  REORDER_POINT: Package,
  SYNC_ERROR: AlertOctagon,
};

const severityColors: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  URGENT: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
};

const severityIcons: Record<string, any> = {
  INFO: Info,
  WARNING: AlertTriangle,
  CRITICAL: AlertCircle,
  URGENT: AlertOctagon,
};

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ACKNOWLEDGED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SNOOZED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  DISMISSED: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
};

export default function EbayInventoryAlertsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'rules' | 'notifications' | 'settings'>('overview');
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Dashboard data
  const { data: dashboardData, mutate: mutateDashboard } = useSWR<any>('/api/ebay-inventory-alerts/dashboard', fetcher);

  // Alerts
  const { data: alertsData, mutate: mutateAlerts } = useSWR<any>(
    `/api/ebay-inventory-alerts/alerts${typeFilter ? `?type=${typeFilter}` : ''}${statusFilter ? `${typeFilter ? '&' : '?'}status=${statusFilter}` : ''}`,
    fetcher
  );

  // Rules
  const { data: rulesData, mutate: mutateRules } = useSWR<any>(
    activeTab === 'rules' ? '/api/ebay-inventory-alerts/rules' : null,
    fetcher
  );

  // Notification settings
  const { data: notificationSettings, mutate: mutateNotifications } = useSWR<any>(
    activeTab === 'notifications' ? '/api/ebay-inventory-alerts/notifications/settings' : null,
    fetcher
  );

  // Settings
  const { data: settingsData } = useSWR<any>(
    activeTab === 'settings' ? '/api/ebay-inventory-alerts/settings' : null,
    fetcher
  );

  const stats = dashboardData?.stats;

  // アラート確認
  const handleAcknowledge = async (alertId: string) => {
    try {
      await putApi(`/api/ebay-inventory-alerts/alerts/${alertId}`, { status: 'ACKNOWLEDGED' });
      mutateAlerts();
      mutateDashboard();
      addToast({ type: 'success', message: 'アラートを確認しました' });
    } catch (error) {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  };

  // アラート解決
  const handleResolve = async (alertId: string) => {
    try {
      await putApi(`/api/ebay-inventory-alerts/alerts/${alertId}`, { status: 'RESOLVED' });
      mutateAlerts();
      mutateDashboard();
      addToast({ type: 'success', message: 'アラートを解決しました' });
    } catch (error) {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  };

  // 一括アクション
  const handleBulkAction = async (action: string) => {
    if (selectedAlerts.size === 0) return;

    try {
      await postApi('/api/ebay-inventory-alerts/alerts/bulk-action', {
        alertIds: Array.from(selectedAlerts),
        action,
      });
      setSelectedAlerts(new Set());
      mutateAlerts();
      mutateDashboard();
      addToast({ type: 'success', message: `${selectedAlerts.size}件のアラートを更新しました` });
    } catch (error) {
      addToast({ type: 'error', message: '一括更新に失敗しました' });
    }
  };

  // ルール切り替え
  const handleToggleRule = async (ruleId: string) => {
    try {
      await postApi(`/api/ebay-inventory-alerts/rules/${ruleId}/toggle`, {});
      mutateRules();
      addToast({ type: 'success', message: 'ルールを更新しました' });
    } catch (error) {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  };

  // 在庫チェック実行
  const handleRunCheck = async () => {
    try {
      const result = await postApi('/api/ebay-inventory-alerts/check', {});
      mutateDashboard();
      mutateAlerts();
      addToast({ type: 'success', message: `${(result as any).checkedItems}件をチェック、${(result as any).newAlerts}件の新規アラート` });
    } catch (error) {
      addToast({ type: 'error', message: 'チェックに失敗しました' });
    }
  };

  // 選択切り替え
  const toggleSelect = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'alerts', label: 'アラート', icon: Bell, count: stats?.summary.active },
    { id: 'rules', label: 'ルール', icon: Zap },
    { id: 'notifications', label: '通知', icon: Mail },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-orange-500">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">在庫アラート</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              リアルタイム在庫監視・通知
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRunCheck}>
            <RefreshCw className="h-4 w-4 mr-1" />
            在庫チェック
          </Button>
          <Button variant="outline" size="sm" onClick={() => { mutateAlerts(); mutateDashboard(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブ</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.summary.active}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
                    <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">確認済み</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.summary.acknowledged}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">解決済み</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.summary.resolved}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800">
                    <Pause className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">スヌーズ</p>
                    <p className="text-xl font-bold text-zinc-600 dark:text-zinc-400">{stats.summary.snoozed}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">合計</p>
                    <p className="text-xl font-bold text-zinc-900 dark:text-white">{stats.summary.total}</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* By Type */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">タイプ別</h3>
                <div className="space-y-2">
                  {Object.entries(stats.byType).map(([type, count]) => {
                    const Icon = typeIcons[type] || AlertCircle;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-zinc-400" />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">{typeLabels[type]}</span>
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{count as number}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* By Severity */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-3">重要度別</h3>
                <div className="space-y-2">
                  {Object.entries(stats.bySeverity).map(([severity, count]) => {
                    const Icon = severityIcons[severity] || AlertCircle;
                    return (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-4 w-4',
                            severity === 'CRITICAL' || severity === 'URGENT' ? 'text-red-500' :
                            severity === 'WARNING' ? 'text-amber-500' : 'text-blue-500'
                          )} />
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">{severity}</span>
                        </div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">{count as number}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* Critical Alerts */}
            {dashboardData?.criticalAlerts?.length > 0 && (
              <Card className="p-4 border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10">
                <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                  <AlertOctagon className="h-4 w-4" />
                  緊急アラート
                </h3>
                <div className="space-y-2">
                  {dashboardData.criticalAlerts.map((alert: Alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded-lg dark:bg-zinc-800">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{alert.itemTitle}</p>
                        <p className="text-xs text-zinc-500">{alert.message}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleAcknowledge(alert.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleResolve(alert.id)}>
                          <Check className="h-4 w-4 text-emerald-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Filters & Bulk Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <option value="">すべてのタイプ</option>
                  {Object.entries(typeLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <option value="">すべてのステータス</option>
                  <option value="ACTIVE">アクティブ</option>
                  <option value="ACKNOWLEDGED">確認済み</option>
                  <option value="RESOLVED">解決済み</option>
                  <option value="SNOOZED">スヌーズ</option>
                </select>
              </div>
              {selectedAlerts.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">{selectedAlerts.size}件選択</span>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('acknowledge')}>
                    確認
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('resolve')}>
                    解決
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('dismiss')}>
                    却下
                  </Button>
                </div>
              )}
            </div>

            {/* Alert List */}
            <div className="space-y-2">
              {alertsData?.alerts.map((alert: Alert) => {
                const TypeIcon = typeIcons[alert.type] || AlertCircle;
                const SeverityIcon = severityIcons[alert.severity] || AlertCircle;
                const isSelected = selectedAlerts.has(alert.id);

                return (
                  <Card
                    key={alert.id}
                    className={cn(
                      'p-4 border-l-4 transition-colors',
                      severityColors[alert.severity],
                      isSelected && 'ring-2 ring-blue-500'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(alert.id)}
                        className="mt-1 h-4 w-4 rounded border-zinc-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIcon className="h-4 w-4" />
                          <span className="text-xs font-medium uppercase">{typeLabels[alert.type]}</span>
                          <span className={cn('text-xs px-1.5 py-0.5 rounded', statusColors[alert.status])}>
                            {alert.status}
                          </span>
                          {alert.currentStock !== null && (
                            <span className="text-xs text-zinc-500">
                              在庫: {alert.currentStock}点
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-zinc-900 dark:text-white mb-1">{alert.itemTitle}</h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">{alert.message}</p>
                        {alert.recommendation && (
                          <p className="text-xs text-zinc-500 italic">{alert.recommendation}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                          <span>SKU: {alert.sku}</span>
                          <span>{new Date(alert.createdAt).toLocaleString('ja-JP')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {alert.status === 'ACTIVE' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleAcknowledge(alert.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleResolve(alert.id)}>
                              <Check className="h-4 w-4 text-emerald-500" />
                            </Button>
                          </>
                        )}
                        {alert.status === 'ACKNOWLEDGED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleResolve(alert.id)}>
                            <Check className="h-4 w-4 text-emerald-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">アラートルール</h3>
              <Button variant="primary" size="sm">
                ルール追加
              </Button>
            </div>
            <div className="space-y-3">
              {rulesData?.rules.map((rule: Rule) => {
                const TypeIcon = typeIcons[rule.type] || AlertCircle;
                return (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className={cn(
                            'w-10 h-6 rounded-full transition-colors',
                            rule.isActive ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            rule.isActive ? 'translate-x-4' : 'translate-x-0.5'
                          )} />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <TypeIcon className="h-4 w-4 text-zinc-400" />
                            <h4 className="font-medium text-zinc-900 dark:text-white">{rule.name}</h4>
                          </div>
                          <p className="text-sm text-zinc-500">
                            タイプ: {typeLabels[rule.type]} •
                            重要度: {rule.actions.severity} •
                            通知: {rule.actions.notifications?.join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{rule.triggeredCount}回</p>
                          <p className="text-xs text-zinc-400">トリガー</p>
                        </div>
                        <Button variant="outline" size="sm">編集</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && notificationSettings && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">通知チャネル</h3>
              <div className="space-y-4">
                {Object.entries(notificationSettings.channels).map(([channel, settings]: [string, any]) => {
                  const icons: Record<string, any> = {
                    EMAIL: Mail,
                    SLACK: MessageSquare,
                    SMS: Smartphone,
                    PUSH: Bell,
                    WEBHOOK: Webhook,
                  };
                  const Icon = icons[channel] || Bell;

                  return (
                    <div key={channel} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-zinc-400" />
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">{channel}</p>
                          {settings.recipients && (
                            <p className="text-xs text-zinc-500">{settings.recipients.join(', ')}</p>
                          )}
                          {settings.channel && (
                            <p className="text-xs text-zinc-500">{settings.channel}</p>
                          )}
                        </div>
                      </div>
                      <button
                        className={cn(
                          'w-11 h-6 rounded-full transition-colors',
                          settings.enabled ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        )}
                      >
                        <div className={cn(
                          'w-5 h-5 rounded-full bg-white transition-transform',
                          settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        )} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">静音時間</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">静音時間を有効化</p>
                    <p className="text-xs text-zinc-500">指定時間帯は通知を抑制（緊急除く）</p>
                  </div>
                  <button
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      notificationSettings.quietHours?.enabled ? 'bg-emerald-500' : 'bg-zinc-300'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      notificationSettings.quietHours?.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">開始時刻</label>
                    <input
                      type="time"
                      value={notificationSettings.quietHours?.start || '22:00'}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">終了時刻</label>
                    <input
                      type="time"
                      value={notificationSettings.quietHours?.end || '08:00'}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settingsData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">チェック設定</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    チェック間隔（分）
                  </label>
                  <input
                    type="number"
                    value={settingsData.checkInterval}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">自動解決</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">在庫復旧時に自動解決</p>
                    <p className="text-xs text-zinc-500">在庫が補充されたら自動的にアラートを解決</p>
                  </div>
                  <button
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      settingsData.autoResolve?.resolveWhenStockRestored ? 'bg-emerald-500' : 'bg-zinc-300'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.autoResolve?.resolveWhenStockRestored ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">販売時に自動解決</p>
                    <p className="text-xs text-zinc-500">滞留在庫が売れたら自動的にアラートを解決</p>
                  </div>
                  <button
                    className={cn(
                      'w-11 h-6 rounded-full transition-colors',
                      settingsData.autoResolve?.resolveWhenSold ? 'bg-emerald-500' : 'bg-zinc-300'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.autoResolve?.resolveWhenSold ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

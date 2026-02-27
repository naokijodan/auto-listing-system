// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  X,
  Pause,
  Settings,
  BarChart3,
  Zap,
  Package,
  DollarSign,
  ShoppingCart,
  Truck,
  Star,
  TrendingUp,
  Server,
  Shield,
  Plus,
  Edit3,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Mail,
  MessageSquare,
  Smartphone,
  Webhook,
  Send,
} from 'lucide-react';

const fetcher2 = (url: string) => fetcher(url);

// 型定義
type AlertCategory = 'INVENTORY' | 'PRICING' | 'ORDER' | 'SHIPPING' | 'REVIEW' | 'PERFORMANCE' | 'SYSTEM' | 'COMPLIANCE';
type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'URGENT';
type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SNOOZED' | 'DISMISSED';

interface UnifiedAlert {
  id: string;
  category: AlertCategory;
  source: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  details: Record<string, unknown>;
  actionUrl?: string;
  actionLabel?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  snoozedUntil?: string;
  tags: string[];
  createdAt: string;
}

interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  source: string;
  conditions: { field: string; operator: string; value: unknown }[];
  severity: AlertSeverity;
  actions: { type: string; config: Record<string, unknown> }[];
  isActive: boolean;
}

interface NotificationChannel {
  id: string;
  type: 'EMAIL' | 'SLACK' | 'SMS' | 'PUSH' | 'WEBHOOK';
  name: string;
  config: Record<string, unknown>;
  categories: AlertCategory[];
  severities: AlertSeverity[];
  isActive: boolean;
}

const severityConfig: Record<AlertSeverity, { label: string; color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  URGENT: { label: '緊急', color: 'text-red-700', bgColor: 'bg-red-100', icon: AlertTriangle },
  CRITICAL: { label: '重要', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: AlertCircle },
  WARNING: { label: '警告', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: AlertTriangle },
  INFO: { label: '情報', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Info },
};

const statusConfig: Record<AlertStatus, { label: string; color: string; icon: typeof Clock }> = {
  ACTIVE: { label: 'アクティブ', color: 'text-red-600 bg-red-50', icon: AlertCircle },
  ACKNOWLEDGED: { label: '確認済', color: 'text-amber-600 bg-amber-50', icon: Eye },
  RESOLVED: { label: '解決済', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  SNOOZED: { label: 'スヌーズ', color: 'text-purple-600 bg-purple-50', icon: Pause },
  DISMISSED: { label: '却下', color: 'text-zinc-600 bg-zinc-100', icon: X },
};

const categoryConfig: Record<AlertCategory, { label: string; icon: typeof Package; color: string }> = {
  INVENTORY: { label: '在庫', icon: Package, color: 'text-blue-600' },
  PRICING: { label: '価格', icon: DollarSign, color: 'text-emerald-600' },
  ORDER: { label: '注文', icon: ShoppingCart, color: 'text-purple-600' },
  SHIPPING: { label: '配送', icon: Truck, color: 'text-indigo-600' },
  REVIEW: { label: 'レビュー', icon: Star, color: 'text-yellow-600' },
  PERFORMANCE: { label: 'パフォーマンス', icon: TrendingUp, color: 'text-cyan-600' },
  SYSTEM: { label: 'システム', icon: Server, color: 'text-zinc-600' },
  COMPLIANCE: { label: 'コンプライアンス', icon: Shield, color: 'text-red-600' },
};

const channelTypeConfig: Record<string, { label: string; icon: typeof Mail }> = {
  EMAIL: { label: 'メール', icon: Mail },
  SLACK: { label: 'Slack', icon: MessageSquare },
  SMS: { label: 'SMS', icon: Smartphone },
  PUSH: { label: 'プッシュ', icon: Bell },
  WEBHOOK: { label: 'Webhook', icon: Webhook },
};

export default function AlertHubPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'rules' | 'channels' | 'stats' | 'settings'>('overview');
  const [selectedAlert, setSelectedAlert] = useState<UnifiedAlert | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());

  // データ取得
  const { data: dashboardData, mutate: mutateDashboard } = useSWR(
    '/api/ebay-alert-hub/dashboard',
    fetcher2
  );

  const { data: alertsData, mutate: mutateAlerts } = useSWR(
    `/api/ebay-alert-hub/alerts?${new URLSearchParams({
      ...(categoryFilter && { category: categoryFilter }),
      ...(severityFilter && { severity: severityFilter }),
      ...(statusFilter && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
    }).toString()}`,
    fetcher2
  );

  const { data: rulesData, mutate: mutateRules } = useSWR(
    '/api/ebay-alert-hub/rules',
    fetcher2
  );

  const { data: channelsData, mutate: mutateChannels } = useSWR(
    '/api/ebay-alert-hub/channels',
    fetcher2
  );

  const { data: statsData } = useSWR(
    '/api/ebay-alert-hub/stats',
    fetcher2
  );

  const alerts: UnifiedAlert[] = alertsData?.alerts || [];
  const rules: AlertRule[] = rulesData?.rules || [];
  const channels: NotificationChannel[] = channelsData?.channels || [];

  // アラート確認
  const handleAcknowledge = async (alertId: string) => {
    try {
      await postApi(`/api/ebay-alert-hub/alerts/${alertId}/acknowledge`, {});
      addToast({ type: 'success', message: 'アラートを確認しました' });
      mutateAlerts();
      mutateDashboard();
      setSelectedAlert(null);
    } catch {
      addToast({ type: 'error', message: 'アラート確認に失敗しました' });
    }
  };

  // アラート解決
  const handleResolve = async (alertId: string) => {
    try {
      await postApi(`/api/ebay-alert-hub/alerts/${alertId}/resolve`, {});
      addToast({ type: 'success', message: 'アラートを解決しました' });
      mutateAlerts();
      mutateDashboard();
      setSelectedAlert(null);
    } catch {
      addToast({ type: 'error', message: 'アラート解決に失敗しました' });
    }
  };

  // アラートスヌーズ
  const handleSnooze = async (alertId: string, duration: number = 60) => {
    try {
      await postApi(`/api/ebay-alert-hub/alerts/${alertId}/snooze`, { duration });
      addToast({ type: 'success', message: `アラートを${duration}分間スヌーズしました` });
      mutateAlerts();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: 'スヌーズに失敗しました' });
    }
  };

  // 一括アクション
  const handleBulkAction = async (action: string) => {
    if (selectedAlerts.size === 0) return;

    try {
      await postApi('/api/ebay-alert-hub/alerts/bulk-action', {
        alertIds: Array.from(selectedAlerts),
        action,
      });
      addToast({ type: 'success', message: `${selectedAlerts.size}件のアラートを処理しました` });
      setSelectedAlerts(new Set());
      mutateAlerts();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '一括処理に失敗しました' });
    }
  };

  // ルール有効/無効
  const handleToggleRule = async (ruleId: string) => {
    try {
      await postApi(`/api/ebay-alert-hub/rules/${ruleId}/toggle`, {});
      addToast({ type: 'success', message: 'ルールを更新しました' });
      mutateRules();
    } catch {
      addToast({ type: 'error', message: 'ルール更新に失敗しました' });
    }
  };

  // チャンネルテスト
  const handleTestChannel = async (channelId: string) => {
    try {
      await postApi(`/api/ebay-alert-hub/channels/${channelId}/test`, {});
      addToast({ type: 'success', message: 'テスト通知を送信しました' });
    } catch {
      addToast({ type: 'error', message: 'テスト通知に失敗しました' });
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'alerts', label: 'アラート', icon: Bell },
    { id: 'rules', label: 'ルール', icon: Zap },
    { id: 'channels', label: '通知', icon: Send },
    { id: 'stats', label: '統計', icon: TrendingUp },
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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">アラートハブ</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {dashboardData?.summary?.active || 0} 件のアクティブアラート
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            mutateDashboard();
            mutateAlerts();
            mutateRules();
            mutateChannels();
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* 概要タブ */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-4">
            {/* サマリーカード */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">アクティブ</p>
                    <p className="text-xl font-bold text-red-600">{dashboardData.summary.active}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <Eye className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">確認済</p>
                    <p className="text-xl font-bold text-amber-600">{dashboardData.summary.acknowledged}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">解決済</p>
                    <p className="text-xl font-bold text-emerald-600">{dashboardData.summary.resolved}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Pause className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">スヌーズ</p>
                    <p className="text-xl font-bold text-purple-600">{dashboardData.summary.snoozed}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">総アラート</p>
                    <p className="text-xl font-bold">{dashboardData.summary.total}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 重要度別 & カテゴリ別 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-medium mb-4">重要度別アラート</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.bySeverity).map(([severity, count]) => {
                    const config = severityConfig[severity.toUpperCase() as AlertSeverity];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                      <div key={severity} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1.5 rounded', config.bgColor)}>
                            <Icon className={cn('h-4 w-4', config.color)} />
                          </div>
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <span className={cn('font-bold', config.color)}>{count as number}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-4">カテゴリ別アラート</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(dashboardData.byCategory).map(([category, count]) => {
                    const config = categoryConfig[category.toUpperCase() as AlertCategory];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                      <div key={category} className="flex items-center justify-between p-2 bg-zinc-50 rounded">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-4 w-4', config.color)} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <span className="font-medium">{count as number}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* 緊急アラート */}
            {dashboardData.urgentAlerts?.length > 0 && (
              <Card className="p-4 border-red-200 bg-red-50">
                <h3 className="font-medium mb-4 text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  緊急・重要アラート
                </h3>
                <div className="space-y-2">
                  {dashboardData.urgentAlerts.map((alert: UnifiedAlert) => {
                    const sConfig = severityConfig[alert.severity];
                    const cConfig = categoryConfig[alert.category];
                    const CatIcon = cConfig.icon;
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:bg-zinc-50"
                        onClick={() => {
                          setSelectedAlert(alert);
                          setActiveTab('alerts');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <CatIcon className={cn('h-5 w-5', cConfig.color)} />
                          <div>
                            <p className="font-medium text-sm">{alert.title}</p>
                            <p className="text-xs text-zinc-500">{alert.message}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', sConfig.bgColor, sConfig.color)}>
                            {sConfig.label}
                          </span>
                          <ChevronRight className="h-4 w-4 text-zinc-400" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* 最近のアラート */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">最近のアラート</h3>
              <div className="space-y-2">
                {dashboardData.recentAlerts?.slice(0, 5).map((alert: UnifiedAlert) => {
                  const sConfig = severityConfig[alert.severity];
                  const cConfig = categoryConfig[alert.category];
                  const stConfig = statusConfig[alert.status];
                  const CatIcon = cConfig.icon;
                  return (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg cursor-pointer hover:bg-zinc-100"
                      onClick={() => {
                        setSelectedAlert(alert);
                        setActiveTab('alerts');
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <CatIcon className={cn('h-4 w-4', cConfig.color)} />
                        <div>
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-zinc-400">
                            {new Date(alert.createdAt).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2 py-0.5 rounded-full text-xs', stConfig.color)}>
                          {stConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* アラートタブ */}
        {activeTab === 'alerts' && (
          <div className="flex gap-4 h-full">
            {/* アラート一覧 */}
            <div className="flex-1 flex flex-col">
              {/* フィルター */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="アラートを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 text-sm"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべてのカテゴリ</option>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべての重要度</option>
                  {Object.entries(severityConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべてのステータス</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* 一括アクション */}
              {selectedAlerts.size > 0 && (
                <div className="flex items-center gap-2 mb-4 p-2 bg-zinc-50 rounded-lg">
                  <span className="text-sm text-zinc-600">{selectedAlerts.size}件選択中</span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('ACKNOWLEDGE')}>
                    確認
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('RESOLVE')}>
                    解決
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('SNOOZE')}>
                    スヌーズ
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedAlerts(new Set())}>
                    選択解除
                  </Button>
                </div>
              )}

              {/* アラートリスト */}
              <div className="flex-1 overflow-auto space-y-2">
                {alerts.map((alert) => {
                  const sConfig = severityConfig[alert.severity];
                  const cConfig = categoryConfig[alert.category];
                  const stConfig = statusConfig[alert.status];
                  const CatIcon = cConfig.icon;
                  const SevIcon = sConfig.icon;
                  const isSelected = selectedAlerts.has(alert.id);

                  return (
                    <Card
                      key={alert.id}
                      className={cn(
                        'p-4 cursor-pointer transition-colors',
                        selectedAlert?.id === alert.id ? 'ring-2 ring-red-500' : 'hover:bg-zinc-50',
                        isSelected && 'bg-red-50'
                      )}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newSet = new Set(selectedAlerts);
                            if (isSelected) {
                              newSet.delete(alert.id);
                            } else {
                              newSet.add(alert.id);
                            }
                            setSelectedAlerts(newSet);
                          }}
                          className="mt-1"
                        />
                        <div className={cn('p-2 rounded-lg', sConfig.bgColor)}>
                          <SevIcon className={cn('h-4 w-4', sConfig.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn('px-2 py-0.5 rounded text-xs', sConfig.bgColor, sConfig.color)}>
                              {sConfig.label}
                            </span>
                            <span className={cn('px-2 py-0.5 rounded-full text-xs', stConfig.color)}>
                              {stConfig.label}
                            </span>
                          </div>
                          <p className="font-medium text-sm">{alert.title}</p>
                          <p className="text-sm text-zinc-500 line-clamp-1">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                            <CatIcon className="h-3 w-3" />
                            <span>{cConfig.label}</span>
                            <span>•</span>
                            <span>{new Date(alert.createdAt).toLocaleString('ja-JP')}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* アラート詳細 */}
            {selectedAlert && (
              <Card className="w-96 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">アラート詳細</h3>
                  <button onClick={() => setSelectedAlert(null)} className="text-zinc-400 hover:text-zinc-600">
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-auto space-y-4">
                  {/* 重要度とステータス */}
                  <div className="flex items-center gap-2">
                    <span className={cn('px-3 py-1 rounded text-sm font-medium', severityConfig[selectedAlert.severity].bgColor, severityConfig[selectedAlert.severity].color)}>
                      {severityConfig[selectedAlert.severity].label}
                    </span>
                    <span className={cn('px-3 py-1 rounded-full text-sm', statusConfig[selectedAlert.status].color)}>
                      {statusConfig[selectedAlert.status].label}
                    </span>
                  </div>

                  {/* タイトルとメッセージ */}
                  <div>
                    <h4 className="font-medium mb-2">{selectedAlert.title}</h4>
                    <p className="text-sm text-zinc-600">{selectedAlert.message}</p>
                  </div>

                  {/* カテゴリ */}
                  <div className="flex items-center gap-2 text-sm">
                    {(() => {
                      const CatIcon = categoryConfig[selectedAlert.category].icon;
                      return <CatIcon className={cn('h-4 w-4', categoryConfig[selectedAlert.category].color)} />;
                    })()}
                    <span>{categoryConfig[selectedAlert.category].label}</span>
                  </div>

                  {/* 日時 */}
                  <div className="p-3 bg-zinc-50 rounded-lg text-sm space-y-1">
                    <p>作成: {new Date(selectedAlert.createdAt).toLocaleString('ja-JP')}</p>
                    {selectedAlert.acknowledgedAt && (
                      <p>確認: {new Date(selectedAlert.acknowledgedAt).toLocaleString('ja-JP')}</p>
                    )}
                    {selectedAlert.resolvedAt && (
                      <p>解決: {new Date(selectedAlert.resolvedAt).toLocaleString('ja-JP')}</p>
                    )}
                    {selectedAlert.snoozedUntil && (
                      <p>スヌーズ解除: {new Date(selectedAlert.snoozedUntil).toLocaleString('ja-JP')}</p>
                    )}
                  </div>

                  {/* タグ */}
                  {selectedAlert.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedAlert.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-zinc-100 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* アクションリンク */}
                  {selectedAlert.actionUrl && (
                    <a
                      href={selectedAlert.actionUrl}
                      className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedAlert.actionLabel || '詳細を見る'}</span>
                    </a>
                  )}

                  {/* アクション */}
                  {selectedAlert.status === 'ACTIVE' && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAcknowledge(selectedAlert.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        確認
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleResolve(selectedAlert.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        解決
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSnooze(selectedAlert.id, 60)}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ルールタブ */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">アラートルール</h3>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                ルール作成
              </Button>
            </div>

            <div className="space-y-3">
              {rules.map((rule) => {
                const cConfig = categoryConfig[rule.category];
                const sConfig = severityConfig[rule.severity];
                const CatIcon = cConfig.icon;
                return (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className={cn(
                            'p-2 rounded-lg transition-colors',
                            rule.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                          )}
                        >
                          {rule.isActive ? (
                            <ToggleRight className="h-5 w-5" />
                          ) : (
                            <ToggleLeft className="h-5 w-5" />
                          )}
                        </button>
                        <div className="flex items-center gap-3">
                          <CatIcon className={cn('h-5 w-5', cConfig.color)} />
                          <div>
                            <h4 className="font-medium">{rule.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                              <span>{cConfig.label}</span>
                              <span>•</span>
                              <span className={cn('px-1.5 py-0.5 rounded', sConfig.bgColor, sConfig.color)}>
                                {sConfig.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 通知チャンネルタブ */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">通知チャンネル</h3>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                チャンネル追加
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {channels.map((channel) => {
                const typeConfig = channelTypeConfig[channel.type];
                const TypeIcon = typeConfig.icon;
                return (
                  <Card key={channel.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', channel.isActive ? 'bg-emerald-50' : 'bg-zinc-100')}>
                          <TypeIcon className={cn('h-5 w-5', channel.isActive ? 'text-emerald-600' : 'text-zinc-400')} />
                        </div>
                        <div>
                          <h4 className="font-medium">{channel.name}</h4>
                          <span className="text-xs text-zinc-500">{typeConfig.label}</span>
                        </div>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs',
                        channel.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                      )}>
                        {channel.isActive ? '有効' : '無効'}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-500 mb-3">
                      <p>カテゴリ: {channel.categories.map(c => categoryConfig[c]?.label).join(', ')}</p>
                      <p>重要度: {channel.severities.map(s => severityConfig[s]?.label).join(', ')}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestChannel(channel.id)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        テスト
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 統計タブ */}
        {activeTab === 'stats' && statsData && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{statsData.alerts.total}</p>
                <p className="text-sm text-zinc-500">総アラート</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{statsData.alerts.active}</p>
                <p className="text-sm text-zinc-500">アクティブ</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{statsData.alerts.resolved}</p>
                <p className="text-sm text-zinc-500">解決済</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold">{statsData.alerts.averageResolutionTime}h</p>
                <p className="text-sm text-zinc-500">平均解決時間</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-medium mb-4">カテゴリ別分布</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(statsData.byCategory).map(([category, count]) => {
                  const config = categoryConfig[category.toUpperCase() as AlertCategory];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div key={category} className="flex items-center gap-2 p-3 bg-zinc-50 rounded-lg">
                      <Icon className={cn('h-5 w-5', config.color)} />
                      <div>
                        <p className="font-medium">{count as number}</p>
                        <p className="text-xs text-zinc-500">{config.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-2xl">
            <Card className="p-4">
              <h3 className="font-medium mb-4">通知設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">通知を有効化</p>
                    <p className="text-xs text-zinc-500">アラート通知を送信する</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">静粛時間</p>
                    <p className="text-xs text-zinc-500">指定時間帯は通知を送信しない</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">ダイジェスト通知</p>
                    <p className="text-xs text-zinc-500">アラートをまとめて通知</p>
                  </div>
                  <select className="px-3 py-2 rounded-lg border border-zinc-200 text-sm">
                    <option value="DAILY">毎日</option>
                    <option value="WEEKLY">毎週</option>
                    <option value="DISABLED">無効</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">自動アクション</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">INFO アラートを自動確認</p>
                    <p className="text-xs text-zinc-500">情報レベルのアラートを自動的に確認済みにする</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">自動解決日数</p>
                    <p className="text-xs text-zinc-500">指定日数後に自動解決</p>
                  </div>
                  <select className="px-3 py-2 rounded-lg border border-zinc-200 text-sm">
                    <option value="3">3日</option>
                    <option value="7">7日</option>
                    <option value="14">14日</option>
                    <option value="0">無効</option>
                  </select>
                </div>
              </div>
            </Card>

            <Button variant="primary">
              設定を保存
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

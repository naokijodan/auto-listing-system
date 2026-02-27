// @ts-nocheck
'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Settings,
  Play,
  Pause,
  Bell,
  Activity,
  TrendingUp,
  TrendingDown,
  XCircle,
  Eye,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function putApi<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}

interface DashboardData {
  summary: {
    totalListings: number;
    activeListings: number;
    pausedByInventory: number;
    outOfStockCount: number;
    lowStockCount: number;
    healthScore: number;
  };
  byStatus: Record<string, number>;
  recentAlerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    listingId: string;
    productTitle: string;
    actionTaken: string | null;
    createdAt: string;
  }>;
  lastCheckTime: string | null;
}

interface InventorySettings {
  autoStatusEnabled: boolean;
  pauseOnOutOfStock: boolean;
  resumeOnRestock: boolean;
  checkIntervalHours: number;
  lowStockThreshold: number;
  notifyOnOutOfStock: boolean;
  notifyOnRestock: boolean;
}

interface AlertsResponse {
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    message: string;
    listing: {
      id: string;
      status: string;
      price: number;
      productTitle: string;
      sourceUrl: string;
    };
    actionTaken: string | null;
    acknowledged: boolean;
    createdAt: string;
  }>;
  total: number;
}

const severityColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  INFO: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

const alertTypeLabels: Record<string, string> = {
  OUT_OF_STOCK: '在庫切れ',
  RESTOCKED: '在庫復活',
  LOW_STOCK: '低在庫',
  PRICE_CHANGE: '価格変動',
};

export default function EbayInventoryPage() {
  const [isChecking, setIsChecking] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<InventorySettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // ダッシュボードデータ
  const { data: dashboard, isLoading, mutate } = useSWR<DashboardData>(
    '/api/ebay-inventory/dashboard',
    fetcher,
    { refreshInterval: 30000 }
  );

  // 設定
  const { data: settings, mutate: mutateSettings } = useSWR<InventorySettings>(
    '/api/ebay-inventory/settings',
    fetcher
  );

  // アラート一覧
  const { data: alertsData, mutate: mutateAlerts } = useSWR<AlertsResponse>(
    '/api/ebay-inventory/alerts?limit=20',
    fetcher
  );

  // 在庫チェック実行
  const handleCheckInventory = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await postApi<{ message: string; count: number }>(
        '/api/ebay-inventory/check',
        { checkAll: true, limit: 100 }
      );
      addToast(response.message, 'success');
      mutate();
    } catch {
      addToast('在庫チェックの開始に失敗しました', 'error');
    } finally {
      setIsChecking(false);
    }
  }, [mutate]);

  // 在庫切れ出品を一時停止
  const handlePauseOutOfStock = useCallback(async () => {
    setIsPausing(true);
    try {
      const response = await postApi<{ message: string; count: number }>(
        '/api/ebay-inventory/pause-out-of-stock',
        {}
      );
      addToast(response.message, 'success');
      mutate();
      mutateAlerts();
    } catch {
      addToast('一時停止に失敗しました', 'error');
    } finally {
      setIsPausing(false);
    }
  }, [mutate, mutateAlerts]);

  // 在庫復活出品を再開
  const handleResumeRestocked = useCallback(async () => {
    setIsResuming(true);
    try {
      const response = await postApi<{ message: string; count: number }>(
        '/api/ebay-inventory/resume-restocked',
        {}
      );
      addToast(response.message, 'success');
      mutate();
      mutateAlerts();
    } catch {
      addToast('再開に失敗しました', 'error');
    } finally {
      setIsResuming(false);
    }
  }, [mutate, mutateAlerts]);

  // 設定を開く
  const openSettings = useCallback(() => {
    if (settings) {
      setSettingsForm({ ...settings });
      setShowSettings(true);
    }
  }, [settings]);

  // 設定を保存
  const handleSaveSettings = useCallback(async () => {
    if (!settingsForm) return;
    setIsSavingSettings(true);
    try {
      await putApi('/api/ebay-inventory/settings', settingsForm);
      addToast('設定を保存しました', 'success');
      mutateSettings();
      setShowSettings(false);
    } catch {
      addToast('設定の保存に失敗しました', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  }, [settingsForm, mutateSettings]);

  // アラートを確認済みに
  const handleAcknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      await postApi(`/api/ebay-inventory/alerts/${alertId}/acknowledge`, {});
      mutateAlerts();
    } catch {
      addToast('確認に失敗しました', 'error');
    }
  }, [mutateAlerts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const summary = dashboard?.summary || {
    totalListings: 0,
    activeListings: 0,
    pausedByInventory: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    healthScore: 100,
  };

  const alerts = alertsData?.alerts || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              eBay管理
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              在庫監視
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              eBay出品の在庫状態を監視・管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openSettings}>
            <Settings className="h-4 w-4 mr-2" />
            設定
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckInventory}
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            在庫チェック
          </Button>
        </div>
      </div>

      {/* Health Score & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Health Score */}
        <Card className="p-4 md:col-span-2">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold',
                summary.healthScore >= 80
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : summary.healthScore >= 50
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {summary.healthScore}
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">在庫健全性</p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {summary.healthScore >= 80
                  ? '良好'
                  : summary.healthScore >= 50
                  ? '要注意'
                  : '要対応'}
              </p>
              {dashboard?.lastCheckTime && (
                <p className="text-xs text-zinc-400">
                  最終チェック: {new Date(dashboard.lastCheckTime).toLocaleString('ja-JP')}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">総出品数</p>
              <p className="text-xl font-bold">{summary.totalListings}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブ</p>
              <p className="text-xl font-bold">{summary.activeListings}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">在庫切れ</p>
              <p className="text-xl font-bold text-red-600">{summary.outOfStockCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">在庫停止中</p>
              <p className="text-xl font-bold text-amber-600">{summary.pausedByInventory}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={handlePauseOutOfStock}
          disabled={isPausing || summary.outOfStockCount === 0}
          className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400"
        >
          {isPausing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Pause className="h-4 w-4 mr-2" />
          )}
          在庫切れを一時停止 ({summary.outOfStockCount})
        </Button>
        <Button
          variant="outline"
          onClick={handleResumeRestocked}
          disabled={isResuming || summary.pausedByInventory === 0}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
        >
          {isResuming ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          在庫復活を再開 ({summary.pausedByInventory})
        </Button>
      </div>

      {/* Alerts */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            直近のアラート
          </h2>
          <Badge variant="secondary">{alertsData?.total || 0}件</Badge>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>アラートはありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  alert.acknowledged
                    ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge className={severityColors[alert.severity] || severityColors.INFO}>
                    {alert.severity}
                  </Badge>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {alertTypeLabels[alert.type] || alert.type}
                    </p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {alert.listing?.productTitle || alert.message}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {alert.actionTaken && (
                    <Badge variant="outline" className="text-xs">
                      {alert.actionTaken}
                    </Badge>
                  )}
                  <span className="text-xs text-zinc-400">
                    {new Date(alert.createdAt).toLocaleString('ja-JP')}
                  </span>
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Settings Modal */}
      {showSettings && settingsForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              在庫監視設定
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>自動ステータス管理</Label>
                  <p className="text-sm text-zinc-500">在庫状態に応じて出品を自動管理</p>
                </div>
                <Switch
                  checked={settingsForm.autoStatusEnabled}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, autoStatusEnabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>在庫切れ時に一時停止</Label>
                  <p className="text-sm text-zinc-500">仕入れ元が在庫切れになったら一時停止</p>
                </div>
                <Switch
                  checked={settingsForm.pauseOnOutOfStock}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, pauseOnOutOfStock: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>在庫復活時に再開</Label>
                  <p className="text-sm text-zinc-500">仕入れ元の在庫が復活したら出品再開</p>
                </div>
                <Switch
                  checked={settingsForm.resumeOnRestock}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, resumeOnRestock: checked })
                  }
                />
              </div>

              <div>
                <Label htmlFor="checkInterval">チェック間隔（時間）</Label>
                <Input
                  id="checkInterval"
                  type="number"
                  min={1}
                  max={24}
                  value={settingsForm.checkIntervalHours}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      checkIntervalHours: parseInt(e.target.value, 10) || 6,
                    })
                  }
                  className="mt-1"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>在庫切れ通知</Label>
                  <p className="text-sm text-zinc-500">在庫切れ時に通知を送信</p>
                </div>
                <Switch
                  checked={settingsForm.notifyOnOutOfStock}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, notifyOnOutOfStock: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>在庫復活通知</Label>
                  <p className="text-sm text-zinc-500">在庫復活時に通知を送信</p>
                </div>
                <Switch
                  checked={settingsForm.notifyOnRestock}
                  onCheckedChange={(checked) =>
                    setSettingsForm({ ...settingsForm, notifyOnRestock: checked })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                キャンセル
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

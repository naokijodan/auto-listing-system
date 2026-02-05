'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  Gauge,
  Shield,
  RefreshCw,
  Save,
  RotateCcw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface RateLimitConfig {
  domain: string;
  requestsPerWindow: number;
  windowMs: number;
  minDelayMs: number;
}

interface RateLimitStatus {
  domain: string;
  config: RateLimitConfig;
  currentCount: number;
  limit: number;
  remaining: number;
  canRequest: boolean;
  resetMs: number;
}

interface ConfigsResponse {
  success: boolean;
  data: RateLimitConfig[];
}

interface StatusResponse {
  success: boolean;
  data: RateLimitStatus[];
}

const domainLabels: Record<string, string> = {
  'mercari.com': 'メルカリ',
  'yahoo.co.jp': 'ヤフオク',
  'ebay.com': 'eBay',
  'rakuten.co.jp': '楽天',
  default: 'デフォルト',
};

const domainColors: Record<string, string> = {
  'mercari.com': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'yahoo.co.jp': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'ebay.com': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'rakuten.co.jp': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-300',
};

export default function RateLimitsPage() {
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<RateLimitConfig>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch configs
  const { data: configsResponse, isLoading, mutate } = useSWR<ConfigsResponse>(
    '/api/rate-limits',
    fetcher
  );

  // Fetch status
  const { data: statusResponse, mutate: mutateStatus } = useSWR<StatusResponse>(
    '/api/rate-limits/status',
    fetcher,
    { refreshInterval: 5000 }
  );

  const configs = configsResponse?.data || [];
  const statuses = statusResponse?.data || [];

  // Get status for a domain
  const getStatus = (domain: string): RateLimitStatus | undefined => {
    return statuses.find((s) => s.domain === domain);
  };

  // Start editing
  const startEdit = (config: RateLimitConfig) => {
    setEditingDomain(config.domain);
    setEditValues({
      requestsPerWindow: config.requestsPerWindow,
      windowMs: config.windowMs,
      minDelayMs: config.minDelayMs,
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingDomain(null);
    setEditValues({});
  };

  // Save config
  const saveConfig = async (domain: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/rate-limits/${encodeURIComponent(domain)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });
      const data = await res.json();
      if (data.success) {
        setEditingDomain(null);
        setEditValues({});
        mutate();
        addToast({ type: 'success', message: '設定を保存しました' });
      } else {
        addToast({ type: 'error', message: '保存に失敗しました' });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'エラーが発生しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset config to default
  const resetConfig = async (domain: string) => {
    if (!confirm(`${domainLabels[domain] || domain}の設定をデフォルトに戻しますか？`)) return;

    try {
      const res = await fetch(`/api/rate-limits/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        mutate();
        addToast({ type: 'success', message: 'デフォルト設定に戻しました' });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'エラーが発生しました' });
    }
  };

  // Reset counter
  const resetCounter = async (domain: string) => {
    try {
      const res = await fetch(`/api/rate-limits/reset/${encodeURIComponent(domain)}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        mutateStatus();
        addToast({ type: 'success', message: 'カウンターをリセットしました' });
      }
    } catch (error) {
      addToast({ type: 'error', message: 'カウンターのリセットに失敗しました' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">レート制限設定</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            サイト別のアクセス頻度を制御してBANを防止
          </p>
        </div>
        <button
          onClick={() => mutateStatus()}
          className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          <RefreshCw className="h-4 w-4" />
          更新
        </button>
      </div>

      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="font-medium text-blue-900 dark:text-blue-200">レート制限について</p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              各サイトへのアクセス頻度を制限し、IPブロックやアカウントBANを防ぎます。
              設定値は慎重に変更してください。
            </p>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statuses.map((status) => {
          const usagePercent = (status.currentCount / status.limit) * 100;
          return (
            <div
              key={status.domain}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', domainColors[status.domain])}>
                  {domainLabels[status.domain] || status.domain}
                </span>
                {status.canRequest ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {status.remaining}
                  </span>
                  <span className="text-sm text-zinc-500">/ {status.limit}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      usagePercent > 80 ? 'bg-red-500' :
                      usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(100, usagePercent)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {Math.round(status.resetMs / 1000)}秒でリセット
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Config List */}
      <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-white">
            <Gauge className="h-5 w-5" />
            サイト別設定
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {configs.map((config) => {
              const isEditing = editingDomain === config.domain;
              const status = getStatus(config.domain);

              return (
                <div key={config.domain} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn('rounded-full px-3 py-1 text-sm font-medium', domainColors[config.domain])}>
                        {domainLabels[config.domain] || config.domain}
                      </span>
                      {status && !status.canRequest && (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" />
                          制限中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => resetCounter(config.domain)}
                            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                            title="カウンターをリセット"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => startEdit(config)}
                            className="rounded-lg border border-zinc-200 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            編集
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            リクエスト数/ウィンドウ
                          </label>
                          <input
                            type="number"
                            value={editValues.requestsPerWindow}
                            onChange={(e) => setEditValues({ ...editValues, requestsPerWindow: Number(e.target.value) })}
                            min="1"
                            max="100"
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <p className="mt-1 text-xs text-zinc-500">ウィンドウ内の最大リクエスト数</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            ウィンドウサイズ (ms)
                          </label>
                          <input
                            type="number"
                            value={editValues.windowMs}
                            onChange={(e) => setEditValues({ ...editValues, windowMs: Number(e.target.value) })}
                            min="10000"
                            max="300000"
                            step="1000"
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <p className="mt-1 text-xs text-zinc-500">{(editValues.windowMs || 0) / 1000}秒</p>
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            最小遅延 (ms)
                          </label>
                          <input
                            type="number"
                            value={editValues.minDelayMs}
                            onChange={(e) => setEditValues({ ...editValues, minDelayMs: Number(e.target.value) })}
                            min="500"
                            max="30000"
                            step="500"
                            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                          />
                          <p className="mt-1 text-xs text-zinc-500">リクエスト間の最小間隔: {(editValues.minDelayMs || 0) / 1000}秒</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveConfig(config.domain)}
                          disabled={isSaving}
                          className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                          保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => resetConfig(config.domain)}
                          className="ml-auto text-sm text-red-600 hover:text-red-700"
                        >
                          デフォルトに戻す
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-zinc-500">リクエスト数/ウィンドウ</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {config.requestsPerWindow}回 / {config.windowMs / 1000}秒
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">最小遅延</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {config.minDelayMs / 1000}秒
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">理論上の最大速度</p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {Math.round((config.requestsPerWindow / (config.windowMs / 1000)) * 60)}回/分
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Warning */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-200">注意事項</p>
            <ul className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              <li>• レート制限を緩めすぎるとIPブロックやアカウントBANのリスクが高まります</li>
              <li>• 各サイトの利用規約に従って適切な値を設定してください</li>
              <li>• 問題が発生した場合は、まず制限を厳しくしてください</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, deleteApi, putApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  Key,
  RefreshCw,
  Plus,
  Settings,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
  Shield,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  permissions: string[];
  rateLimit: { requestsPerMinute: number; requestsPerDay: number };
  status: string;
  lastUsedAt: string | null;
  usageCount: number;
  expiresAt: string | null;
  ipRestrictions: string[];
  createdAt: string;
}

type TabType = 'keys' | 'usage' | 'scopes' | 'settings';

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle }> = {
  ACTIVE: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  EXPIRED: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  REVOKED: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
};

const envColors: Record<string, string> = {
  PRODUCTION: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DEVELOPMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  STAGING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function EbayApiKeysPage() {
  const [activeTab, setActiveTab] = useState<TabType>('keys');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);

  // データ取得
  const { data: statsData, mutate: mutateStats } = useSWR('/api/ebay-api-keys/stats', fetcher);
  const stats = statsData?.data;

  const { data: keysData, mutate: mutateKeys, isLoading: isLoadingKeys } = useSWR(
    activeTab === 'keys' ? `/api/ebay-api-keys/keys?page=${page}&limit=10` : null,
    fetcher
  );

  const { data: usageData, isLoading: isLoadingUsage } = useSWR(
    activeTab === 'usage' ? `/api/ebay-api-keys/usage-logs?page=${page}&limit=20` : null,
    fetcher
  );

  const { data: scopesData } = useSWR('/api/ebay-api-keys/scopes', fetcher);

  // アクション
  const handleRevokeKey = async (id: string) => {
    if (!confirm('このAPIキーを取り消しますか？')) return;
    try {
      await postApi(`/api/ebay-api-keys/keys/${id}/revoke`, {});
      addToast({ type: 'success', message: 'APIキーを取り消しました' });
      mutateKeys();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '操作に失敗しました' });
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('このAPIキーを削除しますか？')) return;
    try {
      await deleteApi(`/api/ebay-api-keys/keys/${id}`);
      addToast({ type: 'success', message: 'APIキーを削除しました' });
      mutateKeys();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const handleRotateKey = async (id: string) => {
    if (!confirm('APIキーをローテーションしますか？古いキーは無効になります。')) return;
    try {
      const response = await postApi(`/api/ebay-api-keys/keys/${id}/rotate`, {}) as { data: { newKey: string } };
      addToast({ type: 'success', message: 'APIキーをローテーションしました' });
      setNewKeyValue(response.data.newKey);
      mutateKeys();
    } catch {
      addToast({ type: 'error', message: 'ローテーションに失敗しました' });
    }
  };

  const handleCreateKey = async (data: { name: string; environment: string; permissions: string[] }) => {
    try {
      const response = await postApi('/api/ebay-api-keys/keys', data) as { data: { fullKey: string } };
      addToast({ type: 'success', message: 'APIキーを作成しました' });
      setNewKeyValue(response.data.fullKey);
      setShowCreateModal(false);
      mutateKeys();
      mutateStats();
    } catch {
      addToast({ type: 'error', message: '作成に失敗しました' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ type: 'success', message: 'コピーしました' });
  };

  const tabs: { id: TabType; label: string; icon: typeof Key }[] = [
    { id: 'keys', label: 'APIキー', icon: Key },
    { id: 'usage', label: '使用ログ', icon: BarChart3 },
    { id: 'scopes', label: '権限', icon: Shield },
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
            <Key className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">APIキー管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              APIキーの作成と管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            新規キー作成
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { mutateStats(); mutateKeys(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Key Display */}
      {newKeyValue && (
        <Card className="mb-4 p-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-700 dark:text-amber-400">
                新しいAPIキーが生成されました
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-300 mb-2">
                このキーは一度しか表示されません。安全な場所に保存してください。
              </p>
              <div className="flex items-center gap-2 p-2 bg-white dark:bg-zinc-800 rounded border border-amber-200 dark:border-amber-700">
                <code className="flex-1 text-sm font-mono break-all">{newKeyValue}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(newKeyValue)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setNewKeyValue(null)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="mb-4 grid grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">総キー数</p>
                <p className="text-xl font-bold text-zinc-900 dark:text-white">
                  {stats.totalKeys}
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
                <p className="text-sm text-zinc-500 dark:text-zinc-400">アクティブ</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {stats.activeKeys}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
                <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">総使用回数</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.totalUsage.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">応答時間</p>
                <p className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                  {stats.avgResponseTime}ms
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">エラー率</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {stats.errorRate}%
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
        {/* Keys Tab */}
        {activeTab === 'keys' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoadingKeys ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : (
                keysData?.data?.keys?.map((key: ApiKeyItem) => {
                  const statusCfg = statusConfig[key.status] || statusConfig.ACTIVE;
                  const StatusIcon = statusCfg.icon;

                  return (
                    <Card key={key.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn('p-2 rounded-lg', statusCfg.color)}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-zinc-900 dark:text-white">
                              {key.name}
                            </span>
                            <span className={cn('text-xs px-2 py-0.5 rounded', envColors[key.environment])}>
                              {key.environment}
                            </span>
                            <span className={cn('text-xs px-2 py-0.5 rounded', statusCfg.color)}>
                              {key.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm text-zinc-500 font-mono">
                              {key.keyPrefix}{'*'.repeat(20)}
                            </code>
                            <button
                              onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                              className="text-zinc-400 hover:text-zinc-600"
                            >
                              {showKey === key.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {key.permissions.slice(0, 3).map((perm) => (
                              <span
                                key={perm}
                                className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                              >
                                {perm}
                              </span>
                            ))}
                            {key.permissions.length > 3 && (
                              <span className="text-xs text-zinc-400">
                                +{key.permissions.length - 3}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-500">
                            <span>使用: {key.usageCount.toLocaleString()}</span>
                            <span>制限: {key.rateLimit.requestsPerMinute}/min</span>
                            {key.lastUsedAt && (
                              <span>最終: {new Date(key.lastUsedAt).toLocaleString('ja-JP')}</span>
                            )}
                            {key.expiresAt && (
                              <span className={new Date(key.expiresAt) < new Date() ? 'text-red-500' : ''}>
                                有効期限: {new Date(key.expiresAt).toLocaleDateString('ja-JP')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRotateKey(key.id)}
                            disabled={key.status !== 'ACTIVE'}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={key.status !== 'ACTIVE'}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="h-full overflow-y-auto">
            {isLoadingUsage ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-1">
                {usageData?.data?.logs?.map((log: {
                  id: string;
                  endpoint: string;
                  method: string;
                  statusCode: number;
                  responseTime: number;
                  ipAddress: string;
                  timestamp: string;
                }) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-2 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-sm"
                  >
                    <span className={cn(
                      'font-mono text-xs px-2 py-0.5 rounded',
                      log.method === 'GET' ? 'bg-blue-100 text-blue-700' :
                      log.method === 'POST' ? 'bg-emerald-100 text-emerald-700' :
                      log.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    )}>
                      {log.method}
                    </span>
                    <span className="flex-1 font-mono text-zinc-600 dark:text-zinc-400 truncate">
                      {log.endpoint}
                    </span>
                    <span className={cn(
                      'font-mono',
                      log.statusCode >= 400 ? 'text-red-500' : 'text-emerald-500'
                    )}>
                      {log.statusCode}
                    </span>
                    <span className="text-zinc-400 w-16 text-right">{log.responseTime}ms</span>
                    <span className="text-zinc-400 w-28">{log.ipAddress}</span>
                    <span className="text-zinc-400 w-40">
                      {new Date(log.timestamp).toLocaleString('ja-JP')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scopes Tab */}
        {activeTab === 'scopes' && scopesData?.data && (
          <div className="grid grid-cols-3 gap-4">
            {['listings', 'orders', 'analytics', 'messages', 'reports', 'admin'].map((category) => {
              const scopes = scopesData.data.filter((s: { category: string }) => s.category === category);
              if (scopes.length === 0) return null;

              return (
                <Card key={category} className="p-4">
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white capitalize mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {scopes.map((scope: { id: string; name: string }) => (
                      <div
                        key={scope.id}
                        className="flex items-center gap-2 p-2 rounded bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <Shield className="h-4 w-4 text-zinc-400" />
                        <div>
                          <p className="text-sm font-medium">{scope.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{scope.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                デフォルトレート制限
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Production</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">1分あたり</span>
                      <span>1,000 リクエスト</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">1日あたり</span>
                      <span>100,000 リクエスト</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Development</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">1分あたり</span>
                      <span>100 リクエスト</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">1日あたり</span>
                      <span>10,000 リクエスト</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              新規APIキー作成
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateKey({
                  name: formData.get('name') as string,
                  environment: formData.get('environment') as string,
                  permissions: ['read:listings', 'read:orders'],
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  キー名
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                  placeholder="My API Key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  環境
                </label>
                <select
                  name="environment"
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                >
                  <option value="DEVELOPMENT">Development</option>
                  <option value="STAGING">Staging</option>
                  <option value="PRODUCTION">Production</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                  キャンセル
                </Button>
                <Button variant="primary" type="submit">
                  作成
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

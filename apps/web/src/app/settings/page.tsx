
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addToast } from '@/components/ui/toast';
import {
  DollarSign,
  Bell,
  Globe,
  Palette,
  Shield,
  Database,
  Save,
  RefreshCw,
  Layers,
  FolderTree,
  Sparkles,
  ChevronRight,
  Store,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Zap,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi, syncScheduleApi, SyncSchedule, SyncScheduleConfig } from '@/lib/api';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const tabs = [
  { id: 'price', label: '価格設定', icon: DollarSign },
  { id: 'listing', label: '出品設定', icon: Layers },
  { id: 'notifications', label: '通知設定', icon: Bell },
  { id: 'marketplace', label: 'マーケットプレイス', icon: Globe },
  { id: 'sync', label: '同期スケジュール', icon: Calendar },
  { id: 'appearance', label: '外観', icon: Palette },
  { id: 'system', label: 'システム', icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('price');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">設定</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          RAKUDAの各種設定を管理
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'price' && <PriceSettings />}
          {activeTab === 'listing' && <ListingSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'marketplace' && <MarketplaceSettings />}
          {activeTab === 'sync' && <SyncScheduleSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'system' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}

function PriceSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>eBay 価格設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                基本利益率 (%)
              </label>
              <input
                type="number"
                defaultValue={30}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                最低利益 ($)
              </label>
              <input
                type="number"
                defaultValue={10}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                送料 ($)
              </label>
              <input
                type="number"
                defaultValue={15}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                手数料率 (%)
              </label>
              <input
                type="number"
                defaultValue={13}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Joom 価格設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                基本利益率 (%)
              </label>
              <input
                type="number"
                defaultValue={25}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                最低利益 ($)
              </label>
              <input
                type="number"
                defaultValue={8}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}

function ListingSettings() {
  const settingsLinks = [
    {
      href: '/settings/templates',
      icon: Layers,
      title: '出品テンプレート',
      description: '商品タイプごとの出品設定プリセットを管理',
    },
    {
      href: '/settings/categories',
      icon: FolderTree,
      title: 'カテゴリマッピング',
      description: '日本語カテゴリとeBayカテゴリの紐付けを管理',
    },
    {
      href: '/settings/prompts',
      icon: Sparkles,
      title: '翻訳プロンプト',
      description: '商品ジャンルごとの翻訳品質を最適化',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>出品設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                  <link.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">{link.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{link.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  const settingsLinks = [
    {
      href: '/settings/notifications',
      icon: Bell,
      title: '通知チャンネル管理',
      description: 'Slack、Discord、LINE 通知チャンネルを設定',
    },
    {
      href: '/settings/rate-limits',
      icon: Shield,
      title: 'レート制限',
      description: 'スクレイピング・API呼び出しの制限を管理',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>通知設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                  <link.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">{link.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{link.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>在庫・価格監視アラート</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              価格変動通知閾値 (%)
            </label>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              この割合以上の価格変動があった場合に通知します
            </p>
            <input
              type="number"
              defaultValue={10}
              min={1}
              max={100}
              className="h-10 w-32 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              通知チャンネルを設定すると、在庫切れや価格変動を自動的に通知します。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}

interface MarketplaceOverview {
  ebay: {
    connected: boolean;
    tokenExpired: boolean | null;
    environment: string;
    listings: Record<string, number>;
  };
  joom: {
    connected: boolean;
    listings: Record<string, number>;
  };
}

interface ConnectionTestResult {
  success: boolean;
  status: string;
  message: string;
  environment?: string;
  tokenExpired?: boolean;
}

function MarketplaceSettings() {
  const { data: overviewResponse, isLoading, mutate } = useSWR<{ success: boolean; data: MarketplaceOverview }>(
    '/api/marketplaces/overview',
    fetcher
  );
  const [testingEbay, setTestingEbay] = useState(false);
  const [testingJoom, setTestingJoom] = useState(false);
  const [ebayTestResult, setEbayTestResult] = useState<ConnectionTestResult | null>(null);
  const [joomTestResult, setJoomTestResult] = useState<ConnectionTestResult | null>(null);

  const overview = overviewResponse?.data;

  // eBayアカウント一覧
  const { data: ebayAccountsData, mutate: mutateAccounts } = useSWR<{ accounts: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sandbox: boolean;
    tokenExpiresAt: string | null;
    isExpired: boolean;
    needsRefresh: boolean;
    createdAt: string;
  }> }>('/api/ebay/accounts', fetcher);

  const [newAccountName, setNewAccountName] = useState('');

  const handleAddEbayAccount = () => {
    const accountName = newAccountName.trim() || `account-${Date.now()}`;
    window.location.href = `/api/ebay/auth?accountName=${encodeURIComponent(accountName)}`;
  };

  const handleDeleteEbayAccount = async (accountId: string) => {
    try {
      await fetch(`/api/ebay/accounts/${accountId}`, { method: 'DELETE' });
      mutateAccounts();
      addToast({ type: 'success', message: 'アカウントを無効化しました' });
    } catch {
      addToast({ type: 'error', message: 'アカウントの無効化に失敗しました' });
    }
  };

  const handleTestEbayConnection = async () => {
    setTestingEbay(true);
    setEbayTestResult(null);
    try {
      const result = await fetcher<ConnectionTestResult>('/api/marketplaces/ebay/test-connection');
      setEbayTestResult(result);
      if (result.success) {
        addToast({ type: 'success', message: 'eBay接続テスト成功' });
      } else {
        addToast({ type: 'error', message: result.message });
      }
    } catch (error) {
      addToast({ type: 'error', message: '接続テストに失敗しました' });
    } finally {
      setTestingEbay(false);
    }
  };

  const handleTestJoomConnection = async () => {
    setTestingJoom(true);
    setJoomTestResult(null);
    try {
      const result = await fetcher<ConnectionTestResult>('/api/marketplaces/joom/test-connection');
      setJoomTestResult(result);
      if (result.success) {
        addToast({ type: 'success', message: 'Joom接続テスト成功' });
      } else {
        addToast({ type: 'error', message: result.message });
      }
    } catch (error) {
      addToast({ type: 'error', message: '接続テストに失敗しました' });
    } finally {
      setTestingJoom(false);
    }
  };

  const getConnectionStatus = (connected: boolean, tokenExpired: boolean | null) => {
    if (!connected) {
      return { color: 'text-zinc-500', bg: 'bg-zinc-400', label: '未接続', icon: XCircle };
    }
    if (tokenExpired) {
      return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', label: 'トークン期限切れ', icon: AlertTriangle };
    }
    return { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500', label: '接続済み', icon: CheckCircle };
  };

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
        </div>
      )}

      {overview && (
        <>
          {/* eBay Card */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-600" />
                  eBay
                </CardTitle>
                {(() => {
                  const status = getConnectionStatus(overview.ebay.connected, overview.ebay.tokenExpired);
                  return (
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', status.bg)} />
                      <span className={cn('text-sm', status.color)}>{status.label}</span>
                    </div>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400">環境</p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    {overview.ebay.environment === 'production' ? '本番' : 'サンドボックス'}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-600 dark:text-blue-400">アクティブ出品</p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    {overview.ebay.listings.ACTIVE || 0}件
                  </p>
                </div>
              </div>

              {/* Test Result */}
              {ebayTestResult && (
                <div className={cn(
                  'rounded-lg p-3',
                  ebayTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                )}>
                  <div className="flex items-center gap-2">
                    {ebayTestResult.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={cn(
                      'text-sm font-medium',
                      ebayTestResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                    )}>
                      {ebayTestResult.message}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestEbayConnection}
                  disabled={testingEbay}
                >
                  {testingEbay ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  接続テスト
                </Button>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  <RefreshCw className="h-4 w-4" />
                  更新
                </Button>
              </div>

              {/* eBay アカウント管理 */}
              <div className="border-t pt-4 dark:border-zinc-700">
                <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">接続アカウント</h4>
                {ebayAccountsData?.accounts && ebayAccountsData.accounts.length > 0 ? (
                  <div className="space-y-2">
                    {ebayAccountsData.accounts.map(account => (
                      <div key={account.id} className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                        <div className="flex items-center gap-3">
                          <span className={cn('h-2 w-2 rounded-full', account.isActive && !account.isExpired ? 'bg-emerald-500' : account.isExpired ? 'bg-amber-500' : 'bg-zinc-400')} />
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{account.name}</p>
                            <p className="text-xs text-zinc-500">
                              {account.isExpired ? 'トークン期限切れ' : account.isActive ? '接続済み' : '無効'}
                              {account.sandbox ? ' (サンドボックス)' : ''}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEbayAccount(account.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          削除
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">アカウントが接続されていません</p>
                )}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="アカウント名"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddEbayAccount}>
                    + アカウント追加
                  </Button>
                </div>
              </div>

              {/* Sync Schedule */}
              <div className="border-t pt-4 dark:border-zinc-700">
                <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">同期スケジュール</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">在庫同期</span>
                    <span className="text-zinc-900 dark:text-white">6時間ごと (毎時45分)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">注文同期</span>
                    <span className="text-zinc-900 dark:text-white">6時間ごと (毎時45分)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">価格同期</span>
                    <span className="text-zinc-900 dark:text-white">6時間ごと</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Joom Card */}
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-amber-600" />
                  Joom
                </CardTitle>
                {(() => {
                  const status = getConnectionStatus(overview.joom.connected, null);
                  return (
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', status.bg)} />
                      <span className={cn('text-sm', status.color)}>{status.label}</span>
                    </div>
                  );
                })()}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">アクティブ出品</p>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    {overview.joom.listings.ACTIVE || 0}件
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">販売済</p>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    {overview.joom.listings.SOLD || 0}件
                  </p>
                </div>
              </div>

              {/* Test Result */}
              {joomTestResult && (
                <div className={cn(
                  'rounded-lg p-3',
                  joomTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                )}>
                  <div className="flex items-center gap-2">
                    {joomTestResult.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={cn(
                      'text-sm font-medium',
                      joomTestResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                    )}>
                      {joomTestResult.message}
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestJoomConnection}
                  disabled={testingJoom}
                >
                  {testingJoom ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  接続テスト
                </Button>
              </div>

              {/* Sync Schedule */}
              <div className="border-t pt-4 dark:border-zinc-700">
                <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">同期スケジュール</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">在庫同期</span>
                    <span className="text-zinc-900 dark:text-white">6時間ごと (毎時30分)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">注文同期</span>
                    <span className="text-zinc-900 dark:text-white">6時間ごと (毎時30分)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600 dark:text-zinc-400">価格同期</span>
                    <span className="text-zinc-900 dark:text-white">6時間ごと</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Etsy Card */}
          <Card className="border-2 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-orange-600" />
                  Etsy
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  <span className="text-sm text-zinc-500">認証待ち</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                  <p className="text-xs text-orange-600 dark:text-orange-400">連携方式</p>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-200">OAuth2 PKCE</p>
                </div>
                <div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-900/20">
                  <p className="text-xs text-orange-600 dark:text-orange-400">対象商品</p>
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-200">ヴィンテージ品</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/etsy/auth">
                    <Zap className="h-4 w-4" />
                    OAuth認証開始
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/etsy/status" target="_blank">
                    <RefreshCw className="h-4 w-4" />
                    ステータス確認
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shopify Card */}
          <Card className="border-2 border-green-200 dark:border-green-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-green-600" />
                  Shopify (Social Commerce Hub)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  <span className="text-sm text-zinc-500">認証待ち</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">連携方式</p>
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">OAuth2</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">対象商品</p>
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">ブランド品/高単価</p>
                </div>
                <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <p className="text-xs text-green-600 dark:text-green-400">配信先</p>
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">Instagram / TikTok</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/shopify/auth?shop=YOUR-STORE">
                    <Zap className="h-4 w-4" />
                    OAuth認証開始
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/shopify/status" target="_blank">
                    <RefreshCw className="h-4 w-4" />
                    ステータス確認
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Social Commerce Channels */}
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                ソーシャルコマース (Shopify Hub経由)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-pink-200 p-4 dark:border-pink-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">📸</span>
                    <h4 className="font-medium text-zinc-900 dark:text-white">Instagram Shop</h4>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Shopifyの「Facebook & Instagram」チャネル経由で自動配信
                  </p>
                  <p className="mt-2 text-xs text-pink-600 dark:text-pink-400">
                    Shopify認証後に設定可能
                  </p>
                </div>
                <div className="rounded-lg border border-cyan-200 p-4 dark:border-cyan-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🎵</span>
                    <h4 className="font-medium text-zinc-900 dark:text-white">TikTok Shop</h4>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Shopifyの「TikTok」チャネル経由で自動配信
                  </p>
                  <p className="mt-2 text-xs text-cyan-600 dark:text-cyan-400">
                    Shopify認証後に設定可能
                  </p>
                </div>
              </div>
              <div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Shopifyに商品を出品すると、Instagram Shop / TikTok Shopに自動的に配信されます。
                  追加のAPI連携は不要です。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle>クイックリンク</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/joom"
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-amber-600" />
                  <span className="font-medium">Joom管理</span>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-400" />
              </Link>
              <Link
                href="/ebay"
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">eBay管理</span>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-400" />
              </Link>
              <Link
                href="/etsy"
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-orange-600" />
                  <span className="font-medium">Etsy管理</span>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-400" />
              </Link>
              <Link
                href="/shopify"
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Shopify管理</span>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-400" />
              </Link>
              <Link
                href="/settings/categories"
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <FolderTree className="h-5 w-5 text-purple-600" />
                  <span className="font-medium">カテゴリマッピング</span>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-400" />
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// Sync interval options
const intervalOptions = [
  { value: '1', label: '1時間' },
  { value: '3', label: '3時間' },
  { value: '6', label: '6時間' },
  { value: '12', label: '12時間' },
  { value: '24', label: '24時間' },
];

function SyncScheduleSettings() {
  const [selectedMarketplace, setSelectedMarketplace] = useState<'JOOM' | 'EBAY' | 'ETSY' | 'SHOPIFY'>('JOOM');
  const [schedules, setSchedules] = useState<Record<string, SyncSchedule>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load schedules
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        // Try to fetch from API, fallback to defaults if not available
        const response = await fetch('/api/sync-schedules');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const scheduleMap: Record<string, SyncSchedule> = {};
            data.data.forEach((s: SyncSchedule) => {
              scheduleMap[s.marketplace] = s;
            });
            setSchedules(scheduleMap);
          }
        } else {
          // Use default values if API not available
          setSchedules({
            JOOM: {
              marketplace: 'JOOM',
              inventory: { interval: 6, enabled: true },
              orders: { interval: 6, enabled: true },
              prices: { interval: 6, enabled: true },
              updatedAt: new Date().toISOString(),
            },
            EBAY: {
              marketplace: 'EBAY',
              inventory: { interval: 6, enabled: true },
              orders: { interval: 6, enabled: true },
              prices: { interval: 6, enabled: true },
              updatedAt: new Date().toISOString(),
            },
            ETSY: {
              marketplace: 'ETSY',
              inventory: { interval: 6, enabled: true },
              orders: { interval: 6, enabled: true },
              prices: { interval: 6, enabled: true },
              updatedAt: new Date().toISOString(),
            },
            SHOPIFY: {
              marketplace: 'SHOPIFY',
              inventory: { interval: 6, enabled: true },
              orders: { interval: 6, enabled: true },
              prices: { interval: 6, enabled: true },
              updatedAt: new Date().toISOString(),
            },
          });
        }
      } catch {
        // Use default values on error
        setSchedules({
          JOOM: {
            marketplace: 'JOOM',
            inventory: { interval: 6, enabled: true },
            orders: { interval: 6, enabled: true },
            prices: { interval: 6, enabled: true },
            updatedAt: new Date().toISOString(),
          },
          EBAY: {
            marketplace: 'EBAY',
            inventory: { interval: 6, enabled: true },
            orders: { interval: 6, enabled: true },
            prices: { interval: 6, enabled: true },
            updatedAt: new Date().toISOString(),
          },
          ETSY: {
            marketplace: 'ETSY',
            inventory: { interval: 6, enabled: true },
            orders: { interval: 6, enabled: true },
            prices: { interval: 6, enabled: true },
            updatedAt: new Date().toISOString(),
          },
          SHOPIFY: {
            marketplace: 'SHOPIFY',
            inventory: { interval: 6, enabled: true },
            orders: { interval: 6, enabled: true },
            prices: { interval: 6, enabled: true },
            updatedAt: new Date().toISOString(),
          },
        });
      } finally {
        setLoading(false);
      }
    };
    loadSchedules();
  }, []);

  const currentSchedule = schedules[selectedMarketplace];

  const updateScheduleField = (
    syncType: 'inventory' | 'orders' | 'prices',
    field: 'interval' | 'enabled',
    value: number | boolean
  ) => {
    setSchedules((prev) => ({
      ...prev,
      [selectedMarketplace]: {
        ...prev[selectedMarketplace],
        [syncType]: {
          ...prev[selectedMarketplace]?.[syncType],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const schedule = schedules[selectedMarketplace];
      await syncScheduleApi.update(selectedMarketplace, {
        inventory: schedule.inventory,
        orders: schedule.orders,
        prices: schedule.prices,
      });
      addToast({ type: 'success', message: '同期スケジュールを保存しました' });
    } catch {
      addToast({ type: 'error', message: '保存に失敗しました（APIが未実装の可能性があります）' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Marketplace Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            同期スケジュール設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              マーケットプレイス
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMarketplace('JOOM')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'JOOM'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
              >
                <Store className="h-4 w-4" />
                Joom
              </button>
              <button
                onClick={() => setSelectedMarketplace('EBAY')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'EBAY'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
              >
                <Store className="h-4 w-4" />
                eBay
              </button>
              <button
                onClick={() => setSelectedMarketplace('ETSY')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'ETSY'
                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
              >
                <Store className="h-4 w-4" />
                Etsy
              </button>
              <button
                onClick={() => setSelectedMarketplace('SHOPIFY')}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                  selectedMarketplace === 'SHOPIFY'
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                )}
              >
                <Store className="h-4 w-4" />
                Shopify
              </button>
            </div>
          </div>

          {currentSchedule && (
            <div className="space-y-6">
              {/* Inventory Sync */}
              <SyncTypeConfig
                label="在庫同期"
                description="商品の在庫数を同期します"
                config={currentSchedule.inventory}
                onIntervalChange={(v) => updateScheduleField('inventory', 'interval', v)}
                onEnabledChange={(v) => updateScheduleField('inventory', 'enabled', v)}
                color={selectedMarketplace === 'JOOM' ? 'amber' : selectedMarketplace === 'EBAY' ? 'blue' : selectedMarketplace === 'ETSY' ? 'orange' : 'green'}
              />

              {/* Orders Sync */}
              <SyncTypeConfig
                label="注文同期"
                description="新規注文を取得・同期します"
                config={currentSchedule.orders}
                onIntervalChange={(v) => updateScheduleField('orders', 'interval', v)}
                onEnabledChange={(v) => updateScheduleField('orders', 'enabled', v)}
                color={selectedMarketplace === 'JOOM' ? 'amber' : selectedMarketplace === 'EBAY' ? 'blue' : selectedMarketplace === 'ETSY' ? 'orange' : 'green'}
              />

              {/* Prices Sync */}
              <SyncTypeConfig
                label="価格同期"
                description="商品価格を同期・更新します"
                config={currentSchedule.prices}
                onIntervalChange={(v) => updateScheduleField('prices', 'interval', v)}
                onEnabledChange={(v) => updateScheduleField('prices', 'enabled', v)}
                color={selectedMarketplace === 'JOOM' ? 'amber' : selectedMarketplace === 'EBAY' ? 'blue' : selectedMarketplace === 'ETSY' ? 'orange' : 'green'}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </Button>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <h4 className="mb-2 font-medium text-amber-800 dark:text-amber-300">
              同期スケジュールについて
            </h4>
            <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
              <li>- 在庫同期: マーケットプレイスの在庫数を仕入れ元と同期</li>
              <li>- 注文同期: 新規注文の取得と処理状況の更新</li>
              <li>- 価格同期: 為替レートや仕入れ価格に基づく価格更新</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SyncTypeConfigProps {
  label: string;
  description: string;
  config: SyncScheduleConfig;
  onIntervalChange: (value: number) => void;
  onEnabledChange: (value: boolean) => void;
  color: 'amber' | 'blue' | 'orange' | 'green';
}

const colorMap: Record<string, { bg: string; text: string }> = {
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
};

function SyncTypeConfig({
  label,
  description,
  config,
  onIntervalChange,
  onEnabledChange,
  color,
}: SyncTypeConfigProps) {
  const bgColor = colorMap[color]?.bg ?? colorMap.blue.bg;
  const textColor = colorMap[color]?.text ?? colorMap.blue.text;

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', bgColor)}>
              <Clock className={cn('h-4 w-4', textColor)} />
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-white">{label}</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            </div>
          </div>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {config.enabled && (
        <div className="mt-4 flex items-center gap-4 pl-12">
          <label className="text-sm text-zinc-600 dark:text-zinc-400">実行間隔:</label>
          <Select
            value={config.interval.toString()}
            onValueChange={(v: string) => onIntervalChange(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {intervalOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {config.lastRun && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              前回: {new Date(config.lastRun).toLocaleString('ja-JP')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AppearanceSettings() {
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  // 初期化時にLocalStorageから読み込み
  useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as 'system' | 'light' | 'dark' | null;
      if (stored) {
        setTheme(stored);
      }
    }
  });

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // テーマを適用
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>外観設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            テーマ
          </label>
          <select
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value as 'system' | 'light' | 'dark')}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="system">システム設定に従う</option>
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            ヘッダーの太陽/月アイコンでも切り替えできます
          </p>
        </div>

        {/* Theme Preview */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'ライト', bg: 'bg-white border-zinc-200', text: 'text-zinc-900' },
            { id: 'dark', label: 'ダーク', bg: 'bg-zinc-900 border-zinc-700', text: 'text-white' },
            { id: 'system', label: 'システム', bg: 'bg-gradient-to-r from-white to-zinc-900 border-zinc-300', text: 'text-zinc-500' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id as 'system' | 'light' | 'dark')}
              className={cn(
                'flex flex-col items-center rounded-lg border-2 p-3 transition-colors',
                t.bg,
                theme === t.id ? 'ring-2 ring-amber-500' : ''
              )}
            >
              <div className={cn('h-8 w-full rounded', t.id === 'light' ? 'bg-zinc-100' : t.id === 'dark' ? 'bg-zinc-800' : 'bg-gradient-to-r from-zinc-100 to-zinc-800')} />
              <span className={cn('mt-2 text-xs font-medium', t.text)}>{t.label}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            言語
          </label>
          <select className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemSettings() {
  // Load INTEGRATION settings
  const { data: integrationRes, mutate } = useSWR<{ success: boolean; data: Record<string, any> }>(
    '/api/system-settings/category/INTEGRATION',
    fetcher
  );
  const integration = integrationRes?.data || {};

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [model, setModel] = useState<string>('gpt-5-nano');
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    if (integration?.openai_model) {
      setModel(integration.openai_model);
    }
  }, [integration?.openai_model]);

  const isConfigured = Boolean(integration?.openai_api_key && String(integration.openai_api_key).trim().length > 0);

  const handleSaveApiKey = async () => {
    const value = apiKeyInput.trim();
    if (!value) {
      addToast({ type: 'info', message: '空欄のため保存しません（既存値を維持）' });
      return;
    }
    try {
      setSavingKey(true);
      await putApi('/api/system-settings/openai_api_key', { value, reason: 'Update from settings UI' });
      addToast({ type: 'success', message: 'OpenAI API Keyを保存しました' });
      setApiKeyInput('');
      mutate();
    } catch (e) {
      addToast({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setSavingKey(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const res = await postApi<{ success: boolean; message: string }>(
        '/api/system-settings/openai_api_key/verify',
        {}
      );
      if (res.success) {
        addToast({ type: 'success', message: '接続テストに成功しました' });
      } else {
        addToast({ type: 'error', message: res.message || '接続テストに失敗しました' });
      }
    } catch (e: any) {
      addToast({ type: 'error', message: '接続テストに失敗しました' });
    } finally {
      setVerifying(false);
    }
  };

  const handleSaveModel = async () => {
    try {
      setSavingModel(true);
      await putApi('/api/system-settings/openai_model', { value: model, reason: 'Update from settings UI' });
      addToast({ type: 'success', message: 'モデル設定を保存しました' });
      mutate();
    } catch {
      addToast({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setSavingModel(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* API Integration */}
      <Card>
        <CardHeader>
          <CardTitle>API連携設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <span className="text-sm font-medium text-zinc-900 dark:text-white">OpenAI 接続状態</span>
            <span className={cn('flex items-center gap-1.5 text-sm', isConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500')}>
              <span className={cn('h-2 w-2 rounded-full', isConfigured ? 'bg-emerald-500' : 'bg-zinc-400')} />
              {isConfigured ? '設定済み' : '未設定'}
            </span>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              OpenAI API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="新しいキーを入力..."
                className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <Button onClick={handleSaveApiKey} disabled={savingKey}>
                {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </Button>
              <Button variant="outline" onClick={handleVerify} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Verify
              </Button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              GPT-4oを使った翻訳・属性抽出に必要。sk-で始まるキーを入力してください。
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              OpenAI モデル
            </label>
            <div className="flex gap-2">
              <Select value={model} onValueChange={(v) => setModel(v)}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="モデルを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-5-nano">GPT-5 Nano（最速・最安）</SelectItem>
                  <SelectItem value="gpt-5-mini">GPT-5 Mini（高速・コスト効率）</SelectItem>
                  <SelectItem value="gpt-5">GPT-5（高性能）</SelectItem>
                  <SelectItem value="gpt-5.2">GPT-5.2（フロンティア）</SelectItem>
                  <SelectItem value="gpt-5.4">GPT-5.4（最新・最高性能）</SelectItem>
                  <SelectItem value="gpt-4.1-nano">GPT-4.1 Nano（非推論・最安）</SelectItem>
                  <SelectItem value="gpt-4.1-mini">GPT-4.1 Mini（非推論・コスト効率）</SelectItem>
                  <SelectItem value="gpt-4.1">GPT-4.1（非推論・最高性能）</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSaveModel} disabled={savingModel}>
                {savingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </Button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              翻訳に使用するモデル名（gpt-4o, gpt-4o-mini等）
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>スケジューラー設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: '在庫チェック', value: '3回/日 (9:00, 17:00, 01:00)' },
            { label: '為替レート更新', value: '毎日 00:00' },
            { label: '価格同期', value: '6時間ごと' },
            { label: '日次レポート', value: '毎日 21:00' },
            { label: 'ヘルスチェック', value: '3時間ごと' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">{item.label}</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>データベース</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">PostgreSQL</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">rakuda-postgres:5432</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              接続中
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Redis</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">rakuda-redis:6379</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              接続中
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline">
          <RefreshCw className="h-4 w-4" />
          接続テスト
        </Button>
      </div>
    </div>
  );
}

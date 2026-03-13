'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addToast } from '@/components/ui/toast';
import { Store, CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw, Zap, ChevronRight, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetcher } from '@/lib/api';
import Link from 'next/link';
import {
  marketplaceOverviewResponseSchema,
  connectionTestResultSchema,
  type MarketplaceOverview as MarketplaceOverviewType,
} from './types';
import { z } from 'zod';

export function MarketplaceSettings() {
  const { data: overviewRaw, isLoading, mutate } = useSWR('/api/marketplaces/overview', fetcher);
  const overviewParsed = marketplaceOverviewResponseSchema.safeParse(overviewRaw);
  const overview: MarketplaceOverviewType | undefined = overviewParsed.success ? overviewParsed.data.data : undefined;

  // eBayアカウント一覧
  const accountsSchema = z.object({
    accounts: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        isActive: z.boolean(),
        sandbox: z.boolean(),
        tokenExpiresAt: z.string().nullable(),
        isExpired: z.boolean(),
        needsRefresh: z.boolean(),
        createdAt: z.string(),
      })
    ),
  });
  const { data: ebayAccountsRaw, mutate: mutateAccounts } = useSWR('/api/ebay/accounts', fetcher);
  const ebayAccountsData = accountsSchema.safeParse(ebayAccountsRaw).success
    ? (ebayAccountsRaw as z.infer<typeof accountsSchema>)
    : undefined;

  const [testingEbay, setTestingEbay] = useState(false);
  const [testingJoom, setTestingJoom] = useState(false);
  const [ebayTestResult, setEbayTestResult] = useState<z.infer<typeof connectionTestResultSchema> | null>(null);
  const [joomTestResult, setJoomTestResult] = useState<z.infer<typeof connectionTestResultSchema> | null>(null);
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
      const raw = await fetcher('/api/marketplaces/ebay/test-connection');
      const parsed = connectionTestResultSchema.safeParse(raw);
      if (parsed.success) {
        setEbayTestResult(parsed.data);
        if (parsed.data.success) {
          addToast({ type: 'success', message: 'eBay接続テスト成功' });
        } else {
          addToast({ type: 'error', message: parsed.data.message });
        }
      } else {
        addToast({ type: 'error', message: '無効なレスポンス形式です' });
      }
    } catch {
      addToast({ type: 'error', message: '接続テストに失敗しました' });
    } finally {
      setTestingEbay(false);
    }
  };

  const handleTestJoomConnection = async () => {
    setTestingJoom(true);
    setJoomTestResult(null);
    try {
      const raw = await fetcher('/api/marketplaces/joom/test-connection');
      const parsed = connectionTestResultSchema.safeParse(raw);
      if (parsed.success) {
        setJoomTestResult(parsed.data);
        if (parsed.data.success) {
          addToast({ type: 'success', message: 'Joom接続テスト成功' });
        } else {
          addToast({ type: 'error', message: parsed.data.message });
        }
      } else {
        addToast({ type: 'error', message: '無効なレスポンス形式です' });
      }
    } catch {
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
        <div className="flex items-center justify-center py-8" aria-live="polite" aria-busy="true">
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
                <div
                  className={cn(
                    'rounded-lg p-3',
                    ebayTestResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                  )}
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    {ebayTestResult.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        ebayTestResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                      )}
                    >
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
                  aria-label="eBay 接続テストを実行"
                >
                  {testingEbay ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  接続テスト
                </Button>
                <Button variant="outline" size="sm" onClick={() => mutate()} aria-label="eBay 情報を更新">
                  <RefreshCw className="h-4 w-4" />
                  更新
                </Button>
              </div>

              {/* eBay アカウント管理 */}
              <div className="border-t pt-4 dark:border-zinc-700">
                <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">接続アカウント</h4>
                {ebayAccountsData?.accounts && ebayAccountsData.accounts.length > 0 ? (
                  <div className="space-y-2">
                    {ebayAccountsData.accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              account.isActive && !account.isExpired
                                ? 'bg-emerald-500'
                                : account.isExpired
                                ? 'bg-amber-500'
                                : 'bg-zinc-400'
                            )}
                          />
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
                          aria-label={`アカウント ${account.name} を削除`}
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
                    aria-label="eBay アカウント名"
                  />
                  <Button variant="outline" size="sm" onClick={handleAddEbayAccount} aria-label="eBay アカウントを追加">
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
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{overview.joom.listings.ACTIVE || 0}件</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-600 dark:text-amber-400">販売済</p>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{overview.joom.listings.SOLD || 0}件</p>
                </div>
              </div>

              {/* Test Result */}
              {joomTestResult && (
                <div
                  className={cn(
                    'rounded-lg p-3',
                    joomTestResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
                  )}
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2">
                    {joomTestResult.success ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        joomTestResult.success ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
                      )}
                    >
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
                  aria-label="Joom 接続テストを実行"
                >
                  {testingJoom ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  接続テスト
                </Button>
                <Button variant="outline" size="sm" onClick={() => mutate()} aria-label="Joom 情報を更新">
                  <RefreshCw className="h-4 w-4" />
                  更新
                </Button>
              </div>

              {/* Shortcuts */}
              <div className="border-t pt-4 dark:border-zinc-700">
                <h4 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">設定ショートカット</h4>
                <Card className="border border-zinc-200 dark:border-zinc-700">
                  <CardContent className="p-3">
                    <Link
                      href="/settings/categories"
                      className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      aria-label="カテゴリマッピング設定を開く"
                    >
                      <div className="flex items-center gap-3">
                        <FolderTree className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">カテゴリマッピング</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-zinc-400" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default MarketplaceSettings;


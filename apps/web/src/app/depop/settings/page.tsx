'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Key,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Wifi,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const fetcher = (url: string) =>
  fetch(`${API_BASE}${url}`).then((r) => r.json());

interface DepopSettings {
  configured: boolean;
  marketplace: string;
  authType: string;
  hasApiKey: boolean;
}

interface ConnectionTestResult {
  connected: boolean;
  message: string;
}

export default function DepopSettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const { data: settings, mutate } = useSWR<DepopSettings>(
    '/api/depop/settings',
    fetcher,
  );

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKey.trim()) return;
    setIsSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/depop/settings/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveResult({ success: true, message: data.message || 'APIキーを保存しました' });
        setApiKey('');
        mutate();
      } else {
        setSaveResult({ success: false, message: data.error || '保存に失敗しました' });
      }
    } catch (error) {
      setSaveResult({ success: false, message: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  }, [apiKey, mutate]);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/depop/settings/test-connection`, {
        method: 'POST',
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ connected: false, message: '接続テストに失敗しました' });
    } finally {
      setIsTesting(false);
    }
  }, []);

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/depop">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Depop設定</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Depop Selling APIの接続設定
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">接続状態</h2>
        <div className="flex items-center gap-3">
          {settings?.configured ? (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">APIキー設定済み</p>
                <p className="text-sm text-zinc-500">Depop Partner APIに接続可能です</p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/30">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-600 dark:text-amber-400">未設定</p>
                <p className="text-sm text-zinc-500">APIキーを設定してください</p>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* API Key Setup */}
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">APIキー設定</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          Depop Partner Portalから取得したAPIキーを入力してください。
          既存のキーがある場合は上書きされます。
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              APIキー
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Bearer トークンを入力"
                  className="w-full rounded-lg border border-zinc-300 bg-white pl-10 pr-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleSaveApiKey}
                disabled={isSaving || !apiKey.trim()}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Key className="h-4 w-4 mr-1" />
                )}
                保存
              </Button>
            </div>
          </div>

          {saveResult && (
            <div className={`flex items-center gap-2 text-sm ${saveResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
              {saveResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {saveResult.message}
            </div>
          )}
        </div>
      </Card>

      {/* Connection Test */}
      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">接続テスト</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
          設定済みのAPIキーでDepop APIへの接続をテストします。
        </p>

        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !settings?.configured}
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Wifi className="h-4 w-4 mr-1" />
            )}
            接続テスト実行
          </Button>

          {testResult && (
            <div className={`flex items-center gap-2 rounded-lg p-3 ${testResult.connected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {testResult.connected ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              <span className="text-sm font-medium">{testResult.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* API Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">API情報</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">エンドポイント</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">partnerapi.depop.com/api/v1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">認証方式</span>
            <span className="text-zinc-700 dark:text-zinc-300">Bearer Token</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">レート制限</span>
            <span className="text-zinc-700 dark:text-zinc-300">10 req/sec</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">画像上限</span>
            <span className="text-zinc-700 dark:text-zinc-300">4枚/商品</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

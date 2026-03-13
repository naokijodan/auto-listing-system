'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { addToast } from '@/components/ui/toast';
import { RefreshCw, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetcher, putApi, postApi } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { systemSettingsCategoryResponseSchema } from './types';

export function SystemSettings() {
  // Load INTEGRATION settings
  const { data: integrationRaw, mutate } = useSWR('/api/system-settings/category/INTEGRATION', fetcher);
  const integrationRes = systemSettingsCategoryResponseSchema.safeParse(integrationRaw);
  const integration: Record<string, unknown> = integrationRes.success ? integrationRes.data.data : {};

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [model, setModel] = useState<string>('gpt-5-nano');
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    const v = integration?.openai_model;
    if (typeof v === 'string' && v.trim().length > 0) {
      setModel(v);
    }
  }, [integration?.openai_model]);

  const isConfigured = typeof integration?.openai_api_key === 'string' && integration.openai_api_key.trim().length > 0;

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
    } catch {
      addToast({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setSavingKey(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const raw = await postApi('/api/system-settings/openai_api_key/verify', {});
      const schema = z.object({ success: z.boolean(), message: z.string() });
      const parsed = schema.safeParse(raw);
      if (parsed.success && parsed.data.success) {
        addToast({ type: 'success', message: '接続テストに成功しました' });
      } else {
        const msg = parsed.success ? parsed.data.message : '不正なレスポンス';
        addToast({ type: 'error', message: msg || '接続テストに失敗しました' });
      }
    } catch {
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
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">OpenAI API Key</label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="新しいキーを入力..."
                className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
                aria-label="OpenAI API Key"
              />
              <Button onClick={handleSaveApiKey} disabled={savingKey} aria-label="OpenAI API Key を保存">
                {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </Button>
              <Button variant="outline" onClick={handleVerify} disabled={verifying} aria-label="OpenAI 接続を検証">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Verify
              </Button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">GPT-4oを使った翻訳・属性抽出に必要。sk-で始まるキーを入力してください。</p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">OpenAI モデル</label>
            <div className="flex gap-2">
              <Select value={model} onValueChange={(v) => setModel(v)}>
                <SelectTrigger className="w-64" aria-label="OpenAI モデルを選択">
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
              <Button onClick={handleSaveModel} disabled={savingModel} aria-label="モデル設定を保存">
                {savingModel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </Button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">翻訳に使用するモデル名（gpt-4o, gpt-4o-mini等）</p>
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
        <Button variant="outline" aria-label="システム接続テストを実行">
          <RefreshCw className="h-4 w-4" />
          接続テスト
        </Button>
      </div>
    </div>
  );
}

export default SystemSettings;

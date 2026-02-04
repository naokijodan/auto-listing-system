'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  ChevronLeft,
  X,
  Check,
  AlertCircle,
  Sparkles,
  TestTube,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetcher, postApi, patchApi, deleteApi } from '@/lib/api';
import Link from 'next/link';

interface TranslationPrompt {
  id: string;
  name: string;
  category: string | null;
  marketplace: string | null;
  systemPrompt: string;
  userPrompt: string;
  extractAttributes: string[];
  additionalInstructions: string | null;
  seoKeywords: string[];
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  _count?: { templates: number };
}

export default function PromptsPage() {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [testInput, setTestInput] = useState({ title: '', description: '' });
  const [testResult, setTestResult] = useState<any>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    marketplace: '',
    systemPrompt: 'You are a professional translator specializing in e-commerce product listings.',
    userPrompt: 'Translate the following product information to English:\n\nTitle: {{title}}\nDescription: {{description}}',
    extractAttributes: '',
    additionalInstructions: '',
    seoKeywords: '',
    priority: 0,
    isDefault: false,
  });
  const [error, setError] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR<{ data: TranslationPrompt[] }>(
    `/api/prompts?search=${encodeURIComponent(search)}`,
    fetcher
  );

  const prompts = data?.data || [];

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      marketplace: '',
      systemPrompt: 'You are a professional translator specializing in e-commerce product listings.',
      userPrompt: 'Translate the following product information to English:\n\nTitle: {{title}}\nDescription: {{description}}',
      extractAttributes: '',
      additionalInstructions: '',
      seoKeywords: '',
      priority: 0,
      isDefault: false,
    });
  };

  const handleCreate = async () => {
    setError(null);
    try {
      await postApi('/api/prompts', {
        ...formData,
        category: formData.category || null,
        marketplace: formData.marketplace || null,
        extractAttributes: formData.extractAttributes.split(',').map(s => s.trim()).filter(Boolean),
        seoKeywords: formData.seoKeywords.split(',').map(s => s.trim()).filter(Boolean),
      });
      setIsCreating(false);
      resetForm();
      mutate();
    } catch (e) {
      setError('作成に失敗しました');
    }
  };

  const handleUpdate = async (id: string) => {
    setError(null);
    try {
      await patchApi(`/api/prompts/${id}`, {
        ...formData,
        category: formData.category || null,
        marketplace: formData.marketplace || null,
        extractAttributes: formData.extractAttributes.split(',').map(s => s.trim()).filter(Boolean),
        seoKeywords: formData.seoKeywords.split(',').map(s => s.trim()).filter(Boolean),
      });
      setEditingId(null);
      mutate();
    } catch (e) {
      setError('更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この翻訳プロンプトを削除しますか？')) return;
    try {
      await deleteApi(`/api/prompts/${id}`);
      mutate();
    } catch (e) {
      setError('削除に失敗しました');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await postApi(`/api/prompts/${id}/duplicate`, {});
      mutate();
    } catch (e) {
      setError('複製に失敗しました');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const result = await postApi<any>(`/api/prompts/${id}/test`, testInput);
      setTestResult(result.data);
    } catch (e) {
      setError('テスト翻訳に失敗しました');
    }
  };

  const startEdit = (prompt: TranslationPrompt) => {
    setEditingId(prompt.id);
    setFormData({
      name: prompt.name,
      category: prompt.category || '',
      marketplace: prompt.marketplace || '',
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      extractAttributes: prompt.extractAttributes.join(', '),
      additionalInstructions: prompt.additionalInstructions || '',
      seoKeywords: prompt.seoKeywords.join(', '),
      priority: prompt.priority,
      isDefault: prompt.isDefault,
    });
  };

  const PromptForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">プロンプト名</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例: 腕時計用翻訳"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">優先度</label>
          <input
            type="number"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">対象カテゴリ</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="空欄 = 全カテゴリ"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">対象マーケットプレイス</label>
          <select
            value={formData.marketplace}
            onChange={(e) => setFormData({ ...formData, marketplace: e.target.value })}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">全マーケット</option>
            <option value="ebay">eBay</option>
            <option value="joom">Joom</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">システムプロンプト</label>
          <textarea
            value={formData.systemPrompt}
            onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">
            ユーザープロンプト
            <span className="ml-2 text-xs text-zinc-500">変数: {'{{title}}, {{description}}, {{brand}}'}</span>
          </label>
          <textarea
            value={formData.userPrompt}
            onChange={(e) => setFormData({ ...formData, userPrompt: e.target.value })}
            rows={6}
            className="w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            抽出する属性
            <span className="ml-2 text-xs text-zinc-500">カンマ区切り</span>
          </label>
          <input
            type="text"
            value={formData.extractAttributes}
            onChange={(e) => setFormData({ ...formData, extractAttributes: e.target.value })}
            placeholder="例: brand, model, color, material"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            SEOキーワード
            <span className="ml-2 text-xs text-zinc-500">カンマ区切り</span>
          </label>
          <input
            type="text"
            value={formData.seoKeywords}
            onChange={(e) => setFormData({ ...formData, seoKeywords: e.target.value })}
            placeholder="例: vintage, rare, authentic"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">追加指示</label>
          <textarea
            value={formData.additionalInstructions}
            onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
            rows={2}
            placeholder="追加の指示がある場合はここに入力"
            className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="isDefault" className="text-sm font-medium">
            デフォルトプロンプトとして設定
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setIsCreating(false);
            setEditingId(null);
            resetForm();
          }}
        >
          キャンセル
        </Button>
        <Button onClick={onSubmit}>{submitLabel}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">翻訳プロンプト</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              商品ジャンルごとの翻訳品質を最適化
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="プロンプトを検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">新規翻訳プロンプト</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptForm onSubmit={handleCreate} submitLabel="作成" />
          </CardContent>
        </Card>
      )}

      {/* Prompts List */}
      {isLoading ? (
        <div className="p-8 text-center text-zinc-500">読み込み中...</div>
      ) : prompts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-zinc-500">
            <Sparkles className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>翻訳プロンプトがありません</p>
            <p className="mt-1 text-sm">新規作成ボタンからプロンプトを追加してください</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id} className={cn(!prompt.isActive && 'opacity-60')}>
              {editingId === prompt.id ? (
                <CardContent className="pt-6">
                  <PromptForm onSubmit={() => handleUpdate(prompt.id)} submitLabel="保存" />
                </CardContent>
              ) : (
                <>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{prompt.name}</CardTitle>
                        {prompt.isDefault && (
                          <span className="flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Star className="h-3 w-3" />
                            デフォルト
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {prompt.category && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {prompt.category}
                          </span>
                        )}
                        {prompt.marketplace && (
                          <span className="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            {prompt.marketplace}
                          </span>
                        )}
                        <span
                          className={cn(
                            'rounded px-2 py-0.5 text-xs',
                            prompt.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                          )}
                        >
                          {prompt.isActive ? '有効' : '無効'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded bg-zinc-50 p-3 dark:bg-zinc-800/50">
                      <p className="mb-1 text-xs font-medium text-zinc-500">システムプロンプト</p>
                      <p className="line-clamp-2 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {prompt.systemPrompt}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {prompt.extractAttributes.map((attr) => (
                        <span
                          key={attr}
                          className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {attr}
                        </span>
                      ))}
                    </div>

                    {/* Test Translation Section */}
                    {testingId === prompt.id && (
                      <div className="space-y-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium">テスト用タイトル</label>
                            <input
                              type="text"
                              value={testInput.title}
                              onChange={(e) => setTestInput({ ...testInput, title: e.target.value })}
                              placeholder="例: セイコー プレサージュ SARX035"
                              className="h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium">テスト用説明</label>
                            <input
                              type="text"
                              value={testInput.description}
                              onChange={(e) => setTestInput({ ...testInput, description: e.target.value })}
                              placeholder="商品の説明"
                              className="h-9 w-full rounded border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                            />
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleTest(prompt.id)}>
                          <TestTube className="mr-1 h-4 w-4" />
                          翻訳テスト実行
                        </Button>

                        {testResult && (
                          <div className="rounded bg-green-50 p-3 dark:bg-green-900/20">
                            <p className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">
                              翻訳結果
                            </p>
                            <p className="text-sm text-green-800 dark:text-green-300">
                              {testResult.titleEn}
                            </p>
                            {testResult.message && (
                              <p className="mt-2 text-xs text-green-600">{testResult.message}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <button
                        onClick={() => startEdit(prompt)}
                        className="flex-1 rounded px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        <Edit2 className="mr-1 inline h-4 w-4" />
                        編集
                      </button>
                      <button
                        onClick={() =>
                          setTestingId(testingId === prompt.id ? null : prompt.id)
                        }
                        className="flex-1 rounded px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        <TestTube className="mr-1 inline h-4 w-4" />
                        テスト
                      </button>
                      <button
                        onClick={() => handleDuplicate(prompt.id)}
                        className="flex-1 rounded px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        <Copy className="mr-1 inline h-4 w-4" />
                        複製
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        className="rounded px-2 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

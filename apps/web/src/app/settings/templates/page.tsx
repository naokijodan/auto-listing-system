'use client';

import { useEffect, useState } from 'react';
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
  Eye,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetcher, postApi, patchApi, deleteApi } from '@/lib/api';
import Link from 'next/link';
import { addToast } from '@/components/ui/toast';
import {
  type Template,
  type Category,
  type Prompt,
  TemplatesResponseSchema,
  type TemplatesResponse,
} from './types';

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryMappingId: '',
    translationPromptId: '',
    profitRate: 30,
    minProfit: 500,
    titleTemplate: '{{titleEn}}',
    descriptionTemplate: '{{descriptionEn}}',
    conditionMapping: '{}',
    defaultWeight: '',
    defaultShippingDays: '7-14 business days',
  });
  const { data: templatesRaw, mutate, isLoading } = useSWR<unknown>(
    `/api/templates?search=${encodeURIComponent(search)}`,
    fetcher
  );
  const { data: categoriesData } = useSWR<{ data: Category[] }>('/api/categories', fetcher);
  const { data: promptsData } = useSWR<{ data: Prompt[] }>('/api/prompts', fetcher);

  const [validated, setValidated] = useState<TemplatesResponse | null>(null);
  useEffect(() => {
    if (!templatesRaw) return;
    const parsed = TemplatesResponseSchema.safeParse(templatesRaw);
    if (parsed.success) {
      setValidated(parsed.data);
    } else {
      setValidated(null);
      addToast('テンプレートデータの形式が不正です', 'error');
    }
  }, [templatesRaw]);

  const templates = validated?.data || [];
  const categories = categoriesData?.data || [];
  const prompts = promptsData?.data || [];

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryMappingId: '',
      translationPromptId: '',
      profitRate: 30,
      minProfit: 500,
      titleTemplate: '{{titleEn}}',
      descriptionTemplate: '{{descriptionEn}}',
      conditionMapping: '{}',
      defaultWeight: '',
      defaultShippingDays: '7-14 business days',
    });
  };

  const handleCreate = async () => {
    try {
      let conditionMapping = {};
      try {
        conditionMapping = JSON.parse(formData.conditionMapping);
      } catch {
        addToast('コンディションマッピングは有効なJSONである必要があります', 'error');
        return;
      }

      await postApi('/api/templates', {
        ...formData,
        categoryMappingId: formData.categoryMappingId || null,
        translationPromptId: formData.translationPromptId || null,
        defaultWeight: formData.defaultWeight ? parseInt(formData.defaultWeight) : null,
        conditionMapping,
      });
      setIsCreating(false);
      resetForm();
      mutate();
    } catch (e) {
      addToast('作成に失敗しました', 'error');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      let conditionMapping = {};
      try {
        conditionMapping = JSON.parse(formData.conditionMapping);
      } catch {
        addToast('コンディションマッピングは有効なJSONである必要があります', 'error');
        return;
      }

      await patchApi(`/api/templates/${id}`, {
        ...formData,
        categoryMappingId: formData.categoryMappingId || null,
        translationPromptId: formData.translationPromptId || null,
        defaultWeight: formData.defaultWeight ? parseInt(formData.defaultWeight) : null,
        conditionMapping,
      });
      setEditingId(null);
      mutate();
    } catch (e) {
      addToast('更新に失敗しました', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return;
    try {
      await deleteApi(`/api/templates/${id}`);
      mutate();
    } catch (e) {
      addToast('削除に失敗しました', 'error');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await postApi(`/api/templates/${id}/duplicate`, {});
      mutate();
    } catch (e) {
      addToast('複製に失敗しました', 'error');
    }
  };

  const startEdit = (template: Template) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      description: template.description || '',
      categoryMappingId: template.categoryMappingId || '',
      translationPromptId: template.translationPromptId || '',
      profitRate: template.profitRate,
      minProfit: template.minProfit,
      titleTemplate: template.titleTemplate || '',
      descriptionTemplate: template.descriptionTemplate || '',
      conditionMapping: JSON.stringify(template.conditionMapping, null, 2),
      defaultWeight: template.defaultWeight?.toString() || '',
      defaultShippingDays: template.defaultShippingDays || '',
    });
  };

  const TemplateForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">テンプレート名</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="例: 腕時計用テンプレート"
            aria-label="テンプレート名"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">説明</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="テンプレートの説明"
            aria-label="説明"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">カテゴリマッピング</label>
          <select
            value={formData.categoryMappingId}
            onChange={(e) => setFormData({ ...formData, categoryMappingId: e.target.value })}
            aria-label="カテゴリマッピング"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">選択なし</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.sourceCategory} → {cat.ebayCategoryName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">翻訳プロンプト</label>
          <select
            value={formData.translationPromptId}
            onChange={(e) => setFormData({ ...formData, translationPromptId: e.target.value })}
            aria-label="翻訳プロンプト"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">選択なし</option>
            {prompts.map((prompt) => (
              <option key={prompt.id} value={prompt.id}>
                {prompt.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">目標利益率 (%)</label>
          <input
            type="number"
            value={formData.profitRate}
            onChange={(e) => setFormData({ ...formData, profitRate: parseFloat(e.target.value) })}
            aria-label="目標利益率"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">最低利益額 (円)</label>
          <input
            type="number"
            value={formData.minProfit}
            onChange={(e) => setFormData({ ...formData, minProfit: parseFloat(e.target.value) })}
            aria-label="最低利益額"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">デフォルト重量 (g)</label>
          <input
            type="number"
            value={formData.defaultWeight}
            onChange={(e) => setFormData({ ...formData, defaultWeight: e.target.value })}
            placeholder="例: 200"
            aria-label="デフォルト重量"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">配送日数</label>
          <input
            type="text"
            value={formData.defaultShippingDays}
            onChange={(e) => setFormData({ ...formData, defaultShippingDays: e.target.value })}
            placeholder="例: 7-14 business days"
            aria-label="配送日数"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">
            タイトルテンプレート
            <span className="ml-2 text-xs text-zinc-500">変数: {'{{title}}, {{titleEn}}, {{brand}}'}</span>
          </label>
          <input
            type="text"
            value={formData.titleTemplate}
            onChange={(e) => setFormData({ ...formData, titleTemplate: e.target.value })}
            aria-label="タイトルテンプレート"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-mono dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">説明文テンプレート</label>
          <textarea
            value={formData.descriptionTemplate}
            onChange={(e) => setFormData({ ...formData, descriptionTemplate: e.target.value })}
            rows={3}
            aria-label="説明文テンプレート"
            className="w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium">
            コンディションマッピング (JSON)
            <span className="ml-2 text-xs text-zinc-500">例: {'{\"新品\":\"New\", \"未使用に近い\":\"Like New\"}'}</span>
          </label>
          <textarea
            value={formData.conditionMapping}
            onChange={(e) => setFormData({ ...formData, conditionMapping: e.target.value })}
            rows={3}
            aria-label="コンディションマッピングJSON"
            className="w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          aria-label="キャンセル"
          variant="outline"
          onClick={() => {
            setIsCreating(false);
            setEditingId(null);
            resetForm();
          }}
        >
          キャンセル
        </Button>
        <Button aria-label={submitLabel} onClick={onSubmit}>{submitLabel}</Button>
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
            aria-label="設定に戻る"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">出品テンプレート</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              商品タイプごとの出品設定プリセット
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setIsCreating(true)} aria-label="新規テンプレートを作成">
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="テンプレートを検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="テンプレートを検索"
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">新規テンプレート</CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateForm onSubmit={handleCreate} submitLabel="作成" />
          </CardContent>
        </Card>
      )}

      {/* Templates List */}
      {isLoading ? (
        <div className="p-8 text-center text-zinc-500" aria-busy="true">読み込み中...</div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-zinc-500">
            <Layers className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>テンプレートがありません</p>
            <p className="mt-1 text-sm">新規作成ボタンからテンプレートを追加してください</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list" aria-label="テンプレート一覧">
          {templates.map((template) => (
            <Card key={template.id} className={cn(!template.isActive && 'opacity-60')} role="listitem">
              {editingId === template.id ? (
                <CardContent className="pt-6">
                  <TemplateForm onSubmit={() => handleUpdate(template.id)} submitLabel="保存" />
                </CardContent>
              ) : (
                <>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        {template.description && (
                          <p className="mt-1 text-sm text-zinc-500">{template.description}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'rounded px-2 py-0.5 text-xs',
                          template.isActive
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                        )}
                      >
                        {template.isActive ? '有効' : '無効'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-zinc-500">利益率</span>
                        <p className="font-medium">{template.profitRate}%</p>
                      </div>
                      <div>
                        <span className="text-zinc-500">最低利益</span>
                        <p className="font-medium">¥{template.minProfit.toLocaleString()}</p>
                      </div>
                    </div>
                    {template.categoryMapping && (
                      <div className="text-sm">
                        <span className="text-zinc-500">カテゴリ: </span>
                        <span>{template.categoryMapping.sourceCategory}</span>
                      </div>
                    )}
                    {template.translationPrompt && (
                      <div className="text-sm">
                        <span className="text-zinc-500">翻訳: </span>
                        <span>{template.translationPrompt.name}</span>
                      </div>
                    )}
                    <div className="flex gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <button
                        onClick={() => startEdit(template)}
                        className="flex-1 rounded px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        aria-label="編集"
                      >
                        <Edit2 className="mr-1 inline h-4 w-4" />
                        編集
                      </button>
                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="flex-1 rounded px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        aria-label="複製"
                      >
                        <Copy className="mr-1 inline h-4 w-4" />
                        複製
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="rounded px-2 py-1.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        aria-label="削除"
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

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
  Download,
  Upload,
  ChevronLeft,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetcher, postApi, patchApi, deleteApi } from '@/lib/api';
import Link from 'next/link';

interface CategoryMapping {
  id: string;
  sourceCategory: string;
  ebayCategoryId: string;
  ebayCategoryName: string;
  itemSpecifics: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { templates: number };
}

interface ApiResponse {
  success: boolean;
  data: CategoryMapping[];
  pagination: { total: number; limit: number; offset: number };
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    sourceCategory: '',
    ebayCategoryId: '',
    ebayCategoryName: '',
    itemSpecifics: '{}',
  });
  const [error, setError] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR<ApiResponse>(
    `/api/categories?search=${encodeURIComponent(search)}`,
    fetcher
  );

  const categories = data?.data || [];

  const handleCreate = async () => {
    setError(null);
    try {
      let itemSpecifics = {};
      try {
        itemSpecifics = JSON.parse(formData.itemSpecifics);
      } catch {
        setError('Item Specificsは有効なJSONである必要があります');
        return;
      }

      await postApi('/api/categories', {
        ...formData,
        itemSpecifics,
      });
      setIsCreating(false);
      setFormData({ sourceCategory: '', ebayCategoryId: '', ebayCategoryName: '', itemSpecifics: '{}' });
      mutate();
    } catch (e) {
      setError('作成に失敗しました');
    }
  };

  const handleUpdate = async (id: string) => {
    setError(null);
    try {
      let itemSpecifics = {};
      try {
        itemSpecifics = JSON.parse(formData.itemSpecifics);
      } catch {
        setError('Item Specificsは有効なJSONである必要があります');
        return;
      }

      await patchApi(`/api/categories/${id}`, {
        ...formData,
        itemSpecifics,
      });
      setEditingId(null);
      mutate();
    } catch (e) {
      setError('更新に失敗しました');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このカテゴリマッピングを削除しますか？')) return;
    try {
      await deleteApi(`/api/categories/${id}`);
      mutate();
    } catch (e) {
      setError('削除に失敗しました');
    }
  };

  const startEdit = (category: CategoryMapping) => {
    setEditingId(category.id);
    setFormData({
      sourceCategory: category.sourceCategory,
      ebayCategoryId: category.ebayCategoryId,
      ebayCategoryName: category.ebayCategoryName,
      itemSpecifics: JSON.stringify(category.itemSpecifics, null, 2),
    });
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/categories/export/json');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'category_mappings.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      setError('エクスポートに失敗しました');
    }
  };

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
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">カテゴリマッピング</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              日本語カテゴリとeBayカテゴリの紐付けを管理
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            エクスポート
          </Button>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Button>
        </div>
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
          placeholder="カテゴリを検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {/* Create Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">新規カテゴリマッピング</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">日本語カテゴリ</label>
                <input
                  type="text"
                  value={formData.sourceCategory}
                  onChange={(e) => setFormData({ ...formData, sourceCategory: e.target.value })}
                  placeholder="例: 腕時計"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">eBayカテゴリID</label>
                <input
                  type="text"
                  value={formData.ebayCategoryId}
                  onChange={(e) => setFormData({ ...formData, ebayCategoryId: e.target.value })}
                  placeholder="例: 31387"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">eBayカテゴリ名</label>
                <input
                  type="text"
                  value={formData.ebayCategoryName}
                  onChange={(e) => setFormData({ ...formData, ebayCategoryName: e.target.value })}
                  placeholder="例: Wristwatches"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium">Item Specifics (JSON)</label>
                <textarea
                  value={formData.itemSpecifics}
                  onChange={(e) => setFormData({ ...formData, itemSpecifics: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                キャンセル
              </Button>
              <Button onClick={handleCreate}>作成</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-500">読み込み中...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              カテゴリマッピングがありません
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {categories.map((category) => (
                <div key={category.id} className="p-4">
                  {editingId === category.id ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium">日本語カテゴリ</label>
                          <input
                            type="text"
                            value={formData.sourceCategory}
                            onChange={(e) => setFormData({ ...formData, sourceCategory: e.target.value })}
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium">eBayカテゴリID</label>
                          <input
                            type="text"
                            value={formData.ebayCategoryId}
                            onChange={(e) => setFormData({ ...formData, ebayCategoryId: e.target.value })}
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-sm font-medium">eBayカテゴリ名</label>
                          <input
                            type="text"
                            value={formData.ebayCategoryName}
                            onChange={(e) => setFormData({ ...formData, ebayCategoryName: e.target.value })}
                            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-sm font-medium">Item Specifics (JSON)</label>
                          <textarea
                            value={formData.itemSpecifics}
                            onChange={(e) => setFormData({ ...formData, itemSpecifics: e.target.value })}
                            rows={4}
                            className="w-full rounded-lg border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                          <X className="mr-1 h-4 w-4" />
                          キャンセル
                        </Button>
                        <Button size="sm" onClick={() => handleUpdate(category.id)}>
                          <Check className="mr-1 h-4 w-4" />
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-zinc-900 dark:text-white">
                            {category.sourceCategory}
                          </span>
                          <span className="text-zinc-400">→</span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {category.ebayCategoryName}
                          </span>
                          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                            {category.ebayCategoryId}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          {category._count && (
                            <span>テンプレート: {category._count.templates}件</span>
                          )}
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5',
                              category.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                            )}
                          >
                            {category.isActive ? '有効' : '無効'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(category)}
                          className="rounded p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="rounded p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {data?.pagination && (
        <p className="text-center text-sm text-zinc-500">
          全 {data.pagination.total} 件
        </p>
      )}
    </div>
  );
}

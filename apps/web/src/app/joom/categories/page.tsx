'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { addToast } from '@/components/ui/toast';
import { cn, formatNumber } from '@/lib/utils';
import {
  FolderTree,
  Sparkles,
  ShieldCheck,
  Edit,
  Trash2,
  RefreshCw,
  Loader2,
  Filter,
  Lightbulb,
  Tag,
  Plus,
  CheckCircle,
} from 'lucide-react';

// Types matching API responses
interface JoomCategory {
  id: string;
  name: string;
  path: string;
}

interface MappingItem {
  id: string;
  sourceKeywords: string[];
  sourceBrand?: string | null;
  joomCategoryId: string;
  joomCategoryName: string;
  joomCategoryPath: string;
  requiredAttributes?: Record<string, unknown> | null;
  recommendedAttributes?: Record<string, unknown> | null;
  priority?: number | null;
  aiConfidence?: number | null;
  aiSuggested?: boolean | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  usageCount?: number | null;
  lastUsedAt?: string | null;
}

interface MappingsResponse {
  success: boolean;
  data: MappingItem[];
  total: number;
}

interface StatsResponse {
  success: boolean;
  data: {
    totalMappings: number;
    verifiedMappings: number;
    aiSuggestedMappings: number;
    verificationRate: string | number;
    topCategories: Array<{ categoryId: string; categoryName: string; usageCount: number }>;
  };
}

type FilterTab = 'all' | 'verified' | 'unverified' | 'ai';

function confidenceColor(v: number | undefined | null) {
  if (!v && v !== 0) return 'bg-zinc-900 dark:bg-zinc-50';
  if (v >= 0.85) return 'bg-emerald-500';
  if (v >= 0.7) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function JoomCategoriesPage() {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [editing, setEditing] = useState<MappingItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestInput, setSuggestInput] = useState({
    title: '',
    description: '',
    category: '',
    brand: '',
  });
  const [suggestResult, setSuggestResult] = useState<
    | null
    | {
        joomCategoryId: string;
        joomCategoryName: string;
        joomCategoryPath: string;
        confidence: number;
        reasoning?: string;
      }
  >(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // Fetch stats and categories
  const { data: stats } = useSWR<StatsResponse>('/api/joom-categories/stats', fetcher);
  const { data: categories } = useSWR<{ success: boolean; data: JoomCategory[] }>(
    '/api/joom-categories',
    fetcher
  );

  // Build mappings URL by filter
  const mappingsUrl = useMemo(() => {
    const base = '/api/joom-categories/mappings';
    const params = new URLSearchParams({ limit: '50', offset: '0' });
    if (filter === 'verified') params.set('verified', 'true');
    if (filter === 'ai') params.set('aiSuggested', 'true');
    // 未承認はAPIクエリがないため全件取得後にクライアントで絞り込む
    return `${base}?${params.toString()}`;
  }, [filter]);

  const { data: mappingsRes, mutate } = useSWR<MappingsResponse>(mappingsUrl, fetcher);
  const rawMappings = mappingsRes?.data || [];
  const mappings = useMemo(() => {
    if (filter !== 'unverified') return rawMappings;
    return rawMappings.filter((m) => !m.verifiedAt);
  }, [filter, rawMappings]);

  // Actions
  async function handleVerify(id: string) {
    try {
      await postApi(`/api/joom-categories/mappings/${id}/verify`, { verifiedBy: 'admin' });
      addToast({ type: 'success', message: 'マッピングを承認しました' });
      mutate();
    } catch (e) {
      addToast({ type: 'error', message: '承認に失敗しました' });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteApi(`/api/joom-categories/mappings/${id}`);
      addToast({ type: 'success', message: 'マッピングを削除しました' });
      mutate();
    } catch (e) {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  }

  // Create / Edit helpers
  function getCategoryById(id?: string | null) {
    return categories?.data.find((c) => c.id === id);
  }

  async function handleCreate(form: {
    sourceKeywords: string;
    sourceBrand?: string;
    joomCategoryId: string;
    priority?: number;
  }) {
    const cat = getCategoryById(form.joomCategoryId);
    if (!cat) {
      addToast({ type: 'error', message: 'カテゴリを選択してください' });
      return;
    }
    const payload = {
      sourceKeywords: form.sourceKeywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      sourceBrand: form.sourceBrand?.trim() || undefined,
      joomCategoryId: cat.id,
      joomCategoryName: cat.name,
      joomCategoryPath: cat.path,
      priority: form.priority ? Number(form.priority) : 0,
    } as const;
    setIsSubmitting(true);
    try {
      await postApi('/api/joom-categories/mappings', payload);
      addToast({ type: 'success', message: 'マッピングを作成しました' });
      setCreatingOpen(false);
      mutate();
    } catch (_) {
      addToast({ type: 'error', message: '作成に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditSubmit(form: {
    id: string;
    sourceKeywords: string;
    sourceBrand?: string;
    joomCategoryId: string;
    priority?: number;
  }) {
    const cat = getCategoryById(form.joomCategoryId);
    if (!cat) {
      addToast({ type: 'error', message: 'カテゴリを選択してください' });
      return;
    }
    const payload = {
      sourceKeywords: form.sourceKeywords
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      sourceBrand: form.sourceBrand?.trim() || null,
      joomCategoryId: cat.id,
      joomCategoryName: cat.name,
      joomCategoryPath: cat.path,
      priority: form.priority ? Number(form.priority) : 0,
    };
    setIsSubmitting(true);
    try {
      await putApi(`/api/joom-categories/mappings/${form.id}`, payload);
      addToast({ type: 'success', message: 'マッピングを更新しました' });
      setEditing(null);
      mutate();
    } catch (_) {
      addToast({ type: 'error', message: '更新に失敗しました' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSuggest() {
    if (!suggestInput.title || !suggestInput.description) {
      addToast({ type: 'error', message: '商品名と説明は必須です' });
      return;
    }
    setSuggestLoading(true);
    setSuggestResult(null);
    try {
      const res = await postApi<
        | { success: true; data: { suggestion: { joomCategoryId: string; joomCategoryName: string; joomCategoryPath: string; confidence: number; reasoning?: string } } }
        | { success: true; data: { existingMapping: MappingItem } }
      >('/api/joom-categories/suggest', {
        title: suggestInput.title,
        description: suggestInput.description,
        category: suggestInput.category || undefined,
        brand: suggestInput.brand || undefined,
      });

      if ('data' in res && 'suggestion' in (res as any).data) {
        const s = (res as any).data.suggestion;
        setSuggestResult(s);
        addToast({ type: 'success', message: 'AI提案を取得しました' });
      } else if ('data' in res && 'existingMapping' in (res as any).data) {
        const m: MappingItem = (res as any).data.existingMapping;
        setSuggestResult({
          joomCategoryId: m.joomCategoryId,
          joomCategoryName: m.joomCategoryName,
          joomCategoryPath: m.joomCategoryPath,
          confidence: m.aiConfidence || 1,
          reasoning: '既存マッピングが見つかりました',
        });
        addToast({ type: 'info', message: '既存マッピングを表示します' });
      }
    } catch (_) {
      addToast({ type: 'error', message: 'AI提案の取得に失敗しました' });
    } finally {
      setSuggestLoading(false);
    }
  }

  const totalMappings = stats?.data.totalMappings || 0;
  const verifiedMappings = stats?.data.verifiedMappings || 0;
  const aiSuggestedMappings = stats?.data.aiSuggestedMappings || 0;
  const verificationRate = typeof stats?.data.verificationRate === 'number'
    ? `${stats?.data.verificationRate}%`
    : stats?.data.verificationRate || '0%';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-pink-500">
            <FolderTree className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Joomカテゴリマッピング</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">管理とAI提案の検証</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={creatingOpen} onOpenChange={setCreatingOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" /> 新規マッピング
              </Button>
            </DialogTrigger>
            <CreateEditDialog
              mode="create"
              categories={categories?.data || []}
              onSubmit={handleCreate}
              isSubmitting={isSubmitting}
            />
          </Dialog>
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <FolderTree className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">総マッピング数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{formatNumber(totalMappings)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">承認済み</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(verifiedMappings)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">AI提案</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(aiSuggestedMappings)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">承認率</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{verificationRate}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4 text-zinc-500" />
          <button
            className={cn(
              'rounded-md px-3 py-1',
              filter === 'all'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200'
            )}
            onClick={() => setFilter('all')}
          >
            全て
          </button>
          <button
            className={cn(
              'rounded-md px-3 py-1',
              filter === 'verified'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200'
            )}
            onClick={() => setFilter('verified')}
          >
            承認済み
          </button>
          <button
            className={cn(
              'rounded-md px-3 py-1',
              filter === 'unverified'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200'
            )}
            onClick={() => setFilter('unverified')}
          >
            未承認
          </button>
          <button
            className={cn(
              'rounded-md px-3 py-1',
              filter === 'ai'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200'
            )}
            onClick={() => setFilter('ai')}
          >
            AI提案のみ
          </button>
        </div>
      </Card>

      {/* Mappings Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
              <TableHead className="w-[22%]">ソースキーワード</TableHead>
              <TableHead className="w-[10%]">ブランド</TableHead>
              <TableHead className="w-[28%]">Joomカテゴリ</TableHead>
              <TableHead className="w-[18%]">信頼度</TableHead>
              <TableHead className="w-[10%] text-right">使用回数</TableHead>
              <TableHead className="w-[8%]">承認</TableHead>
              <TableHead className="w-[14%]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((m) => (
              <TableRow key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(m.sourceKeywords || []).map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        <Tag className="h-3 w-3" /> {k}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-zinc-700 dark:text-zinc-300">
                  {m.sourceBrand ? (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">{m.sourceBrand}</span>
                  ) : (
                    <span className="text-xs text-zinc-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">{m.joomCategoryName}</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{m.joomCategoryPath}</span>
                  </div>
                </TableCell>
                <TableCell className="min-w-[160px]">
                  <div className="flex items-center gap-3">
                    {/* Custom colored progress based on thresholds */}
                    <div className="h-2 w-36 rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className={cn('h-2 rounded-full', confidenceColor(m.aiConfidence ?? 0))}
                        style={{ width: `${Math.min(100, Math.max(0, Math.round((m.aiConfidence ?? 0) * 100)))}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                      {typeof m.aiConfidence === 'number' ? `${Math.round(m.aiConfidence * 100)}%` : '-'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {m.usageCount ?? 0}
                </TableCell>
                <TableCell>
                  {m.verifiedAt ? (
                    <Badge variant="success">承認済み</Badge>
                  ) : (
                    <Badge>未承認</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {!m.verifiedAt && (
                      <Button size="sm" variant="outline" onClick={() => handleVerify(m.id)}>
                        <ShieldCheck className="h-4 w-4" /> 承認
                      </Button>
                    )}
                    <Dialog open={editing?.id === m.id} onOpenChange={(o) => !o && setEditing(null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>
                          <Edit className="h-4 w-4" /> 編集
                        </Button>
                      </DialogTrigger>
                      {editing && editing.id === m.id && (
                        <CreateEditDialog
                          mode="edit"
                          initial={editing}
                          categories={categories?.data || []}
                          onSubmit={(form) => handleEditSubmit({ ...form, id: m.id })}
                          isSubmitting={isSubmitting}
                        />
                      )}
                    </Dialog>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="h-4 w-4" /> 削除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {mappings.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* AI Suggestion Tester */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">AI提案テスト</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">商品名</label>
            <input
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              value={suggestInput.title}
              onChange={(e) => setSuggestInput((s) => ({ ...s, title: e.target.value }))}
              placeholder="例: Apple Watch Series 8"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">ブランド（任意）</label>
            <input
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              value={suggestInput.brand}
              onChange={(e) => setSuggestInput((s) => ({ ...s, brand: e.target.value }))}
              placeholder="例: Apple"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">説明</label>
            <textarea
              className="min-h-[80px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              value={suggestInput.description}
              onChange={(e) => setSuggestInput((s) => ({ ...s, description: e.target.value }))}
              placeholder="商品の特徴や仕様を入力"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">カテゴリ（任意）</label>
            <input
              className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              value={suggestInput.category}
              onChange={(e) => setSuggestInput((s) => ({ ...s, category: e.target.value }))}
              placeholder="例: Wearables"
            />
          </div>
          <div className="flex items-end justify-end">
            <Button onClick={handleSuggest} disabled={suggestLoading}>
              {suggestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              AI提案を取得
            </Button>
          </div>
        </div>

        {suggestResult && (
          <div className="mt-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">推奨カテゴリ: {suggestResult.joomCategoryName}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{suggestResult.joomCategoryPath}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-36 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={cn('h-2 rounded-full', confidenceColor(suggestResult.confidence))}
                    style={{ width: `${Math.round(suggestResult.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                  {Math.round(suggestResult.confidence * 100)}%
                </span>
              </div>
            </div>
            {suggestResult.reasoning && (
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">理由: {suggestResult.reasoning}</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// Create/Edit Dialog Component
function CreateEditDialog({
  mode,
  categories,
  onSubmit,
  isSubmitting,
  initial,
}: {
  mode: 'create' | 'edit';
  categories: JoomCategory[];
  onSubmit: (form: { sourceKeywords: string; sourceBrand?: string; joomCategoryId: string; priority?: number }) => void;
  isSubmitting: boolean;
  initial?: MappingItem | null;
}) {
  const [form, setForm] = useState({
    sourceKeywords: initial ? (initial.sourceKeywords || []).join(', ') : '',
    sourceBrand: initial?.sourceBrand || '',
    joomCategoryId: initial?.joomCategoryId || '',
    priority: initial?.priority ?? 0,
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? '手動マッピング作成' : 'マッピング編集'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">ソースキーワード（カンマ区切り）</label>
          <input
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.sourceKeywords}
            onChange={(e) => setForm((f) => ({ ...f, sourceKeywords: e.target.value }))}
            placeholder="例: apple watch, smartwatch"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">ブランド（任意）</label>
          <input
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.sourceBrand}
            onChange={(e) => setForm((f) => ({ ...f, sourceBrand: e.target.value }))}
            placeholder="例: Apple"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">Joomカテゴリ</label>
          <select
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.joomCategoryId}
            onChange={(e) => setForm((f) => ({ ...f, joomCategoryId: e.target.value }))}
          >
            <option value="">選択してください</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.path}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500 dark:text-zinc-400">優先度（数値）</label>
          <input
            type="number"
            className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.priority}
            onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
            placeholder="例: 10"
          />
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button
          onClick={() => onSubmit(form)}
          disabled={isSubmitting || !form.sourceKeywords || !form.joomCategoryId}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === 'create' ? '作成' : '更新'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

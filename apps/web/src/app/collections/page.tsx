'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher, postApi, patchApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Plus, RefreshCw, Play, Edit, Trash2, Calendar, Search, Store } from 'lucide-react';

type Collection = {
  id: string;
  name: string;
  sourceType: 'RAKUTEN' | 'AMAZON';
  searchQuery?: string | null;
  searchUrl?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  category?: string | null;
  brand?: string | null;
  aiFilterEnabled: boolean;
  minConfidence: number;
  autoApprove: boolean;
  isScheduled: boolean;
  scheduleCron?: string | null;
  limit: number;
  totalCollected: number;
  totalApproved: number;
  totalRejected: number;
  lastRunAt?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export default function CollectionsPage() {
  const { data, isLoading, mutate } = useSWR<{ success: boolean; data: Collection[] }>(
    '/api/search-collections',
    fetcher
  );
  const collections = data?.data || [];

  const stats = useMemo(() => {
    const active = collections.filter((c) => c.status === 'ACTIVE').length;
    const totalCollected = collections.reduce((s, c) => s + (c.totalCollected || 0), 0);
    const totalApproved = collections.reduce((s, c) => s + (c.totalApproved || 0), 0);
    const approveRate = totalCollected > 0 ? Math.round((totalApproved / totalCollected) * 100) : 0;
    return { active, totalCollected, approveRate, totalApproved };
  }, [collections]);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sourceType: 'RAKUTEN' as 'RAKUTEN' | 'AMAZON',
    searchQuery: '',
    minPrice: '',
    maxPrice: '',
    category: '',
    brand: '',
    aiFilterEnabled: true,
    minConfidence: 0.7,
    autoApprove: false,
    limit: 50,
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      await postApi('/api/search-collections', {
        name: form.name.trim(),
        sourceType: form.sourceType,
        searchQuery: form.searchQuery.trim(),
        minPrice: form.minPrice ? Number(form.minPrice) : undefined,
        maxPrice: form.maxPrice ? Number(form.maxPrice) : undefined,
        category: form.category || undefined,
        brand: form.brand || undefined,
        aiFilterEnabled: form.aiFilterEnabled,
        minConfidence: form.minConfidence,
        autoApprove: form.autoApprove,
        limit: form.limit,
      });
      addToast({ type: 'success', message: 'コレクションを作成しました' });
      setCreating(false);
      setForm({ ...form, name: '', searchQuery: '' });
      mutate();
    } catch (e) {
      addToast({ type: 'error', message: '作成に失敗しました' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRun(id: string) {
    try {
      await postApi(`/api/search-collections/${id}/run`, {});
      addToast({ type: 'success', message: '収集を開始しました' });
      mutate();
    } catch {
      addToast({ type: 'error', message: '収集開始に失敗しました' });
    }
  }

  async function handleToggleSchedule(c: Collection) {
    try {
      await patchApi(`/api/search-collections/${c.id}`, { isScheduled: !c.isScheduled });
      mutate();
    } catch {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このコレクションを削除しますか？')) return;
    try {
      await deleteApi(`/api/search-collections/${id}`);
      addToast({ type: 'success', message: '削除しました' });
      mutate();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
            <Search className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">検索収集</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{isLoading ? '読込中…' : `${collections.length} 件のコレクション`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => mutate()} aria-label="更新">
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> 新規コレクション
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">アクティブ</p>
          <p className="text-2xl font-bold">{stats.active}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">収集合計</p>
          <p className="text-2xl font-bold">{stats.totalCollected}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">承認率</p>
          <p className="text-2xl font-bold">{stats.approveRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">AI選別済み</p>
          <p className="text-2xl font-bold">{stats.totalApproved}</p>
        </Card>
      </div>

      {/* Collections list */}
      <div className="grid grid-cols-1 gap-3">
        {collections.map((c) => (
          <Card key={c.id} className="flex items-center justify-between p-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Store className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-lg font-semibold">{c.name}</p>
                  <Badge variant="secondary">{c.sourceType === 'RAKUTEN' ? '楽天' : 'Amazon'}</Badge>
                </div>
                <p className="truncate text-sm text-zinc-500">{c.searchQuery || c.searchUrl}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>収集: {c.totalCollected}</span>
                  <span>承認: {c.totalApproved}</span>
                  <span>除外: {c.totalRejected}</span>
                  <span>最終実行: {c.lastRunAt ? new Date(c.lastRunAt).toLocaleString() : '-'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleRun(c.id)}>
                <Play className="mr-2 h-4 w-4" /> 実行
              </Button>
              <Button size="sm" variant="outline" onClick={() => addToast({ type: 'info', message: '編集は近日対応' })}>
                <Edit className="mr-2 h-4 w-4" /> 編集
              </Button>
              <Button
                size="sm"
                variant={c.isScheduled ? 'default' : 'outline'}
                onClick={() => handleToggleSchedule(c)}
              >
                <Calendar className="mr-2 h-4 w-4" /> {c.isScheduled ? 'スケジュールON' : 'スケジュールOFF'}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> 削除
              </Button>
            </div>
          </Card>
        ))}
        {!isLoading && collections.length === 0 && (
          <Card className="p-8 text-center text-zinc-500">コレクションがありません。右上のボタンから作成してください。</Card>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>コレクション作成</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <Label>名前</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="例: セイコー 時計 楽天" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ソース</Label>
                <Select value={form.sourceType} onValueChange={(v: 'RAKUTEN' | 'AMAZON') => setForm({ ...form, sourceType: v })}>
                  <SelectTrigger><SelectValue placeholder="選択" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAKUTEN">RAKUTEN</SelectItem>
                    <SelectItem value="AMAZON">AMAZON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>取得上限数</Label>
                <Input type="number" min={1} max={200} value={form.limit} onChange={(e) => setForm({ ...form, limit: Number(e.target.value || 0) })} />
              </div>
            </div>
            <div>
              <Label>検索キーワード</Label>
              <Input value={form.searchQuery} onChange={(e) => setForm({ ...form, searchQuery: e.target.value })} placeholder="例: セイコー 腕時計" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>最低価格</Label>
                <Input type="number" inputMode="numeric" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} />
              </div>
              <div>
                <Label>最高価格</Label>
                <Input type="number" inputMode="numeric" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>カテゴリ</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <Label>ブランド</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
            </div>
            <div className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between">
                <Label>AI選別を有効化</Label>
                <Switch checked={form.aiFilterEnabled} onCheckedChange={(v) => setForm({ ...form, aiFilterEnabled: v })} />
              </div>
              {form.aiFilterEnabled && (
                <div className="grid gap-2">
                  <div>
                    <Label className="mb-1 block">最低信頼度: {Math.round(form.minConfidence * 100)}%</Label>
                    <Slider value={[form.minConfidence]} min={0} max={1} step={0.05} onValueChange={([v]) => setForm({ ...form, minConfidence: v })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>自動承認</Label>
                    <Switch checked={form.autoApprove} onCheckedChange={(v) => setForm({ ...form, autoApprove: v })} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>キャンセル</Button>
            <Button onClick={handleCreate} disabled={submitting || !form.name.trim() || !form.searchQuery.trim()}>
              {submitting ? '作成中…' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


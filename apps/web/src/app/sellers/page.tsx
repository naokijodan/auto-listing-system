'use client';

import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { fetcher, postApi, patchApi, deleteApi, API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { addToast } from '@/components/ui/toast';
import { Users, Plus, Loader2, Play, Trash2, RefreshCw, BadgeHelp } from 'lucide-react';

type Seller = {
  id: string;
  sourceType: string;
  sellerId: string;
  sellerName?: string | null;
  sellerUrl: string;
  rating?: number | null;
  ratingCount?: number | null;
  productCount?: number | null;
  lastScrapedAt?: string | null;
  isMonitored: boolean;
  createdAt: string;
  updatedAt: string;
};

type SellerBatchJob = {
  id: string;
  jobId?: string | null;
  sourceType: string;
  sellerUrl: string;
  sellerName?: string | null;
  limit: number;
  productsFound: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  status: string; // QUEUED, PROCESSING, COMPLETED, FAILED
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  seller?: { id: string; sellerName?: string | null; sourceType: string } | null;
  queueState?: string | null;
  progress?: { total: number; processed: number; created: number; updated: number; skipped: number; failed: number } | null;
};

function formatDate(d?: string | null) {
  if (!d) return '-';
  try { return new Date(d).toLocaleString(); } catch { return d || '-'; }
}

function sourceBadge(type: string) {
  const t = type.toUpperCase();
  const color =
    t === 'MERCARI' ? 'bg-red-100 text-red-700' :
    t === 'YAHOO_AUCTION' ? 'bg-yellow-100 text-yellow-700' :
    t === 'YAHOO_FLEA' ? 'bg-amber-100 text-amber-700' :
    t === 'RAKUMA' ? 'bg-green-100 text-green-700' :
    t === 'RAKUTEN' ? 'bg-indigo-100 text-indigo-700' :
    t === 'AMAZON' ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-700';
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${color}`}>{t}</span>;
}

function detectSourceType(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.host;
    if (host.includes('mercari')) return 'MERCARI';
    if (host.includes('yahoo.co.jp') || host.includes('auctions.yahoo')) return 'YAHOO_AUCTION';
    if (host.includes('paypay')) return 'YAHOO_FLEA';
    if (host.includes('rakuma')) return 'RAKUMA';
    if (host.includes('rakuten')) return 'RAKUTEN';
    if (host.includes('amazon')) return 'AMAZON';
  } catch {}
  return null;
}

export default function SellersPage() {
  const [page] = useState(1);
  const [limit] = useState(50);
  const { data: sellersRes, isLoading: loadingSellers, mutate: mutateSellers } = useSWR<{ success: boolean; data: Seller[]; pagination?: any }>(
    `/api/sellers?page=${page}&limit=${limit}`,
    fetcher
  );
  const sellers = sellersRes?.data || [];

  const { data: jobsRes, isLoading: loadingJobs, mutate: mutateJobs } = useSWR<{ success: boolean; data: SellerBatchJob[]; pagination?: any }>(
    `/api/sellers/batch-jobs?limit=100`,
    fetcher,
    { refreshInterval: 5000 }
  );
  const jobs = jobsRes?.data || [];

  // Stats
  const stats = useMemo(() => {
    const totalSellers = sellers.length;
    const monitored = sellers.filter((s) => s.isMonitored).length;
    const today = new Date(); today.setHours(0,0,0,0);
    const todaysJobs = jobs.filter((j) => j.createdAt && new Date(j.createdAt) >= today).length;
    const totalCollected = jobs.reduce((acc, j) => acc + (j.created || 0), 0);
    return { totalSellers, monitored, todaysJobs, totalCollected };
  }, [sellers, jobs]);

  // Add Seller Dialog state
  const [open, setOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newSource, setNewSource] = useState<string | null>(null);
  const [scrapeLimit, setScrapeLimit] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const onUrlChange = useCallback((v: string) => {
    setNewUrl(v);
    const detected = detectSourceType(v);
    setNewSource(detected);
  }, []);

  const addSeller = useCallback(async () => {
    if (!newUrl) return;
    setSubmitting(true);
    try {
      const body: any = { url: newUrl };
      if (newSource) body.sourceType = newSource;
      await postApi('/api/sellers', body);
      addToast({ type: 'success', message: 'セラーを追加しました' });
      setOpen(false);
      setNewUrl('');
      setNewSource(null);
      mutateSellers();
    } catch (e) {
      addToast({ type: 'error', message: '追加に失敗しました' });
    } finally {
      setSubmitting(false);
    }
  }, [newUrl, newSource, mutateSellers]);

  const triggerScrape = useCallback(async (seller: Seller) => {
    try {
      await postApi(`/api/sellers/${seller.id}/scrape`, { options: { limit: scrapeLimit } });
      addToast({ type: 'success', message: '取得ジョブをキューに追加しました' });
      mutateJobs();
    } catch {
      addToast({ type: 'error', message: 'ジョブ追加に失敗しました' });
    }
  }, [scrapeLimit, mutateJobs]);

  const toggleMonitor = useCallback(async (seller: Seller) => {
    try {
      await patchApi(`/api/sellers/${seller.id}/monitor`, { isMonitored: !seller.isMonitored });
      mutateSellers();
    } catch {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  }, [mutateSellers]);

  const deleteSeller = useCallback(async (seller: Seller) => {
    if (!confirm(`セラーを削除しますか？\n${seller.sellerName || seller.sellerId}`)) return;
    try {
      await deleteApi(`/api/sellers/${seller.id}`);
      addToast({ type: 'success', message: '削除しました' });
      mutateSellers();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  }, [mutateSellers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-600" />
          <h1 className="text-xl font-semibold">セラー管理</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => { mutateSellers(); mutateJobs(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> 更新
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> セラー追加
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-zinc-500">登録セラー数</p>
          <p className="mt-1 text-2xl font-bold">{loadingSellers ? '—' : stats.totalSellers}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-500">監視中セラー数</p>
          <p className="mt-1 text-2xl font-bold">{loadingSellers ? '—' : stats.monitored}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-500">今日のバッチジョブ</p>
          <p className="mt-1 text-2xl font-bold">{loadingJobs ? '—' : stats.todaysJobs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-zinc-500">収集商品合計</p>
          <p className="mt-1 text-2xl font-bold">{loadingJobs ? '—' : stats.totalCollected}</p>
        </Card>
      </div>

      {/* Sellers Table */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">セラー一覧</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-zinc-600">取得上限</Label>
              <div className="flex w-40 items-center gap-3">
                <Slider value={[scrapeLimit]} min={10} max={200} step={10} onValueChange={(v) => setScrapeLimit(v[0] ?? 50)} />
                <span className="w-10 text-right text-xs text-zinc-600">{scrapeLimit}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>セラー名</TableHead>
                <TableHead>ソース</TableHead>
                <TableHead>商品数</TableHead>
                <TableHead>最終取得</TableHead>
                <TableHead className="text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(sellers || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <a className="text-sm font-medium text-blue-600 hover:underline" href={s.sellerUrl} target="_blank" rel="noreferrer">
                        {s.sellerName || s.sellerId}
                      </a>
                      <span className="text-xs text-zinc-500">{s.sellerId}</span>
                    </div>
                  </TableCell>
                  <TableCell>{sourceBadge(s.sourceType)}</TableCell>
                  <TableCell>{s.productCount ?? '-'}</TableCell>
                  <TableCell>{formatDate(s.lastScrapedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => triggerScrape(s)}>
                        <Play className="mr-1 h-4 w-4" /> 取得
                      </Button>
                      <div className="flex items-center gap-2">
                        <Switch checked={s.isMonitored} onCheckedChange={() => toggleMonitor(s)} />
                        <span className="text-xs text-zinc-600">監視</span>
                      </div>
                      <Button size="sm" variant="destructive" onClick={() => deleteSeller(s)}>
                        <Trash2 className="mr-1 h-4 w-4" /> 削除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!loadingSellers && sellers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-zinc-500">セラーがありません。右上のボタンから追加してください。</TableCell>
                </TableRow>
              )}
              {(loadingSellers) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-zinc-500">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> 読み込み中...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Batch Job History */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <BadgeHelp className="h-4 w-4 text-zinc-500" />
          <h2 className="text-sm font-semibold">バッチジョブ履歴</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ジョブID</TableHead>
                <TableHead>セラー名</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>取得/作成/更新/スキップ/失敗</TableHead>
                <TableHead>所要時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(jobs || []).map((j) => {
                const name = j.seller?.sellerName || j.sellerName || '-';
                const started = j.startedAt ? new Date(j.startedAt).getTime() : undefined;
                const finished = j.completedAt ? new Date(j.completedAt).getTime() : undefined;
                const duration = started && finished ? Math.max(0, Math.round((finished - started) / 1000)) : null;
                const statusBadge = (
                  <Badge variant={j.status === 'COMPLETED' ? 'success' : j.status === 'FAILED' ? 'destructive' : 'secondary'}>
                    {j.status}
                  </Badge>
                );
                return (
                  <TableRow key={j.id}>
                    <TableCell className="font-mono text-xs">{j.jobId || '-'}</TableCell>
                    <TableCell className="text-sm">{name}</TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell className="text-sm">
                      {j.productsFound}/{j.created}/{j.updated}/{j.skipped}/{j.failed}
                    </TableCell>
                    <TableCell className="text-sm">{duration !== null ? `${duration}s` : '-'}</TableCell>
                  </TableRow>
                );
              })}
              {(loadingJobs) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-zinc-500">
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> 読み込み中...
                  </TableCell>
                </TableRow>
              )}
              {(!loadingJobs && jobs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-zinc-500">履歴がありません。</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Seller Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>セラー追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">セラーURL</Label>
              <Input id="url" placeholder="https://jp.mercari.com/user/profile/123456" value={newUrl} onChange={(e) => onUrlChange(e.target.value)} />
              <p className="text-xs text-zinc-500">URLからソースタイプを自動判定します。</p>
            </div>
            <div className="space-y-2">
              <Label>ソースタイプ</Label>
              <div className="text-sm">{newSource || '-'}</div>
            </div>
            <div className="space-y-2">
              <Label>取得上限</Label>
              <div className="flex items-center gap-3">
                <Slider value={[scrapeLimit]} min={10} max={200} step={10} onValueChange={(v) => setScrapeLimit(v[0] ?? 50)} />
                <span className="w-12 text-right text-sm">{scrapeLimit}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
            <Button disabled={submitting || !newUrl} onClick={addSeller}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

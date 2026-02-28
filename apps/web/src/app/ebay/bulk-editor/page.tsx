
'use client';

/**
 * Phase 113: eBayバルクエディターUI
 */

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Edit3, ChevronLeft, RefreshCw, Search, Check, X, DollarSign, Percent,
  Tag, Trash2, Play, Pause, Eye, History, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' } });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

interface Listing {
  id: string;
  title: string;
  image?: string;
  brand?: string;
  category?: string;
  price: number;
  shippingCost?: number;
  currency: string;
  status: string;
}

export default function EbayBulkEditorPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('editor');

  const [editMode, setEditMode] = useState<'price' | 'shipping' | 'title'>('price');
  const [priceType, setPriceType] = useState<'fixed' | 'percent' | 'adjust'>('percent');
  const [priceValue, setPriceValue] = useState('');
  const [shippingValue, setShippingValue] = useState('');
  const [titlePrefix, setTitlePrefix] = useState('');
  const [titleSuffix, setTitleSuffix] = useState('');

  const { data, mutate } = useSWR(
    `${API_BASE}/ebay-bulk-editor/listings?status=${statusFilter}&search=${searchQuery}`,
    fetcher
  );
  const { data: historyData } = useSWR(
    activeTab === 'history' ? `${API_BASE}/ebay-bulk-editor/history` : null,
    fetcher
  );

  const listings: Listing[] = data?.listings || [];

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(listings.map(l => l.id)));
    }
  }, [selectedIds.size, listings]);

  const buildChanges = () => {
    const changes: Record<string, unknown> = {};
    if (editMode === 'price') {
      const val = parseFloat(priceValue);
      if (!isNaN(val)) {
        if (priceType === 'fixed') changes.price = val;
        else if (priceType === 'percent') changes.priceAdjustPercent = val;
        else changes.priceAdjustFixed = val;
      }
    } else if (editMode === 'shipping') {
      const val = parseFloat(shippingValue);
      if (!isNaN(val)) changes.shippingCost = val;
    } else if (editMode === 'title') {
      if (titlePrefix) changes.titlePrefix = titlePrefix;
      if (titleSuffix) changes.titleSuffix = titleSuffix;
    }
    return changes;
  };

  const handlePreview = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-bulk-editor/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify({
          listingIds: Array.from(selectedIds),
          changes: buildChanges(),
          preview: true,
        }),
      });
      if (res.ok) {
        setPreviewData(await res.json());
        setIsEditOpen(false);
        setIsPreviewOpen(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-bulk-editor/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify({
          listingIds: Array.from(selectedIds),
          changes: buildChanges(),
          preview: false,
          syncToEbay: true,
        }),
      });
      if (res.ok) {
        setIsPreviewOpen(false);
        setSelectedIds(new Set());
        resetForm();
        mutate();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (!confirm(`選択した${selectedIds.size}件を${status}に変更しますか？`)) return;
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/ebay-bulk-editor/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify({ listingIds: Array.from(selectedIds), status, syncToEbay: true }),
      });
      setSelectedIds(new Set());
      mutate();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`選択した${selectedIds.size}件を削除しますか？（下書きのみ）`)) return;
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/ebay-bulk-editor/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' },
        body: JSON.stringify({ listingIds: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      mutate();
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setPriceValue('');
    setShippingValue('');
    setTitlePrefix('');
    setTitleSuffix('');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />戻る</Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Edit3 className="h-6 w-6" />バルクエディター</h1>
            <p className="text-muted-foreground">複数リスティングの一括編集</p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedIds.size}件選択中</Badge>
            <Button onClick={() => setIsEditOpen(true)}><Edit3 className="h-4 w-4 mr-1" />編集</Button>
            <Button variant="outline" onClick={() => handleBulkStatus('ENDED')}><Pause className="h-4 w-4 mr-1" />終了</Button>
            <Button variant="outline" onClick={() => handleBulkStatus('ACTIVE')}><Play className="h-4 w-4 mr-1" />再開</Button>
            <Button variant="destructive" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-1" />削除</Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">エディター</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="タイトルで検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">出品中</SelectItem>
                <SelectItem value="DRAFT">下書き</SelectItem>
                <SelectItem value="ENDED">終了</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => mutate()}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="border-b p-3 bg-muted/50 flex items-center gap-4">
                <input type="checkbox" checked={listings.length > 0 && selectedIds.size === listings.length} onChange={toggleSelectAll} className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">全{data?.total || 0}件</span>
              </div>
              <div className="divide-y max-h-[60vh] overflow-y-auto">
                {listings.map(listing => (
                  <div key={listing.id} className={`flex items-center gap-4 p-3 hover:bg-muted/50 ${selectedIds.has(listing.id) ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={selectedIds.has(listing.id)} onChange={() => toggleSelect(listing.id)} className="h-4 w-4" />
                    {listing.image && <img src={listing.image} alt="" className="w-12 h-12 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{listing.title}</div>
                      <div className="text-sm text-muted-foreground">{listing.brand} • {listing.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${listing.price?.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">送料 ${listing.shippingCost?.toFixed(2) || '0.00'}</div>
                    </div>
                    <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}>{listing.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />編集履歴</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historyData?.history?.map((h: any) => (
                  <div key={h.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{h.message}</span>
                      <span className="text-sm text-muted-foreground">{new Date(h.createdAt).toLocaleString('ja-JP')}</span>
                    </div>
                    {h.metadata?.changes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        変更: {JSON.stringify(h.metadata.changes)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>一括編集</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button variant={editMode === 'price' ? 'default' : 'outline'} size="sm" onClick={() => setEditMode('price')}><DollarSign className="h-4 w-4 mr-1" />価格</Button>
              <Button variant={editMode === 'shipping' ? 'default' : 'outline'} size="sm" onClick={() => setEditMode('shipping')}><Tag className="h-4 w-4 mr-1" />送料</Button>
              <Button variant={editMode === 'title' ? 'default' : 'outline'} size="sm" onClick={() => setEditMode('title')}><Edit3 className="h-4 w-4 mr-1" />タイトル</Button>
            </div>

            {editMode === 'price' && (
              <div className="space-y-3">
                <Select value={priceType} onValueChange={(v: any) => setPriceType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">パーセント変更</SelectItem>
                    <SelectItem value="adjust">固定額増減</SelectItem>
                    <SelectItem value="fixed">固定価格に設定</SelectItem>
                  </SelectContent>
                </Select>
                <Input type="number" placeholder={priceType === 'percent' ? '例: 10 (10%増)' : '例: 5.00'} value={priceValue} onChange={(e) => setPriceValue(e.target.value)} />
              </div>
            )}

            {editMode === 'shipping' && (
              <Input type="number" placeholder="送料（例: 5.00）" value={shippingValue} onChange={(e) => setShippingValue(e.target.value)} />
            )}

            {editMode === 'title' && (
              <div className="space-y-3">
                <Input placeholder="先頭に追加（例: [SALE]）" value={titlePrefix} onChange={(e) => setTitlePrefix(e.target.value)} />
                <Input placeholder="末尾に追加（例: - Free Shipping）" value={titleSuffix} onChange={(e) => setTitleSuffix(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>キャンセル</Button>
            <Button onClick={handlePreview} disabled={isProcessing}><Eye className="h-4 w-4 mr-1" />プレビュー</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>変更プレビュー</DialogTitle><CardDescription>{previewData?.count}件の変更</CardDescription></DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-2">
            {previewData?.updates?.slice(0, 20).map((u: any) => (
              <div key={u.id} className="p-3 border rounded-lg text-sm">
                <div className="flex items-center gap-4">
                  {Object.entries(u.original as Record<string, unknown>).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key}: </span>
                      <span className="line-through text-red-500">{String(val)}</span>
                      <span className="mx-1">→</span>
                      <span className="text-green-600">{String((u.updated as Record<string, unknown>)[key])}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>キャンセル</Button>
            <Button onClick={handleApply} disabled={isProcessing}><Check className="h-4 w-4 mr-1" />適用</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

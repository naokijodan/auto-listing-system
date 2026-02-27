// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sparkles,
  CheckCircle,
  XCircle,
  Clock,
  Wand2,
  Eye,
  Trash2,
  TrendingUp,
  FileText,
  Tag,
  Loader2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface Suggestion {
  id: string;
  listingId: string;
  productTitle: string;
  productImage?: string;
  type: string;
  original: string;
  suggested: string;
  reason?: string;
  status: string;
  createdAt: string;
}

interface LowPerformanceListing {
  id: string;
  productTitle: string;
  productImage?: string;
  listedAt: string;
  marketplaceData: any;
}

const typeLabels: Record<string, string> = {
  TITLE: 'タイトル',
  DESCRIPTION: '説明文',
  KEYWORDS: 'キーワード',
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: '保留中', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPLIED: { label: '適用済み', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJECTED: { label: '却下', color: 'bg-gray-100 text-gray-800', icon: XCircle },
};

export default function EbayOptimizationPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateListingId, setGenerateListingId] = useState('');

  const { data: dashboard, mutate: mutateDashboard } = useSWR(`${API_BASE}/ebay-optimization/dashboard`, fetcher);
  const { data: suggestions, mutate: mutateSuggestions } = useSWR(
    `${API_BASE}/ebay-optimization/suggestions?${statusFilter ? `status=${statusFilter}&` : ''}${typeFilter ? `type=${typeFilter}&` : ''}limit=100`,
    fetcher
  );
  const { data: stats } = useSWR(`${API_BASE}/ebay-optimization/stats`, fetcher);

  // 出品一覧（最適化対象選択用）
  const { data: activeListings } = useSWR(`${API_BASE}/ebay-listings/listings?status=ACTIVE`, fetcher);

  const handleGenerate = async (listingId: string) => {
    setIsGenerating(true);
    try {
      await fetch(`${API_BASE}/ebay-optimization/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          optimizeTitle: true,
          optimizeDescription: true,
          suggestKeywords: true,
        }),
      });
      mutateDashboard();
      mutateSuggestions();
      alert('最適化提案を生成しました');
    } catch (err) {
      alert('最適化の生成に失敗しました');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async (id: string) => {
    await fetch(`${API_BASE}/ebay-optimization/suggestions/${id}/apply`, { method: 'POST' });
    mutateSuggestions();
    mutateDashboard();
  };

  const handleReject = async (id: string) => {
    await fetch(`${API_BASE}/ebay-optimization/suggestions/${id}/reject`, { method: 'POST' });
    mutateSuggestions();
    mutateDashboard();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この提案を削除しますか？')) return;
    await fetch(`${API_BASE}/ebay-optimization/suggestions/${id}`, { method: 'DELETE' });
    mutateSuggestions();
    mutateDashboard();
  };

  const openPreview = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setPreviewDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">eBay出品最適化</h1>
          <p className="text-muted-foreground">AIでタイトル・説明文を改善</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={generateListingId} onValueChange={setGenerateListingId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="出品を選択..." />
            </SelectTrigger>
            <SelectContent>
              {activeListings?.listings?.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.product?.titleEn || l.product?.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => generateListingId && handleGenerate(generateListingId)}
            disabled={!generateListingId || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            最適化を生成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="suggestions">
            提案一覧
            {dashboard?.summary?.pendingOptimizations > 0 && (
              <Badge variant="secondary" className="ml-2">{dashboard.summary.pendingOptimizations}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="low-performance">低パフォーマンス</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総提案数</CardTitle>
                <Sparkles className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary?.totalOptimizations || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">保留中</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{dashboard?.summary?.pendingOptimizations || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">適用済み</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboard?.summary?.appliedOptimizations || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 最近の最適化 */}
          <Card>
            <CardHeader>
              <CardTitle>最近の最適化提案</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentOptimizations?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">最適化提案なし</p>
                )}
                {dashboard?.recentOptimizations?.map((o: any) => (
                  <div key={o.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {o.type === 'TITLE' && <FileText className="h-4 w-4 text-blue-500" />}
                      {o.type === 'DESCRIPTION' && <FileText className="h-4 w-4 text-green-500" />}
                      {o.type === 'KEYWORDS' && <Tag className="h-4 w-4 text-purple-500" />}
                      <div>
                        <p className="font-medium">{o.productTitle}</p>
                        <p className="text-sm text-muted-foreground">{typeLabels[o.type]}</p>
                      </div>
                    </div>
                    <Badge className={statusConfig[o.status]?.color}>
                      {statusConfig[o.status]?.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 提案一覧 */}
        <TabsContent value="suggestions" className="space-y-4">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="PENDING">保留中</SelectItem>
                <SelectItem value="APPLIED">適用済み</SelectItem>
                <SelectItem value="REJECTED">却下</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="TITLE">タイトル</SelectItem>
                <SelectItem value="DESCRIPTION">説明文</SelectItem>
                <SelectItem value="KEYWORDS">キーワード</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            {suggestions?.suggestions?.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  提案なし
                </CardContent>
              </Card>
            )}
            {suggestions?.suggestions?.map((s: Suggestion) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {s.productImage && (
                      <img src={s.productImage} alt="" className="w-16 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">{s.productTitle}</p>
                        <Badge variant="outline">{typeLabels[s.type]}</Badge>
                        <Badge className={statusConfig[s.status]?.color}>
                          {statusConfig[s.status]?.label}
                        </Badge>
                      </div>
                      {s.type === 'TITLE' && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground line-through">{s.original}</p>
                          <p className="text-sm font-medium text-green-700">{s.suggested}</p>
                        </div>
                      )}
                      {s.type === 'DESCRIPTION' && (
                        <p className="text-sm text-muted-foreground">
                          説明文の改善提案 - <span className="text-blue-600 cursor-pointer" onClick={() => openPreview(s)}>詳細を見る</span>
                        </p>
                      )}
                      {s.type === 'KEYWORDS' && (
                        <div className="flex flex-wrap gap-1">
                          {s.suggested.split(', ').map((kw, i) => (
                            <Badge key={i} variant="secondary">{kw}</Badge>
                          ))}
                        </div>
                      )}
                      {s.reason && <p className="text-xs text-muted-foreground mt-1">{s.reason}</p>}
                    </div>
                    {s.status === 'PENDING' && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openPreview(s)} title="プレビュー">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleApply(s.id)} title="適用">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleReject(s.id)} title="却下">
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} title="削除">
                      <Trash2 className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 低パフォーマンス出品 */}
        <TabsContent value="low-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>最適化推奨出品</CardTitle>
              <p className="text-sm text-muted-foreground">
                7日以上前に出品されたがパフォーマンスが低い商品
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.lowPerformanceListings?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">対象なし</p>
                )}
                {dashboard?.lowPerformanceListings?.map((l: LowPerformanceListing) => (
                  <div key={l.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    {l.productImage && (
                      <img src={l.productImage} alt="" className="w-12 h-12 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{l.productTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        出品日: {new Date(l.listedAt).toLocaleDateString('ja-JP')}
                        {l.marketplaceData?.views !== undefined && ` • Views: ${l.marketplaceData.views}`}
                        {l.marketplaceData?.watchers !== undefined && ` • Watchers: ${l.marketplaceData.watchers}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleGenerate(l.id)}
                      disabled={isGenerating}
                    >
                      <Wand2 className="h-4 w-4 mr-1" />
                      最適化
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* プレビューダイアログ */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>最適化プレビュー: {selectedSuggestion?.productTitle}</DialogTitle>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">変更前</h3>
                <div className="p-3 bg-red-50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedSuggestion.original}
                </div>
              </div>
              <div>
                <h3 className="font-medium mb-2">変更後（提案）</h3>
                <div className="p-3 bg-green-50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedSuggestion.suggested}
                </div>
              </div>
              {selectedSuggestion.reason && (
                <div>
                  <h3 className="font-medium mb-2">改善理由</h3>
                  <p className="text-sm text-muted-foreground">{selectedSuggestion.reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>閉じる</Button>
            {selectedSuggestion?.status === 'PENDING' && (
              <>
                <Button variant="destructive" onClick={() => { handleReject(selectedSuggestion.id); setPreviewDialogOpen(false); }}>
                  却下
                </Button>
                <Button onClick={() => { handleApply(selectedSuggestion.id); setPreviewDialogOpen(false); }}>
                  適用する
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

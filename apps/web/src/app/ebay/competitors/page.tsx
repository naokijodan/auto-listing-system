
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  BarChart3,
  History
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface CompetitorItem {
  id: string;
  listingId: string;
  productTitle: string;
  productImage?: string;
  myPrice: number;
  competitorPrice: number;
  priceDiff: number;
  priceDiffPercent: number;
  competitorUrl: string;
  competitorSeller?: string;
  lastChecked: string;
  isAlert: boolean;
}

interface AlertItem {
  id: string;
  listingId: string;
  productTitle: string;
  myPrice: number;
  competitorPrice: number;
  priceDiff: number;
  priceDiffPercent: number;
  competitorSeller?: string;
  suggestion?: string;
}

interface PriceHistory {
  id: string;
  oldPrice: number;
  newPrice: number;
  createdAt: string;
}

export default function EbayCompetitorsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertFilter, setAlertFilter] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorItem | null>(null);
  const [newCompetitor, setNewCompetitor] = useState({ listingId: '', competitorUrl: '', competitorSeller: '', notes: '' });
  const [isChecking, setIsChecking] = useState(false);

  const { data: dashboard, mutate: mutateDashboard } = useSWR(`${API_BASE}/ebay-competitors/dashboard`, fetcher);
  const { data: competitors, mutate: mutateCompetitors } = useSWR(
    `${API_BASE}/ebay-competitors?${alertFilter === 'alerts' ? 'hasAlert=true&' : ''}limit=100`,
    fetcher
  );
  const { data: alerts, mutate: mutateAlerts } = useSWR(`${API_BASE}/ebay-competitors/alerts`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-competitors/stats/summary`, fetcher);
  const { data: history } = useSWR(
    selectedCompetitor ? `${API_BASE}/ebay-competitors/${selectedCompetitor.id}/history` : null,
    fetcher
  );

  const handleAddCompetitor = async () => {
    if (!newCompetitor.listingId || !newCompetitor.competitorUrl) return;

    await fetch(`${API_BASE}/ebay-competitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCompetitor),
    });

    setAddDialogOpen(false);
    setNewCompetitor({ listingId: '', competitorUrl: '', competitorSeller: '', notes: '' });
    mutateCompetitors();
    mutateDashboard();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この競合を削除しますか？')) return;

    await fetch(`${API_BASE}/ebay-competitors/${id}`, { method: 'DELETE' });
    mutateCompetitors();
    mutateDashboard();
    mutateAlerts();
  };

  const handleCheckPrices = async (competitorIds?: string[]) => {
    setIsChecking(true);
    await fetch(`${API_BASE}/ebay-competitors/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitorIds }),
    });
    setIsChecking(false);
    alert('価格チェックをキューに追加しました');
  };

  const openHistory = (competitor: CompetitorItem) => {
    setSelectedCompetitor(competitor);
    setHistoryDialogOpen(true);
  };

  const filteredCompetitors = competitors?.competitors?.filter((c: CompetitorItem) =>
    !searchQuery || c.productTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.competitorSeller?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">eBay競合分析</h1>
          <p className="text-muted-foreground">競合の価格追跡と分析</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleCheckPrices()} disabled={isChecking}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            全価格チェック
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            競合追加
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="list">競合一覧</TabsTrigger>
          <TabsTrigger value="alerts">
            価格アラート
            {alerts?.count > 0 && (
              <Badge variant="destructive" className="ml-2">{alerts.count}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stats">統計</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">追跡中の競合</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary?.trackedCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">価格アラート</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{dashboard?.summary?.priceAlerts || 0}</div>
                <p className="text-xs text-muted-foreground">競合の方が安い</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均価格差</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary?.avgPriceDiff || '0'}%</div>
                <p className="text-xs text-muted-foreground">自社価格との差</p>
              </CardContent>
            </Card>
          </div>

          {/* 最近の価格変動 */}
          <Card>
            <CardHeader>
              <CardTitle>最近の価格変動</CardTitle>
              <CardDescription>競合の価格変動履歴</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentChanges?.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">価格変動なし</p>
                )}
                {dashboard?.recentChanges?.map((change: any) => (
                  <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{change.productTitle || '商品名不明'}</p>
                      <p className="text-sm text-muted-foreground">
                        ${change.oldPrice} → ${change.newPrice}
                      </p>
                    </div>
                    <Badge variant={parseFloat(change.changePercent) < 0 ? 'destructive' : 'default'}>
                      {parseFloat(change.changePercent) > 0 ? '+' : ''}{change.changePercent}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 頻出競合セラー */}
          <Card>
            <CardHeader>
              <CardTitle>主な競合セラー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {dashboard?.topCompetitors?.map((c: any) => (
                  <Badge key={c.seller} variant="outline" className="px-3 py-1">
                    {c.seller} ({c.count})
                  </Badge>
                ))}
                {!dashboard?.topCompetitors?.length && (
                  <p className="text-muted-foreground">競合セラーなし</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 競合一覧 */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="商品名・セラーで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="alerts">アラートのみ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {filteredCompetitors.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  競合が登録されていません
                </CardContent>
              </Card>
            )}
            {filteredCompetitors.map((c: CompetitorItem) => (
              <Card key={c.id} className={c.isAlert ? 'border-red-300' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {c.productImage && (
                      <img src={c.productImage} alt="" className="w-16 h-16 object-cover rounded" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{c.productTitle || '商品名不明'}</h3>
                      <p className="text-sm text-muted-foreground">
                        セラー: {c.competitorSeller || '不明'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-muted-foreground">自社:</span>
                        <span className="font-medium">${c.myPrice?.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">競合:</span>
                        <span className="font-medium">${c.competitorPrice?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <Badge variant={c.priceDiff < 0 ? 'destructive' : c.priceDiff > 0 ? 'default' : 'secondary'}>
                        {c.priceDiff > 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : c.priceDiff < 0 ? (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        ) : null}
                        {c.priceDiffPercent > 0 ? '+' : ''}{c.priceDiffPercent?.toFixed(1)}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        ${Math.abs(c.priceDiff || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openHistory(c)}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a href={c.competitorUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 価格アラート */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts?.alerts?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                価格アラートなし
              </CardContent>
            </Card>
          )}
          {alerts?.alerts?.map((a: AlertItem) => (
            <Card key={a.id} className="border-red-300">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium">{a.productTitle || '商品名不明'}</h3>
                    <p className="text-sm text-muted-foreground">セラー: {a.competitorSeller || '不明'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
                      自社: <span className="font-medium">${a.myPrice?.toFixed(2)}</span>
                    </p>
                    <p className="text-sm">
                      競合: <span className="font-medium text-red-600">${a.competitorPrice?.toFixed(2)}</span>
                    </p>
                  </div>
                  <Badge variant="destructive">
                    {a.priceDiffPercent?.toFixed(1)}%安い
                  </Badge>
                </div>
                {a.suggestion && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-yellow-800">
                    {a.suggestion}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 統計 */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">総追跡数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.summary?.totalTracked || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">アラート中</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats?.summary?.withAlerts || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">価格変動（30日）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.summary?.priceChangesInPeriod || 0}回</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">平均価格差</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.summary?.avgPriceDiffPercent || '0'}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* 競合追加ダイアログ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>競合を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">リスティングID</label>
              <Input
                value={newCompetitor.listingId}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, listingId: e.target.value })}
                placeholder="自社のリスティングID"
              />
            </div>
            <div>
              <label className="text-sm font-medium">競合URL</label>
              <Input
                value={newCompetitor.competitorUrl}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, competitorUrl: e.target.value })}
                placeholder="https://www.ebay.com/itm/..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">競合セラー名（任意）</label>
              <Input
                value={newCompetitor.competitorSeller}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, competitorSeller: e.target.value })}
                placeholder="seller_name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">メモ（任意）</label>
              <Textarea
                value={newCompetitor.notes}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, notes: e.target.value })}
                placeholder="メモを入力..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleAddCompetitor}>追加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 価格履歴ダイアログ */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>価格履歴: {selectedCompetitor?.productTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history?.history?.length === 0 && (
              <p className="text-center text-muted-foreground py-4">履歴なし</p>
            )}
            {history?.history?.map((h: PriceHistory) => (
              <div key={h.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span>${h.oldPrice?.toFixed(2)}</span>
                  <span>→</span>
                  <span className={h.newPrice < h.oldPrice ? 'text-red-600' : 'text-green-600'}>
                    ${h.newPrice?.toFixed(2)}
                  </span>
                  <Badge variant={h.newPrice < h.oldPrice ? 'destructive' : 'default'}>
                    {((h.newPrice - h.oldPrice) / h.oldPrice * 100).toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

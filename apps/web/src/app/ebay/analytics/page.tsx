'use client';

/**
 * Phase 112: eBay分析・レポートUI
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart,
  ChevronLeft, RefreshCw, Download, Eye, Heart, Percent, Clock, Layers,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = async (url: string) => {
  const res = await fetch(url, { headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key' } });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function TrendBadge({ change }: { change: string }) {
  const num = parseFloat(change);
  if (isNaN(num)) return null;
  const isPositive = num >= 0;
  return (
    <Badge variant={isPositive ? 'default' : 'destructive'} className={isPositive ? 'bg-green-500' : ''}>
      {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      {change}
    </Badge>
  );
}

export default function EbayAnalyticsPage() {
  const [period, setPeriod] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: dashboard, mutate } = useSWR(`${API_BASE}/ebay-analytics/dashboard?days=${period}`, fetcher);
  const { data: salesTrend } = useSWR(`${API_BASE}/ebay-analytics/sales-trend?days=${period}`, fetcher);
  const { data: listingPerf } = useSWR(activeTab === 'listings' ? `${API_BASE}/ebay-analytics/listing-performance?days=${period}` : null, fetcher);
  const { data: categoryData } = useSWR(activeTab === 'categories' ? `${API_BASE}/ebay-analytics/category-analysis?days=${period}` : null, fetcher);
  const { data: inventoryData } = useSWR(activeTab === 'inventory' ? `${API_BASE}/ebay-analytics/inventory-turnover?days=${period}` : null, fetcher);
  const { data: profitData } = useSWR(activeTab === 'profit' ? `${API_BASE}/ebay-analytics/profit-analysis?days=${period}` : null, fetcher);

  const handleExport = async (type: string) => {
    window.open(`${API_BASE}/ebay-analytics/export?type=${type}&days=${period}&format=csv`, '_blank');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />戻る</Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" />分析・レポート</h1>
            <p className="text-muted-foreground">eBay販売パフォーマンス分析</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7日間</SelectItem>
              <SelectItem value="30">30日間</SelectItem>
              <SelectItem value="90">90日間</SelectItem>
              <SelectItem value="365">1年間</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => mutate()}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={() => handleExport('orders')}><Download className="h-4 w-4 mr-1" />エクスポート</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="listings">リスティング</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="inventory">在庫回転</TabsTrigger>
          <TabsTrigger value="profit">利益分析</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-4 w-4" />注文数</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary.orders.current || 0}</div>
                <TrendBadge change={dashboard?.summary.orders.change || '0%'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><DollarSign className="h-4 w-4" />売上</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboard?.summary.revenue.current?.toFixed(0) || 0}</div>
                <TrendBadge change={dashboard?.summary.revenue.change || '0%'} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Package className="h-4 w-4" />販売点数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboard?.summary.soldItems || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">平均注文額</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${dashboard?.summary.avgOrderValue?.toFixed(2) || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>売上トレンド</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {salesTrend?.data?.slice(-14).map((d: any) => (
                    <div key={d.date} className="flex items-center gap-4">
                      <span className="w-20 text-sm text-muted-foreground">{new Date(d.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${Math.min((d.revenue / Math.max(...(salesTrend?.data?.map((x: any) => x.revenue) || [1]))) * 100, 100)}%` }} />
                      </div>
                      <span className="w-20 text-sm font-medium text-right">${d.revenue.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>トップ商品</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard?.topProducts?.slice(0, 5).map((p: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-muted-foreground">#{idx + 1}</span>
                        <div>
                          <div className="font-medium text-sm">{p.title?.substring(0, 40)}...</div>
                          <div className="text-xs text-muted-foreground">{p.quantity}点販売</div>
                        </div>
                      </div>
                      <span className="font-medium">${p.revenue?.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>カテゴリ別売上</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {dashboard?.topCategories?.map((c: any, idx: number) => (
                  <div key={idx} className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">${c.revenue?.toFixed(0)}</div>
                    <div className="text-sm text-muted-foreground">{c.category}</div>
                    <div className="text-xs text-muted-foreground">{c.count}件</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Listings Tab */}
        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>リスティングパフォーマンス</CardTitle><CardDescription>閲覧数・ウォッチ数・コンバージョン率</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {listingPerf?.listings?.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {l.image && <img src={l.image} alt="" className="w-12 h-12 object-cover rounded" />}
                      <div>
                        <div className="font-medium">{l.title?.substring(0, 50)}...</div>
                        <div className="text-sm text-muted-foreground">${l.price?.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center"><Eye className="h-4 w-4 mx-auto text-muted-foreground" />{l.views}</div>
                      <div className="text-center"><Heart className="h-4 w-4 mx-auto text-muted-foreground" />{l.watchers}</div>
                      <div className="text-center"><ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground" />{l.sales}</div>
                      <div className="text-center"><Percent className="h-4 w-4 mx-auto text-muted-foreground" />{l.conversionRate}</div>
                      <div className="font-medium">${l.revenue?.toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>カテゴリ分析</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryData?.categories?.map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{c.category}</div>
                      <div className="text-sm text-muted-foreground">{c.orderCount}件 • {c.quantity}点販売</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">${c.revenue?.toFixed(0)}</div>
                      <div className="text-sm text-muted-foreground">平均 ${c.avgOrderValue}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Layers className="h-4 w-4" />アクティブ出品</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{inventoryData?.activeListings || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">期間内販売数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{inventoryData?.soldInPeriod || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Percent className="h-4 w-4" />回転率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{inventoryData?.turnoverRate || 'N/A'}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" />平均販売日数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{inventoryData?.avgDaysToSell || 'N/A'}日</div></CardContent></Card>
          </div>
        </TabsContent>

        {/* Profit Tab */}
        <TabsContent value="profit" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">総売上</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${profitData?.summary.totalRevenue?.toFixed(0) || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">総原価</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">¥{profitData?.summary.totalCost?.toLocaleString() || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">総利益</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">¥{profitData?.summary.totalProfit?.toLocaleString() || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">利益率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{profitData?.summary.profitMargin || 'N/A'}</div></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>カテゴリ別利益</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profitData?.byCategory?.map((c: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{c.category}</div>
                      <div className="text-sm text-muted-foreground">{c.count}件</div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div><div className="text-sm text-muted-foreground">売上</div><div className="font-medium">${c.revenue?.toFixed(0)}</div></div>
                      <div><div className="text-sm text-muted-foreground">原価</div><div className="font-medium">¥{c.cost?.toLocaleString()}</div></div>
                      <div><div className="text-sm text-muted-foreground">利益</div><div className="font-medium text-green-600">¥{c.profit?.toLocaleString()}</div></div>
                      <Badge variant="outline">{c.profitMargin}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

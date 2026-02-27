// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 279: eBay Performance Dashboard（パフォーマンスダッシュボード）
// テーマカラー: pink-600

export default function EbayPerformanceDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: overviewData } = useSWR('/api/ebay-performance-dashboard/overview', fetcher);
  const { data: kpisData } = useSWR('/api/ebay-performance-dashboard/kpis', fetcher);
  const { data: alertsData } = useSWR('/api/ebay-performance-dashboard/alerts', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-performance-dashboard/settings', fetcher);

  const formatChange = (change: number) => {
    if (change > 0) return <span className="text-green-600">+{change}%</span>;
    if (change < 0) return <span className="text-red-600">{change}%</span>;
    return <span className="text-gray-500">0%</span>;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-pink-600">パフォーマンスダッシュボード</h1>
        <p className="text-gray-600">売上・注文・トラフィックを一元管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="sales">売上分析</TabsTrigger>
          <TabsTrigger value="traffic">トラフィック</TabsTrigger>
          <TabsTrigger value="kpis">KPI</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">売上</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-pink-600">${overviewData?.revenue?.current?.toLocaleString() || 0}</div><div className="text-sm">{formatChange(overviewData?.revenue?.change || 0)} vs 前期</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">注文数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{overviewData?.orders?.current || 0}</div><div className="text-sm">{formatChange(overviewData?.orders?.change || 0)} vs 前期</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">平均注文額</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${overviewData?.avgOrderValue?.current?.toFixed(2) || 0}</div><div className="text-sm">{formatChange(overviewData?.avgOrderValue?.change || 0)} vs 前期</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">コンバージョン率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{overviewData?.conversionRate?.current || 0}%</div><div className="text-sm">{formatChange(overviewData?.conversionRate?.change || 0)} vs 前期</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">訪問者数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{overviewData?.visitors?.current?.toLocaleString() || 0}</div><div className="text-sm">{formatChange(overviewData?.visitors?.change || 0)} vs 前期</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">返品率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{overviewData?.returnRate?.current || 0}%</div><div className="text-sm">{formatChange(overviewData?.returnRate?.change || 0)} vs 前期</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>カテゴリ別売上</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ category: 'Watches', revenue: 50000, percent: 40 },{ category: 'Electronics', revenue: 37500, percent: 30 },{ category: 'Collectibles', revenue: 25000, percent: 20 },{ category: 'Other', revenue: 12500, percent: 10 }].map((item) => (
                    <div key={item.category}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{item.category}</span><span className="text-sm">${item.revenue.toLocaleString()} ({item.percent}%)</span></div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>最近のアラート</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alertsData?.alerts?.slice(0, 3).map((alert: any) => (
                    <div key={alert.id} className={`p-3 border-l-4 rounded ${alert.severity === 'high' ? 'bg-red-50 border-red-400' : alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400' : 'bg-blue-50 border-blue-400'}`}>
                      <p className={`text-sm font-medium ${alert.severity === 'high' ? 'text-red-800' : alert.severity === 'warning' ? 'text-yellow-800' : 'text-blue-800'}`}>{alert.type}</p>
                      <p className={`text-sm ${alert.severity === 'high' ? 'text-red-700' : alert.severity === 'warning' ? 'text-yellow-700' : 'text-blue-700'}`}>{alert.message}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>トップ商品</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Seiko 5 Sports', sales: 75, revenue: 15000 },{ name: 'Citizen Eco-Drive', sales: 50, revenue: 12500 },{ name: 'Orient Bambino', sales: 40, revenue: 8000 }].map((product) => (
                    <div key={product.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{product.name}</div><div className="text-sm text-gray-500">{product.sales}件販売</div></div>
                      <div className="text-right"><div className="font-bold">${product.revenue.toLocaleString()}</div></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>地域別売上</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ region: 'North America', revenue: 50000, percent: 40 },{ region: 'Europe', revenue: 37500, percent: 30 },{ region: 'Asia', revenue: 25000, percent: 20 },{ region: 'Other', revenue: 12500, percent: 10 }].map((region) => (
                    <div key={region.region}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{region.region}</span><span className="text-sm">${region.revenue.toLocaleString()}</span></div>
                      <Progress value={region.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>時間帯別売上</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  {[{ hour: '9時', orders: 25, revenue: 6250 },{ hour: '12時', orders: 40, revenue: 10000 },{ hour: '15時', orders: 35, revenue: 8750 },{ hour: '18時', orders: 50, revenue: 12500 },{ hour: '21時', orders: 45, revenue: 11250 }].map((time) => (
                    <div key={time.hour} className="p-3 bg-gray-50 rounded-lg text-center">
                      <div className="text-sm text-gray-500">{time.hour}</div>
                      <div className="font-bold text-pink-600">${time.revenue.toLocaleString()}</div>
                      <div className="text-sm">{time.orders}件</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-pink-50 rounded-lg text-center"><span className="font-medium">ピーク時間帯: </span><span className="text-pink-600 font-bold">18時</span></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">訪問者</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">12,857</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">ページビュー</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">45,000</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">直帰率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">35.5%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">平均滞在時間</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">4分5秒</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>トラフィックソース</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ source: 'eBay Search', visitors: 6000, percent: 46.7 },{ source: 'Direct', visitors: 3000, percent: 23.3 },{ source: 'External Links', visitors: 2000, percent: 15.6 },{ source: 'Social', visitors: 1857, percent: 14.4 }].map((s) => (
                    <div key={s.source}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{s.source}</span><span className="text-sm">{s.visitors.toLocaleString()} ({s.percent}%)</span></div>
                      <Progress value={s.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>人気リスティング</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ title: 'Seiko 5 Sports SRPD...', views: 1500, watchers: 45 },{ title: 'Citizen Eco-Drive...', views: 1200, watchers: 38 },{ title: 'Orient Bambino V2...', views: 1000, watchers: 30 }].map((listing) => (
                    <div key={listing.title} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium truncate max-w-[200px]">{listing.title}</div>
                      <div className="flex gap-4"><span className="text-sm">{listing.views} views</span><span className="text-sm text-pink-600">{listing.watchers} watchers</span></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kpis">
          <Card>
            <CardHeader><CardTitle>KPIトラッカー</CardTitle><CardDescription>主要指標の目標達成状況</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpisData?.kpis?.map((kpi: any) => (
                  <div key={kpi.name} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium">{kpi.name}</div>
                      <Badge className={kpi.status === 'EXCEEDING' ? 'bg-green-100 text-green-700' : kpi.status === 'ON_TRACK' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{kpi.status === 'EXCEEDING' ? '目標超過' : kpi.status === 'ON_TRACK' ? '順調' : '要注意'}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Progress value={(kpi.value / kpi.target) * 100} className="h-3" />
                      </div>
                      <div className="text-right w-32">
                        <div className="font-bold">{typeof kpi.value === 'number' && kpi.value > 1000 ? `$${kpi.value.toLocaleString()}` : kpi.value}{typeof kpi.value === 'number' && kpi.value < 100 && kpi.name.includes('Rate') ? '%' : ''}</div>
                        <div className="text-sm text-gray-500">目標: {typeof kpi.target === 'number' && kpi.target > 1000 ? `$${kpi.target.toLocaleString()}` : kpi.target}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>アラート一覧</CardTitle><Badge variant="outline">未読: {alertsData?.unread || 0}</Badge></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alertsData?.alerts?.map((alert: any) => (
                  <div key={alert.id} className={`flex items-center justify-between p-4 border-l-4 rounded ${alert.severity === 'high' ? 'bg-red-50 border-red-400' : alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-400' : 'bg-blue-50 border-blue-400'}`}>
                    <div><div className={`font-medium ${alert.severity === 'high' ? 'text-red-800' : alert.severity === 'warning' ? 'text-yellow-800' : 'text-blue-800'}`}>{alert.type}</div><div className={`text-sm ${alert.severity === 'high' ? 'text-red-700' : alert.severity === 'warning' ? 'text-yellow-700' : 'text-blue-700'}`}>{alert.message}</div></div>
                    <Button variant="outline" size="sm">消去</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>表示設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">更新間隔（秒）</label><Input type="number" defaultValue={settingsData?.refreshInterval} /></div>
                <div><label className="text-sm font-medium">デフォルト期間</label>
                  <Select defaultValue={settingsData?.defaultPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last_7_days">過去7日</SelectItem>
                      <SelectItem value="last_30_days">過去30日</SelectItem>
                      <SelectItem value="last_90_days">過去90日</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">タイムゾーン</label><Input defaultValue={settingsData?.timezone} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>アラート閾値</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">売上減少アラート（%）</label><Input type="number" defaultValue={settingsData?.alertThresholds?.revenueDropPercent} /></div>
                <div><label className="text-sm font-medium">低在庫アラート（日）</label><Input type="number" defaultValue={settingsData?.alertThresholds?.lowStockDays} /></div>
                <div><label className="text-sm font-medium">競合価格差アラート（%）</label><Input type="number" defaultValue={settingsData?.alertThresholds?.competitorPriceGap} /></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-pink-600 hover:bg-pink-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

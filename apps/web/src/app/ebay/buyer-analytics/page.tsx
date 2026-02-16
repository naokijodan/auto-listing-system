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

// Phase 293: eBay Buyer Analytics（バイヤー分析）
// テーマカラー: pink-600

export default function EbayBuyerAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-buyer-analytics/dashboard', fetcher);
  const { data: buyersData } = useSWR('/api/ebay-buyer-analytics/buyers', fetcher);
  const { data: segmentsData } = useSWR('/api/ebay-buyer-analytics/segments', fetcher);
  const { data: behaviorData } = useSWR('/api/ebay-buyer-analytics/behavior', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-pink-600">バイヤー分析</h1>
        <p className="text-gray-600">バイヤーの行動分析・セグメント管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="buyers">バイヤー</TabsTrigger>
          <TabsTrigger value="segments">セグメント</TabsTrigger>
          <TabsTrigger value="behavior">行動分析</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">総バイヤー数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-pink-600">{dashboardData?.totalBuyers?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">リピート率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.repeatRate || 0}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">平均購入額</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">${dashboardData?.avgOrderValue || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">VIPバイヤー</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{dashboardData?.vipBuyers || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>最近のバイヤー</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Alice', lastPurchase: '2026-02-17', amount: 125, segment: 'VIP' },
                    { name: 'Bob', lastPurchase: '2026-02-16', amount: 89, segment: 'Regular' },
                    { name: 'Carol', lastPurchase: '2026-02-15', amount: 220, segment: 'VIP' },
                  ].map((buyer, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{buyer.name}</div><div className="text-sm text-gray-500">{buyer.lastPurchase} • ${buyer.amount}</div></div>
                      <Badge className={buyer.segment === 'VIP' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}>{buyer.segment}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>セグメント分布</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'VIP', percent: 8 },{ name: 'Regular', percent: 65 },{ name: 'New', percent: 27 }].map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{item.name}</span><span className="text-sm">{item.percent}%</span></div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="buyers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>バイヤー一覧</CardTitle><CardDescription>登録バイヤーを管理</CardDescription></div>
                <Button className="bg-pink-600 hover:bg-pink-700">+ バイヤー追加</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="バイヤー名で検索..." className="max-w-md" />
                <Select><SelectTrigger className="w-40"><SelectValue placeholder="セグメント" /></SelectTrigger><SelectContent><SelectItem value="all">全て</SelectItem><SelectItem value="vip">VIP</SelectItem><SelectItem value="regular">Regular</SelectItem><SelectItem value="new">New</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-3">
                {(buyersData?.buyers || [
                  { id: 'b1', name: 'Alice', totalPurchases: 12, lifetimeValue: 1250, segment: 'VIP' },
                  { id: 'b2', name: 'Bob', totalPurchases: 5, lifetimeValue: 480, segment: 'Regular' },
                  { id: 'b3', name: 'Carol', totalPurchases: 19, lifetimeValue: 2200, segment: 'VIP' },
                ]).map((buyer: any) => (
                  <div key={buyer.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">{buyer.name.charAt(0)}</div>
                      <div><div className="font-medium">{buyer.name}</div><div className="text-sm text-gray-500">{buyer.totalPurchases} 回購入 • LTV ${buyer.lifetimeValue}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={buyer.segment === 'VIP' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}>{buyer.segment}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>セグメント管理</CardTitle><CardDescription>バイヤーセグメントを定義・管理</CardDescription></div>
                <Button className="bg-pink-600 hover:bg-pink-700">+ セグメント作成</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(segmentsData?.segments || [
                  { id: 's1', name: 'VIP', criteria: 'LTV > 1500', size: 120 },
                  { id: 's2', name: 'Regular', criteria: '2 <= purchases <= 10', size: 980 },
                  { id: 's3', name: 'New', criteria: 'First purchase in 30 days', size: 410 },
                ]).map((seg: any) => (
                  <div key={seg.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${seg.name === 'VIP' ? 'bg-yellow-500' : seg.name === 'Regular' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                      <div><div className="font-medium">{seg.name}</div><div className="text-sm text-gray-500">{seg.criteria} • {seg.size} バイヤー</div></div>
                    </div>
                    <div className="flex gap-2"><Button variant="outline" size="sm">編集</Button><Button variant="outline" size="sm">表示</Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">閲覧→購入率</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-pink-600">{behaviorData?.viewToPurchaseRate || 8.6}%</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">平均セッション</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{behaviorData?.avgSessionMinutes || 5.4} 分</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">カゴ落ち率</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{behaviorData?.cartAbandonmentRate || 71}%</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">リピート購入率</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{behaviorData?.repeatPurchaseRate || 35}%</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>コンバージョンファネル</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { stage: 'View', rate: 100 },
                  { stage: 'Add to Cart', rate: 38 },
                  { stage: 'Checkout', rate: 22 },
                  { stage: 'Purchase', rate: 8.6 },
                ].map((item) => (
                  <div key={item.stage}>
                    <div className="flex justify-between mb-1"><span className="text-sm font-medium">{item.stage}</span><span className="text-sm">{item.rate}%</span></div>
                    <Progress value={item.rate} className="h-3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>レポート</CardTitle><CardDescription>バイヤー分析レポートを生成・管理</CardDescription></div>
                <Button className="bg-pink-600 hover:bg-pink-700">+ レポート生成</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: 'r1', title: 'Monthly Buyer Summary', createdAt: '2026-02-01', status: 'completed' },
                  { id: 'r2', title: 'VIP Behavior Deep Dive', createdAt: '2026-02-12', status: 'running' },
                ].map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div><div className="font-medium">{report.title}</div><div className="text-sm text-gray-500">{report.createdAt}</div></div>
                    <div className="flex items-center gap-2">
                      <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>{report.status}</Badge>
                      {report.status === 'completed' && <Button variant="outline" size="sm">ダウンロード</Button>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>設定</CardTitle><CardDescription>バイヤー分析の設定</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">アラート閾値</label><Input type="number" defaultValue={75} /></div>
                <div><label className="text-sm font-medium">リテンション期間</label><Select><SelectTrigger><SelectValue placeholder="30日" /></SelectTrigger><SelectContent><SelectItem value="30">30日</SelectItem><SelectItem value="60">60日</SelectItem><SelectItem value="90">90日</SelectItem></SelectContent></Select></div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div><div className="font-medium">自動セグメント分類</div><div className="text-sm text-gray-500">バイヤーを自動的にセグメントに分類</div></div>
                <Button variant="outline">有効</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div><div className="font-medium">通知</div><div className="text-sm text-gray-500">重要なバイヤー行動を通知</div></div>
                <Button variant="outline">有効</Button>
              </div>
              <Button className="bg-pink-600 hover:bg-pink-700">設定を保存</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 283: eBay Customer Insights（顧客インサイト）
// テーマカラー: violet-600

export default function EbayCustomerInsightsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-customer-insights/dashboard', fetcher);
  const { data: customersData } = useSWR('/api/ebay-customer-insights/customers', fetcher);
  const { data: segmentsData } = useSWR('/api/ebay-customer-insights/segments', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-customer-insights/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-violet-600">顧客インザイト</h1>
        <p className="text-gray-600">顧客行動の分析と予渪</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="customers">顧客</TabsTrigger>
          <TabsTrigger value="segments">セグメント</TabsTrigger>
          <TabsTrigger value="behavior">行動分析</TabsTrigger>
          <TabsTrigger value="predictions">予測</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">総顧客数</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-violet-600">{dashboardData?.totalCustomers?.toLocaleString() || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">今月の新規</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.newCustomersThisMonth || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">平均LTV</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${dashboardData?.avgLifetimeValue || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">NPS</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardData?.npsScore || 0}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>セグメント別</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ segment: 'VIP', count: 500, revenue: 150000 },{ segment: 'Regular', count: 1500, revenue: 200000 },{ segment: 'New', count: 2000, revenue: 100000 }].map((s) => (<div key={s.segment} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><div className="font-medium">{s.segment}</div><div className="text-sm text-gray-500">{s.count}人</div></div><div className="text-right font-bold">${s.revenue.toLocaleString()}</div></div>))}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>アラート</CardTitle></CardHeader><CardContent><div className="space-y-2"><div className="p-3 bg-red-50 border-l-4 border-red-400 rounded"><p className="text-sm font-medium text-red-800">離脱リスク</p><p className="text-sm text-red-700">50人の顧客が離脱リスク</p></div><div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm font-medium text-yellow-800">VIP未購入</p><p className="text-sm text-yellow-700">5人のVIP顧客が30日以上未跼入</p></div></div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <Card><CardHeader><div className="flex justify-between"><CardTitle>顧客一覧</CardTitle><Input placeholder="検索…" className="max-w-xs" /></div></CardHeader><CardContent><div className="space-y-3">{customersData?.customers?.map((c: any) => (<div key={c.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center font-bold text-violet-600">{c.name.charAt(0)}</div><div><div className="font-medium">{c.name}</div><div className="text-sm text-gray-500">{c.orders}件注文</div></div></div><div className="flex items-center gap-4"><div className="font-bold">${c.ltv}</div><Badge>{c.segment}</Badge><Button variant="outline" size="sm">詳細</Button></div></div>))}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card><CardHeader><div className="flex justify-between"><CardTitle>セグメント</CardTitle><Button className="bg-violet-600 hover:bg-violet-700">新規作成</Button></div></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{segmentsData?.segments?.map((s: any) => (<Card key={s.id}><CardHeader><CardTitle className="text-lg">{s.name}</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-violet-600 mb-2">{s.count}</div><div className="text-sm text-gray-500">平均LTV: ${s.avgLtv}</div></CardContent></Card>))}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="behavior">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>賷買パターン</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ pattern: 'Weekend Shoppers', count: 1200 },{ pattern: 'Bulk Buyers', count: 300 }].map((p) => (<div key={p.pattern} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="font-medium">{p.pattern}</div><div>{p.count}亰</div></div>))}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>コンバージョンファネル</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ stage: 'View', count: 10000 },{ stage: 'Cart', count: 2000 },{ stage: 'Purchase', count: 800 }].map((f) => (<div key={f.stage}><div className="flex justify-between mb-1"><span>{f.stage}</span><span>{f.count}</span></div><Progress value={(f.count / 10000) * 100} className="h-2" /></div>))}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>離脱リスク</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ name: 'Tom Brown', probability: 85 },{ name: 'Sarah Lee', probability: 72 }].map((c) => (<div key={c.name} className="flex items-center justify-between p-3 bg-red-50 rounded-lg"><div className="font-medium">{c.name}</div><Badge className="bg-red-100 text-red-700">{c.probability}%</Badge></div>))}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>LTV予測</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ name: 'John Smith', current: 2500, predicted: 3500 }].map((c) => (<div key={c.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><div className="font-medium">{c.name}</div><div className="text-sm">${c.current} → ${c.predicted}</div></div><Badge className="bg-green-100 text-green-700">+40%</Badge></div>))}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>セグメント設定</CardTitle></CardHeader><CardContent className="space-y-4"><div><label className="text-sm font-medium">VIP閾値</label><Input type="number" defaultValue={settingsData?.vipThreshold} /></div><div><label className="text-sm font-medium">雠脱判定日数</label><Input type="number" defaultValue={settingsData?.churnDays} /></div></CardContent></Card>
            <Card><CardHeader><CardTitle>通知設定</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><span>離脱リスク通知</span><Badge variant={settingsData?.notifyOnChurnRisk ? "default" : "secondary"}>{settingsData?.notifyOnChurnRisk ? 'ON' : 'OFF'}</Badge></div></CardContent></Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-violet-600 hover:bg-violet-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

// Phase 284: eBay Listing Scheduler（出品スケジューラー）
// テーマカラー: rose-600

export default function EbayListingSchedulerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-listing-scheduler/dashboard', fetcher);
  const { data: schedulesData } = useSWR('/api/ebay-listing-scheduler/schedules', fetcher);
  const { data: recurringData } = useSWR('/api/ebay-listing-scheduler/recurring', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-listing-scheduler/settings', fetcher);

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'PUBLISH': return '出品';
      case 'END': return '終了';
      case 'REVISE': return '修正しました';
      case 'RELIST': return '再出品';
      default: return action;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-rose-600">出品スケジューラー</h1>
        <p className="text-gray-600">出品の時間指定登録</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="schedules">スケジュール</TabsTrigger>
          <TabsTrigger value="recurring">繁り返し</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
          <TabsTrigger value="optimal">最適出品時間</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">本日予定</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-rose-600">{dashboardData?.scheduledToday || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">完了済み</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.completedToday || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">失敗</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{dashboardData?.failedToday || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">攐功率</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">96%</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>今後の予定</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ title: 'Seiko 5 Sports', action: 'PUBLISH', time: '14:00' },{ title: 'Citizen Eco-Drive', action: 'REVISE', time: '15:00' }].map((s) => (<div key={s.title} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><div className="font-medium">{s.title}</div><div className="text-sm text-gray-500">{s.time}</div></div><Badge>{getActionLabel(s.action)}</Badge></div>))}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>アクション劈</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ action: 'PUBLISH', count: 300, percent: 60 },{ action: 'REVISE', count: 100, percent: 20 },{ action: 'RELIST', count: 75, percent: 15 }].map((a) => (<div key={a.action}><div className="flex justify-between mb-1"><span>{getActionLabel(a.action)}</span><span>{a.count}件</span></div><Progress value={a.percent} className="h-2" /></div>))}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="schedules">
          <Card><CardHeader><div className="flex justify-between"><CardTitle>スケジュール一覽</CardTitle><Button className="bg-rose-600 hover:bg-rose-700">新規作成</Button></div></CardHeader><CardContent><div className="space-y-3">{schedulesData?.schedules?.map((s: any) => (<div key={s.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"><div><div className="font-medium">{s.title}</div><div className="text-sm text-gray-500">{s.scheduledAt}</div></div><div className="flex items-center gap-4"><Badge variant="outline">{getActionLabel(s.action)}</Badge><Badge>{s.status}</Badge><Button variant="outline" size="sm">編集</Button></div></div>))}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="recurring">
          <Card><CardHeader><div className="flex justify-between"><CardTitle>繰り返しスケジュール</CardTitle><Button className="bg-rose-600 hover:bg-rose-700">新規作成</Button></div></CardHeader><CardContent><div className="space-y-3">{recurringData?.recurring?.map((r: any) => (<div key={r.id} className="flex items-center justify-between p-4 border rounded-lg"><div><div className="font-medium">{r.name}</div><div className="text-sm text-gray-500">{r.frequency} {r.time}</div></div><div className="flex items-center gap-4"><span>{r.items}件</span><Button variant="outline" size="sm">編集</Button></div></div>))}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="history">
          <Card><CardHeader><CardTitle>実行履歴</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ title: 'Seiko 5 Sports', action: 'PUBLISH', status: 'COMPLETED', time: '14:00' },{ title: 'Citizen Eco-Drive', action: 'REVISE', status: 'COMPLETED', time: '15:00' },{ title: 'Orient Bambino', action: 'RELIST', status: 'FAILED', time: '16:00' }].map((h, idx) => (<div key={idx} className="flex items-center justify-between p-4 border rounded-lg"><div><div className="font-medium">{h.title}</div><div className="text-sm text-gray-500">{h.action} - {h.time}</div></div><Badge className={h.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{h.status === 'COMPLETED' ? '完了' : '失敗'}</Badge></div>))}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="optimal">
          <Card><CardHeader><CardTitle>最適出品時間</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="p-4 bg-rose-50 rounded-lg text-center"><div className="text-4xl font-bold text-rose-600">18:00</div><div className="text-gray-500">最適時閑</div></div><div className="p-4 bg-rose-50 rounded-lg text-center"><div className="text-4xl font-bold text-rose-600">Saturday</div><div className="text-gray-500">最適日</div></div></div></CardContent></Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>基本設定</CardTitle></CardHeader><CardContent className="space-y-4"><div><label className="text-sm font-medium">デフォルト時間</label><Input defaultValue={settingsData?.defaultTime} /></div><div><label className="text-sm font-medium">タイムゾーン</label><Input defaultValue={settingsData?.timezone} /></div></CardContent></Card>
            <Card><CardHeader><CardTitle>自動化設定</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><span>自動リトライ</span><Badge variant={settingsData?.autoRetry ? "default" : "secondary"}>{settingsData?.autoRetry ? 'ON' : 'OFF'}</Badge></div><div className="flex items-center justify-between"><span>失敗通知</span><Badge variant={settingsData?.notifyOnFail ? "default" : "secondary"}>{settingsData?.notifyOnFail ? 'ON' : 'OFF'}</Badge></div></CardContent></Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-rose-600 hover:bg-rose-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

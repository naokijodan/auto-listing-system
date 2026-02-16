'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function EbayKeywordResearchPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-keyword-research/dashboard', fetcher);
  const { data: savedData } = useSWR('/api/ebay-keyword-research/saved', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-keyword-research/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-amber-600">キーワードリサーチ</h1>
        <p className="text-gray-600">一気キーワードとトレンド文偤</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="search">検索</TabsTrigger>
          <TabsTrigger value="saved">保存</TabsTrigger>
          <TabsTrigger value="lists">リスト</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="settings">設定殺容</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">総キーワード</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-amber-600">{dashboardData?.totalKeywords?.toLocaleString() || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">トレンディング</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">+{dashboardData?.trendingKeywords || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">保存済み</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardData?.savedKeywords || 0}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">平均検索量</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{dashboardData?.avgSearchVolume?.toLocaleString() || 0}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle>トレンディングキーワード</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ keyword: 'vintage seiko', volume: 15000, change: 25 },{ keyword: 'g-shock limited', volume: 12000, change: 18 },{ keyword: 'omega seamaster', volume: 9500, change: 12 }].map((item) => (<div key={item.keyword} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div><div className="font-medium">{item.keyword}</div><div className="text-sm text-gray-500">{{item.volume.toLocaleString()}} 検索</div></div><Badge className="bg-green-100 text-green-700">+{item.change}%</Badge></div>))}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>カテゴリ別</CardTitle></CardHeader><CardContent><div className="space-y-3">{[{ category: 'Watches', keywords: 1500, volume: 8500 },{ category: 'Electronics', keywords: 1200, volume: 12000 },{ category: 'Collectibles', keywords: 800, volume: 5500 }].map((item) => (<div key={item.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="font-medium">{item.category}</div><div className="text-right"><div className="font-bold">{item.keywords}キーワード</div><div className="text-sm text-gray-500">平均: {item.volume.toLocaleString()}</div></div></div>))}</div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="search"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><Card><CardHeader><CardTitle>キーワード検索</CardTitle><CardDescription>キーワードを入力して検索ほ分析</CardDescription></CardHeader><CardContent className="space-y-4"><Input placeholder="キーワードを入力.…" /><Button className="w-full bg-amber-600 hover:bg-amber-700">検素すれ</Button></CardContent></Card><Card><CardHeader><CardTitle>検索結果</CardTitle></CardHeader><CardContent><div className="text-center text-gray-500">キーワードを入力してください</div></CardContent></Card></div></TabsContent>

        <TabsContent value="saved"><Card><CardHeader><CardTitle>保存キーワード</CardTitle></CardHeader><CardContent><div className="space-y-3">{savedData?.keywords?.map((kw: any) => (<div key={kw.id} className="flex items-center justify-between p-4 border rounded-lg"><div><div className="font-medium">{kw.keyword}</div><div className="text-sm text-gray-500">検索量: {kw.volume?.toLocaleString()}</div></div><Button variant="outline" size="sm">削除</Button></div>))}</div></CardContent></Card></TabsContent>

        <TabsContent value="lists"><Card><CardHeader><div className="flex justify-between"><CardTitle>キーワードリスト</CardTitle><Button className="bg-amber-600 hover:bg-amber-700">新規作成</Button></div></CardHeader><CardContent><div className="text-center text-gray-500">リストを作成してキーワードを管理</div></CardContent></Card></TabsContent>

        <TabsContent value="reports"><Card><CardHeader><CardTitle>レポート</CardTitle></CardHeader><CardContent><div className="text-center text-gray-500">レポート機能は開発中</div></CardContent></Card></TabsContent>

        <TabsContent value="settings"><Card><CardHeader><CardTitle>設定定宕</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center justify-between"><div><div className="font-medium">検索履歴保存</div></div><Badge variant={settingsData?.saveSearchHistory ? 'default' : 'secondary'}>{settingsData?.saveSearchHistory ? 'ON' : 'OFF'}</Badge></div><div className="flex items-center justify-between"><div><div className="font-medium">トレンディング通知</div></div><Badge variant={settingsData?.notifyOnTrending ? 'default' : 'secondary'}>{settingsData?.notifyOnTrending ? 'ON' : 'OFF'}</Badge></div></CardContent></Card><div className="mt-6 flex justify-end"><Button className="bg-amber-600 hover:bg-amber-700">設定を保存</Button></div></TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import React from 'react';
import useSWR from 'swr';
// shadcn/ui components (paths follow common shadcn setup)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TabPanel: React.FC<{ title: string; path: string }> = ({ title, path }) => {
  const { data, error, isLoading } = useSWR(path, fetcher);
  return (
    <Card className="p-4 space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      {isLoading && <p>読み込み中...</p>}
      {error && <p className="text-red-600">エラーが発生しました</p>}
      {!isLoading && !error && (
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      )}
    </Card>
  );
};

export default function CompetitorWatchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-purple-600">競合ウォッチ</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="competitors">競合</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TabPanel title="ダッシュボード" path="/api/ebay-competitor-watch/dashboard" />
        </TabsContent>
        <TabsContent value="competitors">
          <TabPanel title="競合" path="/api/ebay-competitor-watch/competitors" />
        </TabsContent>
        <TabsContent value="products">
          <TabPanel title="商品" path="/api/ebay-competitor-watch/products" />
        </TabsContent>
        <TabsContent value="alerts">
          <TabPanel title="アラート" path="/api/ebay-competitor-watch/alerts" />
        </TabsContent>
        <TabsContent value="analytics">
          <TabPanel title="分析" path="/api/ebay-competitor-watch/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <TabPanel title="設定" path="/api/ebay-competitor-watch/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


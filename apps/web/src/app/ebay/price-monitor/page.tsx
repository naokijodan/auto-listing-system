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

export default function PriceMonitorPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-amber-600">価格モニター</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="monitors">モニタリング</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TabPanel title="ダッシュボード" path="/api/ebay-price-monitor/dashboard" />
        </TabsContent>
        <TabsContent value="monitors">
          {/* monitors は CRUD+start/stop 構成のため単一 ID 例示 */}
          <TabPanel title="モニタリング" path="/api/ebay-price-monitor/monitors/1" />
        </TabsContent>
        <TabsContent value="rules">
          <TabPanel title="ルール" path="/api/ebay-price-monitor/rules" />
        </TabsContent>
        <TabsContent value="alerts">
          <TabPanel title="アラート" path="/api/ebay-price-monitor/alerts" />
        </TabsContent>
        <TabsContent value="analytics">
          <TabPanel title="分析" path="/api/ebay-price-monitor/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <TabPanel title="設定" path="/api/ebay-price-monitor/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


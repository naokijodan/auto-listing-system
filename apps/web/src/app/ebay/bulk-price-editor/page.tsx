
'use client';

import React from 'react';
import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function DataBlock({ url }: { url: string }) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (error) return <div className="text-sm text-red-600">Error: {String(error)}</div>;
  return <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>;
}

export default function BulkPriceEditorPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-indigo-600">一括価格編集</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="prices">価格</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <DataBlock url="/api/ebay-bulk-price-editor/dashboard/overview" />
        </TabsContent>
        <TabsContent value="prices">
          <DataBlock url="/api/ebay-bulk-price-editor/prices" />
        </TabsContent>
        <TabsContent value="rules">
          <DataBlock url="/api/ebay-bulk-price-editor/rules" />
        </TabsContent>
        <TabsContent value="history">
          <DataBlock url="/api/ebay-bulk-price-editor/history" />
        </TabsContent>
        <TabsContent value="analytics">
          <DataBlock url="/api/ebay-bulk-price-editor/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <DataBlock url="/api/ebay-bulk-price-editor/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

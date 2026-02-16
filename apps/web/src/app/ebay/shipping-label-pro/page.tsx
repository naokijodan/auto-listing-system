'use client';

import React from 'react';
import useSWR from 'swr';

// shadcn/ui components (project-typical import paths)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const BASE = '/api/ebay-shipping-label-pro';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function DataPanel({ path, title }: { path: string; title: string }) {
  const { data, error, isValidating } = useSWR(`${BASE}${path}`, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-cyan-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600">Error: {String(error.message || error)}</div>}
        {!error && (isValidating || !data) && <div>Loading...</div>}
        {!error && data && (
          <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded border">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function ShippingLabelProPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-cyan-600">送り状Pro</h1>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="labels">ラベル</TabsTrigger>
          <TabsTrigger value="carriers">キャリア</TabsTrigger>
          <TabsTrigger value="batches">バッチ</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DataPanel title="ダッシュボード概要" path="/dashboard/summary" />
        </TabsContent>

        <TabsContent value="labels">
          <DataPanel title="ラベル詳細" path="/labels/demo-id" />
        </TabsContent>

        <TabsContent value="carriers">
          <DataPanel title="キャリア一覧" path="/carriers" />
        </TabsContent>

        <TabsContent value="batches">
          <DataPanel title="バッチ一覧" path="/batches" />
        </TabsContent>

        <TabsContent value="analytics">
          <DataPanel title="分析" path="/analytics" />
        </TabsContent>

        <TabsContent value="settings">
          <DataPanel title="設定" path="/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


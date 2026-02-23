'use client';

import useSWR from 'swr';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="mt-2 rounded bg-gray-50 p-3 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}

export default function InventoryValuationToolPage() {
  const base = '/api/ebay-inventory-valuation-tool';
  const { data: dashboard } = useSWR(`${base}/dashboard`, fetcher);
  const { data: valuations } = useSWR(`${base}/valuations`, fetcher);
  const { data: categories } = useSWR(`${base}/categories`, fetcher);
  const { data: reports } = useSWR(`${base}/reports`, fetcher);
  const { data: analytics } = useSWR(`${base}/analytics`, fetcher);
  const { data: settings } = useSWR(`${base}/settings`, fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">在庫評価ツール</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="valuations">評価</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={dashboard} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="valuations">
          <Card>
            <CardHeader>
              <CardTitle>評価</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={valuations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={categories} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>レポート</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={reports} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={analytics} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={settings} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


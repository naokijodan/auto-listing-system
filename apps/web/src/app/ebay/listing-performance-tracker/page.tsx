// @ts-nocheck
'use client'

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';
import React from 'react';

type TabKey = 'dashboard' | 'listings' | 'metrics' | 'benchmarks' | 'analytics' | 'settings';

const fetcher = async (url: string): Promise<unknown> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return (await res.json()) as unknown;
};

function TabPanel({ endpoint }: { endpoint: string }) {
  const { data, error, isLoading } = useSWR(endpoint, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle>APIレスポンス</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div>読み込み中...</div>}
        {error && <div>エラーが発生しました</div>}
        {!isLoading && !error && (
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function ListingPerformanceTrackerPage() {
  const base = '/api/ebay-listing-performance-tracker';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-teal-600">出品パフォーマンストラッカー</h1>
      <Tabs defaultValue={'dashboard' satisfies TabKey}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="listings">出品一覧</TabsTrigger>
          <TabsTrigger value="metrics">メトリクス</TabsTrigger>
          <TabsTrigger value="benchmarks">ベンチマーク</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TabPanel endpoint={`${base}/dashboard`} />
        </TabsContent>
        <TabsContent value="listings">
          <TabPanel endpoint={`${base}/listings`} />
        </TabsContent>
        <TabsContent value="metrics">
          <TabPanel endpoint={`${base}/metrics`} />
        </TabsContent>
        <TabsContent value="benchmarks">
          <TabPanel endpoint={`${base}/benchmarks`} />
        </TabsContent>
        <TabsContent value="analytics">
          <TabPanel endpoint={`${base}/analytics`} />
        </TabsContent>
        <TabsContent value="settings">
          <TabPanel endpoint={`${base}/settings`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


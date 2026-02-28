
'use client'

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import React from 'react';

type TabKey = 'dashboard' | 'rates' | 'carriers' | 'rules' | 'analytics' | 'settings';

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

export default function ShippingRateComparatorPage() {
  const base = '/api/ebay-shipping-rate-comparator';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-pink-600">送料比較ツール</h1>
      <Tabs defaultValue={'dashboard' satisfies TabKey}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="rates">料金比較</TabsTrigger>
          <TabsTrigger value="carriers">配送業者</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TabPanel endpoint={`${base}/dashboard`} />
        </TabsContent>
        <TabsContent value="rates">
          <TabPanel endpoint={`${base}/rates`} />
        </TabsContent>
        <TabsContent value="carriers">
          <TabPanel endpoint={`${base}/carriers`} />
        </TabsContent>
        <TabsContent value="rules">
          <TabPanel endpoint={`${base}/rules`} />
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


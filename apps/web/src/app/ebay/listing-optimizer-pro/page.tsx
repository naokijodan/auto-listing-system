
'use client';

import useSWR from 'swr';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="mt-2 rounded bg-gray-50 p-3 text-xs overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ListingOptimizerProPage() {
  const { data: dashboard } = useSWR('/api/ebay-listing-optimizer-pro/dashboard', fetcher);
  const { data: optimizations } = useSWR('/api/ebay-listing-optimizer-pro/optimizations', fetcher);
  const { data: suggestions } = useSWR('/api/ebay-listing-optimizer-pro/suggestions', fetcher);
  const { data: abtests } = useSWR('/api/ebay-listing-optimizer-pro/ab-tests', fetcher);
  const { data: analytics } = useSWR('/api/ebay-listing-optimizer-pro/analytics', fetcher);
  const { data: settings } = useSWR('/api/ebay-listing-optimizer-pro/settings', fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-green-600">出品最適化Pro</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="optimizations">最適化</TabsTrigger>
          <TabsTrigger value="suggestions">提案</TabsTrigger>
          <TabsTrigger value="abtests">A/Bテスト</TabsTrigger>
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

        <TabsContent value="optimizations">
          <Card>
            <CardHeader>
              <CardTitle>最適化</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={optimizations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle>提案</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={suggestions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abtests">
          <Card>
            <CardHeader>
              <CardTitle>A/Bテスト</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={abtests} />
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


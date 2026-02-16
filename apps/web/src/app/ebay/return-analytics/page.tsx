'use client';

import useSWR from 'swr';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="mt-2 rounded bg-gray-50 p-3 text-xs overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ReturnAnalyticsPage() {
  const { data: dashboard } = useSWR('/api/ebay-return-analytics/dashboard', fetcher);
  const { data: returns } = useSWR('/api/ebay-return-analytics/returns', fetcher);
  const { data: patterns } = useSWR('/api/ebay-return-analytics/patterns', fetcher);
  const { data: prevention } = useSWR('/api/ebay-return-analytics/prevention', fetcher);
  const { data: analytics } = useSWR('/api/ebay-return-analytics/analytics', fetcher);
  const { data: settings } = useSWR('/api/ebay-return-analytics/settings', fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-red-600">返品分析</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="returns">返品</TabsTrigger>
          <TabsTrigger value="patterns">パターン</TabsTrigger>
          <TabsTrigger value="prevention">予防</TabsTrigger>
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

        <TabsContent value="returns">
          <Card>
            <CardHeader>
              <CardTitle>返品一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={returns} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>パターン</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={patterns} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prevention">
          <Card>
            <CardHeader>
              <CardTitle>予防</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={prevention} />
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


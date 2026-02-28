
'use client';

import useSWR from 'swr';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="mt-2 rounded bg-gray-50 p-3 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}

export default function WarrantyManagerPage() {
  const base = '/api/ebay-warranty-manager';
  const { data: dashboard } = useSWR(`${base}/dashboard`, fetcher);
  const { data: warranties } = useSWR(`${base}/warranties`, fetcher);
  const { data: claims } = useSWR(`${base}/claims`, fetcher);
  const { data: policies } = useSWR(`${base}/policies`, fetcher);
  const { data: analytics } = useSWR(`${base}/analytics`, fetcher);
  const { data: settings } = useSWR(`${base}/settings`, fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-sky-600">保証管理</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="warranties">保証</TabsTrigger>
          <TabsTrigger value="claims">クレーム</TabsTrigger>
          <TabsTrigger value="policies">ポリシー</TabsTrigger>
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

        <TabsContent value="warranties">
          <Card>
            <CardHeader>
              <CardTitle>保証</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={warranties} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <Card>
            <CardHeader>
              <CardTitle>クレーム</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={claims} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader>
              <CardTitle>ポリシー</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={policies} />
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


// @ts-nocheck
'use client';

import useSWR from 'swr';
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonBlock({ data }: { data: unknown }) {
  return <pre className="mt-2 rounded bg-gray-50 p-3 text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
}

export default function CrossBorderTaxCalculatorPage() {
  const base = '/api/ebay-cross-border-tax-calculator';
  const { data: dashboard } = useSWR(`${base}/dashboard`, fetcher);
  const { data: calculations } = useSWR(`${base}/calculations`, fetcher);
  const { data: countries } = useSWR(`${base}/countries`, fetcher);
  const { data: rules } = useSWR(`${base}/rules`, fetcher);
  const { data: analytics } = useSWR(`${base}/analytics`, fetcher);
  const { data: settings } = useSWR(`${base}/settings`, fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-lime-600">越境税金計算機</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="calculations">税金計算</TabsTrigger>
          <TabsTrigger value="countries">国別</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
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

        <TabsContent value="calculations">
          <Card>
            <CardHeader>
              <CardTitle>税金計算</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={calculations} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries">
          <Card>
            <CardHeader>
              <CardTitle>国別</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={countries} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>ルール</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonBlock data={rules} />
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


'use client';

import React from 'react';
import useSWR from 'swr';

// shadcn/ui components (assumed available in the host project)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function DataCard({ title, endpoint }: { title: string; endpoint: string }) {
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher, { revalidateOnFocus: false });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          再読み込み
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラーが発生しました</div>}
        {!isLoading && !error && (
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function SellerDashboardProPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-violet-600">セラーダッシュボードPro</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="widgets">ウィジェット</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="benchmarks">ベンチマーク</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DataCard title="ダッシュボード" endpoint="/api/ebay-seller-dashboard-pro/dashboard" />
        </TabsContent>
        <TabsContent value="widgets">
          <DataCard title="ウィジェット" endpoint="/api/ebay-seller-dashboard-pro/widgets" />
        </TabsContent>
        <TabsContent value="reports">
          <DataCard title="レポート" endpoint="/api/ebay-seller-dashboard-pro/reports" />
        </TabsContent>
        <TabsContent value="benchmarks">
          <DataCard title="ベンチマーク" endpoint="/api/ebay-seller-dashboard-pro/benchmarks" />
        </TabsContent>
        <TabsContent value="analytics">
          <DataCard title="分析" endpoint="/api/ebay-seller-dashboard-pro/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <DataCard title="設定" endpoint="/api/ebay-seller-dashboard-pro/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


'use client';

import React from 'react';
import useSWR from 'swr';
// shadcn/ui Tabs primitives (assumed available in project)
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function DataBlock({ url }: { url: string }) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  if (error) return <div className="text-sm text-red-600">Error: {String(error)}</div>;
  return <pre className="text-xs bg-gray-50 p-3 rounded border overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>;
}

export default function ShippingProfileManagerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-teal-600">送料プロファイル管理</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="profiles">プロファイル</TabsTrigger>
          <TabsTrigger value="zones">ゾーン</TabsTrigger>
          <TabsTrigger value="rates">料金</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <DataBlock url="/api/ebay-shipping-profile/dashboard/overview" />
        </TabsContent>
        <TabsContent value="profiles">
          <DataBlock url="/api/ebay-shipping-profile/profiles" />
        </TabsContent>
        <TabsContent value="zones">
          <DataBlock url="/api/ebay-shipping-profile/zones" />
        </TabsContent>
        <TabsContent value="rates">
          <DataBlock url="/api/ebay-shipping-profile/rates" />
        </TabsContent>
        <TabsContent value="analytics">
          <DataBlock url="/api/ebay-shipping-profile/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <DataBlock url="/api/ebay-shipping-profile/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

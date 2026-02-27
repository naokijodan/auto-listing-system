// @ts-nocheck
'use client';

import React from 'react';
import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Block({ title, url }: { title: string; url: string }) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  return (
    <div className="space-y-2">
      <h2 className="font-medium text-sm text-gray-500">{title}</h2>
      <div className="rounded-md border p-3 text-sm">
        {isLoading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラーが発生しました</div>}
        {!isLoading && !error && (
          <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

export default function PriceAlertsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-sky-600">価格アラート</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <Block title="サマリー" url="/api/ebay-price-alerts/dashboard/summary" />
          <Block title="トレンド" url="/api/ebay-price-alerts/dashboard/trends" />
          <Block title="有効アラート" url="/api/ebay-price-alerts/dashboard/active-alerts" />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Block title="アラート一覧" url="/api/ebay-price-alerts/alerts" />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <Block title="ルール一覧" url="/api/ebay-price-alerts/rules" />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Block title="通知一覧" url="/api/ebay-price-alerts/notifications" />
          <Block title="通知チャンネル" url="/api/ebay-price-alerts/notifications/channels" />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Block title="分析サマリー" url="/api/ebay-price-alerts/analytics" />
          <Block title="有効性" url="/api/ebay-price-alerts/analytics/effectiveness" />
          <Block title="商品別" url="/api/ebay-price-alerts/analytics/products" />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Block title="設定" url="/api/ebay-price-alerts/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


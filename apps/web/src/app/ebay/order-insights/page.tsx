
'use client';

import React from 'react';
import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type DataProps = { title: string; url: string };

function DataBlock({ title, url }: DataProps) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  return (
    <div className="rounded border p-4 space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {isLoading && <p>読み込み中...</p>}
      {error && <p className="text-red-600">エラーが発生しました</p>}
      {data && (
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
      )}
    </div>
  );
}

export default function OrderInsightsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-indigo-600">オーダーインサイト</h1>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="orders">注文分析</TabsTrigger>
          <TabsTrigger value="patterns">パターン</TabsTrigger>
          <TabsTrigger value="predictions">予測</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <DataBlock title="サマリー" url="/api/ebay-order-insights/dashboard/summary" />
          <DataBlock title="トレンド" url="/api/ebay-order-insights/dashboard/trends" />
          <DataBlock title="KPI" url="/api/ebay-order-insights/dashboard/kpis" />
          <DataBlock title="アラート" url="/api/ebay-order-insights/dashboard/alerts" />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <DataBlock title="注文一覧" url="/api/ebay-order-insights/orders" />
          <DataBlock title="比較" url="/api/ebay-order-insights/orders/compare" />
          <DataBlock title="セグメント" url="/api/ebay-order-insights/orders/segment" />
          <DataBlock title="エクスポート" url="/api/ebay-order-insights/orders/export" />
          <DataBlock title="リフレッシュ" url="/api/ebay-order-insights/orders/refresh" />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <DataBlock title="パターン一覧" url="/api/ebay-order-insights/patterns" />
          <DataBlock title="検出" url="/api/ebay-order-insights/patterns/detect" />
          <DataBlock title="適用" url="/api/ebay-order-insights/patterns/apply" />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <DataBlock title="予測一覧" url="/api/ebay-order-insights/predictions" />
          <DataBlock title="生成" url="/api/ebay-order-insights/predictions/generate" />
          <DataBlock title="精度" url="/api/ebay-order-insights/predictions/accuracy" />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <DataBlock title="分析サマリー" url="/api/ebay-order-insights/analytics" />
          <DataBlock title="売上" url="/api/ebay-order-insights/analytics/revenue" />
          <DataBlock title="顧客" url="/api/ebay-order-insights/analytics/customers" />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <DataBlock title="設定取得" url="/api/ebay-order-insights/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


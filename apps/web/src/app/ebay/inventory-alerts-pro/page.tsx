
'use client';

import React from 'react';
import useSWR from 'swr';

// shadcn/ui components (assumed path aliases)
// Adjust imports to your project setup if needed
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Section({ title, endpoint }: { title: string; endpoint: string }) {
  const { data, error, isLoading, mutate } = useSWR(endpoint, fetcher);
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{title}</span>
          <Badge variant="secondary">{endpoint}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラーが発生しました</div>}
        {!isLoading && !error && (
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
        <div className="mt-3">
          <Button variant="outline" onClick={() => mutate()}>
            再読み込み
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InventoryAlertsProPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-rose-600">在庫アラートPro</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <Section title="ダッシュボード: 概要" endpoint="/api/ebay-inventory-alerts-pro/dashboard" />
          <div className="grid md:grid-cols-3 gap-4">
            <Section title="統計" endpoint="/api/ebay-inventory-alerts-pro/dashboard/stats" />
            <Section title="最近" endpoint="/api/ebay-inventory-alerts-pro/dashboard/recent" />
            <Section title="パフォーマンス" endpoint="/api/ebay-inventory-alerts-pro/dashboard/performance" />
          </div>
          <Section title="アラート概要" endpoint="/api/ebay-inventory-alerts-pro/dashboard/alerts" />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-4">
          <Section title="アラート一覧" endpoint="/api/ebay-inventory-alerts-pro/alerts" />
          <Section title="アラート履歴" endpoint="/api/ebay-inventory-alerts-pro/notifications/history" />
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <Section title="ルール一覧" endpoint="/api/ebay-inventory-alerts-pro/rules" />
          <Section title="分析: 影響" endpoint="/api/ebay-inventory-alerts-pro/analytics/impact" />
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Section title="通知一覧" endpoint="/api/ebay-inventory-alerts-pro/notifications" />
          <Section title="通知設定" endpoint="/api/ebay-inventory-alerts-pro/notifications/history" />
          <Section title="通知トレンド" endpoint="/api/ebay-inventory-alerts-pro/analytics/trends" />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <Section title="分析: 概要" endpoint="/api/ebay-inventory-alerts-pro/analytics" />
          <Section title="分析: トレンド" endpoint="/api/ebay-inventory-alerts-pro/analytics/trends" />
          <Section title="分析: 影響" endpoint="/api/ebay-inventory-alerts-pro/analytics/impact" />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Section title="設定 (GET)" endpoint="/api/ebay-inventory-alerts-pro/settings" />
          <Section title="ヘルスチェック" endpoint="/api/ebay-inventory-alerts-pro/health" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


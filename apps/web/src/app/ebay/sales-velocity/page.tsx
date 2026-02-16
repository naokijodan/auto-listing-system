'use client';

import React from 'react';
import useSWR from 'swr';

// shadcn/ui components (adjust import paths to match your setup)
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

export default function SalesVelocityPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-cyan-600">販売速度トラッカー</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="velocity">速度分析</TabsTrigger>
          <TabsTrigger value="ranking">ランキング</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-4">
          <Section title="概要" endpoint="/api/ebay-sales-velocity/dashboard" />
          <div className="grid md:grid-cols-4 gap-4">
            <Section title="サマリー" endpoint="/api/ebay-sales-velocity/dashboard/summary" />
            <Section title="平均販売速度" endpoint="/api/ebay-sales-velocity/dashboard/avg-velocity" />
            <Section title="高速販売数" endpoint="/api/ebay-sales-velocity/dashboard/fast-moving" />
            <Section title="低速販売数" endpoint="/api/ebay-sales-velocity/dashboard/slow-moving" />
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
          <Section title="商品一覧" endpoint="/api/ebay-sales-velocity/products" />
          <Section title="ヘルスチェック" endpoint="/api/ebay-sales-velocity/health" />
        </TabsContent>

        <TabsContent value="velocity" className="mt-4 space-y-4">
          <Section title="速度: 概要" endpoint="/api/ebay-sales-velocity/velocity" />
          <Section title="速度: 予測" endpoint="/api/ebay-sales-velocity/velocity/forecast" />
        </TabsContent>

        <TabsContent value="ranking" className="mt-4 space-y-4">
          <Section title="ランキング" endpoint="/api/ebay-sales-velocity/ranking" />
          <div className="grid md:grid-cols-3 gap-4">
            <Section title="トップ" endpoint="/api/ebay-sales-velocity/ranking/top" />
            <Section title="ボトム" endpoint="/api/ebay-sales-velocity/ranking/bottom" />
            <Section title="変動" endpoint="/api/ebay-sales-velocity/ranking/changes" />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 space-y-4">
          <Section title="分析: 概要" endpoint="/api/ebay-sales-velocity/analytics" />
          <Section title="分析: トレンド" endpoint="/api/ebay-sales-velocity/analytics/trends" />
          <Section title="分析: 季節性" endpoint="/api/ebay-sales-velocity/analytics/seasonality" />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <Section title="設定 (GET)" endpoint="/api/ebay-sales-velocity/settings" />
          <Section title="再インデックス" endpoint="/api/ebay-sales-velocity/reindex" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


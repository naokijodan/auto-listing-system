'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function Block({ title, url }: { title: string; url: string }) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div>読み込み中...</div>}
        {error && <div>エラーが発生しました</div>}
        {!isLoading && !error && (
          <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function MarketplaceConnectorPage() {
  const base = '/api/ebay-marketplace-connector';
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-pink-600">マーケットプレイスコネクター</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="connections">接続</TabsTrigger>
          <TabsTrigger value="mappings">マッピング</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="サマリー" url={`${base}/dashboard/summary`} />
            <Block title="接続状況" url={`${base}/dashboard/connections`} />
            <Block title="同期ステータス" url={`${base}/dashboard/sync-status`} />
            <Block title="エラー" url={`${base}/dashboard/errors`} />
          </div>
        </TabsContent>

        <TabsContent value="connections">
          <Block title="接続一覧" url={`${base}/connections`} />
        </TabsContent>

        <TabsContent value="mappings">
          <Block title="マッピング一覧" url={`${base}/mappings`} />
        </TabsContent>

        <TabsContent value="rules">
          <Block title="ルール一覧" url={`${base}/rules`} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="分析概要" url={`${base}/analytics`} />
            <Block title="パフォーマンス" url={`${base}/analytics/performance`} />
            <Block title="エラー分析" url={`${base}/analytics/errors`} />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Block title="設定" url={`${base}/settings`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


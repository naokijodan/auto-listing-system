'use client';

import React from 'react';
import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'shadcn/ui';

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

export default function ListingClonePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-600">リスティングクローン</h1>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="clones">クローン</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="bulk">バルク</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <DataBlock title="サマリー" url="/api/ebay-listing-clone/dashboard/summary" />
          <DataBlock title="最近" url="/api/ebay-listing-clone/dashboard/recent" />
          <DataBlock title="統計" url="/api/ebay-listing-clone/dashboard/stats" />
          <DataBlock title="エラー" url="/api/ebay-listing-clone/dashboard/errors" />
        </TabsContent>

        <TabsContent value="clones" className="space-y-4">
          <DataBlock title="クローン作成" url="/api/ebay-listing-clone/clones" />
          <DataBlock title="クローン実行" url="/api/ebay-listing-clone/clones/123/execute" />
          <DataBlock title="プレビュー" url="/api/ebay-listing-clone/clones/123/preview" />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <DataBlock title="テンプレート一覧" url="/api/ebay-listing-clone/templates" />
          <DataBlock title="テンプレート作成" url="/api/ebay-listing-clone/templates/create" />
          <DataBlock title="テンプレート適用" url="/api/ebay-listing-clone/templates/apply" />
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <DataBlock title="バルク一覧" url="/api/ebay-listing-clone/bulk" />
          <DataBlock title="バルク開始" url="/api/ebay-listing-clone/bulk/start" />
          <DataBlock title="ステータス" url="/api/ebay-listing-clone/bulk/status" />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <DataBlock title="分析サマリー" url="/api/ebay-listing-clone/analytics" />
          <DataBlock title="利用状況" url="/api/ebay-listing-clone/analytics/usage" />
          <DataBlock title="パフォーマンス" url="/api/ebay-listing-clone/analytics/performance" />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <DataBlock title="設定取得" url="/api/ebay-listing-clone/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


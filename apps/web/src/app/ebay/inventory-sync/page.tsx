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

export default function InventorySyncPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-emerald-600">在庫同期マネージャー</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="syncs">同期</TabsTrigger>
          <TabsTrigger value="channels">チャンネル</TabsTrigger>
          <TabsTrigger value="mappings">マッピング</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <Block title="サマリー" url="/api/ebay-inventory-sync/dashboard/summary" />
          <Block title="同期状況" url="/api/ebay-inventory-sync/dashboard/sync-status" />
          <Block title="アクティビティ" url="/api/ebay-inventory-sync/dashboard/activity" />
        </TabsContent>

        <TabsContent value="syncs" className="mt-4">
          <Block title="同期一覧" url="/api/ebay-inventory-sync/syncs" />
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <Block title="連携チャンネル" url="/api/ebay-inventory-sync/channels" />
        </TabsContent>

        <TabsContent value="mappings" className="mt-4">
          <Block title="マッピング一覧" url="/api/ebay-inventory-sync/mappings" />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Block title="分析サマリー" url="/api/ebay-inventory-sync/analytics" />
          <Block title="精度" url="/api/ebay-inventory-sync/analytics/accuracy" />
          <Block title="パフォーマンス" url="/api/ebay-inventory-sync/analytics/performance" />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Block title="設定" url="/api/ebay-inventory-sync/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


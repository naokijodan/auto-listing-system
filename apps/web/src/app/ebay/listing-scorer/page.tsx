'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
// shadcn/ui Tabs
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ListingScorerPage() {
  const base = '/api/ebay-listing-scorer';

  const { data: summary } = useSWR(`${base}/dashboard/summary`, fetcher);
  const { data: scores } = useSWR(`${base}/scores`, fetcher);
  const { data: rules } = useSWR(`${base}/rules`, fetcher);
  const { data: improvements } = useSWR(`${base}/improvements`, fetcher);
  const { data: analytics } = useSWR(`${base}/analytics`, fetcher);
  const { data: settings } = useSWR(`${base}/settings`, fetcher);

  const widgets = useMemo(() => summary?.widgets ?? [], [summary]);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold text-rose-600">リスティングスコアラー</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="scores">スコア</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="improvements">改善</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(widgets.length ? widgets : ['summary', 'scores', 'issues', 'trends']).map((w: string) => (
              <div key={w} className="rounded border p-4">
                <div className="text-sm text-gray-500">Widget</div>
                <div className="text-lg font-medium">{w}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scores" className="mt-4">
          <div className="rounded border p-4">
            <div className="mb-2 text-sm text-gray-500">スコア一覧</div>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(scores, null, 2)}</pre>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="rounded border p-4">
            <div className="mb-2 text-sm text-gray-500">ルール</div>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(rules, null, 2)}</pre>
          </div>
        </TabsContent>

        <TabsContent value="improvements" className="mt-4">
          <div className="rounded border p-4">
            <div className="mb-2 text-sm text-gray-500">改善候補</div>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(improvements, null, 2)}</pre>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="rounded border p-4">
            <div className="mb-2 text-sm text-gray-500">分析</div>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(analytics, null, 2)}</pre>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="rounded border p-4">
            <div className="mb-2 text-sm text-gray-500">設定</div>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(settings, null, 2)}</pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


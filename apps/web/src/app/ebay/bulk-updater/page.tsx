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

export default function BulkUpdaterPage() {
  const base = '/api/ebay-bulk-updater';
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-yellow-600">バルクアップデーター</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="updates">更新</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="schedules">スケジュール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="サマリー" url={`${base}/dashboard/summary`} />
            <Block title="ジョブ" url={`${base}/dashboard/jobs`} />
            <Block title="履歴" url={`${base}/dashboard/history`} />
            <Block title="統計" url={`${base}/dashboard/stats`} />
          </div>
        </TabsContent>

        <TabsContent value="updates">
          <Block title="更新一覧" url={`${base}/updates`} />
        </TabsContent>

        <TabsContent value="templates">
          <Block title="テンプレート一覧" url={`${base}/templates`} />
        </TabsContent>

        <TabsContent value="schedules">
          <Block title="スケジュール一覧" url={`${base}/schedules`} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Block title="分析概要" url={`${base}/analytics`} />
            <Block title="成功率" url={`${base}/analytics/success-rate`} />
            <Block title="フィールド" url={`${base}/analytics/fields`} />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Block title="設定" url={`${base}/settings`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


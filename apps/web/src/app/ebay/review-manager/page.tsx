'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReviewManagerPage() {
  const base = '/api/ebay-review-manager';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-emerald-600">レビュー管理</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="reviews">レビュー</TabsTrigger>
          <TabsTrigger value="reply">返信</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardPanel base={base} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-4">
          <ReviewsPanel base={base} />
        </TabsContent>
        <TabsContent value="reply" className="mt-4">
          <AutoReplyPanel base={base} />
        </TabsContent>
        <TabsContent value="templates" className="mt-4">
          <TemplatesPanel base={base} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsPanel base={base} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <SettingsPanel base={base} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/dashboard`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function ReviewsPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/reviews`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function AutoReplyPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/auto-reply`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function TemplatesPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/templates`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function AnalyticsPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/analytics`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function SettingsPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/settings`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

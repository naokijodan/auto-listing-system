'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function CompetitorTrackerPage() {
  const base = '/api/ebay-competitor-tracker';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-violet-600">競合追跡</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="competitors">競合一覧</TabsTrigger>
          <TabsTrigger value="prices">価格比較</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardPanel base={base} />
        </TabsContent>
        <TabsContent value="competitors" className="mt-4">
          <CompetitorsPanel base={base} />
        </TabsContent>
        <TabsContent value="prices" className="mt-4">
          <PricesPanel base={base} />
        </TabsContent>
        <TabsContent value="alerts" className="mt-4">
          <AlertsPanel base={base} />
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

function CompetitorsPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/competitors`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function PricesPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/prices`, fetcher);
  if (isLoading) return <p>読み込み中...</p>;
  if (error) return <p className="text-red-600">エラーが発生しました</p>;
  return (
    <pre className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function AlertsPanel({ base }: { base: string }) {
  const { data, error, isLoading } = useSWR(`${base}/alerts`, fetcher);
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

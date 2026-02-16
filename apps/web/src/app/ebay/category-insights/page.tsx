'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonView({ data }: { data: unknown }) {
  const text = useMemo(() => JSON.stringify(data, null, 2), [data]);
  return (
    <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-80">{text}</pre>
  );
}

export default function CategoryInsightsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-cyan-600">カテゴリインサイト</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="insights">インサイト</TabsTrigger>
          <TabsTrigger value="trends">トレンド</TabsTrigger>
          <TabsTrigger value="benchmarks">ベンチマーク</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>インサイト一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <InsightsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>トレンド</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks">
          <Card>
            <CardHeader>
              <CardTitle>ベンチマーク</CardTitle>
            </CardHeader>
            <CardContent>
              <BenchmarksPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-category-insights/dashboard/summary', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function InsightsPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-category-insights/insights', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function TrendsPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-category-insights/trends', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function BenchmarksPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-category-insights/benchmarks', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function AnalyticsPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-category-insights/analytics', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function SettingsPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-category-insights/settings', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}


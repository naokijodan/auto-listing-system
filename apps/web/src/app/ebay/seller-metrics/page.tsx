'use client';

import * as React from 'react';
import useSWR from 'swr';

// shadcn/ui components (expected in project)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function JsonView({ data }: { data: unknown }) {
  return (
    <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function SellerMetricsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-indigo-600">セラーメトリクス管理</h1>
      </div>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="metrics">メトリクス</TabsTrigger>
          <TabsTrigger value="ratings">評価</TabsTrigger>
          <TabsTrigger value="improvements">改善</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>メトリクス一覧</CardTitle>
              <div className="space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => fetch('/api/ebay-seller-metrics/reindex', { method: 'POST' })}
                >
                  Reindex
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <MetricsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ratings">
          <Card>
            <CardHeader>
              <CardTitle>評価トレンド</CardTitle>
            </CardHeader>
            <CardContent>
              <RatingsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="improvements">
          <Card>
            <CardHeader>
              <CardTitle>改善提案</CardTitle>
            </CardHeader>
            <CardContent>
              <ImprovementsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardSection() {
  const { data, error, isLoading, mutate } = useSWR<any>(
    '/api/ebay-seller-metrics/dashboard/summary',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">概要データを表示します。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
      <div className="mt-3">
        <Button onClick={() => mutate()} className="bg-indigo-600 text-white hover:bg-indigo-700">
          再読み込み
        </Button>
      </div>
    </div>
  );
}

function MetricsSection() {
  const { data, error, isLoading } = useSWR<any>(
    '/api/ebay-seller-metrics/metrics',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">メトリクス一覧を取得します。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function RatingsSection() {
  const { data, error, isLoading } = useSWR<any>(
    '/api/ebay-seller-metrics/ratings/trends',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">評価トレンドを表示します。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function ImprovementsSection() {
  const { data, error, isLoading } = useSWR<any>(
    '/api/ebay-seller-metrics/improvements',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">改善提案とトラッキング。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function AnalyticsSection() {
  const { data, error, isLoading } = useSWR<any>(
    '/api/ebay-seller-metrics/analytics/trends',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">メトリクスの傾向分析。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function SettingsSection() {
  const { data, error, isLoading, mutate } = useSWR<any>(
    '/api/ebay-seller-metrics/settings',
    fetcher
  );
  const onSave = async () => {
    await fetch('/api/ebay-seller-metrics/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: true }),
    });
    mutate();
  };
  return (
    <div>
      <div className="text-sm text-gray-600">通知やタイムゾーンなどの設定。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
      <div className="mt-3">
        <Button onClick={onSave} className="bg-indigo-600 text-white hover:bg-indigo-700">
          保存
        </Button>
      </div>
    </div>
  );
}


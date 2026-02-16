'use client';

import useSWR from 'swr';
import React from 'react';

// Assuming shadcn/ui components are available in your project
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="mt-2 rounded bg-gray-50 p-3 text-xs overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function InventoryForecasterPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-purple-600">在庫予測</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="forecasts">予測</TabsTrigger>
          <TabsTrigger value="models">モデル</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>概要</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardSummary />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>精度</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardAccuracy />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts">
          <Card>
            <CardHeader>
              <CardTitle>予測の管理</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader>
              <CardTitle>モデル</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>アラート</CardTitle>
            </CardHeader>
            <CardContent>
              <AlertsPanel />
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

function DashboardSummary() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-inventory-forecaster/dashboard/summary',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/dashboard/summary</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          再読み込み
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function DashboardAccuracy() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-inventory-forecaster/dashboard/accuracy',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/dashboard/accuracy</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function ForecastsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-inventory-forecaster/forecasts/123',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/forecasts/:id</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function ModelsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-inventory-forecaster/models',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/models</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function AlertsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-inventory-forecaster/alerts',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/alerts</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function AnalyticsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-inventory-forecaster/analytics',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/analytics</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function SettingsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-inventory-forecaster/settings',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/settings</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          取得
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}


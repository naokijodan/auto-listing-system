'use client';

import useSWR from 'swr';
import React from 'react';

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

export default function ProfitTrackerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-emerald-600">利益トラッカー</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="profits">利益</TabsTrigger>
          <TabsTrigger value="costs">コスト</TabsTrigger>
          <TabsTrigger value="goals">目標</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardSummary />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>トレンド</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardTrends />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profits">
          <Card>
            <CardHeader>
              <CardTitle>利益一覧・計算</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfitsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>コスト管理</CardTitle>
            </CardHeader>
            <CardContent>
              <CostsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>目標の進捗</CardTitle>
            </CardHeader>
            <CardContent>
              <GoalsPanel />
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
    '/api/ebay-profit-tracker/dashboard/summary',
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

function DashboardTrends() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-profit-tracker/dashboard/trends',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/dashboard/trends</span>
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

function ProfitsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-profit-tracker/profits',
    fetcher
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/profits</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          一覧取得
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
      <ProfitsCalculate />
    </div>
  );
}

function ProfitsCalculate() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-profit-tracker/profits/calculate',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/profits/calculate</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          計算
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function CostsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-profit-tracker/costs',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/costs</span>
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

function GoalsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-profit-tracker/goals/progress',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/goals/progress</span>
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
    '/api/ebay-profit-tracker/analytics',
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
    '/api/ebay-profit-tracker/settings',
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


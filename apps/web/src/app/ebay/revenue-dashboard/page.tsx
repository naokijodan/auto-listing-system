// @ts-nocheck
'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RevenueDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-emerald-600">収益ダッシュボード</h1>
      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="metrics">メトリクス</TabsTrigger>
          <TabsTrigger value="goals">目標</TabsTrigger>
          <TabsTrigger value="forecasts">予測</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <RD_DashboardPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>メトリクス</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals">
          <Card>
            <CardHeader>
              <CardTitle>目標</CardTitle>
            </CardHeader>
            <CardContent>
              <GoalsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecasts">
          <Card>
            <CardHeader>
              <CardTitle>予測</CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <RD_AnalyticsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <RD_SettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RD_DashboardPanel() {
  const { data: revenue } = useSWR('/api/ebay-revenue-dashboard/dashboard/revenue', fetcher);
  const { data: costs } = useSWR('/api/ebay-revenue-dashboard/dashboard/costs', fetcher);
  const { data: profit } = useSWR('/api/ebay-revenue-dashboard/dashboard/profit', fetcher);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Badge>Revenue</Badge><span className="text-sm text-muted-foreground">{revenue ? '読み込み完了' : '読込中...'}</span></div>
      <div className="flex items-center gap-2"><Badge variant="secondary">Costs</Badge><span className="text-sm text-muted-foreground">{costs ? '読み込み完了' : '読込中...'}</span></div>
      <div className="flex items-center gap-2"><Badge variant="outline">Profit</Badge><span className="text-sm text-muted-foreground">{profit ? '読み込み完了' : '読込中...'}</span></div>
    </div>
  );
}

function MetricsPanel() {
  const { data, mutate, isLoading } = useSWR('/api/ebay-revenue-dashboard/metrics', fetcher);
  const refresh = async () => {
    await fetch('/api/ebay-revenue-dashboard/metrics/refresh', { method: 'POST' });
    mutate();
  };
  const compare = async () => {
    await fetch('/api/ebay-revenue-dashboard/metrics/compare', { method: 'POST', body: JSON.stringify({ periodA: 'prev', periodB: 'current' }), headers: { 'Content-Type': 'application/json' } });
  };
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">{isLoading ? '読込中...' : 'メトリクス一覧'}</div>
      <div className="flex gap-2">
        <Button size="sm" onClick={refresh}>再計算</Button>
        <Button size="sm" variant="secondary" onClick={compare}>比較</Button>
      </div>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function GoalsPanel() {
  const { data } = useSWR('/api/ebay-revenue-dashboard/goals', fetcher);
  return <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>;
}

function ForecastsPanel() {
  const { data, mutate } = useSWR('/api/ebay-revenue-dashboard/forecasts', fetcher);
  const generate = async () => {
    await fetch('/api/ebay-revenue-dashboard/forecasts/generate', { method: 'POST' });
    mutate();
  };
  const compare = async () => {
    await fetch('/api/ebay-revenue-dashboard/forecasts/compare', { method: 'POST', body: JSON.stringify({ a: 'baseline', b: 'optimistic' }), headers: { 'Content-Type': 'application/json' } });
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={generate}>生成</Button>
        <Button size="sm" variant="secondary" onClick={compare}>比較</Button>
      </div>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function RD_AnalyticsPanel() {
  const { data: overview } = useSWR('/api/ebay-revenue-dashboard/analytics', fetcher);
  const { data: breakdown } = useSWR('/api/ebay-revenue-dashboard/analytics/breakdown', fetcher);
  const { data: trends } = useSWR('/api/ebay-revenue-dashboard/analytics/trends', fetcher);
  return (
    <div className="grid md:grid-cols-3 gap-3">
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(overview, null, 2)}</pre>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(breakdown, null, 2)}</pre>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(trends, null, 2)}</pre>
    </div>
  );
}

function RD_SettingsPanel() {
  const { data, mutate } = useSWR('/api/ebay-revenue-dashboard/settings', fetcher);
  const save = async () => {
    await fetch('/api/ebay-revenue-dashboard/settings', { method: 'PUT', body: JSON.stringify({ currency: 'JPY' }), headers: { 'Content-Type': 'application/json' } });
    mutate();
  };
  return (
    <div className="space-y-3">
      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={save}>保存</Button>
      <pre className="text-xs bg-muted p-3 rounded">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}


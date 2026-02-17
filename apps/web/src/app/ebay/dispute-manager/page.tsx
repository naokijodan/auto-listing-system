'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DisputeManagerPage() {
  const base = '/api/ebay-dispute-manager';

  const { data: dashboard } = useSWR(`${base}/dashboard/summary`, fetcher);
  const { data: disputes } = useSWR(`${base}/disputes`, fetcher);
  const { data: evidence } = useSWR(`${base}/evidence`, fetcher);
  const { data: templates } = useSWR(`${base}/templates`, fetcher);
  const { data: analytics } = useSWR(`${base}/analytics/trends`, fetcher);
  const { data: settings } = useSWR(`${base}/settings`, fetcher);

  const pretty = (v: any) => useMemo(() => JSON.stringify(v, null, 2), [v]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-red-600">紛争管理</h1>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="disputes">紛争</TabsTrigger>
          <TabsTrigger value="evidence">証拠</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">/dashboard/summary から取得</span>
                <Button variant="outline" onClick={() => window.location.reload()}>再読み込み</Button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded border overflow-auto">{pretty(dashboard)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes">
          <Card>
            <CardHeader>
              <CardTitle>紛争一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">/disputes から取得</span>
              <pre className="mt-2 text-xs bg-muted p-3 rounded border overflow-auto">{pretty(disputes)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence">
          <Card>
            <CardHeader>
              <CardTitle>証拠</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">/evidence から取得</span>
              <pre className="mt-2 text-xs bg-muted p-3 rounded border overflow-auto">{pretty(evidence)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">/templates から取得</span>
              <pre className="mt-2 text-xs bg-muted p-3 rounded border overflow-auto">{pretty(templates)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析（トレンド）</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">/analytics/trends から取得</span>
              <pre className="mt-2 text-xs bg-muted p-3 rounded border overflow-auto">{pretty(analytics)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-sm text-muted-foreground">/settings から取得</span>
              <pre className="mt-2 text-xs bg-muted p-3 rounded border overflow-auto">{pretty(settings)}</pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Datum = { ok: boolean; path: string; method: string; theme?: string } | null;

export default function BulkExportPage() {
  const base = '/api/ebay-bulk-export';

  const { data: dashboard }: { data: Datum } = useSWR(`${base}/dashboard`, fetcher);
  const { data: exportsData }: { data: Datum } = useSWR(`${base}/exports`, fetcher);
  const { data: templates }: { data: Datum } = useSWR(`${base}/templates`, fetcher);
  const { data: schedules }: { data: Datum } = useSWR(`${base}/schedules`, fetcher);
  const { data: analytics }: { data: Datum } = useSWR(`${base}/analytics`, fetcher);
  const { data: settings }: { data: Datum } = useSWR(`${base}/settings`, fetcher);

  const theme = useMemo(() => 'text-lime-600', []);

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${theme}`}>バルクエクスポート</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="exports">エクスポート</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="schedules">スケジュール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm">{JSON.stringify(dashboard, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <CardTitle>エクスポート</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Button
                  onClick={async () => {
                    await fetch(`${base}/exports`, { method: 'POST' });
                  }}
                >
                  新規作成
                </Button>
              </div>
              <pre className="text-sm">{JSON.stringify(exportsData, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm">{JSON.stringify(templates, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules">
          <Card>
            <CardHeader>
              <CardTitle>スケジュール</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm">{JSON.stringify(schedules, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm">{JSON.stringify(analytics, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm">{JSON.stringify(settings, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


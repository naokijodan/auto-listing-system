'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Datum = { ok: boolean; path: string; method: string; theme?: string } | null;

export default function ListingHealthV2Page() {
  const base = '/api/ebay-listing-health-v2';

  const { data: dashboard }: { data: Datum } = useSWR(`${base}/dashboard`, fetcher);
  const { data: checks }: { data: Datum } = useSWR(`${base}/checks`, fetcher);
  const { data: issues }: { data: Datum } = useSWR(`${base}/issues`, fetcher);
  const { data: recommendations }: { data: Datum } = useSWR(`${base}/recommendations`, fetcher);
  const { data: analytics }: { data: Datum } = useSWR(`${base}/analytics`, fetcher);
  const { data: settings }: { data: Datum } = useSWR(`${base}/settings`, fetcher);

  const theme = useMemo(() => 'text-rose-600', []);

  return (
    <div className="space-y-6">
      <h1 className={`text-2xl font-bold ${theme}`}>出品ヘルスv2</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="checks">ヘルスチェック</TabsTrigger>
          <TabsTrigger value="issues">問題</TabsTrigger>
          <TabsTrigger value="recommendations">レコメンド</TabsTrigger>
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

        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <CardTitle>ヘルスチェック</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    await fetch(`${base}/checks`, { method: 'POST' });
                  }}
                >
                  新規チェック作成
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await fetch(`${base}/checks/1/run`, { method: 'POST' });
                  }}
                >
                  サンプル実行
                </Button>
              </div>
              <pre className="text-sm">{JSON.stringify(checks, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>問題</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm">{JSON.stringify(issues, null, 2)}</pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>レコメンド</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm">{JSON.stringify(recommendations, null, 2)}</pre>
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


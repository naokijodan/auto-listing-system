'use client';

import React from 'react';
import useSWR from 'swr';
// shadcn/ui components (assumes local setup)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string, options?: RequestInit) =>
  fetch(url, { cache: 'no-store', ...options }).then((r) => r.json());

function Section({ title, endpoint, method = 'GET', body }: { title: string; endpoint: string; method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: any }) {
  const key = method === 'GET' ? endpoint : null; // SWR for GET only
  const { data, error, isLoading, mutate } = useSWR(key, fetcher);

  const trigger = async () => {
    await fetcher(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    mutate();
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {method === 'GET' ? (
          <pre className="text-xs bg-gray-50 p-2 rounded border overflow-auto">{isLoading ? 'loading...' : error ? 'error' : JSON.stringify(data, null, 2)}</pre>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={trigger} size="sm">{method} {endpoint}</Button>
            <span className="text-xs text-gray-500">click to run, then data will refresh</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CrossSellPage() {
  const base = '/api/ebay-cross-sell';
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-fuchsia-600">クロスセル管理</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="cross">クロスセル</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="reco">レコメンド</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <Section title="Overview" endpoint={`${base}/dashboard`} />
          <Section title="Summary" endpoint={`${base}/dashboard/summary`} />
          <Section title="Performance" endpoint={`${base}/dashboard/performance`} />
          <Section title="Revenue" endpoint={`${base}/dashboard/revenue`} />
          <Section title="Conversion" endpoint={`${base}/dashboard/conversion`} />
        </TabsContent>

        <TabsContent value="cross" className="mt-4">
          <Section title="List Cross-sells" endpoint={`${base}/cross-sells`} />
          <Section title="Create Cross-sell" endpoint={`${base}/cross-sells`} method="POST" body={{ name: 'New Cross-sell' }} />
          <Section title="Update Cross-sell" endpoint={`${base}/cross-sells/123`} method="PUT" body={{ name: 'Updated' }} />
          <Section title="Delete Cross-sell" endpoint={`${base}/cross-sells/123`} method="DELETE" />
          <Section title="Activate" endpoint={`${base}/cross-sells/123/activate`} method="POST" />
          <Section title="A/B Test" endpoint={`${base}/cross-sells/123/test`} method="POST" body={{ variant: 'B' }} />
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <Section title="List Rules" endpoint={`${base}/rules`} />
          <Section title="Get Rule" endpoint={`${base}/rules/abc`} />
          <Section title="Create Rule" endpoint={`${base}/rules/create`} method="POST" body={{ if: 'category=shoes', then: 'bundle socks' }} />
          <Section title="Set Priority" endpoint={`${base}/rules/priority`} method="POST" body={{ order: ['r1', 'r2'] }} />
        </TabsContent>

        <TabsContent value="reco" className="mt-4">
          <Section title="Recommendations" endpoint={`${base}/recommendations`} />
          <Section title="Get Recommendation" endpoint={`${base}/recommendations/rec1`} />
          <Section title="Generate" endpoint={`${base}/recommendations/generate`} method="POST" body={{ productId: 'p1' }} />
          <Section title="Apply" endpoint={`${base}/recommendations/apply`} method="POST" body={{ target: 'selected' }} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Section title="Overview" endpoint={`${base}/analytics`} />
          <Section title="Effectiveness" endpoint={`${base}/analytics/effectiveness`} />
          <Section title="Products" endpoint={`${base}/analytics/products`} />
          <Section title="Health" endpoint={`${base}/health`} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Section title="Get Settings" endpoint={`${base}/settings`} />
          <Section title="Update Settings" endpoint={`${base}/settings`} method="PUT" body={{ currency: 'USD' }} />
          <Section title="Export" endpoint={`${base}/export`} method="POST" body={{ scope: 'all' }} />
          <Section title="Import" endpoint={`${base}/import`} method="POST" body={{}} />
          <Section title="Reindex" endpoint={`${base}/reindex`} method="POST" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


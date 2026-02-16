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
  const key = method === 'GET' ? endpoint : null; // SWR only for GET
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

export default function StoreBrandingPage() {
  const base = '/api/ebay-store-branding';
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-violet-600">ストアブランディング</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="brands">ブランド</TabsTrigger>
          <TabsTrigger value="assets">アセット</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <Section title="Overview" endpoint={`${base}/dashboard`} />
          <Section title="Summary" endpoint={`${base}/dashboard/summary`} />
          <Section title="Assets" endpoint={`${base}/dashboard/assets`} />
          <Section title="Usage" endpoint={`${base}/dashboard/usage`} />
          <Section title="Consistency" endpoint={`${base}/dashboard/consistency`} />
        </TabsContent>

        <TabsContent value="brands" className="mt-4">
          <Section title="List Brands" endpoint={`${base}/brands`} />
          <Section title="Create Brand" endpoint={`${base}/brands`} method="POST" body={{ name: 'New Brand' }} />
          <Section title="Update Brand" endpoint={`${base}/brands/123`} method="PUT" body={{ name: 'Updated' }} />
          <Section title="Delete Brand" endpoint={`${base}/brands/123`} method="DELETE" />
          <Section title="Publish Brand" endpoint={`${base}/brands/123/publish`} method="POST" />
          <Section title="Preview Brand" endpoint={`${base}/brands/123/preview`} />
        </TabsContent>

        <TabsContent value="assets" className="mt-4">
          <Section title="List Assets" endpoint={`${base}/assets`} />
          <Section title="Get Asset" endpoint={`${base}/assets/a1`} />
          <Section title="Upload Asset" endpoint={`${base}/assets/upload`} method="POST" body={{ filename: 'logo.png' }} />
          <Section title="Organize Assets" endpoint={`${base}/assets/organize`} method="POST" body={{ folders: ['logos', 'banners'] }} />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Section title="List Templates" endpoint={`${base}/templates`} />
          <Section title="Get Template" endpoint={`${base}/templates/t1`} />
          <Section title="Create Template" endpoint={`${base}/templates/create`} method="POST" body={{ name: 'Hero' }} />
          <Section title="Apply Template" endpoint={`${base}/templates/apply`} method="POST" body={{ target: 'homepage' }} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Section title="Overview" endpoint={`${base}/analytics`} />
          <Section title="Engagement" endpoint={`${base}/analytics/engagement`} />
          <Section title="Recognition" endpoint={`${base}/analytics/recognition`} />
          <Section title="Health" endpoint={`${base}/health`} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Section title="Get Settings" endpoint={`${base}/settings`} />
          <Section title="Update Settings" endpoint={`${base}/settings`} method="PUT" body={{ theme: 'modern' }} />
          <Section title="Export" endpoint={`${base}/export`} method="POST" body={{ scope: 'brands' }} />
          <Section title="Import" endpoint={`${base}/import`} method="POST" body={{}} />
          <Section title="Reindex" endpoint={`${base}/reindex`} method="POST" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


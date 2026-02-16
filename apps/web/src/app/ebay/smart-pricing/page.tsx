'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonView({ data }: { data: any }) {
  return (
    <pre className="text-xs whitespace-pre-wrap break-words bg-gray-50 p-3 rounded border">{JSON.stringify(data, null, 2)}</pre>
  );
}

export default function SmartPricingPage() {
  const { data: dashboard } = useSWR('/api/ebay-smart-pricing/dashboard', fetcher);
  const { data: pricing } = useSWR('/api/ebay-smart-pricing/pricing', fetcher);
  const { data: rules } = useSWR('/api/ebay-smart-pricing/rules', fetcher);
  const { data: competitors } = useSWR('/api/ebay-smart-pricing/competitors', fetcher);
  const { data: analytics } = useSWR('/api/ebay-smart-pricing/analytics', fetcher);
  const { data: settings } = useSWR('/api/ebay-smart-pricing/settings', fetcher);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-indigo-600">スマートプライシング</h1>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="pricing">価格設定</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="competitors">競合</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={dashboard || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>価格設定</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={pricing || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>ルール</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={rules || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle>競合</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={competitors || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={analytics || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={settings || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


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

export default function OrderTrackerProPage() {
  const { data: dashboard } = useSWR('/api/ebay-order-tracker-pro/dashboard', fetcher);
  const { data: orders } = useSWR('/api/ebay-order-tracker-pro/orders', fetcher);
  const { data: shipments } = useSWR('/api/ebay-order-tracker-pro/shipments', fetcher);
  const { data: alerts } = useSWR('/api/ebay-order-tracker-pro/alerts', fetcher);
  const { data: analytics } = useSWR('/api/ebay-order-tracker-pro/analytics', fetcher);
  const { data: settings } = useSWR('/api/ebay-order-tracker-pro/settings', fetcher);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-sky-600">注文トラッカーPro</h1>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="orders">注文</TabsTrigger>
          <TabsTrigger value="shipments">配送</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
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

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>注文</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={orders || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments">
          <Card>
            <CardHeader>
              <CardTitle>配送</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={shipments || { loading: true }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>アラート</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonView data={alerts || { loading: true }} />
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


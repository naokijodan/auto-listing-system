// @ts-nocheck
'use client';

import useSWR from 'swr';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from 'shadcn/ui';

const API_PREFIX = '/api/ebay-product-sourcing-assistant/';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function TabPanel({ endpoint }: { endpoint: string }) {
  const { data, error, isLoading } = useSWR(API_PREFIX + endpoint, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-indigo-600">{endpoint}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div>Loading...</div>}
        {error && <div>Error loading data</div>}
        {!isLoading && !error && (
          <pre className="text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProductSourcingAssistantPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-indigo-600">商品ソーシングアシスタント</h1>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="sources">ソース</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="suppliers">サプライヤー</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TabPanel endpoint="dashboard" />
        </TabsContent>
        <TabsContent value="sources">
          <TabPanel endpoint="sources" />
        </TabsContent>
        <TabsContent value="products">
          <TabPanel endpoint="products" />
        </TabsContent>
        <TabsContent value="suppliers">
          <TabPanel endpoint="suppliers" />
        </TabsContent>
        <TabsContent value="analytics">
          <TabPanel endpoint="analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <TabPanel endpoint="settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


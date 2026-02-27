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

const API_PREFIX = '/api/ebay-order-dispute-resolution/';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function TabPanel({ endpoint }: { endpoint: string }) {
  const { data, error, isLoading } = useSWR(API_PREFIX + endpoint, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-violet-600">{endpoint}</CardTitle>
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

export default function OrderDisputeResolutionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-violet-600">注文紛争解決</h1>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="cases">ケース管理</TabsTrigger>
          <TabsTrigger value="evidence">エビデンス</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TabPanel endpoint="dashboard" />
        </TabsContent>
        <TabsContent value="cases">
          <TabPanel endpoint="cases" />
        </TabsContent>
        <TabsContent value="evidence">
          <TabPanel endpoint="evidence" />
        </TabsContent>
        <TabsContent value="templates">
          <TabPanel endpoint="templates" />
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


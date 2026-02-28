
'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type FetchBlockProps = { title: string; endpoint: string };
function FetchBlock({ title, endpoint }: FetchBlockProps) {
  const { data, error, isLoading } = useSWR(endpoint, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{title}</span>
          <Badge variant="secondary">{endpoint.replace('/api/ebay-shipping-options', '')}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div>Loading...</div>}
        {error && <div className="text-red-600">Error loading</div>}
        {!isLoading && !error && (
          <pre className="text-sm overflow-auto p-3 bg-gray-50 rounded border">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function ShippingOptionsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-teal-600">配送オプション管理</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="options">オプション</TabsTrigger>
          <TabsTrigger value="carriers">配送業者</TabsTrigger>
          <TabsTrigger value="rates">料金</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <FetchBlock title="概要" endpoint="/api/ebay-shipping-options/dashboard/summary" />
          <FetchBlock title="配送業者" endpoint="/api/ebay-shipping-options/dashboard/carriers" />
          <FetchBlock title="料金" endpoint="/api/ebay-shipping-options/dashboard/rates" />
          <FetchBlock title="パフォーマンス" endpoint="/api/ebay-shipping-options/dashboard/performance" />
        </TabsContent>

        <TabsContent value="options">
          <FetchBlock title="オプション一覧" endpoint="/api/ebay-shipping-options/options" />
        </TabsContent>

        <TabsContent value="carriers">
          <FetchBlock title="配送業者一覧" endpoint="/api/ebay-shipping-options/carriers" />
        </TabsContent>

        <TabsContent value="rates">
          <FetchBlock title="料金一覧" endpoint="/api/ebay-shipping-options/rates" />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <FetchBlock title="分析概要" endpoint="/api/ebay-shipping-options/analytics" />
          <FetchBlock title="コスト" endpoint="/api/ebay-shipping-options/analytics/costs" />
          <FetchBlock title="配送時間" endpoint="/api/ebay-shipping-options/analytics/delivery-times" />
        </TabsContent>

        <TabsContent value="settings">
          <FetchBlock title="設定" endpoint="/api/ebay-shipping-options/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


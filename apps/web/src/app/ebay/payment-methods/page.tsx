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
          <Badge variant="secondary">{endpoint.replace('/api/ebay-payment-methods', '')}</Badge>
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

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-amber-600">支払い方法管理</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="methods">支払い方法</TabsTrigger>
          <TabsTrigger value="transactions">取引</TabsTrigger>
          <TabsTrigger value="fees">手数料</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <FetchBlock title="概要" endpoint="/api/ebay-payment-methods/dashboard/summary" />
          <FetchBlock title="取引" endpoint="/api/ebay-payment-methods/dashboard/transactions" />
          <FetchBlock title="手数料" endpoint="/api/ebay-payment-methods/dashboard/fees" />
          <FetchBlock title="紛争" endpoint="/api/ebay-payment-methods/dashboard/disputes" />
        </TabsContent>

        <TabsContent value="methods">
          <FetchBlock title="支払い方法一覧" endpoint="/api/ebay-payment-methods/methods" />
        </TabsContent>

        <TabsContent value="transactions">
          <FetchBlock title="取引一覧" endpoint="/api/ebay-payment-methods/transactions" />
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <FetchBlock title="手数料一覧" endpoint="/api/ebay-payment-methods/fees" />
          <FetchBlock title="手数料サマリー" endpoint="/api/ebay-payment-methods/fees/summary" />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <FetchBlock title="分析概要" endpoint="/api/ebay-payment-methods/analytics" />
          <FetchBlock title="収益" endpoint="/api/ebay-payment-methods/analytics/revenue" />
          <FetchBlock title="紛争" endpoint="/api/ebay-payment-methods/analytics/disputes" />
        </TabsContent>

        <TabsContent value="settings">
          <FetchBlock title="設定" endpoint="/api/ebay-payment-methods/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


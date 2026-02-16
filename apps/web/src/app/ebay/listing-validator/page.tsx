'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function DataBlock({ title, url }: { title: string; url: string }) {
  const { data, error, isLoading } = useSWR(url, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div>Loading...</div>}
        {error && <div className="text-red-600">Error loading data</div>}
        {!isLoading && !error && (
          <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded border">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function ListingValidatorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-fuchsia-600">リスティングバリデーター</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="validations">バリデーション</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <DataBlock title="Dashboard Overview" url="/api/ebay-listing-validator/dashboard" />
          <div className="grid md:grid-cols-3 gap-4">
            <DataBlock title="Summary" url="/api/ebay-listing-validator/dashboard/summary" />
            <DataBlock title="Errors" url="/api/ebay-listing-validator/dashboard/errors" />
            <DataBlock title="Warnings" url="/api/ebay-listing-validator/dashboard/warnings" />
          </div>
          <DataBlock title="Passed" url="/api/ebay-listing-validator/dashboard/passed" />
        </TabsContent>

        <TabsContent value="validations" className="space-y-4 mt-4">
          <DataBlock title="List" url="/api/ebay-listing-validator/validations" />
          <DataBlock title="Create" url="/api/ebay-listing-validator/validations" />
          <div className="grid md:grid-cols-3 gap-4">
            <DataBlock title="Update #123" url="/api/ebay-listing-validator/validations/123" />
            <DataBlock title="Run #123" url="/api/ebay-listing-validator/validations/123/run" />
            <DataBlock title="Fix #123" url="/api/ebay-listing-validator/validations/123/fix" />
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4 mt-4">
          <DataBlock title="Rules" url="/api/ebay-listing-validator/rules" />
          <div className="grid md:grid-cols-3 gap-4">
            <DataBlock title="Rule #1" url="/api/ebay-listing-validator/rules/1" />
            <DataBlock title="Create Rule" url="/api/ebay-listing-validator/rules/create" />
            <DataBlock title="Toggle Rule" url="/api/ebay-listing-validator/rules/toggle" />
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <DataBlock title="Reports" url="/api/ebay-listing-validator/reports" />
          <div className="grid md:grid-cols-2 gap-4">
            <DataBlock title="Report #202" url="/api/ebay-listing-validator/reports/202" />
            <DataBlock title="Generate" url="/api/ebay-listing-validator/reports/generate" />
          </div>
          <DataBlock title="Schedule" url="/api/ebay-listing-validator/reports/schedule" />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <DataBlock title="Analytics" url="/api/ebay-listing-validator/analytics" />
          <div className="grid md:grid-cols-2 gap-4">
            <DataBlock title="Trends" url="/api/ebay-listing-validator/analytics/trends" />
            <DataBlock title="Common Issues" url="/api/ebay-listing-validator/analytics/common-issues" />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <DataBlock title="Settings (GET)" url="/api/ebay-listing-validator/settings" />
          <DataBlock title="Settings (PUT)" url="/api/ebay-listing-validator/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


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

export default function SalesReportPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-600">セールスレポート</h1>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="schedules">スケジュール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-4">
          <DataBlock title="Dashboard Overview" url="/api/ebay-sales-report/dashboard" />
          <div className="grid md:grid-cols-4 gap-4">
            <DataBlock title="Summary" url="/api/ebay-sales-report/dashboard/summary" />
            <DataBlock title="Revenue" url="/api/ebay-sales-report/dashboard/revenue" />
            <DataBlock title="Orders" url="/api/ebay-sales-report/dashboard/orders" />
            <DataBlock title="Products" url="/api/ebay-sales-report/dashboard/products" />
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 mt-4">
          <DataBlock title="List" url="/api/ebay-sales-report/reports" />
          <DataBlock title="Create" url="/api/ebay-sales-report/reports" />
          <div className="grid md:grid-cols-3 gap-4">
            <DataBlock title="Update #55" url="/api/ebay-sales-report/reports/55" />
            <DataBlock title="Generate" url="/api/ebay-sales-report/reports/generate" />
            <DataBlock title="Download #55" url="/api/ebay-sales-report/reports/55/download" />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <DataBlock title="Templates" url="/api/ebay-sales-report/templates" />
          <div className="grid md:grid-cols-3 gap-4">
            <DataBlock title="Template #3" url="/api/ebay-sales-report/templates/3" />
            <DataBlock title="Create Template" url="/api/ebay-sales-report/templates/create" />
            <DataBlock title="Preview Template" url="/api/ebay-sales-report/templates/preview" />
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4 mt-4">
          <DataBlock title="Schedules" url="/api/ebay-sales-report/schedules" />
          <div className="grid md:grid-cols-3 gap-4">
            <DataBlock title="Schedule #9" url="/api/ebay-sales-report/schedules/9" />
            <DataBlock title="Create Schedule" url="/api/ebay-sales-report/schedules/create" />
            <DataBlock title="Toggle Schedule" url="/api/ebay-sales-report/schedules/toggle" />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <DataBlock title="Analytics" url="/api/ebay-sales-report/analytics" />
          <div className="grid md:grid-cols-2 gap-4">
            <DataBlock title="Trends" url="/api/ebay-sales-report/analytics/trends" />
            <DataBlock title="Comparison" url="/api/ebay-sales-report/analytics/comparison" />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <DataBlock title="Settings (GET)" url="/api/ebay-sales-report/settings" />
          <DataBlock title="Settings (PUT)" url="/api/ebay-sales-report/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


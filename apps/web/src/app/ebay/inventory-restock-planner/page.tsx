'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'shadcn/ui';
import { Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TabKey =
  | 'dashboard'
  | 'plans'
  | 'suppliers'
  | 'forecasts'
  | 'analytics'
  | 'settings';

const labels: Record<TabKey, string> = {
  dashboard: 'ダッシュボード',
  plans: '補充計画',
  suppliers: 'サプライヤー',
  forecasts: '需要予測',
  analytics: '分析',
  settings: '設定',
};

const endpoints: Record<TabKey, string> = {
  dashboard: '/api/ebay-inventory-restock-planner/dashboard',
  plans: '/api/ebay-inventory-restock-planner/plans',
  suppliers: '/api/ebay-inventory-restock-planner/suppliers',
  forecasts: '/api/ebay-inventory-restock-planner/forecasts',
  analytics: '/api/ebay-inventory-restock-planner/analytics',
  settings: '/api/ebay-inventory-restock-planner/settings',
};

export default function InventoryRestockPlannerPage() {
  const defaultTab: TabKey = 'dashboard';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">在庫補充計画</h1>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {(Object.keys(labels) as TabKey[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {labels[key]}
            </TabsTrigger>
          ))}
        </TabsList>
        {(Object.keys(labels) as TabKey[]).map((key) => (
          <TabsContent key={key} value={key}>
            <TabPanel title={labels[key]} endpoint={endpoints[key]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function TabPanel({ title, endpoint }: { title: string; endpoint: string }) {
  const { data, error, isLoading } = useSWR<any>(endpoint, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-gray-500">読み込み中...</p>}
        {error && <p className="text-red-500">エラーが発生しました</p>}
        {data && (
          <pre className="text-sm bg-gray-50 p-4 rounded overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}


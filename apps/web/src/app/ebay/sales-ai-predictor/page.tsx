'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'shadcn/ui';
import { Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type TabKey = 'dashboard' | 'predictions' | 'models' | 'data' | 'analytics' | 'settings';

const labels: Record<TabKey, string> = {
  dashboard: 'ダッシュボード',
  predictions: '予測',
  models: 'モデル',
  data: 'データ',
  analytics: '分析',
  settings: '設定',
};

const endpoints: Record<TabKey, string> = {
  dashboard: '/api/ebay-sales-ai-predictor/dashboard',
  predictions: '/api/ebay-sales-ai-predictor/predictions',
  models: '/api/ebay-sales-ai-predictor/models',
  data: '/api/ebay-sales-ai-predictor/data',
  analytics: '/api/ebay-sales-ai-predictor/analytics',
  settings: '/api/ebay-sales-ai-predictor/settings',
};

export default function SalesAiPredictorPage() {
  const defaultTab: TabKey = 'dashboard';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-violet-600">売上予測AI</h1>

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
  const { data, error, isLoading } = useSWR(endpoint, fetcher);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p>読み込み中...</p>}
        {error && <p className="text-red-600">読み込みエラー</p>}
        {data && (
          <pre className="text-sm overflow-auto p-3 bg-gray-50 rounded border">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'shadcn/ui';
import { Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type TabKey = 'dashboard' | 'schedules' | 'batches' | 'templates' | 'analytics' | 'settings';

const labels: Record<TabKey, string> = {
  dashboard: 'ダッシュボード',
  schedules: 'スケジュール',
  batches: 'バッチ',
  templates: 'テンプレート',
  analytics: '分析',
  settings: '設定',
};

const base = '/api/ebay-bulk-listing-scheduler';
const endpoints: Record<TabKey, string> = {
  dashboard: `${base}/dashboard`,
  schedules: `${base}/schedules`,
  batches: `${base}/batches`,
  templates: `${base}/templates`,
  analytics: `${base}/analytics`,
  settings: `${base}/settings`,
};

export default function BulkListingSchedulerPage() {
  const defaultTab: TabKey = 'dashboard';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-amber-600">一括出品スケジューラー</h1>

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


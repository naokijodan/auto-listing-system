// @ts-nocheck
'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from 'shadcn/ui';
import { Card, CardHeader, CardTitle, CardContent } from 'shadcn/ui';

const fetcher = (url: string) => fetch(url).then(r => r.json());

type TabKey = 'dashboard' | 'customers' | 'campaigns' | 'actions' | 'analytics' | 'settings';

const labels: Record<TabKey, string> = {
  dashboard: 'ダッシュボード',
  customers: '顧客',
  campaigns: 'キャンペーン',
  actions: 'アクション',
  analytics: '分析',
  settings: '設定',
};

const endpoints: Record<TabKey, string> = {
  dashboard: '/api/ebay-customer-retention/dashboard',
  customers: '/api/ebay-customer-retention/customers',
  campaigns: '/api/ebay-customer-retention/campaigns',
  actions: '/api/ebay-customer-retention/actions',
  analytics: '/api/ebay-customer-retention/analytics',
  settings: '/api/ebay-customer-retention/settings',
};

export default function CustomerRetentionPage() {
  const defaultTab: TabKey = 'dashboard';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-pink-600">顧客維持</h1>

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


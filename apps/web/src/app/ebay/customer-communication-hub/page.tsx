
'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TabKey =
  | 'dashboard'
  | 'messages'
  | 'templates'
  | 'automations'
  | 'analytics'
  | 'settings';

const labels: Record<TabKey, string> = {
  dashboard: 'ダッシュボード',
  messages: 'メッセージ',
  templates: 'テンプレート',
  automations: '自動化',
  analytics: '分析',
  settings: '設定',
};

const endpoints: Record<TabKey, string> = {
  dashboard: '/api/ebay-customer-communication-hub/dashboard',
  messages: '/api/ebay-customer-communication-hub/messages',
  templates: '/api/ebay-customer-communication-hub/templates',
  automations: '/api/ebay-customer-communication-hub/automations',
  analytics: '/api/ebay-customer-communication-hub/analytics',
  settings: '/api/ebay-customer-communication-hub/settings',
};

export default function CustomerCommunicationHubPage() {
  const defaultTab: TabKey = 'dashboard';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-lime-600">顧客コミュニケーションハブ</h1>
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


'use client';

import React from 'react';
import useSWR from 'swr';
// shadcn/ui components (paths follow common shadcn setup)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TabPanel: React.FC<{ title: string; path: string }> = ({ title, path }) => {
  const { data, error, isLoading } = useSWR(path, fetcher);
  return (
    <Card className="p-4 space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>
      {isLoading && <p>読み込み中...</p>}
      {error && <p className="text-red-600">エラーが発生しました</p>}
      {!isLoading && !error && (
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      )}
    </Card>
  );
};

export default function ShippingAutomationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-blue-600">配送自動化</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="automations">自動化</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="carriers">キャリア</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <TabPanel title="ダッシュボード" path="/api/ebay-shipping-automation/dashboard" />
        </TabsContent>
        <TabsContent value="automations">
          {/* automations は CRUD+enable+test 構成のため単一 ID 例示 */}
          <TabPanel title="自動化" path="/api/ebay-shipping-automation/automations/1" />
        </TabsContent>
        <TabsContent value="rules">
          <TabPanel title="ルール" path="/api/ebay-shipping-automation/rules" />
        </TabsContent>
        <TabsContent value="carriers">
          <TabPanel title="キャリア" path="/api/ebay-shipping-automation/carriers" />
        </TabsContent>
        <TabsContent value="analytics">
          <TabPanel title="分析" path="/api/ebay-shipping-automation/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <TabPanel title="設定" path="/api/ebay-shipping-automation/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


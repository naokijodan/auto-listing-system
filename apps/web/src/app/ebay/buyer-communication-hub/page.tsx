'use client';

import useSWR from 'swr';
import React from 'react';

// Assuming shadcn/ui components are available in your project
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="mt-2 rounded bg-gray-50 p-3 text-xs overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function BuyerCommunicationHubPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">バイヤーコミュニケーションハブ</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="messages">メッセージ</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="auto">自動返信</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>概要</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardSummary />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>統計</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardStats />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <CardTitle>受信ボックス</CardTitle>
            </CardHeader>
            <CardContent>
              <InboxPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auto">
          <Card>
            <CardHeader>
              <CardTitle>自動返信</CardTitle>
            </CardHeader>
            <CardContent>
              <AutoRepliesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardSummary() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-buyer-communication-hub/dashboard/summary',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/dashboard/summary</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          再読み込み
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function DashboardStats() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-buyer-communication-hub/dashboard/stats',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/dashboard/stats</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function InboxPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-buyer-communication-hub/dashboard/inbox',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/dashboard/inbox</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function TemplatesPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-buyer-communication-hub/templates',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/templates</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function AutoRepliesPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-buyer-communication-hub/auto-replies',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/auto-replies</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function AnalyticsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-buyer-communication-hub/analytics',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/analytics</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          更新
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function SettingsPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-buyer-communication-hub/settings',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/settings</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          取得
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}


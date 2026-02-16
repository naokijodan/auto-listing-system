'use client';

import * as React from 'react';
import useSWR from 'swr';

// shadcn/ui components (expected in project)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function JsonView({ data }: { data: unknown }) {
  return (
    <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function ProductConditionPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-rose-600">商品コンディション管理</h1>
      </div>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="conditions">コンディション</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="mappings">マッピング</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conditions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>コンディション一覧</CardTitle>
              <Button
                variant="secondary"
                onClick={() => fetch('/api/ebay-product-condition/mappings/sync', { method: 'POST' })}
              >
                同期
              </Button>
            </CardHeader>
            <CardContent>
              <ConditionsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplatesSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings">
          <Card>
            <CardHeader>
              <CardTitle>マッピング</CardTitle>
            </CardHeader>
            <CardContent>
              <MappingsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>分析</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>設定</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsSection />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardSection() {
  const { data, error, isLoading, mutate } = useSWR<any>(
    '/api/ebay-product-condition/dashboard/summary',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">コンディション別統計、返品率、クレーム率。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
      <div className="mt-3">
        <Button onClick={() => mutate()} className="bg-rose-600 text-white hover:bg-rose-700">
          再読み込み
        </Button>
      </div>
    </div>
  );
}

function ConditionsSection() {
  const { data, error, isLoading } = useSWR<any>(
    '/api/ebay-product-condition/conditions',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">コンディション定義を一覧表示。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function TemplatesSection() {
  const { data, error, isLoading } = useSWR<any>('/api/ebay-product-condition/templates', fetcher);
  return (
    <div>
      <div className="text-sm text-gray-600">テンプレート一覧。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function MappingsSection() {
  const { data, error, isLoading } = useSWR<any>('/api/ebay-product-condition/mappings', fetcher);
  return (
    <div>
      <div className="text-sm text-gray-600">マッピング設定の確認。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function AnalyticsSection() {
  const { data, error, isLoading } = useSWR<any>(
    '/api/ebay-product-condition/analytics/performance',
    fetcher
  );
  return (
    <div>
      <div className="text-sm text-gray-600">パフォーマンス分析。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
    </div>
  );
}

function SettingsSection() {
  const { data, error, isLoading, mutate } = useSWR<any>('/api/ebay-product-condition/settings', fetcher);
  const onSave = async () => {
    await fetch('/api/ebay-product-condition/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoValidate: true }),
    });
    mutate();
  };
  return (
    <div>
      <div className="text-sm text-gray-600">デフォルトと検証設定。</div>
      {isLoading && <div>読み込み中...</div>}
      {error && <div className="text-red-600">エラーが発生しました</div>}
      {data && <JsonView data={data} />}
      <div className="mt-3">
        <Button onClick={onSave} className="bg-rose-600 text-white hover:bg-rose-700">
          保存
        </Button>
      </div>
    </div>
  );
}


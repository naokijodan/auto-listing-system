'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function SkuManagementPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-600">SKU管理システム</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="skus">SKU</TabsTrigger>
          <TabsTrigger value="mappings">マッピング</TabsTrigger>
          <TabsTrigger value="validation">バリデーション</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="skus">
          <SkusTab />
        </TabsContent>
        <TabsContent value="mappings">
          <MappingsTab />
        </TabsContent>
        <TabsContent value="validation">
          <ValidationTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-sku-management/dashboard', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function SkusTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-sku-management/skus', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function MappingsTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-sku-management/mappings', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function ValidationTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-sku-management/validation', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function AnalyticsTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-sku-management/analytics', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function SettingsTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-sku-management/settings', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}


'use client';

import useSWR from 'swr';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ReturnPolicyPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-purple-600">返品ポリシー管理</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="policies">ポリシー</TabsTrigger>
          <TabsTrigger value="conditions">条件</TabsTrigger>
          <TabsTrigger value="assign">適用</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="conditions">
          <ConditionsTab />
        </TabsContent>
        <TabsContent value="assign">
          <AssignmentsTab />
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
  const { data, error, isLoading } = useSWR('/api/ebay-return-policy/dashboard', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function PoliciesTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-return-policy/policies', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function ConditionsTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-return-policy/conditions', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function AssignmentsTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-return-policy/assignments', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function AnalyticsTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-return-policy/analytics', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}

function SettingsTab() {
  const { data, error, isLoading } = useSWR('/api/ebay-return-policy/settings', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div>エラーが発生しました</div>;
  return (
    <pre className="bg-gray-50 p-4 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
  );
}


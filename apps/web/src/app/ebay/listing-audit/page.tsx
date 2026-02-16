'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function JsonView({ data }: { data: unknown }) {
  const text = useMemo(() => JSON.stringify(data, null, 2), [data]);
  return (
    <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto max-h-80">{text}</pre>
  );
}

export default function ListingAuditPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">出品監査</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="audits">監査</TabsTrigger>
          <TabsTrigger value="issues">問題</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <Card>
            <CardHeader>
              <CardTitle>ダッシュボード概要</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audits">
          <Card>
            <CardHeader>
              <CardTitle>監査一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <AuditsPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>問題</CardTitle>
            </CardHeader>
            <CardContent>
              <IssuesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>ルール</CardTitle>
            </CardHeader>
            <CardContent>
              <RulesPanel />
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

function DashboardPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-listing-audit/dashboard/summary', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function AuditsPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-listing-audit/audits', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function IssuesPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-listing-audit/issues', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function RulesPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-listing-audit/rules', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function AnalyticsPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-listing-audit/analytics', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}

function SettingsPanel() {
  const { data, error, isLoading } = useSWR('/api/ebay-listing-audit/settings', fetcher);
  if (isLoading) return <div>読み込み中...</div>;
  if (error) return <div className="text-red-600">読み込みエラー</div>;
  return <JsonView data={data} />;
}


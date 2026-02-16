'use client';

import React from 'react';
import useSWR from 'swr';

// shadcn/ui components (project-typical import paths)
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const BASE = '/api/ebay-category-manager';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

function DataPanel({ path, title }: { path: string; title: string }) {
  const { data, error, isValidating } = useSWR(`${BASE}${path}`, fetcher);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-orange-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600">Error: {String(error.message || error)}</div>}
        {!error && (isValidating || !data) && <div>Loading...</div>}
        {!error && data && (
          <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded border">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function CategoryManagerPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-orange-600">カテゴリマネージャー</h1>

      <Tabs defaultValue="dashboard">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="mappings">マッピング</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DataPanel title="ダッシュボード概要" path="/dashboard/summary" />
        </TabsContent>

        <TabsContent value="categories">
          <DataPanel title="カテゴリ一覧" path="/categories" />
        </TabsContent>

        <TabsContent value="mappings">
          <DataPanel title="マッピング一覧" path="/mappings" />
        </TabsContent>

        <TabsContent value="rules">
          <DataPanel title="ルール一覧" path="/rules" />
        </TabsContent>

        <TabsContent value="analytics">
          <DataPanel title="分析" path="/analytics" />
        </TabsContent>

        <TabsContent value="settings">
          <DataPanel title="設定" path="/settings" />
        </TabsContent>
      </Tabs>
    </div>
  );
}


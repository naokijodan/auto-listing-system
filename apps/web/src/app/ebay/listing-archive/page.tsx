'use client';

import useSWR from 'swr';
import React from 'react';

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

export default function ListingArchivePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-600">出品アーカイブ</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="archives">アーカイブ</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="search">検索</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardSummary />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ストレージ状況</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardStorage />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archives">
          <Card>
            <CardHeader>
              <CardTitle>アーカイブ一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <ArchivesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriesPanel />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>検索</CardTitle>
            </CardHeader>
            <CardContent>
              <SearchPanel />
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
    '/api/ebay-listing-archive/dashboard/summary',
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

function DashboardStorage() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-listing-archive/dashboard/storage',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/dashboard/storage</span>
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

function ArchivesPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-listing-archive/archives',
    fetcher
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/archives</span>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          一覧取得
        </Button>
      </div>
      {isLoading && <p className="text-sm">読み込み中...</p>}
      {error && <p className="text-sm text-red-600">エラーが発生しました</p>}
      {data && <JsonBlock data={data} />}
    </div>
  );
}

function CategoriesPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-listing-archive/categories',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/categories</span>
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

function SearchPanel() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/ebay-listing-archive/search/advanced',
    fetcher
  );
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">/search/advanced</span>
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
    '/api/ebay-listing-archive/analytics',
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
    '/api/ebay-listing-archive/settings',
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


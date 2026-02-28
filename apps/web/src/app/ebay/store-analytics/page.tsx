
'use client';

import useSWR from 'swr'
import React from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function JsonView({ url }: { url: string }) {
  const { data, error, isLoading, mutate } = useSWR(url, fetcher)
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{url}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => mutate()}>Refresh</Button>
      </CardHeader>
      <CardContent>
        {error && <div className="text-red-600">Error loading</div>}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </CardContent>
    </Card>
  )
}

export default function StoreAnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-violet-600">ストアアナリティクス</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="metrics">メトリクス</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="benchmarks">ベンチマーク</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <JsonView url="/api/ebay-store-analytics/dashboard" />
        </TabsContent>
        <TabsContent value="metrics">
          <JsonView url="/api/ebay-store-analytics/metrics" />
        </TabsContent>
        <TabsContent value="reports">
          <JsonView url="/api/ebay-store-analytics/reports" />
        </TabsContent>
        <TabsContent value="benchmarks">
          <JsonView url="/api/ebay-store-analytics/benchmarks" />
        </TabsContent>
        <TabsContent value="analytics">
          <JsonView url="/api/ebay-store-analytics/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <JsonView url="/api/ebay-store-analytics/settings" />
        </TabsContent>
      </Tabs>
    </div>
  )
}


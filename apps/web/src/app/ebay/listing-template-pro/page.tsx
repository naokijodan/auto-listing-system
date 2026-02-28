
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

export default function ListingTemplateProPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-teal-600">リスティングテンプレートPro</h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="variables">変数</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <JsonView url="/api/ebay-listing-template-pro/dashboard" />
        </TabsContent>
        <TabsContent value="templates">
          <JsonView url="/api/ebay-listing-template-pro/templates" />
        </TabsContent>
        <TabsContent value="categories">
          <JsonView url="/api/ebay-listing-template-pro/categories" />
        </TabsContent>
        <TabsContent value="variables">
          <JsonView url="/api/ebay-listing-template-pro/variables" />
        </TabsContent>
        <TabsContent value="analytics">
          <JsonView url="/api/ebay-listing-template-pro/analytics" />
        </TabsContent>
        <TabsContent value="settings">
          <JsonView url="/api/ebay-listing-template-pro/settings" />
        </TabsContent>
      </Tabs>
    </div>
  )
}


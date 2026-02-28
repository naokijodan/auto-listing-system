
"use client"

import useSWR from 'swr'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const API_BASE = '/api/ebay-seller-score-optimizer'

function TabPanel({ title, endpoint, method = 'GET' }: { title: string; endpoint: string; method?: 'GET' | 'POST' | 'PUT' | 'DELETE' }) {
  const { data } = useSWR(`${API_BASE}${endpoint}`, (u: string) => fetch(u, { method }).then((r) => r.json()))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
      </CardContent>
    </Card>
  )
}

export default function SellerScoreOptimizerPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-lime-600">セラースコア最適化</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="metrics">メトリクス</TabsTrigger>
          <TabsTrigger value="actions">アクション</TabsTrigger>
          <TabsTrigger value="recommendations">レコメンド</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="ダッシュボード" endpoint="/dashboard" />
            <TabPanel title="サマリー" endpoint="/dashboard/summary" />
            <TabPanel title="スコア内訳" endpoint="/dashboard/score-breakdown" />
            <TabPanel title="履歴" endpoint="/dashboard/history" />
            <TabPanel title="目標" endpoint="/dashboard/goals" />
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="メトリクス一覧" endpoint="/metrics" />
            <TabPanel title="メトリクス詳細" endpoint="/metrics/score-1" />
            <TabPanel title="計算" endpoint="/metrics/calculate" method="POST" />
            <TabPanel title="履歴" endpoint="/metrics/history" />
            <TabPanel title="比較" endpoint="/metrics/compare" method="POST" />
            <TabPanel title="ターゲット" endpoint="/metrics/targets" />
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="アクション一覧" endpoint="/actions" />
            <TabPanel title="アクション詳細" endpoint="/actions/act-1" />
            <TabPanel title="アクション作成" endpoint="/actions" method="POST" />
            <TabPanel title="完了" endpoint="/actions/act-1/complete" method="POST" />
          </div>
        </TabsContent>

        <TabsContent value="recommendations">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="レコメンド一覧" endpoint="/recommendations" />
            <TabPanel title="レコメンド詳細" endpoint="/recommendations/rec-1" />
            <TabPanel title="適用" endpoint="/recommendations/rec-1/apply" method="POST" />
            <TabPanel title="却下" endpoint="/recommendations/rec-1/dismiss" method="POST" />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="分析" endpoint="/analytics" />
            <TabPanel title="トレンド" endpoint="/analytics/trends" />
            <TabPanel title="競合スコア" endpoint="/analytics/competitor-scores" />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="設定取得" endpoint="/settings" />
            <TabPanel title="設定更新" endpoint="/settings" method="PUT" />
            <TabPanel title="ヘルス" endpoint="/health" />
            <TabPanel title="エクスポート" endpoint="/export" />
            <TabPanel title="インポート" endpoint="/import" method="POST" />
            <TabPanel title="更新" endpoint="/refresh" method="POST" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}


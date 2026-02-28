
'use client'

import useSWR from 'swr'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const API_BASE = '/api/ebay-return-automation-engine'

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

export default function ReturnAutomationEnginePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-orange-600">返品自動化エンジン</h1>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="returns">返品</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="labels">ラベル</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="ダッシュボード" endpoint="/dashboard" />
            <TabPanel title="サマリー" endpoint="/dashboard/summary" />
            <TabPanel title="保留中" endpoint="/dashboard/pending" />
            <TabPanel title="処理済み" endpoint="/dashboard/processed" />
            <TabPanel title="コスト" endpoint="/dashboard/cost" />
          </div>
        </TabsContent>

        <TabsContent value="returns">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="返品一覧" endpoint="/returns" />
            <TabPanel title="返品詳細" endpoint="/returns/123" />
            <TabPanel title="返品作成" endpoint="/returns" method="POST" />
            <TabPanel title="承認" endpoint="/returns/123/approve" method="POST" />
            <TabPanel title="却下" endpoint="/returns/123/reject" method="POST" />
            <TabPanel title="一括処理" endpoint="/returns/bulk-process" method="POST" />
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="ルール一覧" endpoint="/rules" />
            <TabPanel title="ルール詳細" endpoint="/rules/ret-1" />
            <TabPanel title="ルール作成" endpoint="/rules" method="POST" />
            <TabPanel title="ルール更新" endpoint="/rules/ret-1" method="PUT" />
          </div>
        </TabsContent>

        <TabsContent value="labels">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="ラベル一覧" endpoint="/labels" />
            <TabPanel title="ラベル詳細" endpoint="/labels/lbl-1" />
            <TabPanel title="生成" endpoint="/labels/generate" method="POST" />
            <TabPanel title="一括生成" endpoint="/labels/bulk-generate" method="POST" />
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="分析" endpoint="/analytics" />
            <TabPanel title="理由別分析" endpoint="/analytics/reasons" />
            <TabPanel title="コストトレンド" endpoint="/analytics/cost-trend" />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid gap-4 md:grid-cols-2">
            <TabPanel title="設定取得" endpoint="/settings" />
            <TabPanel title="設定更新" endpoint="/settings" method="PUT" />
            <TabPanel title="ヘルスチェック" endpoint="/health" />
            <TabPanel title="エクスポート" endpoint="/export" />
            <TabPanel title="インポート" endpoint="/import" method="POST" />
            <TabPanel title="同期" endpoint="/sync" method="POST" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

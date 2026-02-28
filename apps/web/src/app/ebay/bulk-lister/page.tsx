
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 280: eBay Bulk Lister（一括出品ツール）
// テーマカラー: lime-600

export default function EbayBulkListerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-bulk-lister/dashboard', fetcher);
  const { data: batchesData } = useSWR('/api/ebay-bulk-lister/batches', fetcher);
  const { data: templatesData } = useSWR('/api/ebay-bulk-lister/templates', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-bulk-lister/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-lime-600">一括出品ツール</h1>
        <p className="text-gray-600">大量の商品を効率的に出品</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="batches">バッチ</TabsTrigger>
          <TabsTrigger value="upload">アップロード</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">出品済み</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-lime-600">{dashboardData?.totalListed?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">処理中</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{dashboardData?.pendingListings || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">成功率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.successRate || 0}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">本日の出品</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.todayListed || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>最近のバッチ</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Batch 2026-02-16 #1', items: 50, status: 'COMPLETED' },
                    { name: 'Batch 2026-02-16 #2', items: 25, status: 'PROCESSING' },
                    { name: 'Scheduled Batch', items: 50, status: 'SCHEDULED' },
                  ].map((batch) => (
                    <div key={batch.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{batch.name}</div><div className="text-sm text-gray-500">{batch.items}件</div></div>
                      <Badge className={batch.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : batch.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{batch.status === 'COMPLETED' ? '完了' : batch.status === 'PROCESSING' ? '処理中' : '予定'}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>カテゴリ別</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ category: 'Watches', count: 2000, percent: 40 },{ category: 'Electronics', count: 1500, percent: 30 },{ category: 'Collectibles', count: 1000, percent: 20 },{ category: 'Other', count: 500, percent: 10 }].map((item) => (
                    <div key={item.category}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{item.category}</span><span className="text-sm">{item.count.toLocaleString()} ({item.percent}%)</span></div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>バッチ一覧</CardTitle><Button className="bg-lime-600 hover:bg-lime-700">新規バッチ</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {batchesData?.batches?.map((batch: any) => (
                  <div key={batch.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-lime-100 rounded-lg flex items-center justify-center font-bold text-lime-600">{batch.items}</div>
                      <div><div className="font-medium">{batch.name}</div><div className="text-sm text-gray-500">{batch.completed}/{batch.items}完了 • 失敗: {batch.failed}</div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={batch.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : batch.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{batch.status}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>CSVアップロード</CardTitle><CardDescription>CSVファイルから一括インポート</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-gray-500 mb-2">CSVファイルをドラッグ&ドロップ</div>
                  <div className="text-sm text-gray-400">または</div>
                  <Button variant="outline" className="mt-2">ファイルを選択</Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">テンプレートをダウンロード</Button>
                  <Button className="flex-1 bg-lime-600 hover:bg-lime-700">アップロード</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>クイック出品</CardTitle><CardDescription>テンプレートを使用して素早く出品</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">テンプレート</label>
                  <Select><SelectTrigger><SelectValue placeholder="テンプレートを選択" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t1">Watch Listing Template</SelectItem>
                      <SelectItem value="t2">Electronics Template</SelectItem>
                      <SelectItem value="t3">Quick List Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">商品数</label><Input type="number" placeholder="出品数を入力" /></div>
                <Button className="w-full bg-lime-600 hover:bg-lime-700">出品を開始</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>テンプレート</CardTitle><Button className="bg-lime-600 hover:bg-lime-700">新規作成</Button></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesData?.templates?.map((template: any) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader><CardTitle className="text-lg">{template.name}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center"><span className="text-sm text-gray-500">{template.usageCount}回使用</span><span className="text-sm text-gray-500">最終: {template.lastUsed}</span></div>
                      <div className="mt-3 flex gap-2"><Button variant="outline" size="sm" className="flex-1">編集</Button><Button size="sm" className="flex-1 bg-lime-600 hover:bg-lime-700">使用</Button></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>出品パフォーマンス</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span>平均出品時間</span><span className="font-bold">2.5秒/件</span></div>
                  <div className="flex justify-between items-center"><span>成功率</span><span className="font-bold text-green-600">99.0%</span></div>
                  <div className="flex justify-between items-center"><span>平均バッチサイズ</span><span className="font-bold">45件</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>エラー分析</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ type: 'Invalid Category', count: 15, percent: 30 },{ type: 'Missing Images', count: 10, percent: 20 },{ type: 'Price Out of Range', count: 10, percent: 20 }].map((error) => (
                    <div key={error.type}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{error.type}</span><span className="text-sm">{error.count}件 ({error.percent}%)</span></div>
                      <Progress value={error.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>基本設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">デフォルトテンプレート</label>
                  <Select defaultValue={settingsData?.defaultTemplateId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="t1">Watch Listing Template</SelectItem>
                      <SelectItem value="t2">Electronics Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">バッチサイズ上限</label><Input type="number" defaultValue={settingsData?.batchSize} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>自動化設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動リトライ</div><div className="text-sm text-gray-500">失敗時に自動で再試行</div></div><Badge variant={settingsData?.autoRetry ? "default" : "secondary"}>{settingsData?.autoRetry ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">リトライ回数</label><Input type="number" defaultValue={settingsData?.retryAttempts} /></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">完了通知</div></div><Badge variant={settingsData?.notifyOnComplete ? "default" : "secondary"}>{settingsData?.notifyOnComplete ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-lime-600 hover:bg-lime-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 270: eBay Message Template Manager（メッセージテンプレート管理）
// テーマカラー: cyan-600

export default function EbayMessageTemplatesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-message-templates/dashboard', fetcher);
  const { data: templatesData } = useSWR('/api/ebay-message-templates/templates', fetcher);
  const { data: categoriesData } = useSWR('/api/ebay-message-templates/categories', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-600">メッセージテンプレート管理</h1>
        <p className="text-gray-600">eBayの顧客コミュニケーション用テンプレートを管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="variables">変数</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">総テンプレート数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-cyan-600">{dashboardData?.totalTemplates || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">有効テンプレート</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardData?.activeTemplates || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">送信メッセージ数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.messagesSent || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">返信率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboardData?.responseRate || 0}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別テンプレート数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData?.categoryCounts && Object.entries(dashboardData.categoryCounts).map(([category, count]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{category}</span>
                      <Badge variant="secondary">{count as number}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アラート</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm text-yellow-800">返信率が低いテンプレートがあります</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* テンプレート一覧 */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>テンプレート一覧</CardTitle>
                <Button className="bg-cyan-600 hover:bg-cyan-700">新規作成</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="検索..." className="max-w-sm" />
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="カテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="ORDER_STATUS">注文状況</SelectItem>
                    <SelectItem value="SHIPPING">配送</SelectItem>
                    <SelectItem value="FEEDBACK">フィードバック</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {templatesData?.templates?.map((template: any) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{template.category}</Badge>
                        <Badge variant="outline">{template.language}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? '有効' : '無効'}
                      </Badge>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* カテゴリ */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ管理</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoriesData?.categories?.map((category: any) => (
                  <Card key={category.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      <p className="text-gray-500 text-sm mt-1">{category.count} テンプレート</p>
                      <Button variant="link" className="p-0 mt-2 text-cyan-600">詳細を見る →</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 変数 */}
        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <CardTitle>利用可能な変数</CardTitle>
              <CardDescription>テンプレート内で使用できる変数一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { name: '{{buyerName}}', description: '購入者名', example: 'John Doe' },
                  { name: '{{orderNumber}}', description: '注文番号', example: '12345' },
                  { name: '{{itemTitle}}', description: '商品タイトル', example: 'Vintage Watch' },
                  { name: '{{trackingNumber}}', description: '追跡番号', example: 'TRK123456' },
                  { name: '{{estimatedDelivery}}', description: '配達予定日', example: '2026-02-20' },
                ].map((variable) => (
                  <div key={variable.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <code className="bg-cyan-100 text-cyan-800 px-2 py-1 rounded">{variable.name}</code>
                      <span className="ml-3 text-gray-600">{variable.description}</span>
                    </div>
                    <span className="text-sm text-gray-400">例: {variable.example}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析 */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>使用状況</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>総送信数</span>
                    <span className="font-bold">5,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>今月の送信数</span>
                    <span className="font-bold">1,200</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均返信率</span>
                    <span className="font-bold text-green-600">85%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>テンプレート別パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Order Confirmation', rate: 90 },
                    { name: 'Shipping Update', rate: 85 },
                    { name: 'Return Request', rate: 75 },
                  ].map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.name}</span>
                        <span>{item.rate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-cyan-600 h-2 rounded-full"
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>テンプレート設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">デフォルト言語</label>
                <Select defaultValue="en">
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">署名</label>
                <Input defaultValue="Best regards, Your Store" />
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="autoTranslate" className="rounded" />
                <label htmlFor="autoTranslate">自動翻訳を有効化</label>
              </div>

              <Button className="bg-cyan-600 hover:bg-cyan-700">設定を保存</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

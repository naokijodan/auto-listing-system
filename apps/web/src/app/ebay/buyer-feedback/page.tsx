
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
import { Textarea } from '@/components/ui/textarea';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 272: eBay Buyer Feedback Manager（バイヤーフィードバック管理）
// テーマカラー: amber-600

export default function EbayBuyerFeedbackPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-buyer-feedback/dashboard', fetcher);
  const { data: feedbacksData } = useSWR('/api/ebay-buyer-feedback/feedbacks', fetcher);
  const { data: requestsData } = useSWR('/api/ebay-buyer-feedback/requests', fetcher);
  const { data: templatesData } = useSWR('/api/ebay-buyer-feedback/templates', fetcher);
  const { data: analyticsData } = useSWR('/api/ebay-buyer-feedback/analytics/trends', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-buyer-feedback/settings', fetcher);

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-amber-600">バイヤーフィードバック管理</h1>
        <p className="text-gray-600">フィードバックを管理して評価を向上</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="feedbacks">フィードバック</TabsTrigger>
          <TabsTrigger value="requests">リクエスト</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">総フィードバック</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{dashboardData?.totalFeedback?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">ポジティブ率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardData?.positivePercent || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均評価</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">⭐ {dashboardData?.avgRating?.toFixed(1) || '0.0'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">返信待ち</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboardData?.pendingResponses || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>評価分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const data = { 5: 80, 4: 16, 3: 2.4, 2: 1, 1: 0.6 }[stars] || 0;
                    return (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="w-16 text-sm">{'⭐'.repeat(stars)}</span>
                        <Progress value={data} className="flex-1 h-3" />
                        <span className="w-12 text-sm text-right">{data}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アラート</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                    <p className="text-sm font-medium text-red-800">ネガティブフィードバック</p>
                    <p className="text-sm text-red-700">新しい低評価を受け取りました</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm font-medium text-yellow-800">返信待ち</p>
                    <p className="text-sm text-yellow-700">15件の返信が必要です</p>
                  </div>
                  <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded">
                    <p className="text-sm font-medium text-green-800">達成</p>
                    <p className="text-sm text-green-700">ポジティブ率96%達成！</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* フィードバック一覧 */}
        <TabsContent value="feedbacks">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>フィードバック一覧</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-green-50">ポジティブ: {dashboardData?.positiveFeedback || 0}</Badge>
                  <Badge variant="outline" className="bg-yellow-50">ニュートラル: {dashboardData?.neutralFeedback || 0}</Badge>
                  <Badge variant="outline" className="bg-red-50">ネガティブ: {dashboardData?.negativeFeedback || 0}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="検索..." className="max-w-sm" />
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="評価" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="positive">ポジティブ</SelectItem>
                    <SelectItem value="neutral">ニュートラル</SelectItem>
                    <SelectItem value="negative">ネガティブ</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="返信状態" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="responded">返信済み</SelectItem>
                    <SelectItem value="pending">未返信</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {feedbacksData?.feedbacks?.map((feedback: any) => (
                  <div key={feedback.id} className="p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`font-bold ${getRatingColor(feedback.rating)}`}>
                            {'⭐'.repeat(feedback.rating)}
                          </span>
                          <Badge variant={feedback.type === 'positive' ? 'default' : feedback.type === 'negative' ? 'destructive' : 'secondary'}>
                            {feedback.type === 'positive' ? 'ポジティブ' : feedback.type === 'negative' ? 'ネガティブ' : 'ニュートラル'}
                          </Badge>
                          <span className="text-sm text-gray-500">{feedback.buyerName}</span>
                        </div>
                        <p className="text-gray-700 mb-2">{feedback.comment}</p>
                        <div className="flex gap-2 text-sm text-gray-500">
                          <span>{feedback.itemTitle}</span>
                          <span>•</span>
                          <span>{new Date(feedback.createdAt).toLocaleDateString('ja-JP')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={feedback.responded ? "default" : "outline"}>
                          {feedback.responded ? '返信済み' : '未返信'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          {feedback.responded ? '詳細' : '返信'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* フィードバックリクエスト */}
        <TabsContent value="requests">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>リクエスト履歴</CardTitle>
                  <Button className="bg-amber-600 hover:bg-amber-700">新規リクエスト</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {requestsData?.requests?.map((request: any) => (
                    <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">注文 #{request.orderId}</div>
                        <div className="text-sm text-gray-500">バイヤー: {request.buyerId}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={request.status === 'sent' ? 'default' : 'secondary'}>
                          {request.status === 'sent' ? '送信済み' : '予定'}
                        </Badge>
                        <Badge variant={request.feedbackReceived ? 'default' : 'outline'} className="bg-green-50">
                          {request.feedbackReceived ? 'FB受信' : '待機中'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>統計</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">成功率</span>
                    <span className="text-sm font-medium">{requestsData?.successRate || 0}%</span>
                  </div>
                  <Progress value={requestsData?.successRate || 0} className="h-2" />
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500 mb-2">リクエスト総数</div>
                  <div className="text-2xl font-bold">{requestsData?.total || 0}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* テンプレート管理 */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>フィードバックリクエストテンプレート</CardTitle>
                <Button className="bg-amber-600 hover:bg-amber-700">新規作成</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templatesData?.templates?.map((template: any) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-medium">{template.name}</h3>
                      <p className="text-sm text-gray-500">{template.subject}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium text-green-600">{template.successRate}%</div>
                        <div className="text-sm text-gray-500">成功率</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{template.usageCount}</div>
                        <div className="text-sm text-gray-500">使用回数</div>
                      </div>
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

        {/* 分析 */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>評価トレンド</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.trends?.map((trend: any) => (
                    <div key={trend.period} className="flex items-center justify-between p-2 border-b">
                      <span className="text-sm">{trend.period}</span>
                      <div className="flex items-center gap-4">
                        <Badge variant="default" className="bg-green-100 text-green-700">{trend.positive}%</Badge>
                        <span className="text-sm">⭐ {trend.avgRating}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">トレンド</span>
                    <Badge className="bg-green-600">{analyticsData?.overallTrend || '安定'}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { category: 'Watches', avgRating: 4.9, positivePercent: 98 },
                    { category: 'Electronics', avgRating: 4.7, positivePercent: 95 },
                    { category: 'Collectibles', avgRating: 4.85, positivePercent: 97 },
                    { category: 'Clothing', avgRating: 4.6, positivePercent: 93 },
                  ].map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{cat.category}</span>
                      <div className="flex items-center gap-4">
                        <span>⭐ {cat.avgRating}</span>
                        <Badge variant="outline" className="bg-green-50">{cat.positivePercent}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>返信の効果</CardTitle>
                <CardDescription>フィードバックへの返信がリピート購入に与える影響</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <div className="text-sm text-amber-800 mb-2">返信あり</div>
                    <div className="text-3xl font-bold text-amber-600">35%</div>
                    <div className="text-sm text-gray-500">リピート購入率</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">返信なし</div>
                    <div className="text-3xl font-bold text-gray-600">20%</div>
                    <div className="text-sm text-gray-500">リピート購入率</div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-green-50 rounded-lg text-center">
                  <span className="text-green-800 font-medium">返信するとリピート購入率が +75% 向上</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>自動リクエスト設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">自動リクエスト</div>
                    <div className="text-sm text-gray-500">配達後に自動でフィードバックをリクエスト</div>
                  </div>
                  <Badge variant={settingsData?.autoRequestEnabled ? "default" : "secondary"}>
                    {settingsData?.autoRequestEnabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">リクエスト送信までの日数</label>
                  <Input type="number" defaultValue={settingsData?.requestDelayDays || 7} />
                </div>
                <div>
                  <label className="text-sm font-medium">デフォルトテンプレート</label>
                  <Select defaultValue={settingsData?.defaultTemplateId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesData?.templates?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>通知設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">ネガティブフィードバックアラート</div>
                    <div className="text-sm text-gray-500">低評価を受け取ったら通知</div>
                  </div>
                  <Badge variant={settingsData?.negativeAlertEnabled ? "default" : "secondary"}>
                    {settingsData?.negativeAlertEnabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">メール通知</div>
                  </div>
                  <Badge variant={settingsData?.emailNotifications ? "default" : "secondary"}>
                    {settingsData?.emailNotifications ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">返信目標時間（時間）</label>
                  <Input type="number" defaultValue={settingsData?.responseTimeGoal || 24} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="bg-amber-600 hover:bg-amber-700">設定を保存</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

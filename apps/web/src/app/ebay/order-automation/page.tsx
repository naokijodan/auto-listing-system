
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

// Phase 282: eBay Order Automation（注文自動化）
// テーマカラー: amber-600

export default function EbayOrderAutomationPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-order-automation/dashboard', fetcher);
  const { data: rulesData } = useSWR('/api/ebay-order-automation/rules', fetcher);
  const { data: templatesData } = useSWR('/api/ebay-order-automation/templates', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-order-automation/settings', fetcher);

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'ORDER_RECEIVED': return '注文受付';
      case 'PAYMENT_CONFIRMED': return '支払確認';
      case 'SHIPPED': return '発送済み';
      case 'DELIVERED': return '配達完了';
      case 'RETURN_REQUESTED': return '返品リクエスト';
      default: return trigger;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-amber-600">注文自動化</h1>
        <p className="text-gray-600">注文処理のワークフローを自動化</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="logs">ログ</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">アクティブルール</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-amber-600">{dashboardData?.activeRules || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">本日処理</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.ordersProcessedToday || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">自動化率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.automationRate || 0}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">節約時間</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.timeSaved || 0}h</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>最近のアクティビティ</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { orderId: 'ORD001', action: 'Label created', status: 'SUCCESS', time: '10:30' },
                    { orderId: 'ORD002', action: 'Email sent', status: 'SUCCESS', time: '10:28' },
                    { orderId: 'ORD003', action: 'Warehouse notified', status: 'PENDING', time: '10:25' },
                  ].map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">#{activity.orderId}</div><div className="text-sm text-gray-500">{activity.action}</div></div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{activity.time}</span>
                        <Badge className={activity.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{activity.status === 'SUCCESS' ? '成功' : '保留'}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>トリガー別統計</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ trigger: 'ORDER_RECEIVED', count: 100, percent: 40 },{ trigger: 'PAYMENT_CONFIRMED', count: 75, percent: 30 },{ trigger: 'SHIPPED', count: 50, percent: 20 },{ trigger: 'DELIVERED', count: 25, percent: 10 }].map((item) => (
                    <div key={item.trigger}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{getTriggerLabel(item.trigger)}</span><span className="text-sm">{item.count}件 ({item.percent}%)</span></div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>自動化ルール</CardTitle><Button className="bg-amber-600 hover:bg-amber-700">新規ルール</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rulesData?.rules?.map((rule: any) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center font-bold text-amber-600">{rule.actions}</div>
                      <div><div className="font-medium">{rule.name}</div><div className="flex gap-2 text-sm text-gray-500"><Badge variant="outline">{getTriggerLabel(rule.trigger)}</Badge><span>実行: {rule.executed}回</span></div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{rule.isActive ? '有効' : '無効'}</Badge>
                      <Button variant="outline" size="sm">編集</Button>
                      <Button variant="outline" size="sm">テスト</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>メッセージテンプレート</CardTitle><Button className="bg-amber-600 hover:bg-amber-700">新規作成</Button></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesData?.templates?.map((template: any) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader><CardTitle className="text-lg">{template.name}</CardTitle><Badge variant="outline">{template.type}</Badge></CardHeader>
                    <CardContent><div className="flex justify-between items-center"><span className="text-sm text-gray-500">{template.usageCount}回使用</span><Button variant="outline" size="sm">編集</Button></div></CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>実行ログ</CardTitle><Input placeholder="注文IDで検索..." className="max-w-xs" /></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { orderId: 'ORD001', rule: 'Auto Confirm & Label', action: 'CREATE_LABEL', status: 'SUCCESS', timestamp: '2026-02-16 10:30' },
                  { orderId: 'ORD002', rule: 'Ship Notification', action: 'SEND_EMAIL', status: 'SUCCESS', timestamp: '2026-02-16 10:28' },
                  { orderId: 'ORD003', rule: 'Auto Confirm & Label', action: 'CREATE_LABEL', status: 'FAILED', timestamp: '2026-02-16 10:25' },
                ].map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div><div className="font-medium">#{log.orderId}</div><div className="text-sm text-gray-500">{log.rule} → {log.action}</div></div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{log.timestamp}</span>
                      <Badge className={log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{log.status === 'SUCCESS' ? '成功' : '失敗'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>効率分析</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-amber-600">92%</div>
                    <div className="text-gray-500">自動化率</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg text-center"><div className="text-2xl font-bold">0.5秒</div><div className="text-sm text-gray-500">自動処理時間</div></div>
                    <div className="p-3 bg-gray-50 rounded-lg text-center"><div className="text-2xl font-bold">5分</div><div className="text-sm text-gray-500">手動処理時間</div></div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center"><div className="text-lg font-bold text-green-600">12.5時間/日</div><div className="text-sm text-green-700">節約時間</div></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>エラー分析</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ type: 'API_TIMEOUT', count: 10, percent: 40 },{ type: 'INVALID_DATA', count: 8, percent: 32 },{ type: 'CARRIER_ERROR', count: 5, percent: 20 },{ type: 'OTHER', count: 2, percent: 8 }].map((error) => (
                    <div key={error.type}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{error.type}</span><span className="text-sm">{error.count}件 ({error.percent}%)</span></div>
                      <Progress value={error.percent} className="h-2" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg"><div className="text-sm text-yellow-700">エラー率: <span className="font-bold">2.5%</span></div></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>基本設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動化有効</div><div className="text-sm text-gray-500">ルールに基づき自動処理</div></div><Badge variant={settingsData?.automationEnabled ? "default" : "secondary"}>{settingsData?.automationEnabled ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">即時処理</div><div className="text-sm text-gray-500">イベント発生時に即座に処理</div></div><Badge variant={settingsData?.processImmediately ? "default" : "secondary"}>{settingsData?.processImmediately ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>リトライ設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">失敗時リトライ</div></div><Badge variant={settingsData?.retryOnFailure ? "default" : "secondary"}>{settingsData?.retryOnFailure ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">最大リトライ回数</label><Input type="number" defaultValue={settingsData?.maxRetries} /></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">失敗通知</div></div><Badge variant={settingsData?.notifyOnFailure ? "default" : "secondary"}>{settingsData?.notifyOnFailure ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-amber-600 hover:bg-amber-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

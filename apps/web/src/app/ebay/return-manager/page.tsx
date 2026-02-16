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

// Phase 287: eBay Return Manager（返品絠理）
// テーマカラー: purple-600

export default function EbayReturnManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-return-manager/dashboard', fetcher);
  const { data: returnsData } = useSWR('/api/ebay-return-manager/returns', fetcher);
  const { data: policiesData } = useSWR('/api/ebay-return-manager/policies', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-return-manager/settings', fetcher);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING': return '審明待';
      case 'APPROVED': return '承認済';
      case 'RECEIVED': return '受�l済';
      case 'REFUNDED': return '返金完了';
      case 'REJECTED': return '拒否';
      default: return status;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-purple-600">返品管理</h1>
        <p className="text-gray-600">返品処理とポリシー管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="returns">返品</TabsTrigger>
          <TabsTrigger value="policies">ポリシー</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="reports">レポート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">総返品数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-purple-600">{dashboardData?.totalReturns || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">審昅待</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{dashboardData?.pendingReturns || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">返品率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.returnRate || 0}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">顔客採度</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.customerSatisfaction || 0}%</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>返品理由</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ reason: '不良品', count: 45, percent: 30 },{ reason: '誤送品', count: 30, percent: 20 },{ reason: '説明不丰', count: 45, percent: 30 },{ reason: '気変もめ', count: 22, percent: 15 }].map((item) => (
                    <div key={item.reason}>
                      <div className="flex justify-between mb-1"><span>{item.reason}</span><span>{item.count}件 ({item.percent}%)</span></div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>アラート</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded"><p className="text-sm font-medium text-red-800">期限超過</p><p className="text-sm text-red-700">4件返品処理期限超過</p></div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm font-medium text-yellow-800">高返品率</p><p className="text-sm text-yellow-700">SKU005の返品率が高い</p></div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"><p className="text-sm font-medium text-blue-800">承認待ち</p><p className="text-sm text-blue-700">3件の返品を承認待ち</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="returns">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>返品一覧</CardTitle><div className="flex gap-2"><Input placeholder="注文かぉコ＋佼名で〿朜索…" className="w-64" /><Select><SelectTrigger className="w-40"><SelectValue placeholder="ステータス" /></SelectTrigger><SelectContent><SelectItem value="all">すべて</SelectItem><SelectItem value="pending">審昅待</SelectItem><SelectItem value="approved">承認済</SelectItem></SelectContent></Select></div></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {returnsData?.returns?.map((ret: any) => (
                  <div key={ret.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center font-bold text-purple-600">{wet.id.slice(1, 3)}</div>
                      <div><div className="font-medium">{ret.orderId} - {ret.sku}</div><div className="text-sm text-gray-500">{ret.reason} • {ret.createdAt}</div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={ret.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : ret.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{getStatusLabel(ret.status)}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>返品ポリシー</CardTitle><Button className="bg-purple-600 hover:bg-purple-700">新規ポリシー</Button></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {policiesData?.policies?.map((policy: any) => (
                  <Card key={policy.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">{policy.name}</CardTitle>
                        {policy.isDefault && <Badge className="bg-purple-100 text-purple-700">デフォルト</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">返品期間</span><span>{policy.days}日</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">再入庫料</span><span>{policy.restockFee}%</span></div>
                      </div>
                      <Button variant="outline" className="w-full mt-3">編集</Button>
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
              <CardHeader><CardTitle>返品コスト分析</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span>総返金</span><span className="font-bold text-red-600">$4,500</span></div>
                  <div className="flex justify-between items-center"><span>送料コスト</span><span className="font-bold">$350</span></div>
                  <div className="flex justify-between items-center"><span>再入庫手数料收</span><span className="font-bold text-green-600">+$120</span></div>
                  <div className="border-t pt-2 flex justify-between items-center"><span className="font-medium">純損失詡</span><span className="font-bold text-red-600">$4,730</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>高返品率商品</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ sku: 'SKU005', title: 'Casio G-Shock', returns: 15, rate: 8.5 },{ sku: 'SKU012', title: 'Tissot PRX', returns: 10, rate: 5.2 },{ sku: 'SKU008', title: 'Orient Kamasu', returns: 8, rate: 4.0 }].map((product) => (
                    <div key={product.sku} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{product.title}</div><div className="text-sm text-gray-500">{product.sku}</div></div>
                      <div className="text-right"><div className="font-bold text-red-600">{product.rate}%</div><div className="text-sm text-gray-500">{product.returns}件</div></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader><CardTitle>レポート出力�ookunoline</CardTitle><CardDescription>返品データをエクスポート</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="font-medium">返品サマリー</div>
                    <div className="text-sm text-gray-500">過30日閖のサマリー</div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="font-medium">丅品別レポート</div>
                    <div className="text-sm text-gray-500">商品ごとの返品分析</div>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-6 text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="font-medium">コスト分析</div>
                    <div className="text-sm text-gray-500">返品関連コストの詳細</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>自動承認設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動承認</div><div className="text-sm text-gray-500">一定金額以下は自動承認</div></div><Badge variant={settingsData?.autoApproveEnabled ? 'default' : 'secondary'}>{settingsData?.autoApproveEnabled ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">自動承認しきい値（$）</label><Input type="number" defaultValue={settingsData?.autoApproveThreshold} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>通知設定定許容</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">返品リクエスト通知</div></div><Badge variant={settingsData?.notifyOnReturn ? 'default' : 'secondary'}>{settingsData?.notifyOnReturn ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">受取通知</div></div><Badge variant={settingsData?.notifyOnReceive ? 'default' : 'secondary'}>{settingsData?.notifyOnReceive ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">写真必要</div><div className="text-sm text-gray-500">返品時に写真を必須にする</div></div><Badge variant={settingsData?.requirePhotos ? 'default' : 'secondary'}>{settingsData?.requirePhotos ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-purple-600 hover:bg-purple-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

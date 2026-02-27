// @ts-nocheck
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

// Phase 288: eBay Promotion Engine（プロモーション）
// テーマカラー: red-600

export default function EbayPromotionEnginePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-promotion-engine/dashboard', fetcher);
  const { data: promotionsData } = useSWR('/api/ebay-promotion-engine/promotions', fetcher);
  const { data: couponsData } = useSWR('/api/ebay-promotion-engine/coupons', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-promotion-engine/settings', fetcher);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PERCENTAGE': return '%割引';
      case 'FIXED_AMOUNT': return '定禍';
      case 'BOGO': return '1買1';
      case 'FREE_SHIPPING': return '送料無料';
      case 'BUNDLE': return 'セット';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-red-600">プロモーション</h1>
        <p className="text-gray-600">キャンペーン・クーポン管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボート</TabsTrigger>
          <TabsTrigger value="promotions">プロモーション</TabsTrigger>
          <TabsTrigger value="coupons">クーポン</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">アクティブ</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{dashboardData?.activePromotions || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">対象商品</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.totalProducts?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">収益インパクト</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">+${dashboardData?.revenueImpact?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">CV改善</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">+{dashboardData?.conversionLift || 0}%</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>トッププロモーションンコココココco:ree</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Winter Sale', revenue: 5000, conversions: 150 },
                    { name: 'Free Shipping Week', revenue: 4200, conversions: 120 },
                    { name: 'Bundle Deal', revenue: 3300, conversions: 80 },
                  ].map((promo) => (
                    <div key={promo.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{promo.name}</div>
                      <div className="text-right"><div className="font-bold text-green-600">${promo.revenue.toLocaleString()}</div><div className="text-sm text-gray-500">{promo.conversions}件</div></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>パフォーマンス</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ date: '2026-02-10', sales: 5000, discount: 600 },{ date: '2026-02-13', sales: 7500, discount: 900 },{ date: '2026-02-16', sales: 6800, discount: 820 }].map((perf) => (
                    <div key={perf.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">{perf.date}</span>
                      <div className="flex gap-4"><span className="font-bold text-green-600">${perf.sales.toLocaleString()}</span><span className="text-red-600">-${perf.discount}</span></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="promotions">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>プロモーション一觧</CardTitle><Button className="bg-red-600 hover:bg-red-700">新規作成</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {promotionsData?.promotions?.map((promo: any) => (
                  <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center font-bold text-red-600">{promo.discount}%</div>
                      <div><div className="font-medium">{promo.name}</div><div className="flex gap-2 text-sm text-gray-500"><Badge variant="outline">{getTypeLabel(promo.type)}</Badge><span>{promo.products}商品</span></div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">~{promo.endDate}</span>
                      <Badge className={promo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{promo.isActive ? '有劧' : '無効'}</Badge>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>クーポン一覧</CardTitle><Button className="bg-red-600 hover:bg-red-700">新規クーポン</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {couponsData?.coupons?.map((coupon: any) => (
                  <div key={coupon.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-2 bg-red-100 rounded font-mono font-bold text-red-600">{coupon.code}</div>
                      <div><div className="font-medium">{coupon.discount}%割引</div><div className="text-sm text-gray-500">使用: {coupon.used}{coupon.limit ? `/${coupon.limit}` : '（無制限）'}</div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      {coupon.limit && <Progress value={(coupon.used / coupon.limit) * 100} className="w-24 h-2" />}
                      <Badge className={coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{coupon.isActive ? '有劧' : '無効'}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
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
              <CardHeader><CardTitle>収益インパクト</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-green-600">+$25,000</div>
                  <div className="text-gray-500">過30日間</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>注文増加</span><span className="font-bold">+350</span></div>
                  <div className="flex justify-between"><span>平均注文値変化</span><span className="font-bold text-green-600">+12.5%</span></div>
                  <div className="flex justify-between"><span>割引コスト</span><span className="font-bold text-red-600">-$3,200</span></div>
                  <div className="flex justify-between"><span>ROI</span><span className="font-bold text-green-600">681%</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>プロモーション比較</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Winter Sale', roi: 720, conversion: 25.5 },{ name: 'Free Shipping', roi: 650, conversion: 22.0 },{ name: 'Bundle Deal', roi: 580, conversion: 18.5 }].map((comp) => (
                    <div key={comp.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium">{comp.name}</div>
                      <div className="flex gap-4"><span className="font-bold text-green-600">ROI: {comp.roi}%</span><span>CV: {comp.conversion}%</span></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>テンプレート</CardTitle><Button className="bg-red-600 hover:bg-red-700">新規作成</Button></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[{ name: 'Seasonal Sale', type: 'PERCENTAGE', discount: 20, usage: 15 },{ name: 'Free Shipping Event', type: 'FREE_SHIPPING', discount: 0, usage: 8 },{ name: 'Flash Sale', type: 'PERCENTAGE', discount: 30, usage: 5 }].map((template) => (
                  <Card key={template.name} className="hover:shadow-md transition-shadow">
                    <CardHeader><CardTitle className="text-lg">{template.name}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-3">
                        <Badge variant="outline">{getTypeLabel(template.type)}</Badge>
                        <span className="text-sm text-gray-500">{template.usage}回使用</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">編集</Button>
                        <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700">使用</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>基本設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">デフォルト期間(日)</label><Input type="number" defaultValue={settingsData?.defaultDurationDays} /></div>
                <div><label className="text-sm font-medium">最大割引率(%)</label><Input type="number" defaultValue={settingsData?.maxDiscountPercent} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>通知設定定設容</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">開始通知</div></div><Badge variant={settingsData?.notifyOnStart ? 'default' : 'secondary'}>{settingsData?.notifyOnStart ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">終了通知</div></div><Badge variant={settingsData?.notifyOnEnd ? 'default' : 'secondary'}>{settingsData?.notifyOnEnd ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">自動終了</div><div className="text-sm text-gray-500">終了日に自動で無効化</div></div><Badge variant={settingsData?.autoEndPromotions ? 'default' : 'secondary'}>{settingsData?.autoEndPromotions ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">割引タッキング</div><div className="text-sm text-gray-500">複数の割引を併用可能</div></div><Badge variant={settingsData?.allowStacking ? 'default' : 'secondary'}>{settingsData?.allowStacking ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-red-600 hover:bg-red-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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

// Phase 273: eBay Promotion Manager（プロモーション管理）
// テーマカラー: purple-600

export default function EbayPromotionManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-promotion-manager/dashboard', fetcher);
  const { data: promotionsData } = useSWR('/api/ebay-promotion-manager/promotions', fetcher);
  const { data: couponsData } = useSWR('/api/ebay-promotion-manager/coupons', fetcher);
  const { data: analyticsData } = useSWR('/api/ebay-promotion-manager/analytics/overview', fetcher);
  const { data: scheduleData } = useSWR('/api/ebay-promotion-manager/schedule', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-promotion-manager/settings', fetcher);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-700';
      case 'ENDED': return 'bg-gray-100 text-gray-700';
      case 'EXHAUSTED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MARKDOWN': return '値下げ';
      case 'ORDER_DISCOUNT': return '注文割引';
      case 'VOLUME_DISCOUNT': return 'まとめ割引';
      case 'CODELESS_COUPON': return 'コードなしクーポン';
      case 'CODED_COUPON': return 'コード付きクーポン';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-purple-600">プロモーション管理</h1>
        <p className="text-gray-600">セールやクーポンを管理して売上を向上</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="promotions">プロモーション</TabsTrigger>
          <TabsTrigger value="coupons">クーポン</TabsTrigger>
          <TabsTrigger value="schedule">スケジュール</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">有効なプロモーション</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{dashboardData?.activePromotions || 0}</div>
                <div className="text-sm text-gray-500">/ {dashboardData?.totalPromotions || 0} 件</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">プロモーション売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${dashboardData?.promotionRevenue?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均コンバージョン向上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{dashboardData?.avgConversionLift || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">トッププロモーション</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600">{dashboardData?.topPromotion?.name || '-'}</div>
                <div className="text-sm text-gray-500">${dashboardData?.topPromotion?.revenue?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>パフォーマンス上位</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Winter Sale', roi: 250, revenue: 5000 },
                    { name: '20% Off Electronics', roi: 180, revenue: 3500 },
                    { name: 'Free Shipping Week', roi: 150, revenue: 2500 },
                  ].map((promo) => (
                    <div key={promo.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{promo.name}</div>
                        <div className="text-sm text-gray-500">ROI: {promo.roi}%</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">${promo.revenue.toLocaleString()}</div>
                      </div>
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
                    <p className="text-sm font-medium text-yellow-800">終了間近</p>
                    <p className="text-sm text-yellow-700">2つのプロモーションが3日以内に終了</p>
                  </div>
                  <div className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                    <p className="text-sm font-medium text-orange-800">パフォーマンス低下</p>
                    <p className="text-sm text-orange-700">Spring Saleの効果が低下しています</p>
                  </div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <p className="text-sm font-medium text-blue-800">予算</p>
                    <p className="text-sm text-blue-700">Monthly Couponの予算80%使用</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* プロモーション一覧 */}
        <TabsContent value="promotions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>プロモーション一覧</CardTitle>
                <Button className="bg-purple-600 hover:bg-purple-700">新規作成</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="検索..." className="max-w-sm" />
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="タイプ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="MARKDOWN">値下げ</SelectItem>
                    <SelectItem value="ORDER_DISCOUNT">注文割引</SelectItem>
                    <SelectItem value="CODED_COUPON">コード付きクーポン</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="ACTIVE">有効</SelectItem>
                    <SelectItem value="SCHEDULED">予定</SelectItem>
                    <SelectItem value="PAUSED">一時停止</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {promotionsData?.promotions?.map((promo: any) => (
                  <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{promo.name}</h3>
                        <Badge className={getStatusColor(promo.status)}>
                          {promo.status === 'ACTIVE' ? '有効' : promo.status === 'SCHEDULED' ? '予定' : promo.status}
                        </Badge>
                      </div>
                      <div className="flex gap-2 text-sm text-gray-500">
                        <Badge variant="outline">{getTypeLabel(promo.type)}</Badge>
                        <span>
                          {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `$${promo.discountValue} OFF`}
                        </span>
                        <span>•</span>
                        <span>{promo.startDate} ~ {promo.endDate}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-green-600">${promo.revenue?.toLocaleString() || 0}</div>
                        <div className="text-sm text-gray-500">売上</div>
                      </div>
                      <div className="flex gap-2">
                        {promo.status === 'ACTIVE' && (
                          <Button variant="outline" size="sm">一時停止</Button>
                        )}
                        {promo.status === 'PAUSED' && (
                          <Button variant="outline" size="sm">再開</Button>
                        )}
                        <Button variant="outline" size="sm">編集</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* クーポン管理 */}
        <TabsContent value="coupons">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>クーポン一覧</CardTitle>
                  <Button className="bg-purple-600 hover:bg-purple-700">クーポン生成</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {couponsData?.coupons?.map((coupon: any) => (
                    <div key={coupon.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono">
                            {coupon.code}
                          </code>
                          <Badge className={getStatusColor(coupon.status)}>
                            {coupon.status === 'ACTIVE' ? '有効' : coupon.status === 'EXHAUSTED' ? '使い切り' : coupon.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">{coupon.usageCount} / {coupon.maxUsage}</div>
                          <Progress value={(coupon.usageCount / coupon.maxUsage) * 100} className="w-24 h-2" />
                        </div>
                        <Button variant="outline" size="sm">詳細</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>クーポン生成</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">プレフィックス</label>
                  <Input placeholder="SPRING" />
                </div>
                <div>
                  <label className="text-sm font-medium">生成数</label>
                  <Input type="number" placeholder="10" />
                </div>
                <div>
                  <label className="text-sm font-medium">使用上限/コード</label>
                  <Input type="number" placeholder="100" />
                </div>
                <Button className="w-full bg-purple-600 hover:bg-purple-700">生成</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* スケジュール */}
        <TabsContent value="schedule">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">実施中</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduleData?.active?.map((item: any) => (
                    <div key={item.id} className="p-4 border rounded-lg bg-green-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.startDate} ~ {item.endDate}</div>
                        </div>
                        <Badge variant="outline" className="bg-green-100">
                          残り{item.daysRemaining}日
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">予定</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduleData?.upcoming?.map((item: any) => (
                    <div key={item.id} className="p-4 border rounded-lg bg-blue-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">{item.startDate} ~ {item.endDate}</div>
                        </div>
                        <Badge variant="outline" className="bg-blue-100">予定</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-yellow-600">終了間近</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduleData?.expiring?.map((item: any) => (
                    <div key={item.id} className="p-4 border rounded-lg bg-yellow-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">終了日: {item.endDate}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-700">
                            残り{item.daysRemaining}日
                          </Badge>
                          <Button variant="outline" size="sm">延長</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 分析 */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">総売上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData?.totalRevenue?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">プロモーション売上比率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{analyticsData?.promotionPercent || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均コンバージョン率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{analyticsData?.avgConversionRate || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均注文額</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analyticsData?.avgOrderValue || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>タイプ別パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: '値下げ', count: 20, revenue: 6000, roi: 180 },
                    { type: '注文割引', count: 10, revenue: 3500, roi: 150 },
                    { type: 'まとめ割引', count: 5, revenue: 1500, roi: 120 },
                    { type: 'クーポン', count: 10, revenue: 1500, roi: 100 },
                  ].map((item) => (
                    <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{item.type}</div>
                        <div className="text-sm text-gray-500">{item.count}件</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium">${item.revenue.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">売上</div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700">ROI {item.roi}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ROIランキング</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Winter Sale', investment: 2000, revenue: 7000, roi: 250 },
                    { name: '20% Off Electronics', investment: 1500, revenue: 4200, roi: 180 },
                    { name: 'Free Shipping Week', investment: 1000, revenue: 2500, roi: 150 },
                  ].map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-yellow-100 text-yellow-600' :
                          index === 1 ? 'bg-gray-200 text-gray-600' :
                          'bg-orange-100 text-orange-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-500">投資: ${item.investment.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-600">{item.roi}%</div>
                        <div className="text-sm text-gray-500">ROI</div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>デフォルト設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">デフォルト期間（日）</label>
                  <Input type="number" defaultValue={settingsData?.defaultDuration || 14} />
                </div>
                <div>
                  <label className="text-sm font-medium">最大割引率（%）</label>
                  <Input type="number" defaultValue={settingsData?.maxDiscountPercent || 50} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">最低購入額を必須</div>
                    <div className="text-sm text-gray-500">割引適用に最低購入額を設定</div>
                  </div>
                  <Badge variant={settingsData?.minPurchaseRequired ? "default" : "secondary"}>
                    {settingsData?.minPurchaseRequired ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>通知・予算設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">終了通知</div>
                    <div className="text-sm text-gray-500">プロモーション終了前に通知</div>
                  </div>
                  <Badge variant={settingsData?.notifyOnExpiry ? "default" : "secondary"}>
                    {settingsData?.notifyOnExpiry ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">通知日数（終了前）</label>
                  <Input type="number" defaultValue={settingsData?.expiryNotifyDays || 3} />
                </div>
                <div>
                  <label className="text-sm font-medium">月間予算上限</label>
                  <Input type="number" defaultValue={settingsData?.budgetLimit || 5000} />
                </div>
                <div>
                  <label className="text-sm font-medium">予算警告しきい値（%）</label>
                  <Input type="number" defaultValue={settingsData?.budgetAlertPercent || 80} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="bg-purple-600 hover:bg-purple-700">設定を保存</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

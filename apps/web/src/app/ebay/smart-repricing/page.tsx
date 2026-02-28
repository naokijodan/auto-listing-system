
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

// Phase 281: eBay Smart Repricing（スマート価格調整）
// テーマカラー: cyan-600

export default function EbaySmartRepricingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-smart-repricing/dashboard', fetcher);
  const { data: rulesData } = useSWR('/api/ebay-smart-repricing/rules', fetcher);
  const { data: productsData } = useSWR('/api/ebay-smart-repricing/products', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-smart-repricing/settings', fetcher);

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'COMPETITIVE': return '競合対応';
      case 'TIME_BASED': return '時間ベース';
      case 'INVENTORY_BASED': return '在庫ベース';
      case 'DEMAND_BASED': return '需要ベース';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-600">スマート価格調整</h1>
        <p className="text-gray-600">競合分析に基づく自動価格最適化</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="competitors">競合</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">アクティブルール</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-cyan-600">{dashboardData?.activeRules || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">監視商品</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.productsMonitored?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">本日の価格変更</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{dashboardData?.priceChangesToday || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">収益インパクト</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">+${dashboardData?.revenueImpact?.toLocaleString() || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>最近の価格変更</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { sku: 'SKU001', oldPrice: 200, newPrice: 195, reason: 'Competitor undercut' },
                    { sku: 'SKU002', oldPrice: 250, newPrice: 245, reason: 'Time-based rule' },
                    { sku: 'SKU003', oldPrice: 180, newPrice: 185, reason: 'Demand increase' },
                  ].map((change, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{change.sku}</div><div className="text-sm text-gray-500">{change.reason}</div></div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 line-through">${change.oldPrice}</span>
                          <span className="font-bold">${change.newPrice}</span>
                        </div>
                        <span className={`text-sm ${change.newPrice < change.oldPrice ? 'text-red-600' : 'text-green-600'}`}>{change.newPrice < change.oldPrice ? '-' : '+'}{Math.abs(((change.newPrice - change.oldPrice) / change.oldPrice) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>アラート</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded"><p className="text-sm font-medium text-red-800">競合値下げ</p><p className="text-sm text-red-700">競合が5商品で大幅値下げ</p></div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm font-medium text-yellow-800">最低価格</p><p className="text-sm text-yellow-700">10商品が最低価格に到達</p></div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"><p className="text-sm font-medium text-blue-800">ルール発動</p><p className="text-sm text-blue-700">需要増加ルールが発動</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>価格ルール</CardTitle><Button className="bg-cyan-600 hover:bg-cyan-700">新規ルール</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {rulesData?.rules?.map((rule: any) => (
                  <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center font-bold text-cyan-600">{rule.products}</div>
                      <div><div className="font-medium">{rule.name}</div><div className="flex gap-2 text-sm text-gray-500"><Badge variant="outline">{getRuleTypeLabel(rule.type)}</Badge><span>本日: {rule.triggeredToday}回</span></div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{rule.isActive ? '有効' : '無効'}</Badge>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader><CardTitle>価格監視商品</CardTitle><CardDescription>価格調整対象の商品一覧</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="SKUまたは商品名で検索..." className="max-w-sm" />
                <Select><SelectTrigger className="w-48"><SelectValue placeholder="ルール" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="r1">Competitor Match</SelectItem>
                    <SelectItem value="r2">Weekend Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {productsData?.products?.map((product: any) => (
                  <div key={product.sku} className="flex items-center justify-between p-4 border rounded-lg">
                    <div><div className="font-medium">{product.title}</div><div className="text-sm text-gray-500">SKU: {product.sku} • {product.rules}ルール適用</div></div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><div className="font-bold">${product.currentPrice}</div><div className="text-sm text-gray-500">${product.minPrice} - ${product.maxPrice}</div></div>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card>
            <CardHeader><CardTitle>競合分析</CardTitle><CardDescription>競合セラーの価格動向</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Competitor A', productsTracked: 150, avgPriceDiff: -2.5 },
                  { name: 'Competitor B', productsTracked: 120, avgPriceDiff: 3.2 },
                  { name: 'Competitor C', productsTracked: 80, avgPriceDiff: 1.0 },
                ].map((comp) => (
                  <div key={comp.name} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <div className="font-medium">{comp.name}</div>
                      <Badge className={comp.avgPriceDiff < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>{comp.avgPriceDiff > 0 ? '+' : ''}{comp.avgPriceDiff}%</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><div className="text-sm text-gray-500">監視商品</div><div className="font-medium">{comp.productsTracked}</div></div>
                      <div><div className="text-sm text-gray-500">当社より安い</div><div className="font-medium text-red-600">{Math.round(comp.productsTracked * 0.3)}</div></div>
                      <div><div className="text-sm text-gray-500">当社より高い</div><div className="font-medium text-green-600">{Math.round(comp.productsTracked * 0.5)}</div></div>
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
                  <div className="text-4xl font-bold text-green-600">+$45,000</div>
                  <div className="text-gray-500">過去30日間</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Competitor Match</span><span className="font-medium">+$25,000</span></div>
                  <div className="flex justify-between"><span>Demand-based</span><span className="font-medium">+$15,000</span></div>
                  <div className="flex justify-between"><span>Inventory-based</span><span className="font-medium">+$5,000</span></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>価格トレンド</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ date: '2026-02-10', ourPrice: 200, competitorPrice: 205 },{ date: '2026-02-13', ourPrice: 198, competitorPrice: 200 },{ date: '2026-02-16', ourPrice: 195, competitorPrice: 198 }].map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm">{trend.date}</span>
                      <div className="flex gap-4"><span className="text-cyan-600">${trend.ourPrice}</span><span className="text-gray-500">${trend.competitorPrice}</span></div>
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
              <CardHeader><CardTitle>自動調整設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動価格調整</div><div className="text-sm text-gray-500">ルールに基づき自動で価格を調整</div></div><Badge variant={settingsData?.autoRepriceEnabled ? "default" : "secondary"}>{settingsData?.autoRepriceEnabled ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">調整間隔（分）</label><Input type="number" defaultValue={settingsData?.repriceInterval} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>価格制限</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">最低利益率（%）</label><Input type="number" defaultValue={settingsData?.globalMinMargin} /></div>
                <div><label className="text-sm font-medium">最大値下げ率（%）</label><Input type="number" defaultValue={settingsData?.globalMaxDiscount} /></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">最低価格到達通知</div></div><Badge variant={settingsData?.notifyOnMinPrice ? "default" : "secondary"}>{settingsData?.notifyOnMinPrice ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-cyan-600 hover:bg-cyan-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

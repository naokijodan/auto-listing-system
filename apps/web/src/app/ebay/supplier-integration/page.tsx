
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

// Phase 275: eBay Supplier Integration（サプライヤー連携）
// テーマカラー: orange-600

export default function EbaySupplierIntegrationPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-supplier-integration/dashboard', fetcher);
  const { data: suppliersData } = useSWR('/api/ebay-supplier-integration/suppliers', fetcher);
  const { data: ordersData } = useSWR('/api/ebay-supplier-integration/orders', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-supplier-integration/settings', fetcher);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MANUFACTURER': return 'メーカー';
      case 'WHOLESALER': return '卸売';
      case 'DROPSHIPPER': return 'ドロップシップ';
      case 'DISTRIBUTOR': return '代理店';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-orange-600">サプライヤー連携</h1>
        <p className="text-gray-600">仕入先との連携を管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="suppliers">サプライヤー</TabsTrigger>
          <TabsTrigger value="orders">発注</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">サプライヤー数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">{dashboardData?.activeSuppliers || 0}<span className="text-sm text-gray-500 ml-1">/ {dashboardData?.totalSuppliers || 0}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">発注数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.totalOrders || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">処理中</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{dashboardData?.pendingOrders || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">平均納期</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.avgLeadTime || 0}日</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>トップサプライヤー</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Tokyo Watch Supply', orders: 150, fulfillmentRate: 98, avgLeadTime: 5 },
                    { name: 'Osaka Electronics', orders: 120, fulfillmentRate: 96, avgLeadTime: 6 },
                    { name: 'Global Parts Co.', orders: 100, fulfillmentRate: 94, avgLeadTime: 8 },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{s.name}</div><div className="text-sm text-gray-500">{s.orders}件の発注</div></div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-green-100 text-green-700">{s.fulfillmentRate}%</Badge>
                        <span className="text-sm">{s.avgLeadTime}日</span>
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
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm font-medium text-yellow-800">在庫不足</p><p className="text-sm text-yellow-700">Tokyo Watch Supplyの在庫が少なくなっています</p></div>
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded"><p className="text-sm font-medium text-red-800">遅延</p><p className="text-sm text-red-700">3件の注文が遅延しています</p></div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"><p className="text-sm font-medium text-blue-800">価格更新</p><p className="text-sm text-blue-700">Osaka Electronicsが価格を更新</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>サプライヤー一覧</CardTitle><Button className="bg-orange-600 hover:bg-orange-700">新規登録</Button></div></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="検索..." className="max-w-sm" />
                <Select><SelectTrigger className="w-48"><SelectValue placeholder="タイプ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="MANUFACTURER">メーカー</SelectItem>
                    <SelectItem value="WHOLESALER">卸売</SelectItem>
                    <SelectItem value="DROPSHIPPER">ドロップシップ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {suppliersData?.suppliers?.map((supplier: any) => (
                  <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center font-bold text-orange-600">{supplier.name.slice(0, 2)}</div>
                      <div><div className="font-medium">{supplier.name}</div><div className="flex gap-2 text-sm text-gray-500"><Badge variant="outline">{getTypeLabel(supplier.type)}</Badge><span>{supplier.country}</span><span>•</span><span>{supplier.products}商品</span></div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><div className="font-medium">{supplier.avgLeadTime}日</div><div className="text-sm text-gray-500">納期</div></div>
                      <Badge className={supplier.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{supplier.status === 'ACTIVE' ? '有効' : '停止'}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>発注一覧</CardTitle><Button className="bg-orange-600 hover:bg-orange-700">新規発注</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordersData?.orders?.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div><div className="font-medium">#{order.id}</div><div className="text-sm text-gray-500">{order.supplierName} • {order.items}点</div></div>
                    <div className="flex items-center gap-4">
                      <div className="font-bold">${order.total?.toLocaleString()}</div>
                      <Badge className={order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' : order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{order.status}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader><CardTitle>商品カタログ</CardTitle><CardDescription>サプライヤーの商品を検索・比較</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="SKU or 商品名で検索..." className="flex-1" />
                <Button className="bg-orange-600 hover:bg-orange-700">検索</Button>
              </div>
              <div className="space-y-3">
                {[
                  { sku: 'TWS-001', name: 'Seiko 5 Sports', suppliers: 2, minCost: 140, stock: 250 },
                  { sku: 'TWS-002', name: 'Citizen Eco-Drive', suppliers: 2, minCost: 190, stock: 55 },
                  { sku: 'TWS-003', name: 'Orient Bambino', suppliers: 1, minCost: 120, stock: 100 },
                ].map((p) => (
                  <div key={p.sku} className="flex items-center justify-between p-4 border rounded-lg">
                    <div><div className="font-medium">{p.name}</div><div className="text-sm text-gray-500">SKU: {p.sku} • {p.suppliers}サプライヤー</div></div>
                    <div className="flex items-center gap-4"><div className="text-right"><div className="font-bold">${p.minCost}</div><div className="text-sm text-gray-500">最安</div></div><div className="text-right"><div className="font-medium">{p.stock}</div><div className="text-sm text-gray-500">在庫</div></div><Button variant="outline" size="sm">比較</Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>支出分析</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Tokyo Watch Supply', spend: 75000, percent: 50 },{ name: 'Osaka Electronics', spend: 45000, percent: 30 },{ name: 'Global Parts Co.', spend: 30000, percent: 20 }].map((s) => (
                    <div key={s.name}><div className="flex justify-between mb-1"><span className="text-sm">{s.name}</span><span className="text-sm">${s.spend.toLocaleString()} ({s.percent}%)</span></div><Progress value={s.percent} className="h-2" /></div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>パフォーマンス</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Tokyo Watch Supply', fulfillment: 98, leadTime: 5, quality: 4.8 },{ name: 'Osaka Electronics', fulfillment: 96, leadTime: 6, quality: 4.6 }].map((s) => (
                    <div key={s.name} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium mb-2">{s.name}</div>
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div><div className="text-green-600 font-bold">{s.fulfillment}%</div><div className="text-gray-500">納品率</div></div>
                        <div><div className="font-bold">{s.leadTime}日</div><div className="text-gray-500">納期</div></div>
                        <div><div className="font-bold">⭐{s.quality}</div><div className="text-gray-500">品質</div></div>
                      </div>
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
              <CardHeader><CardTitle>自動発注設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動発注</div><div className="text-sm text-gray-500">在庫が閾値以下で自動発注</div></div><Badge variant={settingsData?.autoReorder ? "default" : "secondary"}>{settingsData?.autoReorder ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">発注閾値</label><Input type="number" defaultValue={settingsData?.reorderThreshold} /></div>
                <div><label className="text-sm font-medium">デフォルト支払条件</label><Input defaultValue={settingsData?.defaultPaymentTerms} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>通知設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">在庫不足通知</div></div><Badge variant={settingsData?.notifyOnLowStock ? "default" : "secondary"}>{settingsData?.notifyOnLowStock ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">遅延通知</div></div><Badge variant={settingsData?.notifyOnDelay ? "default" : "secondary"}>{settingsData?.notifyOnDelay ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-orange-600 hover:bg-orange-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

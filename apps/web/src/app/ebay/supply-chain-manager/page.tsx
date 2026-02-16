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

// Phase 294: eBay Supply Chain Manager（サプライチェーン管理）
// テーマカラー: orange-600

export default function EbaySupplyChainManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-supply-chain-manager/dashboard', fetcher);
  const { data: suppliersData } = useSWR('/api/ebay-supply-chain-manager/suppliers', fetcher);
  const { data: ordersData } = useSWR('/api/ebay-supply-chain-manager/orders', fetcher);
  const { data: inventoryData } = useSWR('/api/ebay-supply-chain-manager/inventory', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-orange-600">サプライチェーン管理</h1>
        <p className="text-gray-600">サプライヤー・発注・在庫・物流の統合管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="suppliers">サプライヤー</TabsTrigger>
          <TabsTrigger value="orders">発注</TabsTrigger>
          <TabsTrigger value="inventory">在庫</TabsTrigger>
          <TabsTrigger value="logistics">物流</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">サプライヤー数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">{dashboardData?.totalSuppliers || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">発注中</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{dashboardData?.openOrders || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">在庫不足SKU</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{dashboardData?.lowStockSkus?.length || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">出荷待ち</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.pendingShipments || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>最近の発注</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { id: 'o1', supplier: 'Acme Parts', status: 'in_transit', eta: '2026-02-21' },
                    { id: 'o2', supplier: 'Global Widgets', status: 'placed', eta: '2026-02-25' },
                  ].map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{order.supplier}</div><div className="text-sm text-gray-500">ETA: {order.eta}</div></div>
                      <Badge className={order.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{order.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>在庫状況</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Gear A', stock: 240, max: 300 },{ name: 'Bolt B', stock: 80, max: 200 },{ name: 'Plate C', stock: 500, max: 600 }].map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{item.name}</span><span className="text-sm">{item.stock}/{item.max}</span></div>
                      <Progress value={(item.stock / item.max) * 100} className={`h-2 ${item.stock < item.max * 0.5 ? '[&>div]:bg-red-500' : ''}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>サプライヤー一覧</CardTitle><CardDescription>取引先サプライヤーを管理</CardDescription></div>
                <Button className="bg-orange-600 hover:bg-orange-700">+ サプライヤー追加</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="サプライヤー名で検索..." className="max-w-md" />
                <Select><SelectTrigger className="w-40"><SelectValue placeholder="ステータス" /></SelectTrigger><SelectContent><SelectItem value="all">全て</SelectItem><SelectItem value="active">有効</SelectItem><SelectItem value="inactive">無効</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-3">
                {(suppliersData?.suppliers || [
                  { id: 's1', name: 'Acme Parts', rating: 4.7, leadTimeDays: 7, active: true },
                  { id: 's2', name: 'Global Widgets', rating: 4.2, leadTimeDays: 12, active: true },
                  { id: 's3', name: 'Rapid Manufacturing', rating: 3.9, leadTimeDays: 5, active: false },
                ]).map((supplier: any) => (
                  <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-bold">{supplier.name.charAt(0)}</div>
                      <div><div className="font-medium">{supplier.name}</div><div className="text-sm text-gray-500">評価 {supplier.rating} • リードタイム {supplier.leadTimeDays}日</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={supplier.active ? 'default' : 'secondary'}>{supplier.active ? '有効' : '無効'}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                      <Button variant="outline" size="sm">発注</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>発注管理</CardTitle><CardDescription>発注の作成・追跡</CardDescription></div>
                <Button className="bg-orange-600 hover:bg-orange-700">+ 新規発注</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="発注ID、サプライヤーで検索..." className="max-w-md" />
                <Select><SelectTrigger className="w-40"><SelectValue placeholder="ステータス" /></SelectTrigger><SelectContent><SelectItem value="all">全て</SelectItem><SelectItem value="draft">下書き</SelectItem><SelectItem value="placed">発注済</SelectItem><SelectItem value="in_transit">輸送中</SelectItem><SelectItem value="delivered">配達完了</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-3">
                {(ordersData?.orders || [
                  { id: 'o1', supplierName: 'Acme Parts', status: 'in_transit', eta: '2026-02-21', total: 5000 },
                  { id: 'o2', supplierName: 'Global Widgets', status: 'placed', eta: '2026-02-25', total: 2500 },
                ]).map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div><div className="font-medium">#{order.id} - {order.supplierName}</div><div className="text-sm text-gray-500">ETA: {order.eta} • ${order.total?.toLocaleString()}</div></div>
                    <div className="flex items-center gap-2">
                      <Badge className={order.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{order.status}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>在庫管理</CardTitle><CardDescription>SKU別の在庫状況</CardDescription></div>
                <Button className="bg-orange-600 hover:bg-orange-700">在庫調整</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="SKU、商品名で検索..." className="max-w-md" />
                <Select><SelectTrigger className="w-40"><SelectValue placeholder="ステータス" /></SelectTrigger><SelectContent><SelectItem value="all">全て</SelectItem><SelectItem value="ok">正常</SelectItem><SelectItem value="low">在庫少</SelectItem><SelectItem value="out">在庫切れ</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-3">
                {(inventoryData?.items || [
                  { sku: 'SKU-001', name: 'Gear A', stock: 240, reorderPoint: 150, status: 'ok' },
                  { sku: 'SKU-002', name: 'Bolt B', stock: 80, reorderPoint: 120, status: 'low' },
                  { sku: 'SKU-003', name: 'Plate C', stock: 500, reorderPoint: 200, status: 'ok' },
                ]).map((item: any) => (
                  <div key={item.sku} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${item.status === 'ok' ? 'bg-green-500' : item.status === 'low' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                      <div><div className="font-medium">{item.name}</div><div className="text-sm text-gray-500">{item.sku} • 在庫 {item.stock} / 再発注点 {item.reorderPoint}</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === 'ok' ? 'default' : item.status === 'low' ? 'secondary' : 'destructive'}>{item.status === 'ok' ? '正常' : item.status === 'low' ? '在庫少' : '在庫切れ'}</Badge>
                      <Button variant="outline" size="sm">調整</Button>
                      <Button variant="outline" size="sm">発注</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics">
          <Card>
            <CardHeader><CardTitle>物流追跡</CardTitle><CardDescription>出荷・配送状況を追跡</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="追跡番号、発注IDで検索..." className="max-w-md" />
                <Button className="bg-orange-600 hover:bg-orange-700">追跡</Button>
              </div>
              <div className="space-y-3">
                {[
                  { id: 'sh1', carrier: 'DHL', trackingNumber: 'DHL123456', status: 'in_transit', eta: '2026-02-21' },
                  { id: 'sh2', carrier: 'FedEx', trackingNumber: 'FDX789012', status: 'label_created', eta: '2026-02-25' },
                ].map((shipment) => (
                  <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div><div className="font-medium">{shipment.carrier} - {shipment.trackingNumber}</div><div className="text-sm text-gray-500">ETA: {shipment.eta}</div></div>
                    <div className="flex items-center gap-2">
                      <Badge className={shipment.status === 'in_transit' ? 'bg-blue-100 text-blue-700' : shipment.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{shipment.status}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>設定</CardTitle><CardDescription>サプライチェーン管理の設定</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">安全在庫率</label><Input type="number" defaultValue={15} /></div>
                <div><label className="text-sm font-medium">デフォルトリードタイム</label><Input type="number" defaultValue={7} /></div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div><div className="font-medium">自動発注</div><div className="text-sm text-gray-500">再発注点を下回ったら自動で発注</div></div>
                <Button variant="outline">有効</Button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div><div className="font-medium">在庫アラート</div><div className="text-sm text-gray-500">在庫不足時に通知</div></div>
                <Button variant="outline">有効</Button>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700">設定を保存</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

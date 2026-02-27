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

// Phase 276: eBay Multi-Warehouse Manager（複数倉庫管理）
// テーマカラー: blue-600

export default function EbayMultiWarehousePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-multi-warehouse/dashboard', fetcher);
  const { data: warehousesData } = useSWR('/api/ebay-multi-warehouse/warehouses', fetcher);
  const { data: transfersData } = useSWR('/api/ebay-multi-warehouse/transfers', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-multi-warehouse/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-blue-600">複数倉庫管理</h1>
        <p className="text-gray-600">在庫を複数拠点で最適化</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="warehouses">倉庫</TabsTrigger>
          <TabsTrigger value="inventory">在庫</TabsTrigger>
          <TabsTrigger value="transfers">移送</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">倉庫数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{dashboardData?.activeWarehouses || 0}<span className="text-sm text-gray-500 ml-1">/ {dashboardData?.totalWarehouses || 0}</span></div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">総在庫数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.totalInventory?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">在庫価値</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">${dashboardData?.totalValue?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">移送中</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-orange-600">{dashboardData?.pendingTransfers || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>在庫分布</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Tokyo Main', items: 5000, percent: 33, capacity: 80 },{ name: 'Osaka Hub', items: 4000, percent: 27, capacity: 65 },{ name: 'US East', items: 3500, percent: 23, capacity: 90 },{ name: 'US West', items: 2500, percent: 17, capacity: 55 }].map((w) => (
                    <div key={w.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{w.name}</div><div className="text-sm text-gray-500">{w.items.toLocaleString()}点 ({w.percent}%)</div></div>
                      <div className="flex items-center gap-2">
                        <Progress value={w.capacity} className={`w-20 h-2 ${w.capacity > 85 ? '[&>div]:bg-red-500' : ''}`} />
                        <span className={`text-sm ${w.capacity > 85 ? 'text-red-600' : ''}`}>{w.capacity}%</span>
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
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm font-medium text-yellow-800">低在庫</p><p className="text-sm text-yellow-700">Tokyo Mainで12 SKUが低在庫</p></div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"><p className="text-sm font-medium text-blue-800">移送待ち</p><p className="text-sm text-blue-700">3件の移送が承認待ち</p></div>
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded"><p className="text-sm font-medium text-red-800">容量警告</p><p className="text-sm text-red-700">US Eastの容量が90%に到達</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="warehouses">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>倉庫一覧</CardTitle><Button className="bg-blue-600 hover:bg-blue-700">新規追加</Button></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehousesData?.warehouses?.map((w: any) => (
                  <Card key={w.id} className={!w.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div><CardTitle className="text-lg">{w.name}</CardTitle><CardDescription>{w.code} • {w.country}</CardDescription></div>
                        <Badge className={w.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{w.isActive ? '稼働中' : '停止'}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-gray-500">タイプ</span><span>{w.type === 'OWNED' ? '自社' : w.type === 'THIRD_PARTY' ? '3PL' : 'FC'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-500">在庫数</span><span>{w.items?.toLocaleString()}</span></div>
                        <div><div className="flex justify-between text-sm mb-1"><span className="text-gray-500">容量</span><span>{w.capacity}%</span></div><Progress value={w.capacity} className={`h-2 ${w.capacity > 85 ? '[&>div]:bg-red-500' : ''}`} /></div>
                        <Button variant="outline" size="sm" className="w-full">詳細</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader><CardTitle>グローバル在庫</CardTitle><CardDescription>全倉庫の在庫状況</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="SKU or 商品名で検索..." className="flex-1" />
                <Select><SelectTrigger className="w-48"><SelectValue placeholder="倉庫" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="1">Tokyo Main</SelectItem>
                    <SelectItem value="2">Osaka Hub</SelectItem>
                    <SelectItem value="3">US East</SelectItem>
                  </SelectContent>
                </Select>
                <Button className="bg-blue-600 hover:bg-blue-700">検索</Button>
              </div>
              <div className="space-y-3">
                {[
                  { sku: 'SKU001', name: 'Seiko 5 Sports', total: 150, warehouses: [{ name: 'Tokyo', qty: 50 }, { name: 'Osaka', qty: 40 }, { name: 'US East', qty: 60 }] },
                  { sku: 'SKU002', name: 'Citizen Eco-Drive', total: 90, warehouses: [{ name: 'Tokyo', qty: 30 }, { name: 'Osaka', qty: 25 }, { name: 'US East', qty: 35 }] },
                ].map((item) => (
                  <div key={item.sku} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div><div className="font-medium">{item.name}</div><div className="text-sm text-gray-500">SKU: {item.sku}</div></div>
                      <div className="text-right"><div className="text-xl font-bold text-blue-600">{item.total}</div><div className="text-sm text-gray-500">総在庫</div></div>
                    </div>
                    <div className="flex gap-2">
                      {item.warehouses.map((w) => (<Badge key={w.name} variant="outline" className="flex-1 justify-center py-1">{w.name}: {w.qty}</Badge>))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>移送一覧</CardTitle><Button className="bg-blue-600 hover:bg-blue-700">新規移送</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transfersData?.transfers?.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center"><div className="font-medium">{t.from}</div><div className="text-2xl">→</div><div className="font-medium">{t.to}</div></div>
                      <div><div className="text-sm text-gray-500">{t.items}点</div><div className="text-sm text-gray-500">{t.createdAt}</div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : t.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>{t.status}</Badge>
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
              <CardHeader><CardTitle>倉庫稼働率</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Tokyo Main', capacity: 80, trend: 'stable' },{ name: 'Osaka Hub', capacity: 65, trend: 'increasing' },{ name: 'US East', capacity: 90, trend: 'high' },{ name: 'US West', capacity: 55, trend: 'stable' }].map((w) => (
                    <div key={w.name}><div className="flex justify-between mb-1"><span className="text-sm">{w.name}</span><span className={`text-sm ${w.capacity > 85 ? 'text-red-600' : ''}`}>{w.capacity}%</span></div><Progress value={w.capacity} className={`h-2 ${w.capacity > 85 ? '[&>div]:bg-red-500' : ''}`} /></div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>回転率</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Tokyo Main', rate: 4.5 },{ name: 'Osaka Hub', rate: 5.2 },{ name: 'US East', rate: 6.1 },{ name: 'US West', rate: 3.8 }].map((w) => (
                    <div key={w.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="font-medium">{w.name}</span><span className="text-lg font-bold text-blue-600">{w.rate}x</span></div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center"><span className="text-blue-800">平均回転率: <strong>4.9x</strong></span></div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>最適化提案</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'REBALANCE', sku: 'SKU001', from: 'Tokyo', to: 'US East', qty: 20, reason: 'US Eastで需要増加' },
                    { type: 'CONSOLIDATE', sku: 'SKU005', from: 'US West', to: 'US East', qty: 10, reason: 'US Westの在庫が少量' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                      <div><Badge variant="outline" className="mb-1">{r.type}</Badge><div className="font-medium">{r.sku}: {r.from} → {r.to} ({r.qty}点)</div><div className="text-sm text-gray-600">{r.reason}</div></div>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">適用</Button>
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
                <div><label className="text-sm font-medium">デフォルト倉庫</label>
                  <Select defaultValue={settingsData?.defaultWarehouse}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="1">Tokyo Main</SelectItem><SelectItem value="2">Osaka Hub</SelectItem><SelectItem value="3">US East</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><label className="text-sm font-medium">低在庫閾値</label><Input type="number" defaultValue={settingsData?.lowStockThreshold} /></div>
                <div><label className="text-sm font-medium">容量警告閾値（%）</label><Input type="number" defaultValue={settingsData?.capacityAlertThreshold} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>移送設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動最適化</div><div className="text-sm text-gray-500">在庫バランスを自動調整</div></div><Badge variant={settingsData?.autoOptimize ? "default" : "secondary"}>{settingsData?.autoOptimize ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">移送承認</div><div className="text-sm text-gray-500">移送には承認が必要</div></div><Badge variant={settingsData?.transferApprovalRequired ? "default" : "secondary"}>{settingsData?.transferApprovalRequired ? '必要' : '不要'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-blue-600 hover:bg-blue-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

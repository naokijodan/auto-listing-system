// @ts-nocheck
'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Building2,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Settings,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  DollarSign,
  Clock,
  Star,
  Truck,
  BarChart3
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ProductSourcingHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/product-sourcing-hub/dashboard/overview`, fetcher);
  const { data: recentOrders } = useSWR(`${API_BASE}/ebay/product-sourcing-hub/dashboard/recent-orders`, fetcher);
  const { data: priceAlerts } = useSWR(`${API_BASE}/ebay/product-sourcing-hub/dashboard/price-alerts`, fetcher);
  const { data: suppliers } = useSWR(`${API_BASE}/ebay/product-sourcing-hub/suppliers`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/product-sourcing-hub/products`, fetcher);
  const { data: orders } = useSWR(`${API_BASE}/ebay/product-sourcing-hub/orders`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/product-sourcing-hub/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-600">Product Sourcing Hub</h1>
          <p className="text-gray-500">商品仕入れハブ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <ShoppingCart className="w-4 h-4 mr-2" />
            発注作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="suppliers">サプライヤー</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="orders">発注</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">サプライヤー</CardTitle>
                <Building2 className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.activeSuppliers}</div>
                <p className="text-xs text-muted-foreground">総数: {overview?.totalSuppliers}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">商品数</CardTitle>
                <Package className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalProducts?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">仕入れ可能</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">発注中</CardTitle>
                <Truck className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.inTransit}</div>
                <p className="text-xs text-muted-foreground">保留: {overview?.pendingOrders}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">節約額</CardTitle>
                <DollarSign className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview?.totalSaved?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">平均リードタイム: {overview?.avgLeadTime}日</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders & Price Alerts */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>最近の発注</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentOrders?.orders?.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{order.supplier}</p>
                        <p className="text-sm text-gray-500">{order.items}アイテム</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${order.total.toLocaleString()}</p>
                        <Badge variant={order.status === 'shipped' ? 'default' : order.status === 'processing' ? 'secondary' : 'outline'}>
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>価格アラート</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {priceAlerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {alert.change < 0 ? (
                          <TrendingDown className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingUp className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{alert.product}</p>
                          <p className="text-sm text-gray-500">{alert.supplier}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={alert.change < 0 ? 'default' : 'destructive'}>
                          {alert.change > 0 ? '+' : ''}{alert.change}%
                        </Badge>
                        <p className="text-sm text-gray-500">${alert.oldPrice} → ${alert.newPrice}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>サプライヤー一覧</CardTitle>
                  <CardDescription>仕入れ先の管理</CardDescription>
                </div>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  サプライヤー追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>サプライヤー名</TableHead>
                    <TableHead>国</TableHead>
                    <TableHead>商品数</TableHead>
                    <TableHead>評価</TableHead>
                    <TableHead>リードタイム</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers?.suppliers?.map((supplier: any) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.country}</TableCell>
                      <TableCell>{supplier.products}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {supplier.rating}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.leadTime}日</TableCell>
                      <TableCell>
                        <Switch checked={supplier.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>商品一覧</CardTitle>
                  <CardDescription>仕入れ可能な商品</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="商品検索..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="サプライヤー" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="tokyo">Tokyo Watches</SelectItem>
                      <SelectItem value="osaka">Osaka Parts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>仕入れ価格</TableHead>
                    <TableHead>MOQ</TableHead>
                    <TableHead>リードタイム</TableHead>
                    <TableHead>在庫</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.supplier}</TableCell>
                      <TableCell>${product.cost.toFixed(2)}</TableCell>
                      <TableCell>{product.moq}</TableCell>
                      <TableCell>{product.leadTime}日</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>発注一覧</CardTitle>
                  <CardDescription>仕入れ発注の管理</CardDescription>
                </div>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  発注作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>発注ID</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>合計</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>発注日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.orders?.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.id}</TableCell>
                      <TableCell>{order.supplier}</TableCell>
                      <TableCell>{order.items}</TableCell>
                      <TableCell>${order.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'shipped' ? 'default' : order.status === 'processing' ? 'secondary' : 'outline'}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.createdAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>コストトレンド</CardTitle>
              <CardDescription>仕入れコストの推移</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-gray-500">
                <BarChart3 className="w-12 h-12" />
                <span className="ml-2">チャート表示エリア</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>仕入れの設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルト通貨</p>
                  <p className="text-sm text-gray-500">仕入れ価格の通貨</p>
                </div>
                <Select defaultValue={settings?.settings?.defaultCurrency}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動再発注</p>
                  <p className="text-sm text-gray-500">在庫が閾値を下回った時</p>
                </div>
                <Switch checked={settings?.settings?.autoReorder} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">再発注閾値</p>
                  <p className="text-sm text-gray-500">自動発注のトリガー在庫数</p>
                </div>
                <Input type="number" defaultValue={settings?.settings?.reorderThreshold} className="w-24" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">価格アラート</p>
                  <p className="text-sm text-gray-500">価格変動時に通知</p>
                </div>
                <Switch checked={settings?.settings?.priceAlerts} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">価格変動閾値</p>
                  <p className="text-sm text-gray-500">アラートを発生させる変動率</p>
                </div>
                <Select defaultValue={String(settings?.settings?.priceAlertThreshold)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-amber-600 hover:bg-amber-700">
                <Settings className="w-4 h-4 mr-2" />
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

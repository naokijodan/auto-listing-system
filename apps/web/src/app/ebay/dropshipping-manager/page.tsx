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
import { Progress } from '@/components/ui/progress';
import {
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  Settings,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  Send,
  Clock,
  BarChart3,
  Download,
  ShoppingCart,
  Store,
  TrendingUp,
  CheckCircle,
  XCircle
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function DropshippingManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/dropshipping-manager/dashboard/overview`, fetcher);
  const { data: recentOrders } = useSWR(`${API_BASE}/ebay/dropshipping-manager/dashboard/orders`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/dropshipping-manager/dashboard/alerts`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/dropshipping-manager/products`, fetcher);
  const { data: orders } = useSWR(`${API_BASE}/ebay/dropshipping-manager/orders`, fetcher);
  const { data: suppliers } = useSWR(`${API_BASE}/ebay/dropshipping-manager/suppliers`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/dropshipping-manager/settings/general`, fetcher);

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />保留中</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><RefreshCw className="w-3 h-3 mr-1" />処理中</Badge>;
      case 'shipped':
        return <Badge variant="default" className="bg-green-600"><Truck className="w-3 h-3 mr-1" />発送済み</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-emerald-600"><CheckCircle className="w-3 h-3 mr-1" />配達完了</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStockBadge = (stock: string) => {
    switch (stock) {
      case 'in_stock':
        return <Badge variant="default" className="bg-green-600">在庫あり</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">低在庫</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive">在庫切れ</Badge>;
      default:
        return <Badge variant="secondary">{stock}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pink-600">Dropshipping Manager</h1>
          <p className="text-gray-500">ドロップシッピング管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-pink-600 hover:bg-pink-700">
            <Plus className="w-4 h-4 mr-2" />
            商品追加
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="products">商品管理</TabsTrigger>
          <TabsTrigger value="orders">注文管理</TabsTrigger>
          <TabsTrigger value="suppliers">サプライヤー</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総商品数</CardTitle>
                <Package className="w-4 h-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalProducts}</div>
                <p className="text-xs text-muted-foreground">出品中: {overview?.activeListings}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">処理中注文</CardTitle>
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.processingOrders}</div>
                <p className="text-xs text-muted-foreground">保留: {overview?.pendingOrders}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均配送時間</CardTitle>
                <Truck className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgFulfillmentTime}</div>
                <p className="text-xs text-muted-foreground">サプライヤー: {overview?.totalSuppliers}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">月間売上</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{overview?.monthlyRevenue?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">利益率: {overview?.profitMargin}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {alerts?.alerts?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-pink-600" />
                  アラート
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className={`p-3 rounded-lg flex items-center justify-between ${alert.priority === 'high' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                      <div>
                        <Badge variant={alert.priority === 'high' ? 'destructive' : 'outline'} className="mb-1">
                          {alert.type}
                        </Badge>
                        <p className="text-sm">{alert.message}</p>
                      </div>
                      <Button size="sm" variant="outline">対応</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-pink-600" />
                最近の注文
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文ID</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>購入者</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders?.orders?.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.id}</TableCell>
                      <TableCell className="font-medium">{order.product}</TableCell>
                      <TableCell>{order.buyer}</TableCell>
                      <TableCell>{order.supplier}</TableCell>
                      <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                      <TableCell>{order.orderedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          {order.status === 'pending' && (
                            <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                              <Send className="w-3 h-3 mr-1" />
                              転送
                            </Button>
                          )}
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
                <CardTitle>商品一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="商品名/SKUで検索..." className="w-64" />
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    在庫同期
                  </Button>
                  <Button className="bg-pink-600 hover:bg-pink-700">
                    <Plus className="w-4 h-4 mr-2" />
                    商品追加
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>仕入値</TableHead>
                    <TableHead>販売価格</TableHead>
                    <TableHead>利益率</TableHead>
                    <TableHead>在庫</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell>{product.supplier}</TableCell>
                      <TableCell>¥{product.supplierPrice?.toLocaleString()}</TableCell>
                      <TableCell>¥{product.listingPrice?.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-green-600">{product.margin}%</TableCell>
                      <TableCell>{getStockBadge(product.stock)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><RefreshCw className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4" /></Button>
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
                <CardTitle>注文一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="注文ID/購入者で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">保留中</SelectItem>
                      <SelectItem value="processing">処理中</SelectItem>
                      <SelectItem value="shipped">発送済み</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文ID</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>購入者</TableHead>
                    <TableHead>サプライヤー注文</TableHead>
                    <TableHead>利益</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.orders?.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">{order.id}</TableCell>
                      <TableCell className="font-medium">{order.product}</TableCell>
                      <TableCell>{order.buyer}</TableCell>
                      <TableCell>{order.supplierOrder || '-'}</TableCell>
                      <TableCell className="font-bold text-green-600">¥{order.profit?.toLocaleString()}</TableCell>
                      <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                      <TableCell>{order.orderedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          {order.status === 'pending' && (
                            <Button variant="ghost" size="sm" className="text-pink-600">
                              <Send className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>サプライヤー一覧</CardTitle>
                <Button className="bg-pink-600 hover:bg-pink-700">
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
                    <TableHead>商品数</TableHead>
                    <TableHead>フルフィルメント率</TableHead>
                    <TableHead>平均リードタイム</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers?.suppliers?.map((supplier: any) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.products}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={supplier.fulfillmentRate} className="h-2 w-20" />
                          <span>{supplier.fulfillmentRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{supplier.avgLeadTime}</TableCell>
                      <TableCell>
                        {supplier.active ? (
                          <Badge variant="default" className="bg-green-600">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><RefreshCw className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-pink-600" />
                  利益分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>総売上</span>
                    <span className="text-xl font-bold">¥2,850,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>総コスト</span>
                    <span className="text-xl font-bold">¥2,035,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>粗利</span>
                    <span className="text-xl font-bold text-green-600">¥815,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>純利益</span>
                    <span className="text-xl font-bold text-green-600">¥580,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-pink-600" />
                  フルフィルメント分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>平均配送時間</span>
                    <span className="text-xl font-bold">2.3日</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>オンタイム率</span>
                    <span className="text-xl font-bold">94.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>遅延注文</span>
                    <span className="text-xl font-bold text-orange-600">25件</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>返品率</span>
                    <span className="text-xl font-bold">2.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-pink-600" />
                売上トレンド
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                売上トレンドチャート
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動注文転送</p>
                  <p className="text-sm text-gray-500">注文受信時に自動でサプライヤーへ転送</p>
                </div>
                <Switch checked={settings?.settings?.autoForwardOrders} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動在庫同期</p>
                  <p className="text-sm text-gray-500">定期的にサプライヤーの在庫を同期</p>
                </div>
                <Switch checked={settings?.settings?.autoSyncInventory} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動価格調整</p>
                  <p className="text-sm text-gray-500">サプライヤー価格変更時に自動調整</p>
                </div>
                <Switch checked={settings?.settings?.autoAdjustPricing} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">同期間隔（分）</label>
                  <Input type="number" defaultValue={settings?.settings?.syncInterval || 30} />
                </div>
                <div>
                  <label className="text-sm font-medium">デフォルト利益率（%）</label>
                  <Input type="number" defaultValue={settings?.settings?.defaultMargin || 25} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">最低利益率（%）</label>
                <Input type="number" defaultValue={settings?.settings?.minMargin || 15} />
              </div>

              <Button className="bg-pink-600 hover:bg-pink-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

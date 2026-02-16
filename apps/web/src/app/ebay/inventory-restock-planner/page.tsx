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
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  Settings,
  Plus,
  Eye,
  Trash2,
  RefreshCw,
  Play,
  Calendar,
  DollarSign,
  Clock,
  BarChart3,
  Download,
  Truck,
  PackageCheck,
  History
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function InventoryRestockPlannerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/inventory-restock-planner/dashboard/overview`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/inventory-restock-planner/dashboard/alerts`, fetcher);
  const { data: forecast } = useSWR(`${API_BASE}/ebay/inventory-restock-planner/dashboard/forecast`, fetcher);
  const { data: inventory } = useSWR(`${API_BASE}/ebay/inventory-restock-planner/inventory`, fetcher);
  const { data: plans } = useSWR(`${API_BASE}/ebay/inventory-restock-planner/plans`, fetcher);
  const { data: orders } = useSWR(`${API_BASE}/ebay/inventory-restock-planner/orders`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/inventory-restock-planner/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />危険</Badge>;
      case 'low':
        return <Badge variant="outline" className="border-orange-500 text-orange-600">低在庫</Badge>;
      case 'normal':
        return <Badge variant="default" className="bg-green-600">正常</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="default" className="bg-green-600"><PackageCheck className="w-3 h-3 mr-1" />納品完了</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Truck className="w-3 h-3 mr-1" />発送中</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />処理中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-600">Inventory Restock Planner</h1>
          <p className="text-gray-500">在庫補充計画</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            補充計画作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="inventory">在庫分析</TabsTrigger>
          <TabsTrigger value="plans">補充計画</TabsTrigger>
          <TabsTrigger value="orders">発注管理</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総SKU数</CardTitle>
                <Package className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalSkus?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">在庫健全度: {overview?.stockHealth}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">低在庫アイテム</CardTitle>
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.lowStockItems}</div>
                <p className="text-xs text-red-600">危険: {overview?.criticalItems}件</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均補充時間</CardTitle>
                <Clock className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgRestockTime}</div>
                <p className="text-xs text-muted-foreground">発注から納品まで</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">今月の補充予算</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{overview?.spentThisMonth?.toLocaleString()}</div>
                <Progress value={(overview?.spentThisMonth / overview?.restockBudget) * 100} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">予算: ¥{overview?.restockBudget?.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                在庫アラート
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>商品名</TableHead>
                    <TableHead>現在在庫</TableHead>
                    <TableHead>最小在庫</TableHead>
                    <TableHead>欠品予測</TableHead>
                    <TableHead>緊急度</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts?.alerts?.map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-mono">{alert.sku}</TableCell>
                      <TableCell className="font-medium">{alert.product}</TableCell>
                      <TableCell className="font-bold text-red-600">{alert.currentStock}</TableCell>
                      <TableCell>{alert.minStock}</TableCell>
                      <TableCell>{alert.daysUntilStockout}日後</TableCell>
                      <TableCell>{getStatusBadge(alert.urgency)}</TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          発注
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Demand Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                需要予測（7日間）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {forecast?.forecast?.map((day: any, idx: number) => (
                  <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">{day.date}</div>
                    <div className="text-lg font-bold">{day.expectedSales}</div>
                    <div className={`text-sm ${day.stockLevel <= 0 ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                      残: {day.stockLevel}
                    </div>
                  </div>
                ))}
              </div>
              {forecast?.restockRecommendation && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="font-semibold text-orange-800">推奨アクション</p>
                  <p className="text-sm text-orange-700">
                    {forecast.restockRecommendation.orderBy}までに{forecast.restockRecommendation.quantity}個を発注
                    （推定コスト: ¥{forecast.restockRecommendation.estimatedCost?.toLocaleString()}）
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>在庫一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="SKU/商品名で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="critical">危険</SelectItem>
                      <SelectItem value="low">低在庫</SelectItem>
                      <SelectItem value="normal">正常</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>商品名</TableHead>
                    <TableHead>現在在庫</TableHead>
                    <TableHead>発注点</TableHead>
                    <TableHead>日販平均</TableHead>
                    <TableHead>在庫日数</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory?.items?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.product}</TableCell>
                      <TableCell className="font-bold">{item.currentStock}</TableCell>
                      <TableCell>{item.reorderPoint}</TableCell>
                      <TableCell>{item.avgDailySales}</TableCell>
                      <TableCell>{item.daysOfStock}日</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><History className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>補充計画</CardTitle>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  新規計画
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>計画名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>合計金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>次回実行</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans?.plans?.map((plan: any) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{plan.type}</Badge>
                      </TableCell>
                      <TableCell>{plan.itemCount}</TableCell>
                      <TableCell>¥{plan.totalCost?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                          {plan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{plan.nextRun || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Play className="w-4 h-4" /></Button>
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
                <CardTitle>発注履歴</CardTitle>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" />
                  新規発注
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>発注番号</TableHead>
                    <TableHead>サプライヤー</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>合計金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>発注日</TableHead>
                    <TableHead>到着予定</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.orders?.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono font-medium">{order.id}</TableCell>
                      <TableCell>{order.supplier}</TableCell>
                      <TableCell>{order.itemCount}</TableCell>
                      <TableCell>¥{order.totalCost?.toLocaleString()}</TableCell>
                      <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                      <TableCell>{order.orderedAt}</TableCell>
                      <TableCell>{order.eta || order.deliveredAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          {order.status === 'shipped' && (
                            <Button variant="ghost" size="sm" className="text-green-600">
                              <PackageCheck className="w-4 h-4" />
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

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-orange-600" />
                  コストトレンド
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  コストトレンドチャート
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-orange-600" />
                  在庫回転率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>全体回転率</span>
                    <span className="text-2xl font-bold">8.5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均在庫日数</span>
                    <span className="text-2xl font-bold">43日</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                欠品リスク分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-red-600">3</div>
                  <div className="text-sm text-red-700">危険アイテム</div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-orange-600">8</div>
                  <div className="text-sm text-orange-700">高リスク</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-yellow-600">15</div>
                  <div className="text-sm text-yellow-700">中リスク</div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <div className="text-3xl font-bold text-gray-600">¥450K</div>
                  <div className="text-sm text-gray-700">推定機会損失</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動補充</p>
                  <p className="text-sm text-gray-500">条件を満たしたら自動で補充計画を作成</p>
                </div>
                <Switch checked={settings?.settings?.autoRestockEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">低在庫通知</p>
                  <p className="text-sm text-gray-500">在庫が閾値を下回ったら通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnLowStock} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">危険在庫通知</p>
                  <p className="text-sm text-gray-500">緊急の在庫不足を通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnCritical} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">低在庫閾値（日数）</label>
                  <Input type="number" defaultValue={settings?.settings?.lowStockThreshold || 14} />
                </div>
                <div>
                  <label className="text-sm font-medium">危険在庫閾値（日数）</label>
                  <Input type="number" defaultValue={settings?.settings?.criticalStockThreshold || 7} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">1日の最大予算</label>
                <Input type="number" defaultValue={settings?.settings?.maxDailyBudget || 500000} />
              </div>

              <Button className="bg-orange-600 hover:bg-orange-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

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
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Target,
  Settings,
  Download,
  Calculator,
  Percent,
  Package,
  Eye,
  RefreshCw,
  FileText
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ProfitAnalyzerProPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/dashboard/overview`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/dashboard/trends`, fetcher);
  const { data: breakdown } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/dashboard/breakdown`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/products`, fetcher);
  const { data: categories } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/categories`, fetcher);
  const { data: costs } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/costs`, fetcher);
  const { data: goals } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/goals`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/profit-analyzer-pro/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pink-600">Profit Analyzer Pro</h1>
          <p className="text-gray-500">利益分析プロ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button className="bg-pink-600 hover:bg-pink-700">
            <Download className="w-4 h-4 mr-2" />
            レポート出力
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="costs">コスト</TabsTrigger>
          <TabsTrigger value="goals">目標</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総売上</CardTitle>
                <DollarSign className="w-4 h-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview?.totalRevenue?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">今月</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">粗利益</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview?.grossProfit?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">コスト: ${overview?.totalCost?.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">純利益</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview?.netProfit?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">注文数: {overview?.ordersThisMonth}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">利益率</CardTitle>
                <Percent className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.profitMargin}%</div>
                <p className="text-xs text-muted-foreground">平均: ${overview?.avgOrderProfit}/注文</p>
              </CardContent>
            </Card>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>収益内訳</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>売上</span>
                    <span className="font-bold text-green-600">${breakdown?.breakdown?.revenue?.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-500 mb-2">コスト内訳</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>商品原価</span>
                        <span className="text-red-600">-${breakdown?.breakdown?.costs?.productCost?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>送料</span>
                        <span className="text-red-600">-${breakdown?.breakdown?.costs?.shipping?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>手数料</span>
                        <span className="text-red-600">-${breakdown?.breakdown?.costs?.fees?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4 flex justify-between font-bold">
                    <span>純利益</span>
                    <span className="text-pink-600">${breakdown?.breakdown?.profit?.net?.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>月別トレンド</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trends?.monthly?.map((month: any) => (
                    <div key={month.month} className="flex items-center justify-between">
                      <span className="text-sm">{month.month}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">${month.profit.toLocaleString()}</span>
                        <Badge variant={month.margin > 32 ? 'default' : 'secondary'}>
                          {month.margin}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>商品別利益</CardTitle>
                  <CardDescription>各商品の収益性分析</CardDescription>
                </div>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="並び替え" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">利益順</SelectItem>
                    <SelectItem value="margin">利益率順</SelectItem>
                    <SelectItem value="revenue">売上順</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>商品名</TableHead>
                    <TableHead className="text-right">売上</TableHead>
                    <TableHead className="text-right">コスト</TableHead>
                    <TableHead className="text-right">利益</TableHead>
                    <TableHead className="text-right">利益率</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell className="text-right">${product.revenue.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">-${product.cost.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">${product.profit.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product.margin >= 35 ? 'default' : product.margin >= 30 ? 'secondary' : 'outline'}>
                          {product.margin}%
                        </Badge>
                      </TableCell>
                      <TableCell>{product.orders}</TableCell>
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

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別利益</CardTitle>
              <CardDescription>カテゴリごとの収益性</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories?.categories?.map((cat: any) => (
                  <div key={cat.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium">{cat.name}</h3>
                        <p className="text-sm text-gray-500">{cat.products}商品</p>
                      </div>
                      <Badge variant="default">{cat.margin}%</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">売上</p>
                        <p className="font-medium">${cat.revenue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">コスト</p>
                        <p className="font-medium text-red-600">${cat.cost.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">利益</p>
                        <p className="font-medium text-green-600">${cat.profit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>コスト分析</CardTitle>
              <CardDescription>コスト構造の内訳</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {costs?.costs?.map((cost: any) => (
                  <div key={cost.type} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{cost.type}</span>
                      <span>${cost.total.toLocaleString()} ({cost.percentage}%)</span>
                    </div>
                    <Progress value={cost.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>シミュレーション</CardTitle>
              <CardDescription>価格・コスト変更の影響を試算</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">現在の価格</label>
                  <Input type="number" defaultValue={380} />
                </div>
                <div>
                  <label className="text-sm font-medium">新しい価格</label>
                  <Input type="number" defaultValue={350} />
                </div>
              </div>
              <Button className="bg-pink-600 hover:bg-pink-700">
                <Calculator className="w-4 h-4 mr-2" />
                シミュレーション実行
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>目標管理</CardTitle>
                  <CardDescription>利益目標の設定と進捗</CardDescription>
                </div>
                <Button className="bg-pink-600 hover:bg-pink-700">
                  <Target className="w-4 h-4 mr-2" />
                  目標追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {goals?.goals?.map((goal: any) => (
                  <div key={goal.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{goal.name}</h3>
                      <Badge variant={goal.progress >= 100 ? 'default' : 'secondary'}>
                        {goal.progress}%
                      </Badge>
                    </div>
                    <Progress value={goal.progress} className="h-2 mb-2" />
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>現在: {typeof goal.current === 'number' ? (goal.name.includes('Margin') ? `${goal.current}%` : `$${goal.current.toLocaleString()}`) : goal.current}</span>
                      <span>目標: {typeof goal.target === 'number' ? (goal.name.includes('Margin') ? `${goal.target}%` : `$${goal.target.toLocaleString()}`) : goal.target}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>利益分析の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">通貨</p>
                  <p className="text-sm text-gray-500">表示通貨</p>
                </div>
                <Select defaultValue={settings?.settings?.currency}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">送料を含む</p>
                  <p className="text-sm text-gray-500">コスト計算に送料を含める</p>
                </div>
                <Switch checked={settings?.settings?.includeShipping} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">手数料を含む</p>
                  <p className="text-sm text-gray-500">コスト計算に手数料を含める</p>
                </div>
                <Switch checked={settings?.settings?.includeFees} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルト利益率</p>
                  <p className="text-sm text-gray-500">目標利益率</p>
                </div>
                <Select defaultValue={String(settings?.settings?.defaultMargin)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="30">30%</SelectItem>
                    <SelectItem value="35">35%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動計算</p>
                  <p className="text-sm text-gray-500">利益を自動で再計算</p>
                </div>
                <Switch checked={settings?.settings?.autoCalculate} />
              </div>

              <Button className="bg-pink-600 hover:bg-pink-700">
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

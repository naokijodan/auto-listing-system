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
  Layers,
  DollarSign,
  TrendingUp,
  Settings,
  Plus,
  Eye,
  Trash2,
  Percent,
  BarChart3,
  Download,
  CheckCircle,
  XCircle,
  Upload,
  Copy,
  Tag
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ProductBundleBuilderPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/product-bundle-builder/dashboard/overview`, fetcher);
  const { data: topBundles } = useSWR(`${API_BASE}/ebay/product-bundle-builder/dashboard/top-bundles`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay/product-bundle-builder/dashboard/performance`, fetcher);
  const { data: bundles } = useSWR(`${API_BASE}/ebay/product-bundle-builder/bundles`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/product-bundle-builder/products`, fetcher);
  const { data: templates } = useSWR(`${API_BASE}/ebay/product-bundle-builder/templates`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/product-bundle-builder/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-violet-600">Product Bundle Builder</h1>
          <p className="text-gray-500">商品バンドル作成</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-2" />
            バンドル作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="bundles">バンドル管理</TabsTrigger>
          <TabsTrigger value="products">商品選択</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総バンドル数</CardTitle>
                <Layers className="w-4 h-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalBundles}</div>
                <p className="text-xs text-muted-foreground">アクティブ: {overview?.activeBundles}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">販売数</CardTitle>
                <Package className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalSold}</div>
                <p className="text-xs text-muted-foreground">コンバージョン: {overview?.conversionRate}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">月間売上</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{overview?.monthlyRevenue?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">平均単価: ¥{overview?.avgBundleValue?.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均割引</CardTitle>
                <Percent className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgDiscount}%</div>
                <p className="text-xs text-muted-foreground">お得感アピール</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Bundles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                人気バンドル
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>バンドル名</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>価格</TableHead>
                    <TableHead>販売数</TableHead>
                    <TableHead>売上</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topBundles?.bundles?.map((bundle: any) => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">{bundle.name}</TableCell>
                      <TableCell>{bundle.items}点</TableCell>
                      <TableCell>¥{bundle.price?.toLocaleString()}</TableCell>
                      <TableCell className="font-bold">{bundle.sold}</TableCell>
                      <TableCell className="text-green-600">¥{bundle.revenue?.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Copy className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Performance Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-violet-600" />
                パフォーマンス（7日間）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {performance?.trend?.map((day: any, idx: number) => (
                  <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-500">{day.date}</div>
                    <div className="text-lg font-bold text-violet-600">{day.sold}</div>
                    <div className="text-xs text-gray-600">¥{(day.revenue / 1000).toFixed(0)}K</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundles" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>バンドル一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="バンドル名で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="active">アクティブ</SelectItem>
                      <SelectItem value="inactive">非アクティブ</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-violet-600 hover:bg-violet-700">
                    <Plus className="w-4 h-4 mr-2" />
                    新規作成
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>バンドル名</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>定価</TableHead>
                    <TableHead>バンドル価格</TableHead>
                    <TableHead>割引</TableHead>
                    <TableHead>販売数</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bundles?.bundles?.map((bundle: any) => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">{bundle.name}</TableCell>
                      <TableCell>{bundle.items}点</TableCell>
                      <TableCell className="line-through text-gray-400">¥{bundle.originalPrice?.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-violet-600">¥{bundle.bundlePrice?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          -{bundle.discount}%
                        </Badge>
                      </TableCell>
                      <TableCell>{bundle.sold}</TableCell>
                      <TableCell>
                        {bundle.status === 'active' ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />公開中
                          </Badge>
                        ) : (
                          <Badge variant="secondary">非公開</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Upload className="w-4 h-4" /></Button>
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

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>商品一覧</CardTitle>
                <Input placeholder="商品名/SKUで検索..." className="w-64" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>価格</TableHead>
                    <TableHead>在庫</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell className="font-mono">{product.sku}</TableCell>
                      <TableCell>¥{product.price?.toLocaleString()}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                          <Plus className="w-3 h-3 mr-1" />
                          追加
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>バンドルテンプレート</CardTitle>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  テンプレート作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>テンプレート名</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>割引タイプ</TableHead>
                    <TableHead>割引</TableHead>
                    <TableHead>使用回数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates?.templates?.map((tpl: any) => (
                    <TableRow key={tpl.id}>
                      <TableCell className="font-medium">{tpl.name}</TableCell>
                      <TableCell>{tpl.items}点</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {tpl.discountType === 'percentage' ? 'パーセント' : '固定額'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {tpl.discountType === 'percentage' ? `${tpl.discount}%` : `¥${tpl.discount?.toLocaleString()}`}
                      </TableCell>
                      <TableCell>{tpl.usageCount}回</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline">使用</Button>
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

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-600" />
                  売上分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>総販売数</span>
                    <span className="text-xl font-bold">450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>総売上</span>
                    <span className="text-xl font-bold">¥12,500,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均注文額</span>
                    <span className="text-xl font-bold">¥27,778</span>
                  </div>
                  <div className="p-3 bg-violet-50 rounded-lg">
                    <p className="text-sm text-violet-700">
                      バンドル購入率: 35%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-violet-600" />
                  コンバージョン分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>閲覧数</span>
                    <span className="text-xl font-bold">15,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>カート追加</span>
                    <span className="text-xl font-bold">1,800</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>購入完了</span>
                    <span className="text-xl font-bold">450</span>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>全体CV率</span>
                      <span>3.0%</span>
                    </div>
                    <Progress value={30} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>売上トレンド</CardTitle>
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
                <Settings className="w-5 h-5 text-violet-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動公開</p>
                  <p className="text-sm text-gray-500">バンドル作成後に自動で公開</p>
                </div>
                <Switch checked={settings?.settings?.autoPublish} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">送料を含める</p>
                  <p className="text-sm text-gray-500">バンドル価格に送料を含める</p>
                </div>
                <Switch checked={settings?.settings?.includeShipping} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">デフォルト割引タイプ</label>
                  <Select defaultValue={settings?.settings?.defaultDiscountType || 'percentage'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">パーセント</SelectItem>
                      <SelectItem value="fixed">固定額</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">デフォルト割引率（%）</label>
                  <Input type="number" defaultValue={settings?.settings?.defaultDiscount || 10} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">最小アイテム数</label>
                  <Input type="number" defaultValue={settings?.settings?.minItems || 2} />
                </div>
                <div>
                  <label className="text-sm font-medium">最大アイテム数</label>
                  <Input type="number" defaultValue={settings?.settings?.maxItems || 10} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">タイトルサフィックス</label>
                <Input defaultValue={settings?.settings?.bundleTitleSuffix || ' - Bundle Deal'} />
              </div>

              <Button className="bg-violet-600 hover:bg-violet-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

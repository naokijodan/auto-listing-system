
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
  Users,
  TrendingDown,
  TrendingUp,
  Bell,
  Target,
  Settings,
  Eye,
  Plus,
  Trash2,
  BarChart3,
  PieChart,
  AlertTriangle,
  Search,
  Download,
  RefreshCw,
  Star,
  Activity
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function CompetitorTrackerProPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/dashboard/overview`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/dashboard/alerts`, fetcher);
  const { data: competitors } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/competitors`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/products`, fetcher);
  const { data: priceComparison } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/analysis/price-comparison`, fetcher);
  const { data: marketShare } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/analysis/market-share`, fetcher);
  const { data: opportunities } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/analysis/opportunities`, fetcher);
  const { data: alertsList } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/alerts`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/competitor-tracker-pro/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-lime-600">Competitor Tracker Pro</h1>
          <p className="text-gray-500">競合追跡プロ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button className="bg-lime-600 hover:bg-lime-700">
            <Plus className="w-4 h-4 mr-2" />
            競合を追加
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="competitors">競合</TabsTrigger>
          <TabsTrigger value="products">商品</TabsTrigger>
          <TabsTrigger value="analysis">分析</TabsTrigger>
          <TabsTrigger value="alerts">アラート</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">追跡中の競合</CardTitle>
                <Users className="w-4 h-4 text-lime-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.activeTracking || 0}</div>
                <p className="text-xs text-muted-foreground">総数: {overview?.totalCompetitors || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">本日のアラート</CardTitle>
                <Bell className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.alertsToday || 0}</div>
                <p className="text-xs text-muted-foreground">価格変動: {overview?.priceChanges24h || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">価格指数</CardTitle>
                <BarChart3 className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgPriceIndex || 0}</div>
                <p className="text-xs text-muted-foreground">vs 市場平均</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">マーケットシェア</CardTitle>
                <PieChart className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.marketShare || 0}%</div>
                <p className="text-xs text-muted-foreground">新規出品: {overview?.newListings24h || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>最新アラート</CardTitle>
              <CardDescription>競合の価格変動・新規出品</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts?.alerts?.map((alert: any) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {alert.type === 'price_drop' && <TrendingDown className="w-5 h-5 text-red-500" />}
                      {alert.type === 'new_listing' && <Plus className="w-5 h-5 text-blue-500" />}
                      {alert.type === 'stock_out' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                      <div>
                        <p className="font-medium">{alert.product}</p>
                        <p className="text-sm text-gray-500">{alert.competitor}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {alert.change && (
                        <Badge variant={alert.change < 0 ? 'destructive' : 'default'}>
                          {alert.change > 0 ? '+' : ''}{alert.change}%
                        </Badge>
                      )}
                      {alert.price && <p className="text-sm font-medium">${alert.price}</p>}
                      <p className="text-xs text-gray-400">{alert.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>競合一覧</CardTitle>
                  <CardDescription>追跡中の競合セラー</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="競合を検索..." className="w-64" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>セラー名</TableHead>
                    <TableHead>プラットフォーム</TableHead>
                    <TableHead>商品数</TableHead>
                    <TableHead>平均価格</TableHead>
                    <TableHead>評価</TableHead>
                    <TableHead>追跡</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors?.competitors?.map((comp: any) => (
                    <TableRow key={comp.id}>
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell>{comp.platform}</TableCell>
                      <TableCell>{comp.products}</TableCell>
                      <TableCell>${comp.avgPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {comp.rating}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={comp.tracking} />
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
                  <CardTitle>商品追跡</CardTitle>
                  <CardDescription>競合との価格比較</CardDescription>
                </div>
                <Select>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="ポジション" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="above">市場より高い</SelectItem>
                    <SelectItem value="below">市場より低い</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>競合数</TableHead>
                    <TableHead>自社価格</TableHead>
                    <TableHead>競合平均</TableHead>
                    <TableHead>最安値</TableHead>
                    <TableHead>ポジション</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>{product.competitors}</TableCell>
                      <TableCell>${product.myPrice.toFixed(2)}</TableCell>
                      <TableCell>${product.avgCompetitorPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600">${product.lowestPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={product.pricePosition === 'below_avg' ? 'default' : 'secondary'}>
                          {product.pricePosition === 'below_avg' ? '有利' : '要検討'}
                        </Badge>
                      </TableCell>
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

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Price Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>価格比較</CardTitle>
                <CardDescription>市場との価格差</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>自社平均価格</span>
                    <span className="font-bold">${priceComparison?.comparison?.myAvgPrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>競合平均価格</span>
                    <span className="font-bold">${priceComparison?.comparison?.competitorAvgPrice?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>価格差</span>
                    <Badge variant={priceComparison?.comparison?.priceDifference > 0 ? 'secondary' : 'default'}>
                      {priceComparison?.comparison?.priceDifference > 0 ? '+' : ''}
                      {priceComparison?.comparison?.priceDifference}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Market Share */}
            <Card>
              <CardHeader>
                <CardTitle>マーケットシェア</CardTitle>
                <CardDescription>カテゴリ内のシェア</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>自社シェア</span>
                    <span className="font-bold text-lime-600">{marketShare?.marketShare?.myShare}%</span>
                  </div>
                  {marketShare?.marketShare?.topCompetitors?.map((comp: any) => (
                    <div key={comp.name} className="flex justify-between items-center">
                      <span className="text-gray-600">{comp.name}</span>
                      <span>{comp.share}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Opportunities */}
          <Card>
            <CardHeader>
              <CardTitle>機会発見</CardTitle>
              <CardDescription>価格改善・新規出品の機会</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {opportunities?.opportunities?.map((opp: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Target className="w-5 h-5 text-lime-600" />
                      <div>
                        <p className="font-medium">{opp.product}</p>
                        <p className="text-sm text-gray-500">
                          {opp.type === 'underpriced' && `推奨価格: $${opp.suggestedPrice}`}
                          {opp.type === 'low_competition' && `競合数: ${opp.competitors}`}
                          {opp.type === 'trending' && `検索量: ${opp.searchVolume}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={opp.potential === 'high' ? 'default' : 'secondary'}>
                      {opp.suggestedAction || opp.potential}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>アラート設定</CardTitle>
                  <CardDescription>価格変動・在庫切れ等の通知</CardDescription>
                </div>
                <Button className="bg-lime-600 hover:bg-lime-700">
                  <Plus className="w-4 h-4 mr-2" />
                  アラート追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイプ</TableHead>
                    <TableHead>競合</TableHead>
                    <TableHead>条件</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertsList?.alerts?.map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge variant="outline">{alert.type}</Badge>
                      </TableCell>
                      <TableCell>{alert.competitor}</TableCell>
                      <TableCell>
                        {alert.threshold && `${alert.threshold}%以上の変動`}
                        {alert.keywords && alert.keywords.join(', ')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.triggered ? 'destructive' : 'default'}>
                          {alert.triggered ? '発火済み' : 'アクティブ'}
                        </Badge>
                      </TableCell>
                      <TableCell>{alert.createdAt}</TableCell>
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

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>競合追跡の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">追跡間隔</p>
                  <p className="text-sm text-gray-500">競合データの更新頻度</p>
                </div>
                <Select defaultValue={settings?.settings?.trackingInterval}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30m">30分</SelectItem>
                    <SelectItem value="1h">1時間</SelectItem>
                    <SelectItem value="6h">6時間</SelectItem>
                    <SelectItem value="24h">24時間</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">アラート閾値</p>
                  <p className="text-sm text-gray-500">価格変動の通知基準</p>
                </div>
                <Select defaultValue={String(settings?.settings?.alertThreshold)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3%</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動マッチング</p>
                  <p className="text-sm text-gray-500">商品を自動で競合にマッチ</p>
                </div>
                <Switch checked={settings?.settings?.autoMatchProducts} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">送料込み価格</p>
                  <p className="text-sm text-gray-500">比較に送料を含める</p>
                </div>
                <Switch checked={settings?.settings?.includeShipping} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">価格変更通知</p>
                  <p className="text-sm text-gray-500">競合の価格変動時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnPriceChange} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">新規出品通知</p>
                  <p className="text-sm text-gray-500">競合の新規出品時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnNewListing} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">在庫切れ通知</p>
                  <p className="text-sm text-gray-500">競合の在庫切れ時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnStockOut} />
              </div>

              <Button className="bg-lime-600 hover:bg-lime-700">
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

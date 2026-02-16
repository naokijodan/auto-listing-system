'use client';

import { useState } from 'react';
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
  TrendingDown,
  TrendingUp,
  LayoutDashboard,
  History,
  Settings2,
  Bell,
  FileText,
  Users,
  Search,
  Plus,
  ArrowDown,
  ArrowUp,
  Minus,
  Eye,
  Trash2,
  LineChart,
  Target,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function PriceHistoryPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8 text-lime-600" />
            Price History Tracker
          </h1>
          <p className="text-muted-foreground mt-1">価格履歴追跡・分析</p>
        </div>
        <Button className="bg-lime-600 hover:bg-lime-700">
          <Plus className="mr-2 h-4 w-4" />
          商品を追跡
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            商品履歴
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            競合分析
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            アラート
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            レポート
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="competitors">
          <CompetitorsTab />
        </TabsContent>
        <TabsContent value="alerts">
          <AlertsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/price-history/dashboard/overview`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/price-history/dashboard/trends`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/price-history/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">追跡商品数</CardTitle>
            <Target className="h-4 w-4 text-lime-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalProducts?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">価格変動: {overview?.trackedPriceChanges?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均価格変動</CardTitle>
            {(overview?.avgPriceChange || 0) < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(overview?.avgPriceChange || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {overview?.avgPriceChange}%
            </div>
            <p className="text-xs text-muted-foreground">重要な変動: {overview?.significantChanges}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">値下げ</CardTitle>
            <ArrowDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overview?.priceDrops?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">値上げ: {overview?.priceIncreases?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">変動なし</CardTitle>
            <Minus className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.unchanged}</div>
            <p className="text-xs text-muted-foreground">安定した価格</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別トレンド</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends?.categories?.map((cat: any) => (
                <div key={cat.category} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{cat.category}</p>
                    <p className="text-sm text-muted-foreground">{cat.products?.toLocaleString()} 商品</p>
                  </div>
                  <div className={`flex items-center gap-1 ${cat.trend < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {cat.trend < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    <span className="font-bold">{cat.trend > 0 ? '+' : ''}{cat.trend}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近のアラート</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts?.alerts?.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">
                      ${alert.oldPrice} → ${alert.newPrice}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={alert.type === 'price_drop' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {alert.change > 0 ? '+' : ''}{alert.change}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/price-history/products`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>追跡商品一覧</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="商品名で検索..." className="w-64" />
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="トレンド" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="dropping">値下げ中</SelectItem>
                  <SelectItem value="rising">値上がり中</SelectItem>
                  <SelectItem value="stable">安定</SelectItem>
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
                <TableHead className="text-right">現在価格</TableHead>
                <TableHead className="text-right">最高値</TableHead>
                <TableHead className="text-right">最安値</TableHead>
                <TableHead className="text-right">平均</TableHead>
                <TableHead className="text-right">変動</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.products?.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell className="text-right">${product.currentPrice}</TableCell>
                  <TableCell className="text-right text-green-600">${product.highPrice}</TableCell>
                  <TableCell className="text-right text-red-600">${product.lowPrice}</TableCell>
                  <TableCell className="text-right">${product.avgPrice}</TableCell>
                  <TableCell className="text-right">
                    <span className={product.changePercent < 0 ? 'text-red-600' : 'text-green-600'}>
                      {product.changePercent > 0 ? '+' : ''}{product.changePercent}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <LineChart className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CompetitorsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/price-history/competitors`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">競合価格追跡</h2>
        <Button className="bg-lime-600 hover:bg-lime-700">
          <Plus className="mr-2 h-4 w-4" />
          競合を追加
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.competitors?.map((comp: any) => (
          <Card key={comp.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{comp.seller}</CardTitle>
                <Badge className={comp.avgPriceDiff < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                  {comp.avgPriceDiff > 0 ? '+' : ''}{comp.avgPriceDiff}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">追跡商品</span>
                  <span className="font-medium">{comp.productsTracked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最終更新</span>
                  <span className="font-medium">{comp.lastUpdated?.split(' ')[1]}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  詳細
                </Button>
                <Button size="sm" className="flex-1 bg-lime-600 hover:bg-lime-700">
                  比較
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AlertsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/price-history/alerts`, fetcher);
  const { data: history } = useSWR(`${API_BASE}/ebay/price-history/alerts/history`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>アラート設定</CardTitle>
              <Button size="sm" className="bg-lime-600 hover:bg-lime-700">
                <Plus className="mr-2 h-4 w-4" />
                新規
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.alerts?.map((alert: any) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{alert.type === 'price_drop' ? '値下げ' : alert.type === 'competitor_undercut' ? '競合下回り' : '値上げ'}</p>
                    <p className="text-sm text-muted-foreground">閾値: {alert.threshold}%</p>
                  </div>
                  <Switch checked={alert.active} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>アラート履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history?.history?.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{item.type === 'price_drop' ? '値下げ検出' : '競合下回り'}</p>
                    <p className="text-sm text-muted-foreground">{item.triggeredAt}</p>
                  </div>
                  <Badge className={item.change < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                    {item.change > 0 ? '+' : ''}{item.change}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/price-history/reports/summary`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>サマリーレポート</CardTitle>
              <CardDescription>期間: {data?.report?.period}</CardDescription>
            </div>
            <Button variant="outline">
              レポートをエクスポート
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">追跡商品</p>
              <p className="text-2xl font-bold">{data?.report?.totalProducts?.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">価格変動回数</p>
              <p className="text-2xl font-bold">{data?.report?.priceChanges?.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">平均変動</p>
              <p className={`text-2xl font-bold ${(data?.report?.avgChange || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data?.report?.avgChange}%
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-4">大幅値下げ</h3>
              <div className="space-y-2">
                {data?.report?.topDrops?.map((item: any) => (
                  <div key={item.productId} className="flex justify-between p-2 bg-red-50 rounded">
                    <span>{item.title}</span>
                    <span className="text-red-600 font-medium">{item.drop}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-4">大幅値上げ</h3>
              <div className="space-y-2">
                {data?.report?.topIncreases?.map((item: any) => (
                  <div key={item.productId} className="flex justify-between p-2 bg-green-50 rounded">
                    <span>{item.title}</span>
                    <span className="text-green-600 font-medium">+{item.increase}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/price-history/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">追跡間隔（分）</label>
            <Input type="number" defaultValue={data?.settings?.trackingInterval} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">データ保持期間（日）</label>
            <Input type="number" defaultValue={data?.settings?.dataRetentionDays} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">アラート閾値（%）</label>
            <Input type="number" defaultValue={data?.settings?.alertThreshold} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">競合価格を含める</p>
              <p className="text-sm text-muted-foreground">競合の価格も追跡する</p>
            </div>
            <Switch checked={data?.settings?.includeCompetitors} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">通貨</label>
            <Select defaultValue={data?.settings?.currency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="JPY">JPY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-lime-600 hover:bg-lime-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

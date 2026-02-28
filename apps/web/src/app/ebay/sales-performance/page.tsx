
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
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  LayoutDashboard,
  Package,
  Settings2,
  Target,
  Clock,
  Globe,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Eye,
  FileText,
  Plus,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function SalesPerformancePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            Sales Performance Tracker
          </h1>
          <p className="text-muted-foreground mt-1">販売パフォーマンス追跡・分析</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <FileText className="mr-2 h-4 w-4" />
          レポート生成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            商品別
          </TabsTrigger>
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            目標
          </TabsTrigger>
          <TabsTrigger value="time" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            時間帯
          </TabsTrigger>
          <TabsTrigger value="geo" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            地域
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
        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
        <TabsContent value="time">
          <TimeTab />
        </TabsContent>
        <TabsContent value="geo">
          <GeoTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/sales-performance/dashboard/overview`, fetcher);
  const { data: metrics } = useSWR(`${API_BASE}/ebay/sales-performance/dashboard/metrics`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/sales-performance/dashboard/trends`, fetcher);

  const getChangeIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center text-green-600 text-sm">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{change}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-red-600 text-sm">
          <TrendingDown className="h-3 w-3 mr-1" />
          {change}%
        </span>
      );
    }
    return <span className="text-sm text-muted-foreground">0%</span>;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.totalSales?.toLocaleString()}</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">今日: ${overview?.todaySales?.toLocaleString()}</span>
              {getChangeIndicator(overview?.monthlyGrowth || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">注文数</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalOrders?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">今日: {overview?.todayOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均注文額</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.avgOrderValue}</div>
            {metrics?.metrics?.aov && getChangeIndicator(metrics.metrics.aov.change)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">コンバージョン率</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.conversionRate}%</div>
            {metrics?.metrics?.conversion && getChangeIndicator(metrics.metrics.conversion.change)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>主要指標の比較</CardTitle>
            <CardDescription>前期間との比較</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics?.metrics && Object.entries(metrics.metrics).map(([key, data]: [string, any]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize">{key}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {typeof data.current === 'number' && data.current > 1000
                        ? `$${data.current.toLocaleString()}`
                        : data.current}
                    </span>
                    {getChangeIndicator(data.change)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>日別トレンド</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trends?.daily?.map((day: any) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">{day.date}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">${day.sales?.toLocaleString()}</span>
                    <Badge variant="outline">{day.orders} orders</Badge>
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
  const { data } = useSWR(`${API_BASE}/ebay/sales-performance/products`, fetcher);

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'up':
        return <Badge className="bg-green-100 text-green-800">上昇</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800">下降</Badge>;
      case 'stable':
        return <Badge className="bg-gray-100 text-gray-800">安定</Badge>;
      default:
        return <Badge variant="outline">{trend}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>商品パフォーマンス</CardTitle>
            <Select defaultValue="sales">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="並び順" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">売上順</SelectItem>
                <SelectItem value="orders">注文数順</SelectItem>
                <SelectItem value="conversion">CVR順</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead className="text-right">売上</TableHead>
                <TableHead className="text-right">注文数</TableHead>
                <TableHead className="text-right">平均価格</TableHead>
                <TableHead className="text-right">閲覧数</TableHead>
                <TableHead className="text-right">CVR</TableHead>
                <TableHead>トレンド</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.products?.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{product.title}</TableCell>
                  <TableCell className="text-right">${product.sales?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{product.orders}</TableCell>
                  <TableCell className="text-right">${product.avgPrice}</TableCell>
                  <TableCell className="text-right">{product.views?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{product.conversion}%</TableCell>
                  <TableCell>{getTrendBadge(product.trend)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
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

function GoalsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/sales-performance/goals`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">目標管理</h2>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="mr-2 h-4 w-4" />
          目標を追加
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.goals?.map((goal: any) => (
          <Card key={goal.id}>
            <CardHeader>
              <CardTitle className="text-lg">{goal.name}</CardTitle>
              <CardDescription>期限: {goal.deadline}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>進捗</span>
                  <span className="font-medium">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">現在</span>
                <span className="font-medium">
                  {typeof goal.current === 'number' && goal.current > 1000
                    ? `$${goal.current.toLocaleString()}`
                    : goal.current}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">目標</span>
                <span className="font-medium">
                  {typeof goal.target === 'number' && goal.target > 1000
                    ? `$${goal.target.toLocaleString()}`
                    : goal.target}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TimeTab() {
  const { data } = useSWR(`${API_BASE}/ebay/sales-performance/time-analysis`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>曜日別パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data?.dayOfWeek?.map((day: any) => (
                <div key={day.day} className="flex items-center justify-between">
                  <span className="w-24">{day.day}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${(day.sales / 25000) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right w-24">
                    <p className="font-medium">${day.sales?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{day.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ベストタイム</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-600 font-medium">最も売上が高い時間帯</p>
              <p className="text-2xl font-bold">{data?.bestHour?.hour}:00</p>
              <p className="text-sm text-muted-foreground">平均売上: ${data?.bestHour?.avgSales?.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">最も売上が高い曜日</p>
              <p className="text-2xl font-bold">{data?.bestDay?.day}</p>
              <p className="text-sm text-muted-foreground">平均売上: ${data?.bestDay?.avgSales?.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function GeoTab() {
  const { data } = useSWR(`${API_BASE}/ebay/sales-performance/geo-analysis`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>地域別パフォーマンス</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>国</TableHead>
                <TableHead className="text-right">売上</TableHead>
                <TableHead className="text-right">注文数</TableHead>
                <TableHead className="text-right">シェア</TableHead>
                <TableHead>構成比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.countries?.map((country: any) => (
                <TableRow key={country.country}>
                  <TableCell className="font-medium">{country.country}</TableCell>
                  <TableCell className="text-right">${country.sales?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{country.orders}</TableCell>
                  <TableCell className="text-right">{country.share}%</TableCell>
                  <TableCell>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${country.share}%` }}
                      />
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

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/sales-performance/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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

          <div className="space-y-2">
            <label className="text-sm font-medium">タイムゾーン</label>
            <Select defaultValue={data?.settings?.timezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">閲覧数を追跡</p>
              <p className="text-sm text-muted-foreground">商品の閲覧数をトラッキング</p>
            </div>
            <Switch checked={data?.settings?.trackViews} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">コンバージョン追跡</p>
              <p className="text-sm text-muted-foreground">コンバージョン率を計算</p>
            </div>
            <Switch checked={data?.settings?.trackConversion} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">前期間と比較</p>
              <p className="text-sm text-muted-foreground">自動で前期間との比較を表示</p>
            </div>
            <Switch checked={data?.settings?.compareWithPrevious} />
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

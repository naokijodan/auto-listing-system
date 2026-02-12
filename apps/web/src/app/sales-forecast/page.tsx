'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Package,
  BarChart3,
  Calendar,
  Target,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import {
  useForecastStats,
  useForecastDaily,
  useForecastCategories,
  useForecastProducts,
  useInventoryRecommendations,
  useSeasonality,
  useTrends,
} from '@/lib/hooks';

export default function SalesForecastPage() {
  const [forecastDays, setForecastDays] = useState(30);
  const [historicalDays, setHistoricalDays] = useState(90);

  const { data: statsData, mutate: mutateStats } = useForecastStats();
  const { data: dailyData } = useForecastDaily({ historicalDays, forecastDays });
  const { data: categoriesData } = useForecastCategories({ historicalDays, forecastDays });
  const { data: productsData } = useForecastProducts({ historicalDays, limit: 10 });
  const { data: inventoryData } = useInventoryRecommendations(forecastDays);
  const { data: seasonalityData } = useSeasonality(historicalDays);
  const { data: trendsData } = useTrends(historicalDays);

  const stats = statsData?.data;
  const daily = dailyData?.data;
  const categories = categoriesData?.data || [];
  const products = productsData?.data || [];
  const inventory = inventoryData?.data;
  const seasonality = seasonalityData?.data;
  const trends = trendsData?.data;

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendBadge = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <Badge className="bg-green-100 text-green-800">上昇</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800">下降</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">横ばい</Badge>;
    }
  };

  const getUrgencyBadge = (urgency: 'high' | 'medium' | 'low') => {
    switch (urgency) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">緊急</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">要対応</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800">問題なし</Badge>;
    }
  };

  const formatCurrency = (value: number): string => {
    return `¥${value.toLocaleString()}`;
  };

  // チャートデータの準備
  const combinedChartData = [
    ...(daily?.historical?.slice(-14) || []).map((d) => ({
      date: d.date.slice(5), // MM-DD形式
      actual: d.revenue,
      type: 'actual',
    })),
    ...(daily?.forecasts?.slice(0, 14) || []).map((f) => ({
      date: f.date.slice(5),
      predicted: f.predictedRevenue,
      lower: f.lowerBound,
      upper: f.upperBound,
      type: 'forecast',
    })),
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">売上予測AI</h1>
          <p className="text-muted-foreground">需要予測と在庫最適化提案</p>
        </div>
        <div className="flex gap-4">
          <Select value={historicalDays.toString()} onValueChange={(v) => setHistoricalDays(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">過去30日</SelectItem>
              <SelectItem value="60">過去60日</SelectItem>
              <SelectItem value="90">過去90日</SelectItem>
            </SelectContent>
          </Select>
          <Select value={forecastDays.toString()} onValueChange={(v) => setForecastDays(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="14">14日予測</SelectItem>
              <SelectItem value="30">30日予測</SelectItem>
              <SelectItem value="60">60日予測</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => mutateStats()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              予測売上（30日）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.predictedRevenue30d || 0)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {stats?.trend && getTrendIcon(stats.trend)}
              <span className={`text-sm ${stats?.growthRate && stats.growthRate > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats?.growthRate ? `${stats.growthRate > 0 ? '+' : ''}${stats.growthRate}%` : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              予測注文数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.predictedOrders30d || 0}件</div>
            <div className="text-sm text-muted-foreground mt-1">
              信頼度: {stats?.confidence ? `${Math.round(stats.confidence * 100)}%` : '-'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              予測精度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.forecastAccuracy || 0}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              MAPE: {stats?.mape || 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              在庫アラート
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-red-600">{stats?.urgentRestockCount || 0}</span>
              <span className="text-sm text-muted-foreground">緊急</span>
              <span className="text-2xl font-bold text-yellow-600 ml-2">{stats?.soonRestockCount || 0}</span>
              <span className="text-sm text-muted-foreground">要対応</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="forecast">
        <TabsList>
          <TabsTrigger value="forecast">予測チャート</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ分析</TabsTrigger>
          <TabsTrigger value="products">商品需要</TabsTrigger>
          <TabsTrigger value="inventory">在庫提案</TabsTrigger>
          <TabsTrigger value="seasonality">季節性</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>売上予測チャート</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'actual' ? '実績' : name === 'predicted' ? '予測' : name,
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="upper"
                      stackId="1"
                      stroke="none"
                      fill="#e0e7ff"
                      name="上限"
                    />
                    <Area
                      type="monotone"
                      dataKey="lower"
                      stackId="2"
                      stroke="none"
                      fill="#ffffff"
                      name="下限"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="実績"
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="予測"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>週別トレンド</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends?.weeklyTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis yAxisId="left" tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}K`} />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#6366f1" name="売上" />
                    <Bar yAxisId="right" dataKey="orders" fill="#10b981" name="注文数" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別予測</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">カテゴリ</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">現在売上</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">予測売上</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">成長率</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">トレンド</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {categories.map((cat) => (
                      <tr key={cat.category} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{cat.category}</td>
                        <td className="px-4 py-3">{formatCurrency(cat.currentRevenue)}</td>
                        <td className="px-4 py-3">{formatCurrency(cat.predictedRevenue)}</td>
                        <td className="px-4 py-3">
                          <span className={cat.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {cat.growthRate >= 0 ? '+' : ''}{cat.growthRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3">{getTrendBadge(cat.trend)}</td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>商品別需要予測</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">商品名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">現在販売数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">予測販売数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">需要トレンド</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">補充推奨</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.map((prod) => (
                      <tr key={prod.productId} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="max-w-xs truncate font-medium">{prod.title}</div>
                        </td>
                        <td className="px-4 py-3">{prod.currentSales}点</td>
                        <td className="px-4 py-3">{prod.predictedSales}点</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {prod.demandTrend === 'increasing' && <ArrowUp className="w-4 h-4 text-green-500" />}
                            {prod.demandTrend === 'decreasing' && <ArrowDown className="w-4 h-4 text-red-500" />}
                            {prod.demandTrend === 'stable' && <Minus className="w-4 h-4 text-gray-500" />}
                            <span className="text-sm">
                              {prod.demandTrend === 'increasing' ? '増加' : prod.demandTrend === 'decreasing' ? '減少' : '安定'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {prod.restockRecommendation ? (
                            <Badge className="bg-blue-100 text-blue-800">
                              {prod.recommendedQuantity}点推奨
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          {/* サマリー */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div className="text-2xl font-bold mt-2">{inventory?.summary.totalProducts || 0}</div>
                  <div className="text-sm text-muted-foreground">総商品数</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto text-red-500" />
                  <div className="text-2xl font-bold mt-2 text-red-600">{inventory?.summary.urgentRestock || 0}</div>
                  <div className="text-sm text-muted-foreground">緊急補充</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Calendar className="w-8 h-8 mx-auto text-yellow-500" />
                  <div className="text-2xl font-bold mt-2 text-yellow-600">{inventory?.summary.soonRestock || 0}</div>
                  <div className="text-sm text-muted-foreground">要補充</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardContent className="pt-6">
                <div className="text-center">
                  <Target className="w-8 h-8 mx-auto text-green-500" />
                  <div className="text-2xl font-bold mt-2 text-green-600">{inventory?.summary.sufficient || 0}</div>
                  <div className="text-sm text-muted-foreground">十分</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>在庫補充推奨</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">商品名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">現在庫</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">予測需要</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">在庫日数</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">緊急度</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">推奨補充数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(inventory?.recommendations || []).slice(0, 20).map((rec) => (
                      <tr key={rec.productId} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="max-w-xs truncate font-medium">{rec.title}</div>
                        </td>
                        <td className="px-4 py-3">{rec.currentStock}点</td>
                        <td className="px-4 py-3">{rec.predictedDemand}点</td>
                        <td className="px-4 py-3">{rec.daysOfStock}日</td>
                        <td className="px-4 py-3">{getUrgencyBadge(rec.urgency)}</td>
                        <td className="px-4 py-3">
                          {rec.recommendedQuantity > 0 ? (
                            <span className="font-medium text-blue-600">+{rec.recommendedQuantity}点</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!inventory?.recommendations || inventory.recommendations.length === 0) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          推奨データがありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seasonality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>曜日別売上傾向</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonality?.dayOfWeek || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis domain={[0, 2]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(0)}%`, '売上係数']} />
                      <Bar dataKey="factor" fill="#6366f1" name="売上係数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>月別売上傾向</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonality?.monthOfYear || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 2]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(v: number) => [`${(v * 100).toFixed(0)}%`, '売上係数']} />
                      <Bar dataKey="factor" fill="#10b981" name="売上係数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>季節性インサイト</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(seasonality?.insights || []).map((insight, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-1 text-muted-foreground" />
                    <span>{insight}</span>
                  </li>
                ))}
                {(!seasonality?.insights || seasonality.insights.length === 0) && (
                  <li className="text-muted-foreground">インサイトがありません</li>
                )}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

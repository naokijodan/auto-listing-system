
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { fetcher } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';

interface SalesTrend {
  date: string;
  revenue: number;
  orders: number;
  profit: number;
  avgOrderValue: number;
}

interface CategoryData {
  category: string;
  revenue: number;
  orders: number;
  profit: number;
  revenuePercentage: string;
  profitMargin: string;
}

interface MarketplaceData {
  marketplace: string;
  revenue: number;
  orders: number;
  profit: number;
  listings: number;
  revenueChange: string;
  ordersChange: string;
  avgOrderValue: number;
  profitMargin: string;
}

interface ProductPerformance {
  productId: string;
  title: string;
  category: string;
  brand: string;
  revenue: number;
  orders: number;
  profit: number;
  profitMargin: string;
}

interface Summary {
  revenue: number;
  revenueChange: string;
  orders: number;
  ordersChange: string;
  profit: number;
  profitMargin: string;
  cost: number;
  avgOrderValue: number;
  activeListings: number;
  period: { start: string; end: string; days: number };
}

export default function AnalyticsPage() {
  const { t, locale } = useTranslation();

  // 日付範囲
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState<string>('day');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>('');

  // データ取得
  const { data: summaryData, mutate: mutateSummary } = useSWR<{ success: boolean; data: Summary }>(
    `/api/advanced-analytics/summary?startDate=${startDate}&endDate=${endDate}`,
    fetcher
  );
  const summary = summaryData?.data;

  const { data: trendData } = useSWR<{ success: boolean; data: { trend: SalesTrend[]; totals: unknown } }>(
    `/api/advanced-analytics/sales-trend?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`,
    fetcher
  );
  const trend = trendData?.data?.trend || [];

  const { data: categoryData } = useSWR<{ success: boolean; data: { categories: CategoryData[] } }>(
    `/api/advanced-analytics/by-category?startDate=${startDate}&endDate=${endDate}`,
    fetcher
  );
  const categories = categoryData?.data?.categories || [];

  const { data: marketplaceData } = useSWR<{ success: boolean; data: { comparison: MarketplaceData[] } }>(
    `/api/advanced-analytics/marketplace-comparison?startDate=${startDate}&endDate=${endDate}`,
    fetcher
  );
  const marketplaces = marketplaceData?.data?.comparison || [];

  const { data: productData } = useSWR<{ success: boolean; data: { products: ProductPerformance[]; total: number } }>(
    `/api/advanced-analytics/product-performance?startDate=${startDate}&endDate=${endDate}${selectedCategory ? `&category=${selectedCategory}` : ''}${selectedMarketplace ? `&marketplace=${selectedMarketplace}` : ''}&limit=10`,
    fetcher
  );
  const products = productData?.data?.products || [];

  // データエクスポート
  const handleExport = async (type: string, format: string) => {
    window.open(
      `/api/advanced-analytics/export?startDate=${startDate}&endDate=${endDate}&type=${type}&format=${format}`,
      '_blank'
    );
  };

  // 変化率の表示
  const renderChange = (value: string | number) => {
    if (value === 'N/A') return <span className="text-zinc-400">-</span>;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (num > 0) {
      return (
        <span className="flex items-center text-green-600 dark:text-green-400">
          <ArrowUpRight className="h-3 w-3 mr-0.5" />
          {num.toFixed(1)}%
        </span>
      );
    } else if (num < 0) {
      return (
        <span className="flex items-center text-red-600 dark:text-red-400">
          <ArrowDownRight className="h-3 w-3 mr-0.5" />
          {Math.abs(num).toFixed(1)}%
        </span>
      );
    }
    return <span className="text-zinc-400">0%</span>;
  };

  // 簡易チャート（バー）
  const renderBar = (value: number, max: number, color: string) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">高度な分析</h1>
          <p className="text-sm text-zinc-500">売上、カテゴリ、マーケットプレイスの詳細分析</p>
        </div>

        {/* 日付範囲選択 */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
            <span className="text-zinc-400">〜</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => mutateSummary()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              売上
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? `¥${summary.revenue.toLocaleString()}` : '-'}
            </div>
            <div className="text-xs mt-1">
              前期比: {summary ? renderChange(summary.revenueChange) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              注文数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.orders.toLocaleString() || '-'}
            </div>
            <div className="text-xs mt-1">
              前期比: {summary ? renderChange(summary.ordersChange) : '-'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              利益
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? `¥${summary.profit.toLocaleString()}` : '-'}
            </div>
            <div className="text-xs mt-1">
              利益率: <span className="font-medium">{summary?.profitMargin || '0'}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-500" />
              アクティブ出品
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.activeListings.toLocaleString() || '-'}
            </div>
            <div className="text-xs mt-1">
              平均注文額: <span className="font-medium">¥{summary?.avgOrderValue.toLocaleString() || '0'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trend">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trend">売上トレンド</TabsTrigger>
            <TabsTrigger value="category">カテゴリ分析</TabsTrigger>
            <TabsTrigger value="marketplace">マーケットプレイス</TabsTrigger>
            <TabsTrigger value="products">商品パフォーマンス</TabsTrigger>
          </TabsList>

          {/* エクスポートボタン */}
          <div className="hidden md:flex items-center gap-2">
            <Select onValueChange={(v) => handleExport('sales', v)}>
              <SelectTrigger className="w-40">
                <Download className="h-4 w-4 mr-2" />
                エクスポート
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV (売上)</SelectItem>
                <SelectItem value="json">JSON (売上)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 売上トレンド */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>売上推移</CardTitle>
                  <CardDescription>期間別の売上・注文数・利益の推移</CardDescription>
                </div>
                <Select value={groupBy} onValueChange={setGroupBy}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">日別</SelectItem>
                    <SelectItem value="week">週別</SelectItem>
                    <SelectItem value="month">月別</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {trend.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>データがありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {trend.slice(-14).map((item) => {
                    const maxRevenue = Math.max(...trend.map(t => t.revenue));
                    return (
                      <div key={item.date} className="grid grid-cols-5 gap-4 items-center">
                        <span className="text-sm font-medium">{item.date}</span>
                        <div className="col-span-2">
                          {renderBar(item.revenue, maxRevenue, 'bg-green-500')}
                        </div>
                        <span className="text-sm text-right">¥{item.revenue.toLocaleString()}</span>
                        <span className="text-sm text-right text-zinc-500">{item.orders}件</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* カテゴリ分析 */}
        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリ別売上</CardTitle>
              <CardDescription>カテゴリごとの売上と利益率</CardDescription>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <PieChart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>データがありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((cat) => {
                    const maxRevenue = Math.max(...categories.map(c => c.revenue));
                    return (
                      <div key={cat.category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{cat.category}</span>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">{cat.revenuePercentage}%</Badge>
                            <span className="font-medium">¥{cat.revenue.toLocaleString()}</span>
                          </div>
                        </div>
                        {renderBar(cat.revenue, maxRevenue, 'bg-blue-500')}
                        <div className="flex items-center justify-between text-sm text-zinc-500">
                          <span>{cat.orders}件</span>
                          <span>利益率: {cat.profitMargin}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* マーケットプレイス比較 */}
        <TabsContent value="marketplace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>マーケットプレイス比較</CardTitle>
              <CardDescription>プラットフォーム別のパフォーマンス</CardDescription>
            </CardHeader>
            <CardContent>
              {marketplaces.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>データがありません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">マーケットプレイス</th>
                        <th className="text-right py-2 font-medium">売上</th>
                        <th className="text-right py-2 font-medium">変化</th>
                        <th className="text-right py-2 font-medium">注文数</th>
                        <th className="text-right py-2 font-medium">利益率</th>
                        <th className="text-right py-2 font-medium">出品数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketplaces.map((mp) => (
                        <tr key={mp.marketplace} className="border-b last:border-0">
                          <td className="py-3 font-medium">{mp.marketplace}</td>
                          <td className="py-3 text-right">¥{mp.revenue.toLocaleString()}</td>
                          <td className="py-3 text-right">{renderChange(mp.revenueChange)}</td>
                          <td className="py-3 text-right">{mp.orders}</td>
                          <td className="py-3 text-right">{mp.profitMargin}%</td>
                          <td className="py-3 text-right">{mp.listings}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 商品パフォーマンス */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>商品パフォーマンス</CardTitle>
                  <CardDescription>売上上位の商品</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="カテゴリ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">すべて</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.category} value={cat.category}>
                          {cat.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>データがありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {products.map((product, index) => (
                    <div
                      key={product.productId}
                      className="flex items-center gap-4 p-3 border rounded-lg"
                    >
                      <span className="text-lg font-bold text-zinc-400 w-6">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.title}</p>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                          {product.brand && (
                            <span className="truncate">{product.brand}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">¥{product.revenue.toLocaleString()}</p>
                        <p className="text-sm text-zinc-500">
                          {product.orders}件 / {product.profitMargin}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

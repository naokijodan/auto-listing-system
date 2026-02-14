'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { fetcher } from '@/lib/api';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Calendar,
  BarChart3,
  PieChart,
  Award,
  Minus,
} from 'lucide-react';

interface DashboardData {
  period: { days: number; since: string };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalItems: number;
    avgOrderValue: number;
    soldListings: number;
  };
  topProducts: Array<{
    productId: string;
    title: string;
    category: string | null;
    brand: string | null;
    revenue: number;
    quantity: number;
    orderCount: number;
  }>;
  recentOrders: Array<{
    id: string;
    externalId: string | null;
    amount: number;
    currency: string;
    status: string;
    itemCount: number;
    items: Array<{ title: string; price: number; quantity: number }>;
    orderedAt: string;
  }>;
  dailySales: Array<{ date: string; orders: number; revenue: number }>;
}

interface SummaryData {
  period: { type: string; start: string; end: string };
  current: {
    orders: number;
    revenue: number;
    soldListings: number;
    listingRevenue: number;
  };
  comparison: {
    orders: number;
    revenue: number;
    ordersChange: string | null;
    revenueChange: string | null;
    trend: 'up' | 'down' | 'stable' | null;
  };
}

interface CategoryData {
  period: { days: number; since: string };
  categories: Array<{
    category: string;
    revenue: number;
    quantity: number;
    orders: number;
    revenuePercent: string;
  }>;
  totalRevenue: number;
}

interface ProfitData {
  period: { days: number; since: string };
  summary: {
    totalItems: number;
    totalCost: number;
    totalRevenue: number;
    totalFees: number;
    totalProfit: number;
    avgProfitRate: string;
  };
  byCategory: Array<{
    category: string;
    revenue: number;
    cost: number;
    profit: number;
    count: number;
    profitRate: string;
  }>;
  topProfitItems: Array<{
    title: string;
    profit: number;
    profitRate: string;
  }>;
}

const periodOptions = [
  { value: '7', label: '過去7日' },
  { value: '30', label: '過去30日' },
  { value: '90', label: '過去90日' },
];

export default function EbaySalesPage() {
  const [days, setDays] = useState('30');
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'profit'>('overview');

  // ダッシュボードデータ
  const { data: dashboard, isLoading, mutate } = useSWR<DashboardData>(
    `/api/ebay-sales/dashboard?days=${days}`,
    fetcher
  );

  // サマリーデータ
  const { data: summary } = useSWR<SummaryData>(
    `/api/ebay-sales/summary?period=${days === '7' ? 'week' : days === '30' ? 'month' : 'year'}`,
    fetcher
  );

  // カテゴリ別データ
  const { data: categoryData } = useSWR<CategoryData>(
    activeTab === 'categories' ? `/api/ebay-sales/by-category?days=${days}` : null,
    fetcher
  );

  // 利益分析データ
  const { data: profitData } = useSWR<ProfitData>(
    activeTab === 'profit' ? `/api/ebay-sales/profit?days=${days}` : null,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const stats = dashboard?.summary || {
    totalOrders: 0,
    totalRevenue: 0,
    totalItems: 0,
    avgOrderValue: 0,
    soldListings: 0,
  };

  const trend = summary?.comparison.trend;
  const revenueChange = summary?.comparison.revenueChange;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              eBay管理
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              売上レポート
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              eBay売上の分析・統計
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDays(option.value)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  days === option.value
                    ? 'bg-white dark:bg-zinc-700 shadow-sm font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => mutate()}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">総売上</p>
              <p className="text-xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              {revenueChange && (
                <div className="flex items-center gap-1 text-xs">
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <Minus className="h-3 w-3 text-zinc-400" />
                  )}
                  <span className={cn(
                    trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-zinc-400'
                  )}>
                    {revenueChange}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">注文数</p>
              <p className="text-xl font-bold">{stats.totalOrders}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">販売点数</p>
              <p className="text-xl font-bold">{stats.totalItems}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <BarChart3 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">平均注文額</p>
              <p className="text-xl font-bold">${stats.avgOrderValue.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Award className="h-5 w-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">売却済み</p>
              <p className="text-xl font-bold">{stats.soldListings}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'overview'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          )}
        >
          概要
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'categories'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          )}
        >
          カテゴリ別
        </button>
        <button
          onClick={() => setActiveTab('profit')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'profit'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          )}
        >
          利益分析
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">トップ売上商品</h3>
            {dashboard?.topProducts.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">データがありません</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.topProducts.slice(0, 5).map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700 text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{product.title}</p>
                        <p className="text-xs text-zinc-500">{product.category || 'カテゴリなし'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${product.revenue.toFixed(2)}</p>
                      <p className="text-xs text-zinc-500">{product.quantity}点</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Orders */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">最近の注文</h3>
            {dashboard?.recentOrders.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">注文がありません</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {order.items[0]?.title || 'Unknown'}
                        {order.itemCount > 1 && ` 他${order.itemCount - 1}点`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(order.orderedAt).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${order.amount.toFixed(2)}</p>
                      <Badge variant="outline" className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Daily Sales Chart (Simple) */}
          <Card className="p-4 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">日別売上推移</h3>
            {dashboard?.dailySales.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">データがありません</p>
            ) : (
              <div className="h-48 flex items-end gap-1">
                {dashboard?.dailySales
                  .slice()
                  .reverse()
                  .map((day, index) => {
                    const maxRevenue = Math.max(...(dashboard?.dailySales.map(d => d.revenue) || [1]));
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div
                        key={index}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${Math.max(height, 2)}%` }}
                          title={`$${day.revenue.toFixed(2)} (${day.orders}件)`}
                        />
                        <span className="text-xs text-zinc-400 rotate-45 origin-left">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'categories' && categoryData && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">カテゴリ別売上</h3>
          {categoryData.categories.length === 0 ? (
            <p className="text-zinc-500 text-center py-8">データがありません</p>
          ) : (
            <div className="space-y-3">
              {categoryData.categories.map((cat) => (
                <div key={cat.category} className="flex items-center gap-4">
                  <div className="w-32 font-medium truncate">{cat.category}</div>
                  <div className="flex-1">
                    <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${cat.revenuePercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-24 text-right font-semibold">
                    ${cat.revenue.toFixed(2)}
                  </div>
                  <div className="w-16 text-right text-sm text-zinc-500">
                    {cat.revenuePercent}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'profit' && profitData && (
        <div className="space-y-6">
          {/* Profit Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-sm text-emerald-600 dark:text-emerald-400">総利益</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                ${profitData.summary.totalProfit}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">平均利益率</p>
              <p className="text-2xl font-bold">{profitData.summary.avgProfitRate}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">総売上</p>
              <p className="text-2xl font-bold">${profitData.summary.totalRevenue}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">手数料合計</p>
              <p className="text-2xl font-bold text-red-600">${profitData.summary.totalFees}</p>
            </Card>
          </div>

          {/* Category Profit */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">カテゴリ別利益</h3>
            <div className="space-y-3">
              {profitData.byCategory.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div>
                    <p className="font-medium">{cat.category}</p>
                    <p className="text-xs text-zinc-500">{cat.count}件</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-semibold',
                      cat.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      ${cat.profit}
                    </p>
                    <p className="text-xs text-zinc-500">{cat.profitRate}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Profit Items */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">高利益商品 TOP10</h3>
            <div className="space-y-2">
              {profitData.topProfitItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-sm font-medium text-emerald-600">
                      {index + 1}
                    </div>
                    <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">${item.profit}</p>
                    <p className="text-xs text-zinc-500">{item.profitRate}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

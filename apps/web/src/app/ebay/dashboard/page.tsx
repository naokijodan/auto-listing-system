'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import Link from 'next/link';
import {
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Star,
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  Loader2,
  Settings,
  ChevronRight,
  Plus,
  Edit3,
  Sparkles,
  FileText,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Globe,
  Heart,
  Warehouse,
  LineChart,
  UserCircle,
  Bot,
  Megaphone,
  Tag,
  Languages,
  Beaker,
  PackagePlus,
  CalendarClock,
  FileStack,
  ExternalLink,
} from 'lucide-react';

interface Overview {
  sales: {
    today: number;
    todayChange: number;
    thisWeek: number;
    weekChange: number;
    thisMonth: number;
    monthChange: number;
    thisYear: number;
    yearChange: number;
  };
  orders: {
    today: number;
    pending: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  listings: {
    total: number;
    active: number;
    draft: number;
    ended: number;
    error: number;
    pendingPublish: number;
  };
  performance: {
    conversionRate: number;
    conversionChange: number;
    clickThroughRate: number;
    ctrChange: number;
    averageOrderValue: number;
    aovChange: number;
    returnRate: number;
    returnChange: number;
  };
  customers: {
    total: number;
    newThisMonth: number;
    repeatRate: number;
    averageLtv: number;
  };
  alerts: {
    lowStock: number;
    priceAlerts: number;
    pendingMessages: number;
    pendingReturns: number;
    feedbackNeeded: number;
  };
  scores: {
    sellerLevel: string;
    feedbackScore: number;
    feedbackPositive: number;
    feedbackNeutral: number;
    feedbackNegative: number;
    defectRate: number;
    lateShipmentRate: number;
    trackingUploadRate: number;
  };
}

interface KPI {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  changeType: string;
  trend: string;
  target: number;
  progress: number;
}

interface Alert {
  type: string;
  severity: string;
  count: number;
  message: string;
  href: string;
}

interface SalesChartData {
  period: string;
  dataPoints: Array<{
    date: string;
    revenue: number;
    orders: number;
    profit: number;
  }>;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalProfit: number;
    averageDaily: number;
  };
}

interface TopSeller {
  id: string;
  title: string;
  sku: string;
  imageUrl: string;
  totalSales: number;
  revenue: number;
  avgPrice: number;
  trend: string;
  trendValue: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerCountry: string;
  items: number;
  total: string;
  status: string;
  createdAt: string;
}

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  href?: string;
  action?: string;
}

interface FeatureLink {
  id: string;
  name: string;
  icon: string;
  href: string;
  count?: number;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  Edit3,
  RefreshCw,
  ShoppingCart,
  MessageSquare,
  Sparkles,
  FileText,
  BarChart3,
  Package,
  FileStack,
  TrendingUp,
  RotateCcw,
  Star,
  Users,
  Zap,
  CalendarClock,
  PackagePlus,
  Beaker,
  Languages,
  Tag,
  Megaphone,
  Bot,
  Globe,
  UserCircle,
  LineChart,
  Warehouse,
  Heart,
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
};

const severityColors: Record<string, string> = {
  error: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
};

export default function EbayDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'kpi' | 'alerts' | 'features'>('overview');
  const [chartPeriod, setChartPeriod] = useState('7d');
  const [isExecutingAction, setIsExecutingAction] = useState<string | null>(null);

  const { data: overview, isLoading: overviewLoading, mutate: mutateOverview } = useSWR<Overview>(
    '/api/ebay-dashboard/overview',
    fetcher
  );

  const { data: kpiData } = useSWR<{ kpis: KPI[] }>(
    '/api/ebay-dashboard/kpi-summary',
    fetcher
  );

  const { data: alertsData } = useSWR<{ alerts: Alert[]; summary: { critical: number; warnings: number; info: number } }>(
    '/api/ebay-dashboard/alerts-summary',
    fetcher
  );

  const { data: salesChart } = useSWR<SalesChartData>(
    `/api/ebay-dashboard/sales-chart?period=${chartPeriod}`,
    fetcher
  );

  const { data: topSellersData } = useSWR<{ topSellers: TopSeller[] }>(
    '/api/ebay-dashboard/top-sellers?limit=5',
    fetcher
  );

  const { data: recentOrdersData } = useSWR<{ orders: RecentOrder[] }>(
    '/api/ebay-dashboard/recent-orders?limit=5',
    fetcher
  );

  const { data: quickActions } = useSWR<QuickAction[]>(
    '/api/ebay-dashboard/quick-actions',
    fetcher
  );

  const { data: featureLinks } = useSWR<FeatureLink[]>(
    '/api/ebay-dashboard/feature-links',
    fetcher
  );

  const handleQuickAction = async (action: QuickAction) => {
    if (action.href) {
      window.location.href = action.href;
      return;
    }

    if (action.action) {
      setIsExecutingAction(action.id);
      try {
        const result = await postApi(`/api/ebay-dashboard/quick-actions/${action.id}`, {});
        addToast({ type: 'success', message: (result as { message: string }).message });
      } catch {
        addToast({ type: 'error', message: 'アクションの実行に失敗しました' });
      } finally {
        setIsExecutingAction(null);
      }
    }
  };

  const tabs = [
    { id: 'overview', name: '概要', icon: LayoutDashboard },
    { id: 'kpi', name: 'KPI', icon: Target },
    { id: 'alerts', name: 'アラート', icon: AlertTriangle, count: alertsData?.summary.critical },
    { id: 'features', name: '機能一覧', icon: Package },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">eBayダッシュボード</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              統合ビュー
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutateOverview()}
          disabled={overviewLoading}
        >
          <RefreshCw className={cn('h-4 w-4 mr-1', overviewLoading && 'animate-spin')} />
          更新
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">今月売上</p>
                  <p className="text-2xl font-bold">${overview?.sales.thisMonth.toLocaleString()}</p>
                </div>
                <div className={cn(
                  'flex items-center text-sm',
                  (overview?.sales.monthChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {(overview?.sales.monthChange ?? 0) >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(overview?.sales.monthChange ?? 0)}%
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">今日の注文</p>
                  <p className="text-2xl font-bold">{overview?.orders.today}</p>
                </div>
                <ShoppingCart className="h-6 w-6 text-blue-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">アクティブ出品</p>
                  <p className="text-2xl font-bold">{overview?.listings.active}</p>
                </div>
                <Package className="h-6 w-6 text-emerald-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">コンバージョン</p>
                  <p className="text-2xl font-bold">{overview?.performance.conversionRate}%</p>
                </div>
                <div className={cn(
                  'flex items-center text-sm',
                  (overview?.performance.conversionChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {(overview?.performance.conversionChange ?? 0) >= 0 ? '+' : ''}{overview?.performance.conversionChange}%
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">フィードバック</p>
                  <p className="text-2xl font-bold">{overview?.scores.feedbackScore}%</p>
                </div>
                <Star className="h-6 w-6 text-amber-500" />
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">要対応</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {(overview?.alerts.lowStock ?? 0) + (overview?.alerts.pendingMessages ?? 0) + (overview?.alerts.pendingReturns ?? 0)}
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Sales Chart */}
            <Card className="col-span-2 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">売上推移</h3>
                <div className="flex gap-1">
                  {['7d', '30d', '90d'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setChartPeriod(period)}
                      className={cn(
                        'px-2 py-1 text-xs rounded',
                        chartPeriod === period
                          ? 'bg-blue-500 text-white'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      )}
                    >
                      {period === '7d' ? '7日' : period === '30d' ? '30日' : '90日'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple Chart Visualization */}
              <div className="h-48 flex items-end gap-1">
                {salesChart?.dataPoints.slice(-14).map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: `${(point.revenue / 2000) * 100}%` }}
                    title={`${point.date}: $${point.revenue}`}
                  />
                ))}
              </div>

              <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-zinc-500">総売上</p>
                  <p className="font-semibold">${salesChart?.summary.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">総注文</p>
                  <p className="font-semibold">{salesChart?.summary.totalOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">総利益</p>
                  <p className="font-semibold">${salesChart?.summary.totalProfit.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">日平均</p>
                  <p className="font-semibold">${salesChart?.summary.averageDaily.toFixed(0)}</p>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">クイックアクション</h3>
              <div className="grid grid-cols-2 gap-2">
                {quickActions?.map((action) => {
                  const Icon = iconMap[action.icon] || Plus;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      disabled={isExecutingAction === action.id}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
                    >
                      {isExecutingAction === action.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <Icon className="h-5 w-5 text-blue-500" />
                      )}
                      <span className="text-xs text-center">{action.name}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Bottom Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Top Sellers */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">トップセラー</h3>
                <Link href="/ebay/analytics" className="text-xs text-blue-500 hover:underline">
                  詳細
                </Link>
              </div>
              <div className="space-y-3">
                {topSellersData?.topSellers.map((product, i) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-400 w-4">{i + 1}</span>
                    <img
                      src={product.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{product.title}</p>
                      <p className="text-xs text-zinc-500">${product.revenue.toLocaleString()}</p>
                    </div>
                    <div className={cn(
                      'flex items-center text-xs',
                      product.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {product.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {product.trendValue}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Orders */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">最近の注文</h3>
                <Link href="/ebay/orders" className="text-xs text-blue-500 hover:underline">
                  すべて
                </Link>
              </div>
              <div className="space-y-3">
                {recentOrdersData?.orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-xs text-zinc-500">{order.buyerName} • {order.buyerCountry}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">${order.total}</p>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        statusColors[order.status] || 'bg-zinc-100'
                      )}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Seller Status */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">セラーステータス</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">セラーレベル</span>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-sm rounded font-medium">
                    {overview?.scores.sellerLevel}
                  </span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>フィードバックスコア</span>
                    <span>{overview?.scores.feedbackScore}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${overview?.scores.feedbackScore}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>不良率</span>
                    <span>{overview?.scores.defectRate}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(overview?.scores.defectRate ?? 0) * 20}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>追跡番号アップロード率</span>
                    <span>{overview?.scores.trackingUploadRate}%</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${overview?.scores.trackingUploadRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* KPI Tab */}
      {activeTab === 'kpi' && (
        <div className="grid grid-cols-3 gap-4">
          {kpiData?.kpis.map((kpi) => (
            <Card key={kpi.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{kpi.name}</h4>
                <div className={cn(
                  'flex items-center text-sm',
                  kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-zinc-500'
                )}>
                  {kpi.trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
                  {kpi.trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
                  {kpi.changeType === 'percent' ? `${kpi.change}%` : kpi.change}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold">{kpi.value.toLocaleString()}</span>
                <span className="text-zinc-500">{kpi.unit}</span>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-500">目標: {kpi.target.toLocaleString()} {kpi.unit}</span>
                  <span className="text-zinc-700">{kpi.progress.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full',
                      kpi.progress >= 100 ? 'bg-emerald-500' : kpi.progress >= 80 ? 'bg-blue-500' : 'bg-amber-500'
                    )}
                    style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Alert Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-red-600">クリティカル</p>
                  <p className="text-2xl font-bold text-red-700">{alertsData?.summary.critical}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm text-amber-600">警告</p>
                  <p className="text-2xl font-bold text-amber-700">{alertsData?.summary.warnings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-blue-600">情報</p>
                  <p className="text-2xl font-bold text-blue-700">{alertsData?.summary.info}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Alert List */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">アラート一覧</h3>
            <div className="space-y-3">
              {alertsData?.alerts.map((alert, i) => (
                <Link
                  key={i}
                  href={alert.href}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors hover:opacity-80',
                    severityColors[alert.severity]
                  )}
                >
                  <div className="flex items-center gap-3">
                    {alert.severity === 'error' && <XCircle className="h-5 w-5" />}
                    {alert.severity === 'warning' && <AlertTriangle className="h-5 w-5" />}
                    {alert.severity === 'info' && <Clock className="h-5 w-5" />}
                    <div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs opacity-70">{alert.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{alert.count}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-4 gap-4">
          {featureLinks?.map((feature) => {
            const Icon = iconMap[feature.icon] || Package;
            return (
              <Link
                key={feature.id}
                href={feature.href}
                className="block"
              >
                <Card className="p-4 hover:border-blue-500 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="font-medium">{feature.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {feature.count !== undefined && (
                        <span className="px-2 py-0.5 text-xs bg-zinc-100 rounded-full">
                          {feature.count}
                        </span>
                      )}
                      <ExternalLink className="h-4 w-4 text-zinc-400" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

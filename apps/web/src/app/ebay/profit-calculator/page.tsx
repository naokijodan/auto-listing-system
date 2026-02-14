'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Calculator,
  RefreshCw,
  Settings,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Percent,
  Package,
  Target,
  ArrowRight,
  FileText,
  CreditCard,
  Truck,
  Globe,
  BarChart3,
  PieChart,
} from 'lucide-react';

interface Dashboard {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalFees: number;
    totalShipping: number;
    totalProfit: number;
    profitMargin: string;
    orderCount: number;
    averageOrderValue: string;
    averageProfit: string;
  };
  feeBreakdown: {
    finalValue: number;
    paypal: number;
    promoted: number;
    insertion: number;
    international: number;
  };
  profitByCategory: Array<{
    category: string;
    revenue: number;
    profit: number;
    margin: string;
    count: number;
  }>;
  trend: Array<{
    date: string;
    revenue: number;
    cost: number;
    fees: number;
    profit: number;
  }>;
  topProfitProducts: Array<{
    id: string;
    title: string;
    profit: number;
    profitMargin: number;
  }>;
  lowProfitProducts: Array<{
    id: string;
    title: string;
    profit: number;
    profitMargin: number;
  }>;
}

interface CategoryRate {
  category: string;
  finalValueRate: string;
  promotedRate: string;
}

interface CalculationResult {
  fees: Record<string, number>;
  totalFees: number;
  breakdown: {
    salePrice: number;
    cost: number;
    grossProfit: number;
    shippingCost: number;
    shippingCharged: number;
    shippingProfit: number;
    totalFees: number;
    netProfit: number;
  };
  metrics: {
    profitMargin: string;
    roi: string;
    breakEvenPrice: string;
  };
}

interface Goals {
  monthly: {
    revenue: { target: number; current: number; progress: number };
    profit: { target: number; current: number; progress: number };
    margin: { target: number; current: number; progress: number };
    orders: { target: number; current: number; progress: number };
  };
}

export default function EbayProfitCalculatorPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calculator' | 'products' | 'currency' | 'goals'>('dashboard');

  // Calculator state
  const [calcForm, setCalcForm] = useState({
    salePrice: '',
    cost: '',
    shippingCost: '',
    shippingCharged: '',
    category: 'Electronics',
    isPromoted: false,
    isInternational: false,
  });
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<Dashboard>(
    '/api/ebay-profit-calculator/dashboard',
    fetcher
  );

  const { data: categoryRates } = useSWR<CategoryRate[]>(
    '/api/ebay-profit-calculator/category-rates',
    fetcher
  );

  const { data: goals } = useSWR<Goals>(
    '/api/ebay-profit-calculator/goals',
    fetcher
  );

  const { data: exchangeRates } = useSWR<{ rates: Record<string, number> }>(
    '/api/ebay-profit-calculator/exchange-rates',
    fetcher
  );

  const handleCalculate = async () => {
    if (!calcForm.salePrice || !calcForm.cost) {
      addToast({ type: 'error', message: '販売価格と原価を入力してください' });
      return;
    }

    setIsCalculating(true);
    try {
      const result = await postApi('/api/ebay-profit-calculator/calculate', {
        salePrice: parseFloat(calcForm.salePrice),
        cost: parseFloat(calcForm.cost),
        shippingCost: parseFloat(calcForm.shippingCost || '0'),
        shippingCharged: parseFloat(calcForm.shippingCharged || '0'),
        category: calcForm.category,
        isPromoted: calcForm.isPromoted,
        isInternational: calcForm.isInternational,
      });
      setCalcResult(result as CalculationResult);
    } catch {
      addToast({ type: 'error', message: '計算に失敗しました' });
    } finally {
      setIsCalculating(false);
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'ダッシュボード', icon: BarChart3 },
    { id: 'calculator', name: '利益計算', icon: Calculator },
    { id: 'products', name: '商品別利益', icon: Package },
    { id: 'currency', name: '為替影響', icon: Globe },
    { id: 'goals', name: '目標', icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">利益計算</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              eBay手数料・利益分析
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutateDashboard()}
          disabled={dashboardLoading}
        >
          <RefreshCw className={cn('h-4 w-4', dashboardLoading && 'animate-spin')} />
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
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">総売上</p>
                  <p className="text-2xl font-bold">${dashboard?.summary.totalRevenue.toLocaleString()}</p>
                </div>
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">総原価</p>
                  <p className="text-2xl font-bold">${dashboard?.summary.totalCost.toLocaleString()}</p>
                </div>
                <CreditCard className="h-6 w-6 text-red-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">総手数料</p>
                  <p className="text-2xl font-bold">${dashboard?.summary.totalFees.toFixed(0)}</p>
                </div>
                <Percent className="h-6 w-6 text-amber-500" />
              </div>
            </Card>
            <Card className="p-4 bg-emerald-50 border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600">純利益</p>
                  <p className="text-2xl font-bold text-emerald-700">${dashboard?.summary.totalProfit.toFixed(0)}</p>
                </div>
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">利益率</p>
                  <p className="text-2xl font-bold">{dashboard?.summary.profitMargin}%</p>
                </div>
                <PieChart className="h-6 w-6 text-purple-500" />
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Profit Trend */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">利益推移（30日間）</h3>
              <div className="h-48 flex items-end gap-1">
                {dashboard?.trend.slice(-30).map((point, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors"
                    style={{ height: `${(point.profit / 200) * 100}%` }}
                    title={`${point.date}: $${point.profit}`}
                  />
                ))}
              </div>
            </Card>

            {/* Fee Breakdown */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">手数料内訳</h3>
              <div className="space-y-3">
                {dashboard?.feeBreakdown && (
                  <>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>落札手数料</span>
                        <span className="font-medium">${dashboard.feeBreakdown.finalValue.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: `${(dashboard.feeBreakdown.finalValue / dashboard.summary.totalFees) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>PayPal手数料</span>
                        <span className="font-medium">${dashboard.feeBreakdown.paypal.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500" style={{ width: `${(dashboard.feeBreakdown.paypal / dashboard.summary.totalFees) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>広告手数料</span>
                        <span className="font-medium">${dashboard.feeBreakdown.promoted.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${(dashboard.feeBreakdown.promoted / dashboard.summary.totalFees) * 100}%` }} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Category Profit & Top/Low Products */}
          <div className="grid grid-cols-3 gap-6">
            {/* Category Profit */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">カテゴリ別利益</h3>
              <div className="space-y-3">
                {dashboard?.profitByCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cat.category}</p>
                      <p className="text-xs text-zinc-500">{cat.count}件</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-emerald-600">${cat.profit.toFixed(0)}</p>
                      <p className="text-xs text-zinc-500">{cat.margin}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Profit */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                高利益商品
              </h3>
              <div className="space-y-2">
                {dashboard?.topProfitProducts.map((prod, i) => (
                  <div key={prod.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 w-4">{i + 1}</span>
                      <span className="text-sm truncate max-w-32">{prod.title}</span>
                    </div>
                    <span className="font-medium text-emerald-600">${prod.profit.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Low Profit */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                低利益商品
              </h3>
              <div className="space-y-2">
                {dashboard?.lowProfitProducts.map((prod, i) => (
                  <div key={prod.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 w-4">{i + 1}</span>
                      <span className="text-sm truncate max-w-32">{prod.title}</span>
                    </div>
                    <span className={cn(
                      'font-medium',
                      prod.profit < 0 ? 'text-red-600' : 'text-amber-600'
                    )}>
                      ${prod.profit.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-2 gap-6">
          {/* Input Form */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">利益計算</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">販売価格 ($)</label>
                <input
                  type="number"
                  value={calcForm.salePrice}
                  onChange={(e) => setCalcForm(prev => ({ ...prev, salePrice: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">原価 ($)</label>
                <input
                  type="number"
                  value={calcForm.cost}
                  onChange={(e) => setCalcForm(prev => ({ ...prev, cost: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">送料原価 ($)</label>
                  <input
                    type="number"
                    value={calcForm.shippingCost}
                    onChange={(e) => setCalcForm(prev => ({ ...prev, shippingCost: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">送料請求額 ($)</label>
                  <input
                    type="number"
                    value={calcForm.shippingCharged}
                    onChange={(e) => setCalcForm(prev => ({ ...prev, shippingCharged: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">カテゴリ</label>
                <select
                  value={calcForm.category}
                  onChange={(e) => setCalcForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {categoryRates?.map((cat) => (
                    <option key={cat.category} value={cat.category}>
                      {cat.category} (手数料: {cat.finalValueRate}%)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calcForm.isPromoted}
                    onChange={(e) => setCalcForm(prev => ({ ...prev, isPromoted: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">広告出品</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={calcForm.isInternational}
                    onChange={(e) => setCalcForm(prev => ({ ...prev, isInternational: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">国際取引</span>
                </label>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleCalculate}
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                計算する
              </Button>
            </div>
          </Card>

          {/* Results */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">計算結果</h3>
            {calcResult ? (
              <div className="space-y-6">
                {/* Main Result */}
                <div className="text-center p-6 bg-emerald-50 rounded-lg">
                  <p className="text-sm text-emerald-600 mb-1">純利益</p>
                  <p className={cn(
                    'text-4xl font-bold',
                    calcResult.breakdown.netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                  )}>
                    ${calcResult.breakdown.netProfit.toFixed(2)}
                  </p>
                  <p className="text-sm text-emerald-600 mt-2">
                    利益率: {calcResult.metrics.profitMargin}% / ROI: {calcResult.metrics.roi}%
                  </p>
                </div>

                {/* Breakdown */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>販売価格</span>
                    <span className="font-medium">${calcResult.breakdown.salePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>原価</span>
                    <span className="font-medium text-red-600">-${calcResult.breakdown.cost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span>粗利益</span>
                    <span className="font-medium">${calcResult.breakdown.grossProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>送料利益</span>
                    <span className={cn('font-medium', calcResult.breakdown.shippingProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {calcResult.breakdown.shippingProfit >= 0 ? '+' : ''}${calcResult.breakdown.shippingProfit.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Fees */}
                <div className="space-y-2 border-t pt-4">
                  <p className="text-sm font-medium">手数料内訳</p>
                  {Object.entries(calcResult.fees).map(([key, value]) => (
                    value > 0 && (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-zinc-500">{key}</span>
                        <span className="text-red-600">-${value.toFixed(2)}</span>
                      </div>
                    )
                  ))}
                  <div className="flex justify-between text-sm font-medium border-t pt-2">
                    <span>手数料合計</span>
                    <span className="text-red-600">-${calcResult.totalFees.toFixed(2)}</span>
                  </div>
                </div>

                {/* Break Even */}
                <div className="p-3 bg-zinc-50 rounded-lg">
                  <p className="text-sm text-zinc-600">
                    損益分岐価格: <span className="font-medium">${calcResult.metrics.breakEvenPrice}</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
                <p>左のフォームに入力して計算してください</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">商品別利益</h3>
          <p className="text-sm text-zinc-500 text-center py-8">
            ダッシュボードタブで商品別利益を確認できます
          </p>
        </Card>
      )}

      {/* Currency Tab */}
      {activeTab === 'currency' && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">現在の為替レート</h3>
            <div className="space-y-3">
              {exchangeRates?.rates && Object.entries(exchangeRates.rates).map(([currency, rate]) => (
                <div key={currency} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <span className="font-medium">USD/{currency}</span>
                  <span className="text-lg font-bold">{rate}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">為替影響シミュレーション</h3>
            <p className="text-sm text-zinc-500">
              JPY/USDレートが変動した場合の利益への影響を分析します
            </p>
            <div className="mt-4 space-y-2">
              {[-10, -5, 0, 5, 10].map((change) => (
                <div key={change} className="flex items-center justify-between p-2 rounded">
                  <span>{change > 0 ? '+' : ''}{change}%</span>
                  <span className={cn(
                    'font-medium',
                    change > 0 ? 'text-emerald-600' : change < 0 ? 'text-red-600' : ''
                  )}>
                    利益影響: {change > 0 ? '+' : ''}{(change * 0.85).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">月間目標</h3>
            <div className="space-y-4">
              {goals?.monthly && Object.entries(goals.monthly).map(([key, goal]) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="capitalize">{key === 'revenue' ? '売上' : key === 'profit' ? '利益' : key === 'margin' ? '利益率' : '注文数'}</span>
                    <span>
                      {key === 'margin' ? `${goal.current}%` : `$${goal.current.toLocaleString()}`} /
                      {key === 'margin' ? ` ${goal.target}%` : ` $${goal.target.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full',
                        goal.progress >= 100 ? 'bg-emerald-500' : goal.progress >= 70 ? 'bg-blue-500' : 'bg-amber-500'
                      )}
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 text-right mt-1">{goal.progress.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-4">目標設定</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">月間売上目標 ($)</label>
                <input type="number" defaultValue={50000} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">月間利益目標 ($)</label>
                <input type="number" defaultValue={15000} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">目標利益率 (%)</label>
                <input type="number" defaultValue={30} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <Button variant="primary" className="w-full">
                目標を保存
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

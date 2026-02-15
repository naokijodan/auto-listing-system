'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  Settings,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ShoppingCart,
  Clock,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type TabType = 'dashboard' | 'forecasts' | 'reorder' | 'seasonality' | 'optimization' | 'settings';

export default function InventoryForecastingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'forecasts' as const, label: '予測管理', icon: TrendingUp },
    { id: 'reorder' as const, label: '再注文', icon: ShoppingCart },
    { id: 'seasonality' as const, label: '季節性分析', icon: Calendar },
    { id: 'optimization' as const, label: '最適化', icon: RefreshCw },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">在庫予測</h1>
          <p className="text-zinc-500">需要予測と在庫最適化</p>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'forecasts' && <ForecastsTab />}
      {activeTab === 'reorder' && <ReorderTab />}
      {activeTab === 'seasonality' && <SeasonalityTab />}
      {activeTab === 'optimization' && <OptimizationTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading } = useSWR('/api/ebay-inventory-forecasting/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総商品数</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.totalProducts ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">低在庫アラート</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.lowStockAlerts ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">予測精度</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.forecastAccuracy ?? 0}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">平均回転日数</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.avgTurnoverDays ?? 0}日</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ヘルススコア */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">在庫ヘルススコア</h3>
          <span className={`text-2xl font-bold ${
            (dashboard?.healthScore?.score ?? 0) >= 80 ? 'text-green-600' :
            (dashboard?.healthScore?.score ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {dashboard?.healthScore?.score ?? 0}/100
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dashboard?.healthScore?.factors?.map((factor: { factor: string; score: number; weight: number }) => (
            <div key={factor.factor} className="text-center">
              <p className="text-sm text-zinc-500">{factor.factor}</p>
              <p className="font-medium">{factor.score}</p>
              <div className="w-full bg-zinc-200 rounded-full h-2 mt-1">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${factor.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* アラート */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">アクティブアラート</h3>
        <div className="space-y-3">
          {dashboard?.alerts?.map((alert: { id: string; type: string; product: string; urgency: string; currentStock?: number; reorderPoint?: number; daysUntilStockout?: number }) => (
            <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${
              alert.urgency === 'critical' ? 'bg-red-50' :
              alert.urgency === 'high' ? 'bg-amber-50' : 'bg-zinc-50'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.urgency === 'critical' ? 'text-red-600' :
                  alert.urgency === 'high' ? 'text-amber-600' : 'text-zinc-600'
                }`} />
                <div>
                  <p className="font-medium">{alert.product}</p>
                  <p className="text-sm text-zinc-500">{alert.type}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">対処</Button>
            </div>
          ))}
        </div>
      </Card>

      {/* 再注文推奨 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">再注文推奨</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">商品</th>
                <th className="text-right py-2">現在庫</th>
                <th className="text-right py-2">推奨数量</th>
                <th className="text-right py-2">リードタイム</th>
                <th className="text-left py-2">緊急度</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.reorderRecommendations?.map((rec: { productId: string; product: string; currentStock: number; suggestedQty: number; leadTime: number; urgency: string }) => (
                <tr key={rec.productId} className="border-b">
                  <td className="py-2">{rec.product}</td>
                  <td className="py-2 text-right">{rec.currentStock}</td>
                  <td className="py-2 text-right">{rec.suggestedQty}</td>
                  <td className="py-2 text-right">{rec.leadTime}日</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.urgency === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{rec.urgency}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ForecastsTab() {
  const { data, isLoading } = useSWR('/api/ebay-inventory-forecasting/forecasts', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="商品を検索..."
              className="pl-10 pr-4 py-2 border rounded-lg w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            フィルター
          </Button>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          一括再計算
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">商品</th>
                <th className="text-right py-2">現在庫</th>
                <th className="text-right py-2">7日予測</th>
                <th className="text-right py-2">30日予測</th>
                <th className="text-right py-2">信頼度</th>
                <th className="text-left py-2">リスク</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: { id: string; product: { title: string }; currentStock: number; forecast: { next7Days: number; next30Days: number; confidence: number }; riskLevel: string }) => (
                <tr key={item.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{item.product.title}</td>
                  <td className="py-2 text-right">{item.currentStock}</td>
                  <td className="py-2 text-right">{item.forecast.next7Days}</td>
                  <td className="py-2 text-right">{item.forecast.next30Days}</td>
                  <td className="py-2 text-right">{(item.forecast.confidence * 100).toFixed(0)}%</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                      item.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>{item.riskLevel}</span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><RefreshCw className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReorderTab() {
  const { data, isLoading } = useSWR('/api/ebay-inventory-forecasting/reorder/recommendations', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">推奨アイテム</p>
          <p className="text-2xl font-bold">{data?.summary?.totalItems ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">推定総コスト</p>
          <p className="text-2xl font-bold">${data?.summary?.totalCost?.toFixed(2) ?? '0.00'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">緊急アイテム</p>
          <p className="text-2xl font-bold text-red-600">{data?.summary?.criticalItems ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">高優先度</p>
          <p className="text-2xl font-bold text-amber-600">{data?.summary?.highPriorityItems ?? 0}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">再注文推奨</h3>
          <Button size="sm">
            <ShoppingCart className="h-4 w-4 mr-1" />
            一括発注
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">商品</th>
                <th className="text-left py-2">サプライヤー</th>
                <th className="text-right py-2">現在庫</th>
                <th className="text-right py-2">推奨数量</th>
                <th className="text-right py-2">コスト</th>
                <th className="text-left py-2">緊急度</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: { id: string; product: { title: string }; supplier: { name: string }; currentStock: number; suggestedQty: number; totalCost: number; urgency: string }) => (
                <tr key={item.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{item.product.title}</td>
                  <td className="py-2">{item.supplier.name}</td>
                  <td className="py-2 text-right">{item.currentStock}</td>
                  <td className="py-2 text-right">{item.suggestedQty}</td>
                  <td className="py-2 text-right">${item.totalCost.toFixed(2)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.urgency === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.urgency}</span>
                  </td>
                  <td className="py-2">
                    <Button variant="outline" size="sm">発注</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SeasonalityTab() {
  const { data, isLoading } = useSWR('/api/ebay-inventory-forecasting/seasonality', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">四半期別パターン</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.patterns?.map((pattern: { period: string; index: number; description: string }) => (
            <div key={pattern.period} className="text-center p-4 bg-zinc-50 rounded-lg">
              <p className="text-lg font-bold">{pattern.period}</p>
              <p className={`text-2xl font-bold ${pattern.index > 1 ? 'text-green-600' : 'text-amber-600'}`}>
                {pattern.index > 1 ? '+' : ''}{((pattern.index - 1) * 100).toFixed(0)}%
              </p>
              <p className="text-sm text-zinc-500">{pattern.description}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">月別指数</h3>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
          {data?.monthly?.map((month: { month: string; index: number }) => (
            <div key={month.month} className="text-center p-2 border rounded">
              <p className="text-sm font-medium">{month.month}</p>
              <p className={`font-bold ${month.index > 1 ? 'text-green-600' : 'text-amber-600'}`}>
                {month.index.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">主要イベント</h3>
        <div className="space-y-3">
          {data?.events?.map((event: { event: string; date: string; impactMultiplier: number }) => (
            <div key={event.event} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <div>
                <p className="font-medium">{event.event}</p>
                <p className="text-sm text-zinc-500">{event.date}</p>
              </div>
              <span className="text-lg font-bold text-green-600">x{event.impactMultiplier}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OptimizationTab() {
  const { data: suggestions, isLoading: suggestionsLoading } = useSWR('/api/ebay-inventory-forecasting/optimization/suggestions', fetcher);
  const { data: abc, isLoading: abcLoading } = useSWR('/api/ebay-inventory-forecasting/optimization/abc-analysis', fetcher);

  if (suggestionsLoading || abcLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">最適化提案</h3>
        <div className="space-y-3">
          {suggestions?.map((sug: { id: string; type: string; product: { title: string }; currentValue: number; suggestedValue: number; impact: { costSaving: number }; confidence: number }) => (
            <div key={sug.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">{sug.product.title}</p>
                <p className="text-sm text-zinc-500">{sug.type}: {sug.currentValue} → {sug.suggestedValue}</p>
                <p className="text-sm">
                  予想効果: <span className={sug.impact.costSaving > 0 ? 'text-green-600' : 'text-red-600'}>
                    ${Math.abs(sug.impact.costSaving)}
                    {sug.impact.costSaving > 0 ? ' 節約' : ' 追加'}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">信頼度: {(sug.confidence * 100).toFixed(0)}%</span>
                <Button variant="outline" size="sm">適用</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">ABC分析</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-600">クラスA</p>
            <p className="text-2xl font-bold">{abc?.summary?.classA?.count ?? 0}</p>
            <p className="text-sm text-zinc-500">収益 {abc?.summary?.classA?.revenueShare ?? 0}%</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-lg font-bold text-amber-600">クラスB</p>
            <p className="text-2xl font-bold">{abc?.summary?.classB?.count ?? 0}</p>
            <p className="text-sm text-zinc-500">収益 {abc?.summary?.classB?.revenueShare ?? 0}%</p>
          </div>
          <div className="text-center p-4 bg-zinc-50 rounded-lg">
            <p className="text-lg font-bold text-zinc-600">クラスC</p>
            <p className="text-2xl font-bold">{abc?.summary?.classC?.count ?? 0}</p>
            <p className="text-sm text-zinc-500">収益 {abc?.summary?.classC?.revenueShare ?? 0}%</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data: forecastSettings, isLoading: forecastLoading } = useSWR('/api/ebay-inventory-forecasting/settings/forecasting', fetcher);
  const { data: reorderSettings, isLoading: reorderLoading } = useSWR('/api/ebay-inventory-forecasting/settings/reorder', fetcher);

  if (forecastLoading || reorderLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">予測設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">モデルタイプ</span>
            <span className="text-sm font-medium">{forecastSettings?.model?.type ?? 'ensemble'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">予測期間</span>
            <span className="text-sm font-medium">{forecastSettings?.parameters?.forecastHorizon ?? 30}日</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">信頼度レベル</span>
            <span className="text-sm font-medium">{(forecastSettings?.parameters?.confidenceLevel ?? 0.95) * 100}%</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            予測設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">再注文設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">安全在庫日数</span>
            <span className="text-sm font-medium">{reorderSettings?.defaults?.safetyStockDays ?? 7}日</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">自動発注</span>
            <span className="text-sm font-medium">{reorderSettings?.autoReorder?.enabled ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">承認必要</span>
            <span className="text-sm font-medium">{reorderSettings?.autoReorder?.approvalRequired ? 'はい' : 'いいえ'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            再注文設定
          </Button>
        </div>
      </Card>
    </div>
  );
}

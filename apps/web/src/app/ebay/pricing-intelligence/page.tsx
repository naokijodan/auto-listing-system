// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Bell,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle,
  Info,
  BarChart3,
  Settings,
  FileText,
  Lightbulb,
  History,
  Target,
} from 'lucide-react';

type TabType = 'dashboard' | 'analysis' | 'competitors' | 'alerts' | 'recommendations' | 'settings';

export default function PricingIntelligencePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'analysis' as const, label: '価格分析', icon: Search },
    { id: 'competitors' as const, label: '競合追跡', icon: Users },
    { id: 'alerts' as const, label: 'アラート', icon: Bell },
    { id: 'recommendations' as const, label: '推奨', icon: Lightbulb },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">価格インテリジェンス</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">価格分析・競合追跡・最適化</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'analysis' && <AnalysisTab />}
        {activeTab === 'competitors' && <CompetitorsTab />}
        {activeTab === 'alerts' && <AlertsTab />}
        {activeTab === 'recommendations' && <RecommendationsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data, isLoading } = useSWR('/api/ebay-pricing-intelligence/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const dashboard = data || {
    overview: { totalProducts: 0, trackedCompetitors: 0, priceAlertsActive: 0 },
    pricePosition: { belowMarket: 0, atMarket: 0, aboveMarket: 0, averageDeviation: 0 },
    recentChanges: { last24h: { increases: 0, decreases: 0, avgChange: 0 } },
    alerts: { critical: 0, warning: 0, info: 0 },
    trends: [],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">追跡商品</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.totalProducts.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">追跡競合</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.trackedCompetitors}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">アクティブアラート</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.priceAlertsActive}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">平均偏差</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.pricePosition.averageDeviation}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">価格ポジション</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-green-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">市場より低い</span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">{dashboard.pricePosition.belowMarket}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">市場同等</span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">{dashboard.pricePosition.atMarket}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-red-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">市場より高い</span>
              </div>
              <span className="font-semibold text-zinc-900 dark:text-white">{dashboard.pricePosition.aboveMarket}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">アラートサマリー</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">重要</span>
              </div>
              <span className="font-semibold text-red-600">{dashboard.alerts.critical}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">警告</span>
              </div>
              <span className="font-semibold text-amber-600">{dashboard.alerts.warning}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">情報</span>
              </div>
              <span className="font-semibold text-blue-600">{dashboard.alerts.info}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">価格トレンド (7日間)</h3>
        <div className="h-48 flex items-end gap-2">
          {dashboard.trends.map((trend: { date: string; avgPrice: number; competitorAvg: number }, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 justify-center">
                <div
                  className="w-3 bg-emerald-500 rounded-t"
                  style={{ height: `${(trend.avgPrice / 50) * 100}px` }}
                  title={`自社: $${trend.avgPrice}`}
                />
                <div
                  className="w-3 bg-blue-400 rounded-t"
                  style={{ height: `${(trend.competitorAvg / 50) * 100}px` }}
                  title={`競合: $${trend.competitorAvg}`}
                />
              </div>
              <span className="text-xs text-zinc-500">{trend.date.slice(5)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">自社平均</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">競合平均</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AnalysisTab() {
  const { data, isLoading } = useSWR('/api/ebay-pricing-intelligence/analysis', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="商品を検索..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
          />
        </div>
        <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
          <option value="">すべてのポジション</option>
          <option value="below">市場より低い</option>
          <option value="at">市場同等</option>
          <option value="above">市場より高い</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">商品</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">現在価格</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">推奨価格</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">競合最低</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">競合平均</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">ポジション</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">マージン</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {items.map((item: {
                id: string;
                sku: string;
                title: string;
                currentPrice: number;
                suggestedPrice: number;
                competitorPrices: { lowest: number; average: number };
                pricePosition: string;
                margin: { current: number };
              }) => (
                <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white text-sm">{item.title}</p>
                      <p className="text-xs text-zinc-500">{item.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-zinc-900 dark:text-white">
                    ${item.currentPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-emerald-600">
                    ${item.suggestedPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    ${item.competitorPrices.lowest.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    ${item.competitorPrices.average.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.pricePosition === 'below' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      item.pricePosition === 'at' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {item.pricePosition === 'below' ? '低い' : item.pricePosition === 'at' ? '同等' : '高い'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400">
                    {item.margin.current}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm"><Target className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><History className="h-4 w-4" /></Button>
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

function CompetitorsTab() {
  const { data, isLoading } = useSWR('/api/ebay-pricing-intelligence/competitors', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const competitors = data?.competitors || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="競合を検索..."
              className="pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
            />
          </div>
        </div>
        <Button variant="primary" size="sm">
          <Users className="h-4 w-4 mr-1" />
          競合を追加
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {competitors.map((comp: {
          id: string;
          name: string;
          sellerId: string;
          trackedProducts: number;
          avgPriceDiff: number;
          rating: number;
          feedbackScore: number;
          status: string;
          lastActivity: string;
        }) => (
          <Card key={comp.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <span className="text-sm font-semibold text-blue-600">{comp.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">{comp.name}</p>
                  <p className="text-xs text-zinc-500">{comp.sellerId}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                comp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
              }`}>
                {comp.status === 'active' ? 'アクティブ' : '非アクティブ'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-zinc-500">追跡商品</p>
                <p className="font-semibold text-zinc-900 dark:text-white">{comp.trackedProducts}</p>
              </div>
              <div>
                <p className="text-zinc-500">価格差</p>
                <p className={`font-semibold ${comp.avgPriceDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {comp.avgPriceDiff > 0 ? '+' : ''}{comp.avgPriceDiff.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-zinc-500">評価</p>
                <p className="font-semibold text-zinc-900 dark:text-white">{comp.rating}</p>
              </div>
              <div>
                <p className="text-zinc-500">フィードバック</p>
                <p className="font-semibold text-zinc-900 dark:text-white">{comp.feedbackScore.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-xs text-zinc-500">
                最終更新: {new Date(comp.lastActivity).toLocaleString('ja-JP')}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AlertsTab() {
  const { data, isLoading } = useSWR('/api/ebay-pricing-intelligence/alerts', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const alerts = data?.alerts || [];

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning': return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
      default: return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのタイプ</option>
            <option value="price_drop">競合値下げ</option>
            <option value="price_increase">競合値上げ</option>
            <option value="out_of_stock">在庫切れ</option>
            <option value="margin_warning">マージン警告</option>
          </select>
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのステータス</option>
            <option value="unread">未読</option>
            <option value="read">既読</option>
            <option value="resolved">解決済み</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">すべて既読</Button>
          <Button variant="outline" size="sm">ルール管理</Button>
        </div>
      </div>

      <div className="space-y-3">
        {alerts.map((alert: {
          id: string;
          type: string;
          severity: string;
          productTitle: string;
          message: string;
          data: { yourPrice: number; competitorPrice: number; competitorName: string };
          status: string;
          createdAt: string;
        }) => (
          <Card key={alert.id} className={`p-4 border ${getSeverityStyle(alert.severity)}`}>
            <div className="flex items-start gap-4">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-zinc-900 dark:text-white">{alert.productTitle}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.status === 'unread' ? 'bg-emerald-100 text-emerald-700' :
                    alert.status === 'read' ? 'bg-zinc-100 text-zinc-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {alert.status === 'unread' ? '未読' : alert.status === 'read' ? '既読' : '解決済み'}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{alert.message}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-zinc-500">自社: ${alert.data.yourPrice}</span>
                  <span className="text-zinc-500">競合: ${alert.data.competitorPrice}</span>
                  <span className="text-zinc-500">{alert.data.competitorName}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-zinc-500">{new Date(alert.createdAt).toLocaleString('ja-JP')}</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">無視</Button>
                    <Button variant="outline" size="sm">価格調整</Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RecommendationsTab() {
  const { data, isLoading } = useSWR('/api/ebay-pricing-intelligence/recommendations', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const recommendations = data?.recommendations || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">価格最適化の推奨: {recommendations.length}件</p>
        <Button variant="primary" size="sm">
          <CheckCircle className="h-4 w-4 mr-1" />
          すべて適用
        </Button>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec: {
          id: string;
          title: string;
          sku: string;
          currentPrice: number;
          recommendedPrice: number;
          changePercent: number;
          reason: string;
          expectedImpact: { profitChange: number; salesChange: number };
          confidence: number;
          status: string;
        }) => (
          <Card key={rec.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-zinc-900 dark:text-white">{rec.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    rec.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    rec.status === 'applied' ? 'bg-green-100 text-green-700' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>
                    {rec.status === 'pending' ? '保留' : rec.status === 'applied' ? '適用済み' : '却下'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">{rec.sku}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-zinc-500">現在</p>
                  <p className="font-semibold text-zinc-900 dark:text-white">${rec.currentPrice.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <div className="text-right">
                  <p className="text-sm text-zinc-500">推奨</p>
                  <p className="font-semibold text-emerald-600">${rec.recommendedPrice.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">利益影響</p>
                  <p className={`font-semibold ${rec.expectedImpact.profitChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {rec.expectedImpact.profitChange > 0 ? '+' : ''}{rec.expectedImpact.profitChange}%
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>理由: {rec.reason}</span>
                <span>信頼度: {(rec.confidence * 100).toFixed(0)}%</span>
              </div>
              {rec.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">却下</Button>
                  <Button variant="primary" size="sm">適用</Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR('/api/ebay-pricing-intelligence/settings', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-emerald-500" /></div>;
  }

  const settings = data || {
    general: { autoUpdatePrices: false, updateFrequency: 'hourly' },
    alerts: { emailNotifications: true, priceDropThreshold: 5 },
    pricing: { defaultMinMargin: 25, maxAutoAdjustment: 15 },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">自動価格更新</p>
              <p className="text-sm text-zinc-500">推奨価格を自動的に適用</p>
            </div>
            <input type="checkbox" defaultChecked={settings.general.autoUpdatePrices} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">更新頻度</p>
              <p className="text-sm text-zinc-500">競合価格のチェック頻度</p>
            </div>
            <select defaultValue={settings.general.updateFrequency} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <option value="hourly">1時間ごと</option>
              <option value="daily">1日1回</option>
              <option value="weekly">週1回</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">アラート設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">メール通知</p>
              <p className="text-sm text-zinc-500">重要なアラートをメールで通知</p>
            </div>
            <input type="checkbox" defaultChecked={settings.alerts.emailNotifications} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">値下げ閾値</p>
              <p className="text-sm text-zinc-500">アラートを発生させる競合値下げの割合</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings.alerts.priceDropThreshold}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">%</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">価格設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">最小マージン</p>
              <p className="text-sm text-zinc-500">維持する最小利益率</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings.pricing.defaultMinMargin}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">最大自動調整</p>
              <p className="text-sm text-zinc-500">自動価格調整の最大変動幅</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                defaultValue={settings.pricing.maxAutoAdjustment}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">%</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary">設定を保存</Button>
      </div>
    </div>
  );
}


'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Award,
  TrendingUp,
  TrendingDown,
  Truck,
  MessageSquare,
  Star,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  BarChart3,
  Settings,
  FileText,
  Lightbulb,
  Users,
  Target,
} from 'lucide-react';

type TabType = 'dashboard' | 'shipping' | 'customer-service' | 'feedback' | 'compliance' | 'settings';

export default function SellerPerformancePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'shipping' as const, label: '出荷', icon: Truck },
    { id: 'customer-service' as const, label: '顧客サービス', icon: MessageSquare },
    { id: 'feedback' as const, label: 'フィードバック', icon: Star },
    { id: 'compliance' as const, label: 'ポリシー遵守', icon: Shield },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">セラーパフォーマンス</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">パフォーマンス指標・改善管理</p>
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
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
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
        {activeTab === 'shipping' && <ShippingTab />}
        {activeTab === 'customer-service' && <CustomerServiceTab />}
        {activeTab === 'feedback' && <FeedbackTab />}
        {activeTab === 'compliance' && <ComplianceTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-seller-performance/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  const dashboard = data || {
    overview: { sellerLevel: 'Standard', overallScore: 0 },
    metrics: {
      transactionDefectRate: { value: 0, target: 2.0, status: 'good' },
      lateShipmentRate: { value: 0, target: 3.0, status: 'good' },
      casesWithoutResolution: { value: 0, target: 0.3, status: 'good' },
      trackingUploadRate: { value: 0, target: 95, status: 'good' },
    },
    feedbackSummary: { positive: 0, neutral: 0, negative: 0 },
    salesPerformance: { today: { orders: 0, revenue: 0 }, thisWeek: { orders: 0, revenue: 0 } },
    trends: [],
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'Top Rated': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'Above Standard': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-emerald-600';
      case 'good': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      default: return 'text-red-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">セラーレベル</p>
              <span className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${getLevelBadge(dashboard.overview.sellerLevel)}`}>
                {dashboard.overview.sellerLevel}
              </span>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <Target className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総合スコア</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.overallScore}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <ThumbsUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">ポジティブ評価</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.feedbackSummary.positive}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">今日の売上</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">${dashboard.salesPerformance.today.revenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">パフォーマンス指標</h3>
          <div className="space-y-4">
            {Object.entries(dashboard.metrics as Record<string, any>).map(([key, metric]: [string, { value: number; target: number; status: string }]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {key === 'transactionDefectRate' ? '取引欠陥率' :
                     key === 'lateShipmentRate' ? '出荷遅延率' :
                     key === 'casesWithoutResolution' ? '未解決ケース率' :
                     '追跡番号アップロード率'}
                  </span>
                  <span className={`font-semibold ${getStatusColor(metric.status)}`}>
                    {metric.value}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metric.status === 'excellent' ? 'bg-emerald-500' :
                        metric.status === 'good' ? 'bg-green-500' :
                        metric.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min((1 - metric.value / metric.target) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">目標: {metric.target}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">フィードバックサマリー</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">ポジティブ</span>
              </div>
              <span className="font-semibold text-green-600">{dashboard.feedbackSummary.positive}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Minus className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">ニュートラル</span>
              </div>
              <span className="font-semibold text-zinc-600">{dashboard.feedbackSummary.neutral}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">ネガティブ</span>
              </div>
              <span className="font-semibold text-red-600">{dashboard.feedbackSummary.negative}%</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">アラート</h4>
            {dashboard.alerts?.map((alert: { type: string; message: string }, i: number) => (
              <div key={i} className={`flex items-center gap-2 text-sm py-1 ${
                alert.type === 'info' ? 'text-blue-600' :
                alert.type === 'success' ? 'text-green-600' :
                'text-amber-600'
              }`}>
                {alert.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {alert.message}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">パフォーマンストレンド (7日間)</h3>
        <div className="h-48 flex items-end gap-2">
          {dashboard.trends.map((trend: { date: string; score: number; orders: number }, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-1 justify-center">
                <div
                  className="w-3 bg-amber-500 rounded-t"
                  style={{ height: `${trend.score}px` }}
                  title={`スコア: ${trend.score}%`}
                />
                <div
                  className="w-3 bg-blue-400 rounded-t"
                  style={{ height: `${trend.orders * 2}px` }}
                  title={`注文: ${trend.orders}`}
                />
              </div>
              <span className="text-xs text-zinc-500">{trend.date.slice(5)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">スコア</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">注文数</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ShippingTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-seller-performance/shipping', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  const shipping = data || {
    summary: { totalShipments: 0, onTimeRate: 0, averageHandlingTime: 0, trackingUploadRate: 0 },
    byCarrier: [],
    issues: { lateShipments: 0, missingTracking: 0, deliveryExceptions: 0 },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総出荷数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{shipping.summary.totalShipments.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">オンタイム率</p>
              <p className="text-xl font-bold text-green-600">{shipping.summary.onTimeRate}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">平均処理時間</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{shipping.summary.averageHandlingTime}日</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/30">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">追跡番号率</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{shipping.summary.trackingUploadRate}%</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">キャリア別パフォーマンス</h3>
          <div className="space-y-3">
            {shipping.byCarrier.map((carrier: { carrier: string; shipments: number; onTimeRate: number; avgDeliveryDays: number }) => (
              <div key={carrier.carrier} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div>
                  <p className="font-medium text-zinc-900 dark:text-white">{carrier.carrier}</p>
                  <p className="text-sm text-zinc-500">{carrier.shipments}件の出荷</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{carrier.onTimeRate}%</p>
                  <p className="text-sm text-zinc-500">平均{carrier.avgDeliveryDays}日</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">出荷問題</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-red-500" />
                <span className="text-zinc-700 dark:text-zinc-300">出荷遅延</span>
              </div>
              <span className="font-semibold text-red-600">{shipping.issues.lateShipments}件</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                <span className="text-zinc-700 dark:text-zinc-300">追跡番号未登録</span>
              </div>
              <span className="font-semibold text-amber-600">{shipping.issues.missingTracking}件</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <span className="text-zinc-700 dark:text-zinc-300">配送例外</span>
              </div>
              <span className="font-semibold text-orange-600">{shipping.issues.deliveryExceptions}件</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CustomerServiceTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-seller-performance/customer-service', fetcher);
  const { data: casesData } = useSWR<any>('/api/ebay-seller-performance/customer-service/cases', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  const service = data || {
    summary: { totalCases: 0, openCases: 0, resolvedCases: 0, avgResolutionTime: 0, satisfactionRate: 0 },
    casesByType: [],
    responseTime: { average: 0, within24h: 0, within48h: 0 },
  };

  const cases = casesData?.cases || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-zinc-500">総ケース</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{service.summary.totalCases}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-zinc-500">オープン</p>
            <p className="text-2xl font-bold text-amber-600">{service.summary.openCases}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-zinc-500">解決済み</p>
            <p className="text-2xl font-bold text-green-600">{service.summary.resolvedCases}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-zinc-500">平均解決時間</p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{service.summary.avgResolutionTime}h</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <p className="text-sm text-zinc-500">満足度</p>
            <p className="text-2xl font-bold text-emerald-600">{service.summary.satisfactionRate}%</p>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">ケース一覧</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ケースID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">バイヤー</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">タイプ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">ステータス</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">優先度</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">作成日</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {cases.slice(0, 10).map((c: {
                id: string;
                buyerName: string;
                type: string;
                status: string;
                priority: string;
                createdAt: string;
              }) => (
                <tr key={c.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">{c.id}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{c.buyerName}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {c.type === 'item_not_received' ? '未着' :
                     c.type === 'item_not_as_described' ? '商品不一致' :
                     c.type === 'return_request' ? '返品' : 'キャンセル'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      c.status === 'open' ? 'bg-amber-100 text-amber-700' :
                      c.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      c.status === 'escalated' ? 'bg-red-100 text-red-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {c.status === 'open' ? 'オープン' :
                       c.status === 'in_progress' ? '対応中' :
                       c.status === 'escalated' ? 'エスカレ' : '解決済み'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      c.priority === 'high' ? 'bg-red-100 text-red-700' :
                      c.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-zinc-100 text-zinc-700'
                    }`}>
                      {c.priority === 'high' ? '高' : c.priority === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{new Date(c.createdAt).toLocaleDateString('ja-JP')}</td>
                  <td className="px-4 py-3 text-center">
                    <Button variant="ghost" size="sm">詳細</Button>
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

function FeedbackTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-seller-performance/feedback', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  const feedbackData = data || { feedback: [], stats: { positive: 0, neutral: 0, negative: 0, positivePercent: 0 } };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <ThumbsUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">ポジティブ</p>
              <p className="text-xl font-bold text-green-600">{feedbackData.stats.positive}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <Minus className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">ニュートラル</p>
              <p className="text-xl font-bold text-zinc-600">{feedbackData.stats.neutral}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/30">
              <ThumbsDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">ネガティブ</p>
              <p className="text-xl font-bold text-red-600">{feedbackData.stats.negative}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <Star className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">ポジティブ率</p>
              <p className="text-xl font-bold text-emerald-600">{feedbackData.stats.positivePercent}%</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">最近のフィードバック</h3>
        <div className="space-y-3">
          {feedbackData.feedback.slice(0, 10).map((fb: {
            id: string;
            buyerName: string;
            rating: string;
            comment: string;
            itemTitle: string;
            hasResponse: boolean;
            createdAt: string;
          }) => (
            <div key={fb.id} className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    fb.rating === 'positive' ? 'bg-green-100 dark:bg-green-900/30' :
                    fb.rating === 'neutral' ? 'bg-zinc-100 dark:bg-zinc-800' :
                    'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {fb.rating === 'positive' ? <ThumbsUp className="h-4 w-4 text-green-600" /> :
                     fb.rating === 'neutral' ? <Minus className="h-4 w-4 text-zinc-600" /> :
                     <ThumbsDown className="h-4 w-4 text-red-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{fb.buyerName}</p>
                    <p className="text-sm text-zinc-500">{fb.itemTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">{new Date(fb.createdAt).toLocaleDateString('ja-JP')}</span>
                  {fb.hasResponse && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">返信済み</span>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{fb.comment}</p>
              {!fb.hasResponse && (
                <div className="mt-3">
                  <Button variant="outline" size="sm">返信する</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ComplianceTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-seller-performance/policy-compliance', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  const compliance = data || {
    overallStatus: 'compliant',
    policies: [],
    recommendations: [],
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-full ${
            compliance.overallStatus === 'compliant' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            {compliance.overallStatus === 'compliant' ?
              <CheckCircle className="h-8 w-8 text-green-600" /> :
              <AlertTriangle className="h-8 w-8 text-red-600" />}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
              {compliance.overallStatus === 'compliant' ? 'すべてのポリシーに準拠' : 'ポリシー違反あり'}
            </h3>
            <p className="text-zinc-500">最終チェック: {new Date(compliance.lastCheck).toLocaleString('ja-JP')}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">ポリシー別ステータス</h3>
        <div className="space-y-3">
          {compliance.policies.map((policy: { id: string; name: string; status: string; violations: number }) => (
            <div key={policy.id} className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800 rounded-lg">
              <div className="flex items-center gap-3">
                {policy.status === 'compliant' ?
                  <CheckCircle className="h-5 w-5 text-green-500" /> :
                  <AlertTriangle className="h-5 w-5 text-red-500" />}
                <span className="font-medium text-zinc-900 dark:text-white">{policy.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  policy.status === 'compliant' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {policy.status === 'compliant' ? '準拠' : '違反'}
                </span>
                <span className="text-sm text-zinc-500">違反: {policy.violations}件</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">推奨事項</h3>
        <div className="space-y-2">
          {compliance.recommendations.map((rec: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              {rec}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-seller-performance/settings', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-amber-500" /></div>;
  }

  const settings = data || {
    notifications: { performanceAlerts: true, weeklyReport: true },
    goals: { transactionDefectRate: 0.5, lateShipmentRate: 3.0 },
    automation: { autoRespondToPositiveFeedback: false, autoEscalateHighPriorityCases: true },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">パフォーマンスアラート</p>
              <p className="text-sm text-zinc-500">指標が悪化した場合に通知</p>
            </div>
            <input type="checkbox" defaultChecked={settings.notifications.performanceAlerts} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">週次レポート</p>
              <p className="text-sm text-zinc-500">毎週パフォーマンスサマリーを送信</p>
            </div>
            <input type="checkbox" defaultChecked={settings.notifications.weeklyReport} className="toggle" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">目標設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">取引欠陥率目標</p>
              <p className="text-sm text-zinc-500">目標とする取引欠陥率</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                defaultValue={settings.goals.transactionDefectRate}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">出荷遅延率目標</p>
              <p className="text-sm text-zinc-500">目標とする出荷遅延率</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                defaultValue={settings.goals.lateShipmentRate}
                className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
              <span className="text-zinc-500">%</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">自動化設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">ポジティブフィードバック自動返信</p>
              <p className="text-sm text-zinc-500">ポジティブ評価に自動で返信</p>
            </div>
            <input type="checkbox" defaultChecked={settings.automation.autoRespondToPositiveFeedback} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">高優先度ケース自動エスカレーション</p>
              <p className="text-sm text-zinc-500">高優先度ケースを自動でエスカレーション</p>
            </div>
            <input type="checkbox" defaultChecked={settings.automation.autoEscalateHighPriorityCases} className="toggle" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary">設定を保存</Button>
      </div>
    </div>
  );
}

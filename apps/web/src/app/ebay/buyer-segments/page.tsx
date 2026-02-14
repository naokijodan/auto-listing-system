'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Users,
  Crown,
  Heart,
  Star,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  Moon,
  AlertCircle,
  UserX,
  RefreshCw,
  Loader2,
  BarChart3,
  Settings,
  Brain,
  Target,
  Megaphone,
  ArrowRight,
  DollarSign,
  Calendar,
  ShoppingCart,
} from 'lucide-react';

interface DashboardData {
  success: boolean;
  stats: {
    totalBuyers: number;
    activeBuyers: number;
    newBuyersThisMonth: number;
    averageLTV: number;
    averageOrderValue: number;
    repeatPurchaseRate: number;
    churnRate: number;
  };
  segmentDistribution: Array<{
    segment: string;
    count: number;
    percentage: number;
    revenue: number;
    avgLTV: number;
  }>;
  rfmDistribution: {
    recency: Array<{ score: number; count: number; label: string }>;
    frequency: Array<{ score: number; count: number; label: string }>;
    monetary: Array<{ score: number; count: number; label: string }>;
  };
  monthlyTrend: Array<{
    month: string;
    newBuyers: number;
    repeatBuyers: number;
    churnedBuyers: number;
  }>;
}

interface Segment {
  code: string;
  name: string;
  description: string;
  color: string;
}

interface Buyer {
  id: string;
  ebayUsername: string;
  email: string;
  country: string;
  segment: string;
  rfm: { r: number; f: number; m: number; total: number };
  metrics: {
    orderCount: number;
    totalSpent: number;
    averageOrderValue: number;
    lastPurchaseDate: string;
    firstPurchaseDate: string;
  };
  predictedLTV: number;
  churnProbability: number;
}

const segmentIcons: Record<string, typeof Users> = {
  CHAMPIONS: Crown,
  LOYAL: Heart,
  POTENTIAL: Star,
  NEW: UserPlus,
  PROMISING: TrendingUp,
  NEED_ATTENTION: AlertTriangle,
  ABOUT_TO_SLEEP: Moon,
  AT_RISK: AlertCircle,
  HIBERNATING: Moon,
  LOST: UserX,
};

const segmentColors: Record<string, string> = {
  CHAMPIONS: 'bg-emerald-500',
  LOYAL: 'bg-blue-500',
  POTENTIAL: 'bg-purple-500',
  NEW: 'bg-cyan-500',
  PROMISING: 'bg-amber-500',
  NEED_ATTENTION: 'bg-orange-500',
  ABOUT_TO_SLEEP: 'bg-red-400',
  AT_RISK: 'bg-red-600',
  HIBERNATING: 'bg-zinc-500',
  LOST: 'bg-zinc-700',
};

export default function EbayBuyerSegmentsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'buyers' | 'rfm' | 'campaigns' | 'settings'>('dashboard');
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<DashboardData>(
    '/api/ebay-buyer-segments/dashboard',
    fetcher
  );

  // Segments
  const { data: segmentsData } = useSWR<{ success: boolean; segments: Segment[] }>(
    '/api/ebay-buyer-segments/segments',
    fetcher
  );

  // Buyers
  const { data: buyersData, isLoading: buyersLoading } = useSWR<{ success: boolean; buyers: Buyer[]; total: number }>(
    activeTab === 'buyers' ? `/api/ebay-buyer-segments/buyers${selectedSegment ? `?segment=${selectedSegment}` : ''}` : null,
    fetcher
  );

  // Churn risk
  const { data: churnData } = useSWR<{ success: boolean; atRiskBuyers: any[]; summary: any }>(
    activeTab === 'dashboard' ? '/api/ebay-buyer-segments/churn-risk?threshold=0.6' : null,
    fetcher
  );

  // Campaign suggestions
  const { data: campaignsData } = useSWR<{ success: boolean; campaigns: any[] }>(
    activeTab === 'campaigns' ? '/api/ebay-buyer-segments/campaign-suggestions' : null,
    fetcher
  );

  // Settings
  const { data: settingsData, mutate: mutateSettings } = useSWR<{ success: boolean; settings: any }>(
    activeTab === 'settings' ? '/api/ebay-buyer-segments/settings' : null,
    fetcher
  );

  const stats = dashboardData?.stats;
  const segmentDistribution = dashboardData?.segmentDistribution || [];
  const rfmDistribution = dashboardData?.rfmDistribution;
  const monthlyTrend = dashboardData?.monthlyTrend || [];
  const segments = segmentsData?.segments || [];
  const buyers = buyersData?.buyers || [];
  const atRiskBuyers = churnData?.atRiskBuyers || [];
  const campaigns = campaignsData?.campaigns || [];
  const settings = settingsData?.settings;

  // RFM分析実行
  const handleAnalyzeRfm = async () => {
    setIsAnalyzing(true);
    try {
      await postApi('/api/ebay-buyer-segments/analyze-rfm', { period: '365d' });
      addToast({ type: 'success', message: 'RFM分析を完了しました' });
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: 'RFM分析に失敗しました' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // セグメント名を取得
  const getSegmentName = (code: string) => {
    const segment = segments.find(s => s.code === code);
    return segment?.name || code;
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">バイヤーセグメンテーション</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              RFM分析・顧客ライフサイクル管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzeRfm}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-1" />
            )}
            RFM分析実行
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutateDashboard()}
            disabled={dashboardLoading}
          >
            <RefreshCw className={cn('h-4 w-4', dashboardLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        {[
          { id: 'dashboard', label: 'ダッシュボード', icon: BarChart3 },
          { id: 'buyers', label: 'バイヤー一覧', icon: Users },
          { id: 'rfm', label: 'RFM分析', icon: Target },
          { id: 'campaigns', label: 'キャンペーン', icon: Megaphone },
          { id: 'settings', label: '設定', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-7 gap-3">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-xs text-zinc-500">総バイヤー</p>
                  <p className="text-lg font-bold">{stats?.totalBuyers.toLocaleString() || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-xs text-zinc-500">アクティブ</p>
                  <p className="text-lg font-bold">{stats?.activeBuyers || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-cyan-500" />
                <div>
                  <p className="text-xs text-zinc-500">今月新規</p>
                  <p className="text-lg font-bold">{stats?.newBuyersThisMonth || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-zinc-500">平均LTV</p>
                  <p className="text-lg font-bold">${stats?.averageLTV.toFixed(0) || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-xs text-zinc-500">平均注文額</p>
                  <p className="text-lg font-bold">${stats?.averageOrderValue.toFixed(0) || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="text-xs text-zinc-500">リピート率</p>
                  <p className="text-lg font-bold">{stats?.repeatPurchaseRate || 0}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-xs text-zinc-500">解約率</p>
                  <p className="text-lg font-bold">{stats?.churnRate || 0}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Segment Distribution */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              セグメント分布
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {segmentDistribution.map((seg) => {
                const Icon = segmentIcons[seg.segment] || Users;
                const color = segmentColors[seg.segment] || 'bg-zinc-500';
                return (
                  <div
                    key={seg.segment}
                    className="p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => {
                      setSelectedSegment(seg.segment);
                      setActiveTab('buyers');
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('p-1.5 rounded', color)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {getSegmentName(seg.segment)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                      {seg.count}
                    </p>
                    <p className="text-xs text-zinc-500">{seg.percentage}%</p>
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs text-zinc-500">売上: ${seg.revenue.toLocaleString()}</p>
                      <p className="text-xs text-zinc-500">平均LTV: ${seg.avgLTV}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Churn Risk Alert */}
          {atRiskBuyers.length > 0 && (
            <Card className="p-4 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    解約リスク顧客: {atRiskBuyers.length}名
                  </h3>
                </div>
                <Button variant="outline" size="sm">
                  詳細を見る
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
              <p className="text-sm text-zinc-500 mb-3">
                推定損失額: ${churnData?.summary?.potentialRevenueLoss?.toFixed(0) || 0}
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {atRiskBuyers.slice(0, 5).map((buyer) => (
                  <div
                    key={buyer.id}
                    className="flex-shrink-0 p-2 bg-red-50 rounded text-sm dark:bg-red-900/20"
                  >
                    <p className="font-medium text-red-700 dark:text-red-400">
                      {buyer.ebayUsername}
                    </p>
                    <p className="text-xs text-red-500">
                      リスク: {(buyer.churnProbability * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Monthly Trend */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              月別トレンド
            </h3>
            <div className="h-48 flex items-end gap-4">
              {monthlyTrend.map((month, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5" style={{ height: '120px' }}>
                    <div
                      className="flex-1 bg-cyan-500 rounded-t"
                      style={{ height: `${(month.newBuyers / 150) * 100}%`, marginTop: 'auto' }}
                      title={`新規: ${month.newBuyers}`}
                    />
                    <div
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{ height: `${(month.repeatBuyers / 150) * 100}%`, marginTop: 'auto' }}
                      title={`リピート: ${month.repeatBuyers}`}
                    />
                    <div
                      className="flex-1 bg-red-500 rounded-t"
                      style={{ height: `${(month.churnedBuyers / 150) * 100}%`, marginTop: 'auto' }}
                      title={`離脱: ${month.churnedBuyers}`}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">{month.month}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-500 rounded" />
                <span className="text-xs text-zinc-500">新規</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span className="text-xs text-zinc-500">リピート</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-xs text-zinc-500">離脱</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Buyers Tab */}
      {activeTab === 'buyers' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Segment Filter */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={selectedSegment === '' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedSegment('')}
            >
              すべて
            </Button>
            {segments.map((seg) => {
              const Icon = segmentIcons[seg.code] || Users;
              return (
                <Button
                  key={seg.code}
                  variant={selectedSegment === seg.code ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSegment(seg.code)}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {seg.name}
                </Button>
              );
            })}
          </div>

          {/* Buyers Table */}
          <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50">
              <div className="w-40">ユーザー名</div>
              <div className="w-24">国</div>
              <div className="w-28">セグメント</div>
              <div className="w-24 text-center">RFM</div>
              <div className="w-20 text-right">注文数</div>
              <div className="w-24 text-right">総購入額</div>
              <div className="w-24 text-right">予測LTV</div>
              <div className="w-28">最終購入</div>
              <div className="w-24 text-center">解約リスク</div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
              {buyersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : buyers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-zinc-300" />
                  <p className="mt-4 text-sm text-zinc-500">バイヤーが見つかりません</p>
                </div>
              ) : (
                buyers.map((buyer) => {
                  const Icon = segmentIcons[buyer.segment] || Users;
                  const color = segmentColors[buyer.segment] || 'bg-zinc-500';
                  return (
                    <div
                      key={buyer.id}
                      className="flex items-center border-b border-zinc-100 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/30"
                    >
                      <div className="w-40">
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {buyer.ebayUsername}
                        </p>
                        <p className="text-xs text-zinc-500">{buyer.email}</p>
                      </div>
                      <div className="w-24 text-sm text-zinc-600 dark:text-zinc-400">
                        {buyer.country}
                      </div>
                      <div className="w-28">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white', color)}>
                          <Icon className="h-3 w-3" />
                          {getSegmentName(buyer.segment)}
                        </span>
                      </div>
                      <div className="w-24 text-center">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          {buyer.rfm.r}-{buyer.rfm.f}-{buyer.rfm.m}
                        </span>
                        <span className="text-xs text-zinc-500 ml-1">({buyer.rfm.total})</span>
                      </div>
                      <div className="w-20 text-right text-sm text-zinc-600 dark:text-zinc-400">
                        {buyer.metrics.orderCount}
                      </div>
                      <div className="w-24 text-right text-sm font-medium text-zinc-900 dark:text-white">
                        ${buyer.metrics.totalSpent.toFixed(0)}
                      </div>
                      <div className="w-24 text-right text-sm text-emerald-600">
                        ${buyer.predictedLTV}
                      </div>
                      <div className="w-28 text-sm text-zinc-500">
                        {new Date(buyer.metrics.lastPurchaseDate).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="w-24 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          buyer.churnProbability >= 0.7
                            ? 'bg-red-100 text-red-700'
                            : buyer.churnProbability >= 0.4
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {(buyer.churnProbability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* RFM Tab */}
      {activeTab === 'rfm' && rfmDistribution && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Recency */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                <Calendar className="inline h-5 w-5 mr-2 text-blue-500" />
                Recency（最終購入日）
              </h3>
              <div className="space-y-2">
                {rfmDistribution.recency.map((item) => (
                  <div key={item.score} className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold text-blue-600">{item.score}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-600 dark:text-zinc-400">{item.label}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <div className="h-2 bg-zinc-200 rounded dark:bg-zinc-700">
                        <div
                          className="h-full bg-blue-500 rounded"
                          style={{ width: `${(item.count / 350) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Frequency */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                <ShoppingCart className="inline h-5 w-5 mr-2 text-emerald-500" />
                Frequency（購入頻度）
              </h3>
              <div className="space-y-2">
                {rfmDistribution.frequency.map((item) => (
                  <div key={item.score} className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold text-emerald-600">{item.score}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-600 dark:text-zinc-400">{item.label}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <div className="h-2 bg-zinc-200 rounded dark:bg-zinc-700">
                        <div
                          className="h-full bg-emerald-500 rounded"
                          style={{ width: `${(item.count / 350) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Monetary */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                <DollarSign className="inline h-5 w-5 mr-2 text-purple-500" />
                Monetary（購入金額）
              </h3>
              <div className="space-y-2">
                {rfmDistribution.monetary.map((item) => (
                  <div key={item.score} className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold text-purple-600">{item.score}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-600 dark:text-zinc-400">{item.label}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <div className="h-2 bg-zinc-200 rounded dark:bg-zinc-700">
                        <div
                          className="h-full bg-purple-500 rounded"
                          style={{ width: `${(item.count / 350) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* RFM Matrix */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              RFMマトリックス
            </h3>
            <div className="grid grid-cols-6 gap-1">
              <div className="col-span-1" />
              {[1, 2, 3, 4, 5].map(f => (
                <div key={f} className="text-center text-xs font-medium text-zinc-500 py-1">
                  F={f}
                </div>
              ))}
              {[5, 4, 3, 2, 1].map(r => (
                <>
                  <div key={`r-${r}`} className="text-right text-xs font-medium text-zinc-500 pr-2 flex items-center justify-end">
                    R={r}
                  </div>
                  {[1, 2, 3, 4, 5].map(f => {
                    const score = r + f;
                    const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-blue-500' : score >= 4 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div
                        key={`${r}-${f}`}
                        className={cn('h-10 rounded flex items-center justify-center text-white text-xs font-medium', color)}
                      >
                        {score}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              推奨キャンペーン
            </h3>
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const Icon = segmentIcons[campaign.targetSegment] || Users;
                const color = segmentColors[campaign.targetSegment] || 'bg-zinc-500';
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg dark:bg-zinc-800/50"
                  >
                    <div className={cn('p-2 rounded', color)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {campaign.name}
                        </p>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          campaign.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        )}>
                          {campaign.priority === 'high' ? '高優先' : '中優先'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">{campaign.description}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                        {campaign.discount}%
                      </p>
                      <p className="text-xs text-zinc-500">割引</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {campaign.estimatedReach}
                      </p>
                      <p className="text-xs text-zinc-500">対象者</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        ${campaign.estimatedRevenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-zinc-500">予想売上</p>
                    </div>
                    <Button variant="primary" size="sm">
                      実行
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              セグメンテーション設定
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    分析頻度
                  </label>
                  <select
                    value={settings.analysisFrequency}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                  >
                    <option value="hourly">毎時</option>
                    <option value="daily">毎日</option>
                    <option value="weekly">毎週</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    解約リスク閾値
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.churnThreshold}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'enableAutoSegmentation', label: '自動セグメンテーション', desc: '定期的に顧客を自動分類' },
                  { key: 'enableChurnPrediction', label: '解約予測', desc: 'AIによる解約リスク予測' },
                  { key: 'enableLtvPrediction', label: 'LTV予測', desc: '顧客生涯価値の予測' },
                  { key: 'notifyOnHighRisk', label: '高リスク通知', desc: '解約リスクが高い顧客を通知' },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{item.label}</p>
                      <p className="text-sm text-zinc-500">{item.desc}</p>
                    </div>
                    <div
                      className={cn(
                        'w-12 h-6 rounded-full cursor-pointer transition-colors',
                        settings[item.key] ? 'bg-blue-500' : 'bg-zinc-300'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5',
                          settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

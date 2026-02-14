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
  Heart,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Loader2,
  Settings,
  Zap,
  UserPlus,
  UserCheck,
  UserX,
  Star,
  Gift,
  Mail,
  BarChart3,
  Play,
  Pause,
  ChevronRight,
} from 'lucide-react';

interface DashboardData {
  success: boolean;
  stats: {
    totalCustomers: number;
    averageLTV: number;
    averageLifespan: number;
    conversionRate: number;
    retentionRate: number;
    churnRate: number;
    reactivationRate: number;
  };
  stageDistribution: Array<{
    stage: string;
    count: number;
    percentage: number;
    avgValue: number;
  }>;
  funnel: {
    prospects: number;
    firstPurchase: number;
    repeatPurchase: number;
    loyal: number;
    advocate: number;
    conversionRates: Record<string, number>;
  };
  monthlyTrend: Array<{
    month: string;
    newCustomers: number;
    reactivated: number;
    churned: number;
    netGrowth: number;
  }>;
  cohortAnalysis: Array<{
    cohort: string;
    customers: number;
    month1: number;
    month3: number;
    month6: number | null;
    month12: number | null;
    ltv: number;
  }>;
}

interface Stage {
  code: string;
  name: string;
  description: string;
  color: string;
  order: number;
}

const stageIcons: Record<string, typeof Users> = {
  PROSPECT: Users,
  FIRST_TIME: UserPlus,
  ACTIVE: UserCheck,
  AT_RISK: TrendingDown,
  LAPSED: UserX,
  REACTIVATED: RefreshCw,
  LOYAL: Heart,
  ADVOCATE: Star,
};

export default function EbayCustomerLifecyclePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'automation' | 'campaigns' | 'settings'>('dashboard');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, mutate: mutateDashboard } = useSWR<DashboardData>(
    '/api/ebay-customer-lifecycle/dashboard',
    fetcher
  );

  // Stages
  const { data: stagesData } = useSWR<{ success: boolean; stages: Stage[] }>(
    '/api/ebay-customer-lifecycle/stages',
    fetcher
  );

  // Customers
  const { data: customersData, isLoading: customersLoading } = useSWR<{ success: boolean; customers: any[]; total: number }>(
    activeTab === 'customers' ? `/api/ebay-customer-lifecycle/customers${selectedStage ? `?stage=${selectedStage}` : ''}` : null,
    fetcher
  );

  // Automation Rules
  const { data: automationData, isLoading: automationLoading, mutate: mutateAutomation } = useSWR<{ success: boolean; rules: any[] }>(
    activeTab === 'automation' ? '/api/ebay-customer-lifecycle/automation-rules' : null,
    fetcher
  );

  // Health Report
  const { data: healthData } = useSWR<{ success: boolean; report: any }>(
    activeTab === 'dashboard' ? '/api/ebay-customer-lifecycle/health-report' : null,
    fetcher
  );

  // Settings
  const { data: settingsData } = useSWR<{ success: boolean; settings: any }>(
    activeTab === 'settings' ? '/api/ebay-customer-lifecycle/settings' : null,
    fetcher
  );

  const stats = dashboardData?.stats;
  const stageDistribution = dashboardData?.stageDistribution || [];
  const funnel = dashboardData?.funnel;
  const monthlyTrend = dashboardData?.monthlyTrend || [];
  const cohortAnalysis = dashboardData?.cohortAnalysis || [];
  const stages = stagesData?.stages || [];
  const customers = customersData?.customers || [];
  const automationRules = automationData?.rules || [];
  const healthReport = healthData?.report;
  const settings = settingsData?.settings;

  // ステージ名を取得
  const getStageName = (code: string) => {
    const stage = stages.find(s => s.code === code);
    return stage?.name || code;
  };

  // ステージ色を取得
  const getStageColor = (code: string) => {
    const stage = stages.find(s => s.code === code);
    return stage?.color || '#94a3b8';
  };

  // キャンペーン生成
  const handleGenerateCampaign = async (targetStage: string, action: string) => {
    setIsGenerating(true);
    try {
      const response = await postApi('/api/ebay-customer-lifecycle/generate-campaign', {
        targetStage,
        action,
      }) as any;
      addToast({ type: 'success', message: `キャンペーン「${response.campaign.campaignName}」を生成しました` });
    } catch {
      addToast({ type: 'error', message: 'キャンペーン生成に失敗しました' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-pink-500 to-rose-500">
            <Heart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">顧客ライフサイクル</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              LTV最大化・エンゲージメント管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          { id: 'customers', label: '顧客一覧', icon: Users },
          { id: 'automation', label: '自動化', icon: Zap },
          { id: 'campaigns', label: 'キャンペーン', icon: Mail },
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
                  ? 'border-pink-500 text-pink-600 dark:text-pink-400'
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
              <p className="text-xs text-zinc-500">総顧客数</p>
              <p className="text-xl font-bold">{stats?.totalCustomers?.toLocaleString() || 0}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">平均LTV</p>
              <p className="text-xl font-bold">${stats?.averageLTV || 0}</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">平均寿命</p>
              <p className="text-xl font-bold">{stats?.averageLifespan || 0}ヶ月</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">転換率</p>
              <p className="text-xl font-bold">{stats?.conversionRate || 0}%</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">継続率</p>
              <p className="text-xl font-bold text-emerald-600">{stats?.retentionRate || 0}%</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">解約率</p>
              <p className="text-xl font-bold text-red-600">{stats?.churnRate || 0}%</p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-zinc-500">復帰率</p>
              <p className="text-xl font-bold text-purple-600">{stats?.reactivationRate || 0}%</p>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Lifecycle Funnel */}
            <Card className="p-4 col-span-2">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                ライフサイクルファネル
              </h3>
              <div className="flex items-center justify-between">
                {[
                  { label: '見込み客', value: funnel?.prospects, color: '#94a3b8' },
                  { label: '初回購入', value: funnel?.firstPurchase, color: '#06b6d4' },
                  { label: 'リピート', value: funnel?.repeatPurchase, color: '#10b981' },
                  { label: 'ロイヤル', value: funnel?.loyal, color: '#ec4899' },
                  { label: 'アドボケイト', value: funnel?.advocate, color: '#f97316' },
                ].map((step, index, arr) => (
                  <div key={step.label} className="flex items-center">
                    <div className="text-center">
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-2"
                        style={{ backgroundColor: `${step.color}20`, border: `3px solid ${step.color}` }}
                      >
                        <span className="text-lg font-bold" style={{ color: step.color }}>
                          {step.value || 0}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">{step.label}</p>
                    </div>
                    {index < arr.length - 1 && (
                      <ChevronRight className="h-6 w-6 text-zinc-300 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Health Report */}
            {healthReport && (
              <Card className="p-4">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
                  健全性スコア
                </h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle
                        cx="48" cy="48" r="40" fill="none"
                        stroke={healthReport.overallScore >= 80 ? '#10b981' : healthReport.overallScore >= 60 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        strokeDasharray={`${healthReport.overallScore * 2.51} 251`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{healthReport.overallScore}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {healthReport.alerts.slice(0, 2).map((alert: any, i: number) => (
                    <div key={i} className={cn(
                      'p-2 rounded text-xs',
                      alert.type === 'critical' ? 'bg-red-50 text-red-700' :
                      alert.type === 'warning' ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    )}>
                      {alert.message}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Stage Distribution */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              ステージ別分布
            </h3>
            <div className="grid grid-cols-8 gap-3">
              {stageDistribution.map((dist) => {
                const Icon = stageIcons[dist.stage] || Users;
                return (
                  <div
                    key={dist.stage}
                    className="p-3 rounded-lg text-center cursor-pointer hover:shadow-md transition-shadow"
                    style={{ backgroundColor: `${getStageColor(dist.stage)}15` }}
                    onClick={() => {
                      setSelectedStage(dist.stage);
                      setActiveTab('customers');
                    }}
                  >
                    <Icon
                      className="h-6 w-6 mx-auto mb-2"
                      style={{ color: getStageColor(dist.stage) }}
                    />
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {getStageName(dist.stage)}
                    </p>
                    <p className="text-xl font-bold" style={{ color: getStageColor(dist.stage) }}>
                      {dist.count}
                    </p>
                    <p className="text-xs text-zinc-500">{dist.percentage}%</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      平均 ${dist.avgValue}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Cohort Analysis */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              コホート分析（継続率%）
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">コホート</th>
                    <th className="text-right py-2 px-3">顧客数</th>
                    <th className="text-right py-2 px-3">1ヶ月</th>
                    <th className="text-right py-2 px-3">3ヶ月</th>
                    <th className="text-right py-2 px-3">6ヶ月</th>
                    <th className="text-right py-2 px-3">12ヶ月</th>
                    <th className="text-right py-2 px-3">LTV</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortAnalysis.map((cohort) => (
                    <tr key={cohort.cohort} className="border-b border-zinc-100">
                      <td className="py-2 px-3 font-medium">{cohort.cohort}</td>
                      <td className="text-right py-2 px-3">{cohort.customers}</td>
                      <td className="text-right py-2 px-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs">
                          {cohort.month1}%
                        </span>
                      </td>
                      <td className="text-right py-2 px-3">
                        {cohort.month3 !== null ? (
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs',
                            cohort.month3 >= 70 ? 'bg-emerald-100 text-emerald-700' :
                            cohort.month3 >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {cohort.month3}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-right py-2 px-3">
                        {cohort.month6 !== null ? (
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs',
                            cohort.month6 >= 50 ? 'bg-emerald-100 text-emerald-700' :
                            cohort.month6 >= 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {cohort.month6}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-right py-2 px-3">
                        {cohort.month12 !== null ? (
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs',
                            cohort.month12 >= 30 ? 'bg-emerald-100 text-emerald-700' :
                            cohort.month12 >= 20 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {cohort.month12}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="text-right py-2 px-3 font-medium">${cohort.ltv}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Monthly Trend */}
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">
              月別トレンド
            </h3>
            <div className="h-48 flex items-end gap-4">
              {monthlyTrend.map((month, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-0.5" style={{ height: '140px' }}>
                    <div
                      className="flex-1 bg-cyan-500 rounded-t"
                      style={{ height: `${(month.newCustomers / 150) * 100}%`, marginTop: 'auto' }}
                      title={`新規: ${month.newCustomers}`}
                    />
                    <div
                      className="flex-1 bg-purple-500 rounded-t"
                      style={{ height: `${(month.reactivated / 150) * 100}%`, marginTop: 'auto' }}
                      title={`復帰: ${month.reactivated}`}
                    />
                    <div
                      className="flex-1 bg-red-500 rounded-t"
                      style={{ height: `${(month.churned / 150) * 100}%`, marginTop: 'auto' }}
                      title={`解約: ${month.churned}`}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">{month.month}</span>
                  <span className={cn(
                    'text-xs font-medium',
                    month.netGrowth >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {month.netGrowth >= 0 ? '+' : ''}{month.netGrowth}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-500 rounded" />
                <span className="text-xs text-zinc-500">新規</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span className="text-xs text-zinc-500">復帰</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span className="text-xs text-zinc-500">解約</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Stage Filter */}
          <div className="mb-4 flex gap-2 flex-wrap">
            <Button
              variant={selectedStage === '' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('')}
            >
              すべて
            </Button>
            {stages.map((stage) => {
              const Icon = stageIcons[stage.code] || Users;
              return (
                <Button
                  key={stage.code}
                  variant={selectedStage === stage.code ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStage(stage.code)}
                  style={selectedStage === stage.code ? { backgroundColor: stage.color } : {}}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {stage.name}
                </Button>
              );
            })}
          </div>

          {/* Customers Table */}
          <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
              <div className="w-36">ユーザー名</div>
              <div className="w-28">ステージ</div>
              <div className="w-20 text-right">LTV</div>
              <div className="w-16 text-right">注文数</div>
              <div className="w-24 text-right">総購入額</div>
              <div className="w-24 text-right">平均注文額</div>
              <div className="w-20 text-center">開封率</div>
              <div className="w-32">次のアクション</div>
            </div>
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 36px)' }}>
              {customersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                </div>
              ) : (
                customers.map((customer) => {
                  const Icon = stageIcons[customer.stage] || Users;
                  return (
                    <div key={customer.id} className="flex items-center border-b border-zinc-100 px-3 py-2 text-sm">
                      <div className="w-36">
                        <p className="font-medium text-zinc-900 dark:text-white">{customer.ebayUsername}</p>
                        <p className="text-xs text-zinc-500">{customer.email}</p>
                      </div>
                      <div className="w-28">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                          style={{ backgroundColor: getStageColor(customer.stage) }}
                        >
                          <Icon className="h-3 w-3" />
                          {getStageName(customer.stage)}
                        </span>
                      </div>
                      <div className="w-20 text-right font-medium text-emerald-600">
                        ${customer.metrics.ltv.toFixed(0)}
                      </div>
                      <div className="w-16 text-right">{customer.metrics.orderCount}</div>
                      <div className="w-24 text-right">${customer.metrics.totalSpent}</div>
                      <div className="w-24 text-right">${customer.metrics.avgOrderValue.toFixed(0)}</div>
                      <div className="w-20 text-center">
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs',
                          customer.engagement.emailOpenRate >= 50 ? 'bg-emerald-100 text-emerald-700' :
                          customer.engagement.emailOpenRate >= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        )}>
                          {customer.engagement.emailOpenRate}%
                        </span>
                      </div>
                      <div className="w-32">
                        {customer.nextAction && (
                          <Button variant="ghost" size="sm" className="text-xs">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.nextAction}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                自動化ルール
              </h3>
              <Button variant="primary" size="sm">
                <Zap className="h-4 w-4 mr-1" />
                新規ルール
              </Button>
            </div>
            {automationLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
              </div>
            ) : (
              <div className="space-y-3">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                    <div className={cn(
                      'p-2 rounded-full',
                      rule.isActive ? 'bg-emerald-100' : 'bg-zinc-200'
                    )}>
                      {rule.isActive ? (
                        <Play className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Pause className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-white">{rule.name}</p>
                      <p className="text-sm text-zinc-500">
                        {rule.condition.fromStage ? getStageName(rule.condition.fromStage) : '任意'} → {getStageName(rule.condition.toStage)}
                        {rule.delay > 0 && ` (${rule.delay}時間後)`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{rule.action}</p>
                      <p className="text-xs text-zinc-500">トリガー: {rule.trigger}</p>
                    </div>
                    <div
                      className={cn(
                        'w-12 h-6 rounded-full cursor-pointer transition-colors',
                        rule.isActive ? 'bg-emerald-500' : 'bg-zinc-300'
                      )}
                    >
                      <div
                        className={cn(
                          'w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5',
                          rule.isActive ? 'translate-x-6' : 'translate-x-0.5'
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="flex-1 overflow-y-auto">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              キャンペーン生成
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              ステージとアクションを選択して、AIがキャンペーン内容を生成します
            </p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { stage: 'FIRST_TIME', action: 'WELCOME_EMAIL', label: 'ウェルカム' },
                { stage: 'AT_RISK', action: 'DISCOUNT_OFFER', label: 'リスク介入' },
                { stage: 'LAPSED', action: 'WINBACK_CAMPAIGN', label: 'ウィンバック' },
                { stage: 'LOYAL', action: 'LOYALTY_REWARD', label: 'ロイヤルティ報酬' },
              ].map((item) => {
                const Icon = stageIcons[item.stage] || Users;
                return (
                  <div
                    key={`${item.stage}-${item.action}`}
                    className="p-4 border border-zinc-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer dark:border-zinc-700"
                    onClick={() => handleGenerateCampaign(item.stage, item.action)}
                  >
                    <Icon
                      className="h-8 w-8 mb-2"
                      style={{ color: getStageColor(item.stage) }}
                    />
                    <p className="font-medium text-zinc-900 dark:text-white">{item.label}</p>
                    <p className="text-xs text-zinc-500">{getStageName(item.stage)}向け</p>
                    <Button variant="outline" size="sm" className="mt-3 w-full" disabled={isGenerating}>
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Gift className="h-4 w-4 mr-1" />
                          生成
                        </>
                      )}
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
              ライフサイクル設定
            </h3>
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  ステージ定義
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">初回購入期間（日）</label>
                    <input
                      type="number"
                      value={settings.stageDefinitions.firstTimeDays}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">アクティブ期間（日）</label>
                    <input
                      type="number"
                      value={settings.stageDefinitions.activeDays}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">リスク期間（日）</label>
                    <input
                      type="number"
                      value={settings.stageDefinitions.atRiskDays}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">休眠期間（日）</label>
                    <input
                      type="number"
                      value={settings.stageDefinitions.lapsedDays}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">ロイヤル最低注文数</label>
                    <input
                      type="number"
                      value={settings.stageDefinitions.loyalMinOrders}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">ロイヤル最低購入額（$）</label>
                    <input
                      type="number"
                      value={settings.stageDefinitions.loyalMinSpend}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'automationEnabled', label: '自動化を有効化', desc: 'ステージ変更時の自動アクション' },
                  { key: 'emailNotifications', label: 'メール通知', desc: '重要なイベントをメールで通知' },
                  { key: 'weeklyReport', label: '週次レポート', desc: '毎週月曜日にサマリーを送信' },
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
                        settings[item.key] ? 'bg-pink-500' : 'bg-zinc-300'
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

// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Megaphone,
  BarChart3,
  Tag,
  Target,
  Users,
  Settings,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  ShoppingCart,
  Play,
  Pause,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

type TabType = 'dashboard' | 'campaigns' | 'promotions' | 'ads' | 'audiences' | 'settings';

export default function MarketingHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'campaigns' as const, label: 'キャンペーン', icon: Megaphone },
    { id: 'promotions' as const, label: 'プロモーション', icon: Tag },
    { id: 'ads' as const, label: '広告', icon: Target },
    { id: 'audiences' as const, label: 'オーディエンス', icon: Users },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">マーケティングハブ</h1>
          <p className="text-zinc-500">キャンペーン・広告・プロモーション管理</p>
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
      {activeTab === 'campaigns' && <CampaignsTab />}
      {activeTab === 'promotions' && <PromotionsTab />}
      {activeTab === 'ads' && <AdsTab />}
      {activeTab === 'audiences' && <AudiencesTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading } = useSWR('/api/ebay-marketing-hub/dashboard', fetcher);

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
              <Megaphone className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">アクティブキャンペーン</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.activeCampaigns ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総支出</p>
              <p className="text-2xl font-bold">${dashboard?.overview?.totalSpend?.toFixed(2) ?? '0.00'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">インプレッション</p>
              <p className="text-2xl font-bold">{(dashboard?.overview?.totalImpressions ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">ROAS</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.roas ?? 0}x</p>
            </div>
          </div>
        </Card>
      </div>

      {/* パフォーマンス */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-4">本日のパフォーマンス</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-zinc-500">インプレッション</p>
              <p className="text-xl font-bold">{dashboard?.performance?.today?.impressions?.toLocaleString() ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">クリック</p>
              <p className="text-xl font-bold">{dashboard?.performance?.today?.clicks ?? 0}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">支出</p>
              <p className="text-xl font-bold">${dashboard?.performance?.today?.spend?.toFixed(2) ?? '0.00'}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">売上</p>
              <p className="text-xl font-bold">{dashboard?.performance?.today?.sales ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4">週間変化</h3>
          <div className="space-y-3">
            {['impressions', 'clicks', 'spend', 'sales'].map((metric) => {
              const value = dashboard?.performance?.weekChange?.[metric] ?? 0;
              const isPositive = value >= 0;
              return (
                <div key={metric} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{metric}</span>
                  <span className={`flex items-center text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {Math.abs(value)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* トップキャンペーン */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">トップキャンペーン</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">キャンペーン</th>
                <th className="text-left py-2">タイプ</th>
                <th className="text-right py-2">支出</th>
                <th className="text-right py-2">売上</th>
                <th className="text-right py-2">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.topCampaigns?.map((item: { id: string; name: string; type: string; spend: number; sales?: number; impressions?: number; roas?: number }) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{item.type}</span>
                  </td>
                  <td className="py-2 text-right">${item.spend.toFixed(2)}</td>
                  <td className="py-2 text-right">{item.sales ?? '-'}</td>
                  <td className="py-2 text-right">{item.roas ? `${item.roas}x` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* レコメンデーション */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">最適化レコメンデーション</h3>
        <div className="space-y-3">
          {dashboard?.recommendations?.map((rec: { type: string; campaign: string; suggestion: string; impact: string }, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <div>
                <p className="font-medium">{rec.suggestion}</p>
                <p className="text-sm text-zinc-500">予想効果: {rec.impact}</p>
              </div>
              <Button variant="outline" size="sm">適用</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CampaignsTab() {
  const { data, isLoading } = useSWR('/api/ebay-marketing-hub/campaigns', fetcher);

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
              placeholder="キャンペーンを検索..."
              className="pl-10 pr-4 py-2 border rounded-lg w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            フィルター
          </Button>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          新規キャンペーン
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.items?.map((campaign: { id: string; name: string; type: string; status: string; budget: { daily: number; spent: number }; performance: { impressions: number; clicks: number; sales?: number; roas?: number } }) => (
          <Card key={campaign.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${campaign.status === 'active' ? 'bg-green-100' : 'bg-zinc-100'}`}>
                  <Megaphone className={`h-5 w-5 ${campaign.status === 'active' ? 'text-green-600' : 'text-zinc-600'}`} />
                </div>
                <div>
                  <h4 className="font-medium">{campaign.name}</h4>
                  <p className="text-sm text-zinc-500">{campaign.type} | 予算: ${campaign.budget.daily}/日</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-zinc-500">インプレッション</p>
                  <p className="font-medium">{campaign.performance.impressions.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">クリック</p>
                  <p className="font-medium">{campaign.performance.clicks}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">ROAS</p>
                  <p className="font-medium">{campaign.performance.roas ? `${campaign.performance.roas}x` : '-'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PromotionsTab() {
  const { data, isLoading } = useSWR('/api/ebay-marketing-hub/promotions', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">プロモーション一覧</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          新規プロモーション
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">プロモーション名</th>
                <th className="text-left py-2">タイプ</th>
                <th className="text-left py-2">割引</th>
                <th className="text-left py-2">対象商品</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-left py-2">期間</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((promo: { id: string; name: string; type: string; discount?: { type: string; value: number }; listings: number; status: string; startDate: string; endDate: string }) => (
                <tr key={promo.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{promo.name}</td>
                  <td className="py-2">{promo.type}</td>
                  <td className="py-2">
                    {promo.discount ? `${promo.discount.value}${promo.discount.type === 'percent' ? '%' : '円'}` : '-'}
                  </td>
                  <td className="py-2">{promo.listings}商品</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      promo.status === 'active' ? 'bg-green-100 text-green-700' :
                      promo.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-zinc-100 text-zinc-700'
                    }`}>{promo.status}</span>
                  </td>
                  <td className="py-2">{promo.startDate} ~ {promo.endDate}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-600" /></Button>
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

function AdsTab() {
  const { data: adGroups, isLoading: adGroupsLoading } = useSWR('/api/ebay-marketing-hub/ad-groups', fetcher);
  const { data: keywords, isLoading: keywordsLoading } = useSWR('/api/ebay-marketing-hub/keywords', fetcher);

  if (adGroupsLoading || keywordsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">広告グループ</h3>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            グループ追加
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">グループ名</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-right py-2">入札調整</th>
                <th className="text-right py-2">リスティング</th>
                <th className="text-right py-2">インプレッション</th>
                <th className="text-right py-2">CTR</th>
              </tr>
            </thead>
            <tbody>
              {adGroups?.items?.map((group: { id: string; name: string; status: string; bidAdjustment: number; listings: number; performance: { impressions: number; ctr: number } }) => (
                <tr key={group.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{group.name}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      group.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'
                    }`}>{group.status}</span>
                  </td>
                  <td className="py-2 text-right">{group.bidAdjustment}x</td>
                  <td className="py-2 text-right">{group.listings}</td>
                  <td className="py-2 text-right">{group.performance.impressions.toLocaleString()}</td>
                  <td className="py-2 text-right">{group.performance.ctr}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">キーワード</h3>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            キーワード追加
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">キーワード</th>
                <th className="text-left py-2">マッチタイプ</th>
                <th className="text-right py-2">入札額</th>
                <th className="text-right py-2">インプレッション</th>
                <th className="text-right py-2">クリック</th>
                <th className="text-right py-2">CTR</th>
                <th className="text-right py-2">CPC</th>
              </tr>
            </thead>
            <tbody>
              {keywords?.items?.map((kw: { id: string; keyword: string; matchType: string; bid: number; impressions: number; clicks: number; ctr: number; cpc: number }) => (
                <tr key={kw.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{kw.keyword}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 bg-zinc-100 rounded text-xs">{kw.matchType}</span>
                  </td>
                  <td className="py-2 text-right">${kw.bid}</td>
                  <td className="py-2 text-right">{kw.impressions.toLocaleString()}</td>
                  <td className="py-2 text-right">{kw.clicks}</td>
                  <td className="py-2 text-right">{kw.ctr}%</td>
                  <td className="py-2 text-right">${kw.cpc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AudiencesTab() {
  const { data, isLoading } = useSWR('/api/ebay-marketing-hub/audiences', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">オーディエンス一覧</h3>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          オーディエンス作成
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.map((audience: { id: string; name: string; type: string; size: number; status: string; lastUpdated: string }) => (
          <Card key={audience.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">{audience.name}</h4>
                  <p className="text-sm text-zinc-500">タイプ: {audience.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-zinc-500">サイズ</p>
                  <p className="font-medium">{audience.size.toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  audience.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>{audience.status}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR('/api/ebay-marketing-hub/settings/general', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">予算設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">月間予算上限</span>
            <span className="text-sm font-medium">${data?.billing?.monthlyBudgetCap ?? 5000}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">アラートしきい値</span>
            <span className="text-sm font-medium">{data?.billing?.alertThreshold ?? 80}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">デフォルト日予算</span>
            <span className="text-sm font-medium">${data?.defaults?.dailyBudget ?? 50}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            予算設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">入札戦略</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">デフォルト戦略</span>
            <span className="text-sm font-medium">{data?.defaults?.bidStrategy ?? 'auto'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">目標ROAS</span>
            <span className="text-sm font-medium">{data?.defaults?.targetRoas ?? 4.0}x</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            入札設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">予算アラート</span>
            <span className="text-sm font-medium">{data?.notifications?.budgetAlert ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">パフォーマンスレポート</span>
            <span className="text-sm font-medium">{data?.notifications?.performanceReport ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">レポート頻度</span>
            <span className="text-sm font-medium">{data?.notifications?.reportFrequency ?? 'daily'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            通知設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">トラッキング設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">コンバージョンウィンドウ</span>
            <span className="text-sm font-medium">{data?.tracking?.conversionWindow ?? 30}日</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">クロスデバイストラッキング</span>
            <span className="text-sm font-medium">{data?.tracking?.crossDeviceTracking ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">ビュースルーコンバージョン</span>
            <span className="text-sm font-medium">{data?.tracking?.viewThroughConversion ? '有効' : '無効'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            トラッキング設定
          </Button>
        </div>
      </Card>
    </div>
  );
}

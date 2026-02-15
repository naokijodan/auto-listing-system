'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Users,
  UserCheck,
  UserPlus,
  TrendingUp,
  Settings,
  BarChart3,
  Search,
  Filter,
  Eye,
  Target,
  Heart,
  RefreshCw,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  AlertTriangle,
} from 'lucide-react';

type TabType = 'dashboard' | 'customers' | 'segments' | 'rfm' | 'behavior' | 'settings';

export default function CustomerAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'customers' as const, label: '顧客管理', icon: Users },
    { id: 'segments' as const, label: 'セグメント', icon: Target },
    { id: 'rfm' as const, label: 'RFM分析', icon: Star },
    { id: 'behavior' as const, label: '行動分析', icon: Heart },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">顧客分析</h1>
          <p className="text-zinc-500">顧客セグメント・RFM・行動分析</p>
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
      {activeTab === 'customers' && <CustomersTab />}
      {activeTab === 'segments' && <SegmentsTab />}
      {activeTab === 'rfm' && <RfmTab />}
      {activeTab === 'behavior' && <BehaviorTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading } = useSWR('/api/ebay-customer-analytics/dashboard', fetcher);

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
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">総顧客数</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.totalCustomers?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">アクティブ顧客</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.activeCustomers?.toLocaleString() ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">リピート率</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.repeatRate ?? 0}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">平均LTV</p>
              <p className="text-2xl font-bold">${dashboard?.overview?.avgLifetimeValue?.toFixed(2) ?? '0.00'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* セグメント分布 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">セグメント分布</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {dashboard?.segments?.map((seg: { segment: string; count: number; revenue: number; percentage: number }) => (
            <div key={seg.segment} className="p-4 bg-zinc-50 rounded-lg">
              <p className="text-sm text-zinc-500 capitalize">{seg.segment}</p>
              <p className="text-xl font-bold">{seg.count.toLocaleString()}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-zinc-500">{seg.percentage}%</span>
                <span className="text-sm font-medium">${seg.revenue.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* トップ顧客 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">トップ顧客</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">ユーザー</th>
                <th className="text-right py-2">注文数</th>
                <th className="text-right py-2">総支出</th>
                <th className="text-left py-2">最終注文</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.topCustomers?.map((customer: { id: string; username: string; totalOrders: number; totalSpent: number; lastOrder: string }) => (
                <tr key={customer.id} className="border-b">
                  <td className="py-2">{customer.username}</td>
                  <td className="py-2 text-right">{customer.totalOrders}</td>
                  <td className="py-2 text-right">${customer.totalSpent.toFixed(2)}</td>
                  <td className="py-2">{customer.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CustomersTab() {
  const { data, isLoading } = useSWR('/api/ebay-customer-analytics/customers', fetcher);

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
              placeholder="顧客を検索..."
              className="pl-10 pr-4 py-2 border rounded-lg w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            フィルター
          </Button>
        </div>
        <Button variant="outline" size="sm">
          エクスポート
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">ユーザー</th>
                <th className="text-left py-2">セグメント</th>
                <th className="text-right py-2">注文数</th>
                <th className="text-right py-2">総支出</th>
                <th className="text-right py-2">LTV</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((customer: { id: string; username: string; segment: string; metrics: { totalOrders: number; totalSpent: number; lifetimeValue: number }; status: string }) => (
                <tr key={customer.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{customer.username}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      customer.segment === 'champion' ? 'bg-green-100 text-green-700' :
                      customer.segment === 'loyal' ? 'bg-blue-100 text-blue-700' :
                      'bg-zinc-100 text-zinc-700'
                    }`}>{customer.segment}</span>
                  </td>
                  <td className="py-2 text-right">{customer.metrics.totalOrders}</td>
                  <td className="py-2 text-right">${customer.metrics.totalSpent.toFixed(2)}</td>
                  <td className="py-2 text-right">${customer.metrics.lifetimeValue.toFixed(2)}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'
                    }`}>{customer.status}</span>
                  </td>
                  <td className="py-2">
                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
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

function SegmentsTab() {
  const { data, isLoading } = useSWR('/api/ebay-customer-analytics/segments', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">セグメント一覧</h3>
        <Button size="sm">
          <Target className="h-4 w-4 mr-1" />
          セグメント作成
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.map((segment: { id: string; name: string; description: string; customerCount: number; totalRevenue: number; avgLtv: number; type: string }) => (
          <Card key={segment.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{segment.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    segment.type === 'system' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>{segment.type}</span>
                </div>
                <p className="text-sm text-zinc-500">{segment.description}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-zinc-500">顧客数</p>
                  <p className="font-medium">{segment.customerCount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">総収益</p>
                  <p className="font-medium">${segment.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">平均LTV</p>
                  <p className="font-medium">${segment.avgLtv.toFixed(2)}</p>
                </div>
                <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RfmTab() {
  const { data, isLoading } = useSWR('/api/ebay-customer-analytics/rfm', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">RFM分析</h3>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          再計算
        </Button>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-4">セグメント別推奨アクション</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">セグメント</th>
                <th className="text-left py-2">RFM範囲</th>
                <th className="text-right py-2">顧客数</th>
                <th className="text-left py-2">推奨アクション</th>
              </tr>
            </thead>
            <tbody>
              {data?.segments?.map((seg: { segment: string; rfmRange: string; count: number; action: string }) => (
                <tr key={seg.segment} className="border-b">
                  <td className="py-2 font-medium">{seg.segment}</td>
                  <td className="py-2">{seg.rfmRange}</td>
                  <td className="py-2 text-right">{seg.count.toLocaleString()}</td>
                  <td className="py-2">{seg.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h4 className="font-medium mb-4">スコア分布</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data?.distribution?.slice(0, 8).map((item: { rfmScore: string; count: number; label: string }) => (
            <div key={item.rfmScore} className="p-3 bg-zinc-50 rounded-lg text-center">
              <p className="text-lg font-bold">{item.rfmScore}</p>
              <p className="text-sm text-zinc-500">{item.label}</p>
              <p className="font-medium">{item.count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BehaviorTab() {
  const { data: purchase, isLoading: purchaseLoading } = useSWR('/api/ebay-customer-analytics/behavior/purchase', fetcher);

  if (purchaseLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">曜日別購買パターン</h3>
        <div className="grid grid-cols-7 gap-2">
          {purchase?.patterns?.dayOfWeek?.map((day: { day: string; orders: number; revenue: number }) => (
            <div key={day.day} className="text-center p-3 bg-zinc-50 rounded-lg">
              <p className="font-medium">{day.day}</p>
              <p className="text-lg font-bold">{day.orders}</p>
              <p className="text-xs text-zinc-500">${day.revenue.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">時間帯別購買</h3>
        <div className="space-y-2">
          {purchase?.patterns?.timeOfDay?.map((time: { hour: string; orders: number; percentage: number }) => (
            <div key={time.hour} className="flex items-center gap-4">
              <span className="w-16 text-sm">{time.hour}</span>
              <div className="flex-1 bg-zinc-200 rounded-full h-4">
                <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${time.percentage}%` }} />
              </div>
              <span className="w-16 text-sm text-right">{time.orders}件</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">商品親和性</h3>
        <div className="space-y-3">
          {purchase?.productAffinity?.map((affinity: { products: string[]; support: number; confidence: number }, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <div>
                <p className="font-medium">{affinity.products.join(' + ')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm">信頼度: {(affinity.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data: analyticsSettings, isLoading: analyticsLoading } = useSWR('/api/ebay-customer-analytics/settings/analytics', fetcher);

  if (analyticsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">セグメント設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">自動更新</span>
            <span className="text-sm font-medium">{analyticsSettings?.segmentation?.autoUpdate ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">更新頻度</span>
            <span className="text-sm font-medium">{analyticsSettings?.segmentation?.updateFrequency ?? 'daily'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            セグメント設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">トラッキング設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">ブラウズ追跡</span>
            <span className="text-sm font-medium">{analyticsSettings?.tracking?.trackBrowsing ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">検索追跡</span>
            <span className="text-sm font-medium">{analyticsSettings?.tracking?.trackSearch ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">セッションタイムアウト</span>
            <span className="text-sm font-medium">{analyticsSettings?.tracking?.sessionTimeout ?? 30}分</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            トラッキング設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">データ保持</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">履歴データ保持</span>
            <span className="text-sm font-medium">{analyticsSettings?.retention?.historicalDataDays ?? 730}日</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">匿名化までの日数</span>
            <span className="text-sm font-medium">{analyticsSettings?.retention?.anonymizeAfterDays ?? 365}日</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            保持設定
          </Button>
        </div>
      </Card>
    </div>
  );
}

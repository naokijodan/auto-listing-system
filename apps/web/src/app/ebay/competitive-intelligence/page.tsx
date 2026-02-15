'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Target,
  Users,
  TrendingUp,
  Settings,
  BarChart3,
  Search,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  Bell,
  FileText,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
} from 'lucide-react';

type TabType = 'dashboard' | 'competitors' | 'products' | 'alerts' | 'reports' | 'settings';

export default function CompetitiveIntelligencePage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'competitors' as const, label: '競合管理', icon: Users },
    { id: 'products' as const, label: '商品比較', icon: Target },
    { id: 'alerts' as const, label: 'アラート', icon: Bell },
    { id: 'reports' as const, label: 'レポート', icon: FileText },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">競合インテリジェンス</h1>
          <p className="text-zinc-500">競合分析・価格追跡・市場モニタリング</p>
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
      {activeTab === 'competitors' && <CompetitorsTab />}
      {activeTab === 'products' && <ProductsTab />}
      {activeTab === 'alerts' && <AlertsTab />}
      {activeTab === 'reports' && <ReportsTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading } = useSWR('/api/ebay-competitive-intelligence/dashboard', fetcher);

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
              <p className="text-sm text-zinc-500">追跡競合</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.trackedCompetitors ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">追跡商品</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.trackedProducts ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">価格アラート</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.priceAlerts ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">市場順位</p>
              <p className="text-2xl font-bold">#{dashboard?.overview?.marketPosition ?? '-'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 価格比較 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">価格ポジション</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-zinc-500">より安い</p>
            <p className="text-2xl font-bold text-green-600">{dashboard?.priceComparison?.cheaper?.count ?? 0}</p>
            <p className="text-sm text-zinc-500">{dashboard?.priceComparison?.cheaper?.percentage ?? 0}%</p>
          </div>
          <div className="text-center p-4 bg-zinc-50 rounded-lg">
            <p className="text-sm text-zinc-500">同等</p>
            <p className="text-2xl font-bold">{dashboard?.priceComparison?.similar?.count ?? 0}</p>
            <p className="text-sm text-zinc-500">{dashboard?.priceComparison?.similar?.percentage ?? 0}%</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-zinc-500">より高い</p>
            <p className="text-2xl font-bold text-red-600">{dashboard?.priceComparison?.expensive?.count ?? 0}</p>
            <p className="text-sm text-zinc-500">{dashboard?.priceComparison?.expensive?.percentage ?? 0}%</p>
          </div>
        </div>
      </Card>

      {/* 最近の変更 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">最近の価格変更</h3>
        <div className="space-y-3">
          {dashboard?.recentChanges?.map((change: { competitor: string; product: string; change: number; newPrice: number; timestamp: string }, idx: number) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
              <div>
                <p className="font-medium">{change.product}</p>
                <p className="text-sm text-zinc-500">{change.competitor}</p>
              </div>
              <div className="text-right">
                <p className={`font-medium flex items-center ${change.change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {change.change < 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  {Math.abs(change.change)}%
                </p>
                <p className="text-sm">${change.newPrice}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* アラート */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">アクティブアラート</h3>
        <div className="space-y-3">
          {dashboard?.alerts?.map((alert: { id: string; type: string; competitor: string; product: string; impact: string }) => (
            <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${
              alert.impact === 'high' ? 'bg-red-50' : 'bg-amber-50'
            }`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${alert.impact === 'high' ? 'text-red-600' : 'text-amber-600'}`} />
                <div>
                  <p className="font-medium">{alert.type}</p>
                  <p className="text-sm text-zinc-500">{alert.competitor} - {alert.product}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">対処</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CompetitorsTab() {
  const { data, isLoading } = useSWR('/api/ebay-competitive-intelligence/competitors', fetcher);

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
              placeholder="競合を検索..."
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
          競合追加
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.items?.map((competitor: { id: string; name: string; sellerId: string; feedbackScore: number; totalListings: number; trackedProducts: number; avgPriceDiff: number; status: string }) => (
          <Card key={competitor.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">{competitor.name}</h4>
                  <p className="text-sm text-zinc-500">@{competitor.sellerId}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-zinc-500">フィードバック</p>
                  <p className="font-medium">{competitor.feedbackScore}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">リスティング</p>
                  <p className="font-medium">{competitor.totalListings}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">追跡商品</p>
                  <p className="font-medium">{competitor.trackedProducts}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500">平均価格差</p>
                  <p className={`font-medium ${competitor.avgPriceDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {competitor.avgPriceDiff > 0 ? '+' : ''}{competitor.avgPriceDiff}%
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm"><RefreshCw className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProductsTab() {
  const { data, isLoading } = useSWR('/api/ebay-competitive-intelligence/products', fetcher);

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
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          商品追跡
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">商品</th>
                <th className="text-right py-2">自社価格</th>
                <th className="text-right py-2">市場平均</th>
                <th className="text-left py-2">競合価格</th>
                <th className="text-right py-2">順位</th>
                <th className="text-left py-2">推奨</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((product: { id: string; yourListing: { title: string; price: number }; marketAvg: number; competitors: { name: string; price: number; diff: number }[]; yourPosition: number; recommendation: string }) => (
                <tr key={product.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{product.yourListing.title}</td>
                  <td className="py-2 text-right font-medium">${product.yourListing.price}</td>
                  <td className="py-2 text-right">${product.marketAvg}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {product.competitors.slice(0, 2).map((comp: { name: string; price: number; diff: number }) => (
                        <span key={comp.name} className={`px-2 py-0.5 rounded text-xs ${
                          comp.diff < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {comp.name}: ${comp.price}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-right">#{product.yourPosition}</td>
                  <td className="py-2">
                    <span className="text-sm text-blue-600">{product.recommendation}</span>
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

function AlertsTab() {
  const { data, isLoading } = useSWR('/api/ebay-competitive-intelligence/alerts', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">アラート一覧</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">すべて既読</Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            ルール作成
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {data?.items?.map((alert: { id: string; type: string; priority: string; product?: { title: string }; competitor?: { name: string }; details: Record<string, unknown>; status: string; createdAt: string }) => (
          <Card key={alert.id} className={`p-4 ${
            alert.priority === 'high' ? 'border-l-4 border-l-red-500' :
            alert.priority === 'medium' ? 'border-l-4 border-l-amber-500' :
            'border-l-4 border-l-blue-500'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.priority === 'high' ? 'text-red-600' :
                  alert.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                }`} />
                <div>
                  <p className="font-medium">{alert.type}</p>
                  <p className="text-sm text-zinc-500">
                    {alert.competitor?.name} {alert.product?.title ? `- ${alert.product.title}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">{new Date(alert.createdAt).toLocaleString()}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  alert.status === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-700'
                }`}>{alert.status}</span>
                <Button variant="outline" size="sm">詳細</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-4">競合レポート</h3>
          <p className="text-sm text-zinc-500 mb-4">特定の競合の詳細分析レポートを生成します</p>
          <div className="space-y-4">
            <select className="w-full p-2 border rounded-lg">
              <option>競合を選択...</option>
              <option>TechSeller Pro</option>
              <option>AudioKing</option>
            </select>
            <select className="w-full p-2 border rounded-lg">
              <option>過去30日</option>
              <option>過去60日</option>
              <option>過去90日</option>
            </select>
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-1" />
              レポート生成
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-4">市場レポート</h3>
          <p className="text-sm text-zinc-500 mb-4">市場全体の分析レポートを生成します</p>
          <div className="space-y-4">
            <select className="w-full p-2 border rounded-lg">
              <option>カテゴリを選択...</option>
              <option>Electronics</option>
              <option>Audio</option>
              <option>Accessories</option>
            </select>
            <select className="w-full p-2 border rounded-lg">
              <option>過去30日</option>
              <option>過去60日</option>
              <option>過去90日</option>
            </select>
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-1" />
              レポート生成
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">最近のレポート</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
            <div>
              <p className="font-medium">TechSeller Pro 競合分析</p>
              <p className="text-sm text-zinc-500">2026-02-15 生成</p>
            </div>
            <Button variant="outline" size="sm">ダウンロード</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
            <div>
              <p className="font-medium">Electronics 市場レポート</p>
              <p className="text-sm text-zinc-500">2026-02-14 生成</p>
            </div>
            <Button variant="outline" size="sm">ダウンロード</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data: monitoring, isLoading: monitoringLoading } = useSWR('/api/ebay-competitive-intelligence/settings/monitoring', fetcher);
  const { data: notifications, isLoading: notificationsLoading } = useSWR('/api/ebay-competitive-intelligence/settings/notifications', fetcher);

  if (monitoringLoading || notificationsLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">モニタリング設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">競合スキャン頻度</span>
            <span className="text-sm font-medium">{monitoring?.scanFrequency?.competitors ?? 'hourly'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">商品スキャン頻度</span>
            <span className="text-sm font-medium">{monitoring?.scanFrequency?.products ?? 'every_6h'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">価格履歴保持</span>
            <span className="text-sm font-medium">{monitoring?.dataRetention?.priceHistory ?? 90}日</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            モニタリング設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">価格変更通知</span>
            <span className="text-sm font-medium">{notifications?.priceChanges?.enabled ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">しきい値</span>
            <span className="text-sm font-medium">{notifications?.priceChanges?.threshold ?? 5}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">デイリーダイジェスト</span>
            <span className="text-sm font-medium">{notifications?.dailyDigest?.enabled ? '有効' : '無効'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            通知設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">自動追跡設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">自動追跡</span>
            <span className="text-sm font-medium">{monitoring?.autoTracking?.enabled ? '有効' : '無効'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">対象カテゴリ</span>
            <span className="text-sm font-medium">{monitoring?.autoTracking?.categories?.join(', ') ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">最小リスティング数</span>
            <span className="text-sm font-medium">{monitoring?.autoTracking?.minListings ?? 5}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            自動追跡設定
          </Button>
        </div>
      </Card>
    </div>
  );
}

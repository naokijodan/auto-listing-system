
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  RotateCcw,
  DollarSign,
  AlertTriangle,
  FileText,
  Settings,
  TrendingDown,
  CheckCircle,
  Clock,
  Package,
  MessageSquare,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Upload,
  Loader2,
} from 'lucide-react';

type TabType = 'dashboard' | 'returns' | 'refunds' | 'disputes' | 'automation' | 'settings';

export default function ReturnCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: RotateCcw },
    { id: 'returns' as const, label: '返品管理', icon: Package },
    { id: 'refunds' as const, label: '返金管理', icon: DollarSign },
    { id: 'disputes' as const, label: '紛争管理', icon: AlertTriangle },
    { id: 'automation' as const, label: '自動化', icon: RefreshCw },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">返品センター</h1>
          <p className="text-zinc-500">返品・返金・紛争の一元管理</p>
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
      {activeTab === 'returns' && <ReturnsTab />}
      {activeTab === 'refunds' && <RefundsTab />}
      {activeTab === 'disputes' && <DisputesTab />}
      {activeTab === 'automation' && <AutomationTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
}

function DashboardTab() {
  const { data: dashboard, isLoading } = useSWR<any>('/api/ebay-return-center/dashboard', fetcher);

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
              <RotateCcw className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">返品総数</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.totalReturns ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">保留中</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.pendingReturns ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">返品率</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.returnRate ?? 0}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">平均処理日数</p>
              <p className="text-2xl font-bold">{dashboard?.overview?.avgProcessingDays ?? 0}日</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ステータス別・理由別 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-4">ステータス別</h3>
          <div className="space-y-3">
            {dashboard?.byStatus?.map((item: { status: string; count: number; percentage: number }) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm">{item.status}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-zinc-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-4">理由別</h3>
          <div className="space-y-3">
            {dashboard?.byReason?.map((item: { reason: string; count: number; percentage: number }) => (
              <div key={item.reason} className="flex items-center justify-between">
                <span className="text-sm">{item.reason}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-zinc-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 最近の返品 */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">最近の返品</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">返品ID</th>
                <th className="text-left py-2">商品</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-right py-2">金額</th>
                <th className="text-left py-2">日付</th>
              </tr>
            </thead>
            <tbody>
              {dashboard?.recentReturns?.map((item: { id: string; product: string; status: string; amount: number; createdAt: string }) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.id}</td>
                  <td className="py-2">{item.product}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{item.status}</span>
                  </td>
                  <td className="py-2 text-right">${item.amount}</td>
                  <td className="py-2">{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReturnsTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-return-center/returns', fetcher);

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
              placeholder="返品を検索..."
              className="pl-10 pr-4 py-2 border rounded-lg w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            フィルター
          </Button>
        </div>
        <Button variant="outline" size="sm">
          一括処理
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">返品ID</th>
                <th className="text-left py-2">商品</th>
                <th className="text-left py-2">購入者</th>
                <th className="text-left py-2">理由</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-right py-2">金額</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: { id: string; product: { title: string }; buyer: { username: string }; reason: string; status: string; amount: number }) => (
                <tr key={item.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{item.id}</td>
                  <td className="py-2">{item.product.title}</td>
                  <td className="py-2">{item.buyer.username}</td>
                  <td className="py-2">{item.reason}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">{item.status}</span>
                  </td>
                  <td className="py-2 text-right">${item.amount}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><ThumbsUp className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="ghost" size="sm"><ThumbsDown className="h-4 w-4 text-red-600" /></Button>
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

function RefundsTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-return-center/refunds', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">返金一覧</h3>
        <Button variant="outline" size="sm">
          <DollarSign className="h-4 w-4 mr-1" />
          手動返金
        </Button>
      </div>

      <Card className="p-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">返金ID</th>
                <th className="text-left py-2">返品ID</th>
                <th className="text-left py-2">タイプ</th>
                <th className="text-right py-2">金額</th>
                <th className="text-left py-2">方法</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-left py-2">開始日</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: { id: string; returnId: string; type: string; amount: number; method: string; status: string; initiatedAt: string }) => (
                <tr key={item.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{item.id}</td>
                  <td className="py-2">{item.returnId}</td>
                  <td className="py-2">{item.type}</td>
                  <td className="py-2 text-right">${item.amount}</td>
                  <td className="py-2">{item.method}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.status}</span>
                  </td>
                  <td className="py-2">{new Date(item.initiatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DisputesTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-return-center/disputes', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Card className="p-4 flex-1">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm text-zinc-500">オープン紛争</p>
              <p className="text-xl font-bold">{data?.total ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 flex-1">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-zinc-500">期限が近い</p>
              <p className="text-xl font-bold">3</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">紛争一覧</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">紛争ID</th>
                <th className="text-left py-2">タイプ</th>
                <th className="text-left py-2">ステータス</th>
                <th className="text-right py-2">金額</th>
                <th className="text-left py-2">期限</th>
                <th className="text-left py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.items?.map((item: { id: string; type: string; status: string; amount: number; deadline: string }) => (
                <tr key={item.id} className="border-b hover:bg-zinc-50">
                  <td className="py-2">{item.id}</td>
                  <td className="py-2">{item.type}</td>
                  <td className="py-2">
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">{item.status}</span>
                  </td>
                  <td className="py-2 text-right">${item.amount}</td>
                  <td className="py-2">{new Date(item.deadline).toLocaleDateString()}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm"><MessageSquare className="h-4 w-4" /></Button>
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

function AutomationTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-return-center/automation/rules', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">自動化ルール</h3>
        <Button size="sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          ルール追加
        </Button>
      </div>

      <div className="grid gap-4">
        {data?.map((rule: { id: string; name: string; type: string; enabled: boolean; stats: { triggered: number } }) => (
          <Card key={rule.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{rule.name}</h4>
                <p className="text-sm text-zinc-500">タイプ: {rule.type} | 実行回数: {rule.stats.triggered}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  rule.enabled ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'
                }`}>
                  {rule.enabled ? '有効' : '無効'}
                </span>
                <Button variant="outline" size="sm">編集</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR<any>('/api/ebay-return-center/settings/general', fetcher);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">返品ポリシー</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">返品受付</span>
            <span className="text-sm font-medium">{data?.returnPolicy?.acceptReturns ? 'はい' : 'いいえ'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">返品期間</span>
            <span className="text-sm font-medium">{data?.returnPolicy?.returnWindow ?? 30}日</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">再入荷手数料</span>
            <span className="text-sm font-medium">{data?.returnPolicy?.restockingFee ?? 0}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">送料負担</span>
            <span className="text-sm font-medium">{data?.returnPolicy?.shippingPaidBy ?? 'buyer'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            ポリシー編集
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">自動処理</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">初回返品自動承認</span>
            <span className="text-sm font-medium">{data?.autoProcess?.autoApproveFirstTime ? 'はい' : 'いいえ'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">自動承認上限額</span>
            <span className="text-sm font-medium">${data?.autoProcess?.autoApproveUnder ?? 50}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">自動返金までの日数</span>
            <span className="text-sm font-medium">{data?.autoProcess?.autoRefundAfterDays ?? 3}日</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            自動処理設定
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">新規返品</span>
            <span className="text-sm font-medium">{data?.notifications?.newReturn ? '通知あり' : '通知なし'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">紛争開始</span>
            <span className="text-sm font-medium">{data?.notifications?.disputeOpened ? '通知あり' : '通知なし'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">期限リマインダー</span>
            <span className="text-sm font-medium">{data?.notifications?.deadlineReminder ? '通知あり' : '通知なし'}</span>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            <Settings className="h-4 w-4 mr-1" />
            通知設定
          </Button>
        </div>
      </Card>
    </div>
  );
}

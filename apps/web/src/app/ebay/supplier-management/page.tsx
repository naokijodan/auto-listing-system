// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Building2,
  Package,
  ShoppingCart,
  Truck,
  RefreshCw,
  Settings,
  Star,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit,
  Search,
  DollarSign,
  TrendingUp,
  FileText,
  Users,
} from 'lucide-react';

type TabType = 'dashboard' | 'suppliers' | 'orders' | 'receipts' | 'reports' | 'settings';

export default function SupplierManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, label: 'ダッシュボード', icon: Building2 },
    { id: 'suppliers' as const, label: 'サプライヤー', icon: Users },
    { id: 'orders' as const, label: '発注', icon: ShoppingCart },
    { id: 'receipts' as const, label: '入荷', icon: Package },
    { id: 'reports' as const, label: 'レポート', icon: FileText },
    { id: 'settings' as const, label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">サプライヤー管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">サプライヤー・発注・入荷管理</p>
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
                  ? 'border-violet-500 text-violet-600 dark:text-violet-400'
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
        {activeTab === 'suppliers' && <SuppliersTab />}
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'receipts' && <ReceiptsTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data, isLoading } = useSWR('/api/ebay-supplier-management/dashboard', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }

  const dashboard = data || {
    overview: { totalSuppliers: 0, activeSuppliers: 0, totalProducts: 0, pendingOrders: 0 },
    performance: { avgLeadTime: 0, avgQualityScore: 0, onTimeDeliveryRate: 0, defectRate: 0 },
    spending: { thisMonth: 0, lastMonth: 0, change: 0 },
    topSuppliers: [],
    alerts: [],
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
              <Building2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">サプライヤー</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.totalSuppliers}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">商品数</p>
              <p className="text-xl font-bold text-zinc-900 dark:text-white">{dashboard.overview.totalProducts.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/30">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">保留中の発注</p>
              <p className="text-xl font-bold text-amber-600">{dashboard.overview.pendingOrders}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">今月の支出</p>
              <p className="text-xl font-bold text-green-600">${dashboard.spending.thisMonth.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">パフォーマンス指標</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
              <Clock className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.performance.avgLeadTime}</p>
              <p className="text-xs text-zinc-500">平均リードタイム（日）</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
              <Star className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.performance.avgQualityScore}</p>
              <p className="text-xs text-zinc-500">平均品質スコア</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
              <Truck className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{dashboard.performance.onTimeDeliveryRate}%</p>
              <p className="text-xs text-zinc-500">オンタイム配達率</p>
            </div>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-center">
              <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{dashboard.performance.defectRate}%</p>
              <p className="text-xs text-zinc-500">不良率</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">トップサプライヤー</h3>
          <div className="space-y-3">
            {dashboard.topSuppliers.map((s: { id: string; name: string; products: number; spending: number; rating: number }) => (
              <div key={s.id} className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-violet-600">{s.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white text-sm">{s.name}</p>
                    <p className="text-xs text-zinc-500">{s.products}商品</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-zinc-900 dark:text-white">${s.spending.toLocaleString()}</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs text-zinc-500">{s.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {dashboard.alerts.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">アラート</h3>
          <div className="space-y-2">
            {dashboard.alerts.map((alert: { type: string; message: string }, i: number) => (
              <div key={i} className={`flex items-center gap-2 p-3 rounded-lg ${
                alert.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                {alert.type === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-blue-500" />}
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{alert.message}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SuppliersTab() {
  const { data, isLoading } = useSWR('/api/ebay-supplier-management/suppliers', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }

  const suppliers = data?.suppliers || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="サプライヤーを検索..."
              className="pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 w-64"
            />
          </div>
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのステータス</option>
            <option value="active">アクティブ</option>
            <option value="inactive">非アクティブ</option>
          </select>
        </div>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />サプライヤー追加</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {suppliers.map((s: {
          id: string;
          name: string;
          code: string;
          type: string;
          country: string;
          products: number;
          avgLeadTime: number;
          rating: number;
          status: string;
          lastOrder: string;
        }) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <span className="text-lg font-semibold text-violet-600">{s.name.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">{s.name}</h4>
                  <p className="text-xs text-zinc-500">{s.code}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                s.status === 'active' ? 'bg-green-100 text-green-700' :
                s.status === 'inactive' ? 'bg-zinc-100 text-zinc-600' :
                'bg-amber-100 text-amber-700'
              }`}>
                {s.status === 'active' ? 'アクティブ' : s.status === 'inactive' ? '非アクティブ' : '審査中'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              <div>
                <p className="text-zinc-500">タイプ</p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {s.type === 'manufacturer' ? 'メーカー' :
                   s.type === 'wholesaler' ? '卸売' :
                   s.type === 'distributor' ? '代理店' : 'ドロップシップ'}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">国</p>
                <p className="font-medium text-zinc-900 dark:text-white">{s.country}</p>
              </div>
              <div>
                <p className="text-zinc-500">商品数</p>
                <p className="font-medium text-zinc-900 dark:text-white">{s.products}</p>
              </div>
              <div>
                <p className="text-zinc-500">リードタイム</p>
                <p className="font-medium text-zinc-900 dark:text-white">{s.avgLeadTime}日</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= Math.round(s.rating) ? 'text-amber-400 fill-amber-400' : 'text-zinc-300'}`}
                  />
                ))}
                <span className="text-sm text-zinc-500 ml-1">{s.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm"><Edit className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm">詳細</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OrdersTab() {
  const { data, isLoading } = useSWR('/api/ebay-supplier-management/orders', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }

  const orders = data?.orders || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのステータス</option>
            <option value="draft">下書き</option>
            <option value="pending">保留中</option>
            <option value="confirmed">確認済み</option>
            <option value="shipped">出荷済み</option>
            <option value="received">入荷済み</option>
          </select>
        </div>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />新規発注</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">発注ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">サプライヤー</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">商品数</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">予定日</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">ステータス</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {orders.map((o: {
                id: string;
                supplierName: string;
                orderDate: string;
                expectedDate: string;
                items: number;
                totalQuantity: number;
                totalAmount: number;
                status: string;
              }) => (
                <tr key={o.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{o.id}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{o.supplierName}</td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {o.items}種 ({o.totalQuantity}個)
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-white">
                    ${o.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(o.expectedDate).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      o.status === 'draft' ? 'bg-zinc-100 text-zinc-600' :
                      o.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      o.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      o.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                      o.status === 'received' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {o.status === 'draft' ? '下書き' :
                       o.status === 'pending' ? '保留中' :
                       o.status === 'confirmed' ? '確認済み' :
                       o.status === 'shipped' ? '出荷済み' :
                       o.status === 'received' ? '入荷済み' : 'キャンセル'}
                    </span>
                  </td>
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

function ReceiptsTab() {
  const { data, isLoading } = useSWR('/api/ebay-supplier-management/receipts', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }

  const receipts = data?.receipts || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <option value="">すべてのステータス</option>
            <option value="pending">検品中</option>
            <option value="completed">完了</option>
            <option value="partial">一部入荷</option>
          </select>
        </div>
        <Button variant="primary" size="sm"><Plus className="h-4 w-4 mr-1" />入荷登録</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">入荷ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">発注ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">サプライヤー</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">入荷日</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">数量</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">品質問題</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">ステータス</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {receipts.map((r: {
                id: string;
                orderId: string;
                supplierName: string;
                receivedDate: string;
                items: number;
                totalQuantity: number;
                status: string;
                qualityIssues: number;
              }) => (
                <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-white">{r.id}</td>
                  <td className="px-4 py-3 text-sm text-violet-600">{r.orderId}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{r.supplierName}</td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {new Date(r.receivedDate).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-600 dark:text-zinc-400">
                    {r.items}種 ({r.totalQuantity}個)
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.qualityIssues > 0 ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        {r.qualityIssues}件
                      </span>
                    ) : (
                      <span className="text-green-500">✓</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'inspecting' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {r.status === 'pending' ? '保留中' :
                       r.status === 'inspecting' ? '検品中' :
                       r.status === 'completed' ? '完了' : '一部入荷'}
                    </span>
                  </td>
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

function ReportsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">サプライヤーレポート</h3>
          <p className="text-sm text-zinc-500 mb-4">サプライヤーのパフォーマンス、支出、評価を分析</p>
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" />レポート生成</Button>
        </Card>
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">発注レポート</h3>
          <p className="text-sm text-zinc-500 mb-4">発注履歴、支出トレンド、納期遵守率を分析</p>
          <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-1" />レポート生成</Button>
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">支出トレンド</h3>
        <div className="h-48 flex items-end gap-2">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-violet-500 rounded-t"
                style={{ height: `${30 + Math.random() * 100}px` }}
              />
              <span className="text-xs text-zinc-500">{i + 1}月</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data, isLoading } = useSWR('/api/ebay-supplier-management/settings', fetcher);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-violet-500" /></div>;
  }

  const settings = data || {
    general: { defaultPaymentTerms: 'net30', defaultCurrency: 'USD' },
    orders: { requireApproval: true, approvalThreshold: 5000 },
    receiving: { requireInspection: true },
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">デフォルト支払条件</p>
              <p className="text-sm text-zinc-500">新規サプライヤーのデフォルト条件</p>
            </div>
            <select defaultValue={settings.general.defaultPaymentTerms} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <option value="net15">Net 15</option>
              <option value="net30">Net 30</option>
              <option value="net60">Net 60</option>
              <option value="cod">代金引換</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">デフォルト通貨</p>
              <p className="text-sm text-zinc-500">発注のデフォルト通貨</p>
            </div>
            <select defaultValue={settings.general.defaultCurrency} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700">
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="JPY">JPY</option>
              <option value="CNY">CNY</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">発注設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">承認必須</p>
              <p className="text-sm text-zinc-500">発注に承認を必須にする</p>
            </div>
            <input type="checkbox" defaultChecked={settings.orders.requireApproval} className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">承認閾値</p>
              <p className="text-sm text-zinc-500">この金額以上で承認が必要</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">$</span>
              <input
                type="number"
                defaultValue={settings.orders.approvalThreshold}
                className="w-24 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">入荷設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">検品必須</p>
              <p className="text-sm text-zinc-500">入荷時に検品を必須にする</p>
            </div>
            <input type="checkbox" defaultChecked={settings.receiving.requireInspection} className="toggle" />
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="primary">設定を保存</Button>
      </div>
    </div>
  );
}

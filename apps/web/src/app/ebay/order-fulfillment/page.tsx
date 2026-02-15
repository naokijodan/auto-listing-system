'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  RefreshCw,
  RotateCcw,
  Settings,
  Search,
  Filter,
  Play,
  Printer,
  BarChart3,
  ClipboardList,
  Box,
  MapPin,
} from 'lucide-react';

type TabType = 'dashboard' | 'orders' | 'picking' | 'packing' | 'shipping' | 'returns';

export default function OrderFulfillmentPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const { data: dashboard } = useSWR('/api/ebay-order-fulfillment/dashboard', fetcher);
  const { data: orders } = useSWR('/api/ebay-order-fulfillment/orders', fetcher);
  const { data: picking } = useSWR('/api/ebay-order-fulfillment/picking', fetcher);
  const { data: packing } = useSWR('/api/ebay-order-fulfillment/packing', fetcher);
  const { data: shippingQueue } = useSWR('/api/ebay-order-fulfillment/shipping/queue', fetcher);
  const { data: returns } = useSWR('/api/ebay-order-fulfillment/returns', fetcher);
  const { data: fulfillmentReport } = useSWR('/api/ebay-order-fulfillment/reports/fulfillment', fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'orders' as TabType, label: '注文', icon: ClipboardList },
    { id: 'picking' as TabType, label: 'ピッキング', icon: Package },
    { id: 'packing' as TabType, label: 'パッキング', icon: Box },
    { id: 'shipping' as TabType, label: '出荷', icon: Truck },
    { id: 'returns' as TabType, label: '返品', icon: RotateCcw },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'picking': case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'packing': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'shipped': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'delivered': case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'received': case 'processed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '保留中';
      case 'picking': return 'ピッキング中';
      case 'in_progress': return '処理中';
      case 'packing': return 'パッキング中';
      case 'shipped': return '出荷済み';
      case 'delivered': return '配達済み';
      case 'completed': return '完了';
      case 'received': return '受領済み';
      case 'processed': return '処理済み';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">フルフィルメントセンター</h1>
            <p className="text-sm text-zinc-500">注文処理・ピッキング・出荷・返品</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-1" />
            ラベル印刷
          </Button>
          <Button variant="primary" size="sm">
            <Play className="h-4 w-4 mr-1" />
            バッチ処理
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.pendingOrders}</p>
              <p className="text-sm text-zinc-500">保留中</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.processingOrders}</p>
              <p className="text-sm text-zinc-500">処理中</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Truck className="h-5 w-5 text-cyan-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.shippedToday}</p>
              <p className="text-sm text-zinc-500">今日出荷</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.deliveredToday}</p>
              <p className="text-sm text-zinc-500">今日配達</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-2">
                <RotateCcw className="h-5 w-5 text-red-500" />
              </div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{dashboard.returnsPending}</p>
              <p className="text-sm text-zinc-500">返品待ち</p>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">パフォーマンス</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">平均フルフィルメント時間</span>
                  <span className="text-lg font-bold text-zinc-900 dark:text-white">{dashboard.avgFulfillmentTime}日</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-500">オンタイム配送率</span>
                  <span className="text-lg font-bold text-emerald-600">{dashboard.onTimeRate}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">今週の統計</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">{dashboard.stats?.thisWeek?.orders}</p>
                  <p className="text-xs text-zinc-500">注文</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-cyan-600">{dashboard.stats?.thisWeek?.shipped}</p>
                  <p className="text-xs text-zinc-500">出荷</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{dashboard.stats?.thisWeek?.delivered}</p>
                  <p className="text-xs text-zinc-500">配達</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{dashboard.stats?.thisWeek?.returned}</p>
                  <p className="text-xs text-zinc-500">返品</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && orders && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="注文を検索..."
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" />
              フィルター
            </Button>
          </div>

          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">注文番号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">顧客</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">商品数</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">金額</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">ステータス</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">優先度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">日時</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orders.orders?.map((order: any) => (
                  <tr key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">{order.customer}</td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-700 dark:text-zinc-300">{order.items}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-zinc-900 dark:text-white">${order.total?.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.priority === 'express' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        order.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {order.priority === 'express' ? '特急' : order.priority === 'high' ? '高' : '通常'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {new Date(order.createdAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm">詳細</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Picking Tab */}
      {activeTab === 'picking' && picking && (
        <div className="space-y-4">
          {picking.pickingLists?.map((pick: any) => (
            <Card key={pick.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    pick.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    pick.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-emerald-100 dark:bg-emerald-900/30'
                  }`}>
                    <Package className={`h-5 w-5 ${
                      pick.status === 'pending' ? 'text-amber-600' :
                      pick.status === 'in_progress' ? 'text-blue-600' : 'text-emerald-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{pick.orderNumber}</p>
                    <p className="text-sm text-zinc-500">{pick.items}商品 {pick.assignee && `• 担当: ${pick.assignee}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(pick.status)}`}>
                    {getStatusLabel(pick.status)}
                  </span>
                  {pick.status === 'pending' && (
                    <Button variant="primary" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      開始
                    </Button>
                  )}
                  {pick.status === 'in_progress' && (
                    <Button variant="outline" size="sm">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      完了
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Packing Tab */}
      {activeTab === 'packing' && packing && (
        <div className="space-y-4">
          {packing.packingQueue?.map((pack: any) => (
            <Card key={pack.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    pack.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    <Box className={`h-5 w-5 ${
                      pack.status === 'pending' ? 'text-amber-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{pack.orderNumber}</p>
                    <p className="text-sm text-zinc-500">{pack.items}商品 {pack.assignee && `• 担当: ${pack.assignee}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(pack.status)}`}>
                    {getStatusLabel(pack.status)}
                  </span>
                  {pack.status === 'pending' && (
                    <Button variant="primary" size="sm">
                      <Play className="h-4 w-4 mr-1" />
                      開始
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Shipping Tab */}
      {activeTab === 'shipping' && shippingQueue && (
        <div className="space-y-4">
          {shippingQueue.shippingQueue?.map((ship: any) => (
            <Card key={ship.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center dark:bg-cyan-900/30">
                    <Truck className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{ship.orderNumber}</p>
                    <p className="text-sm text-zinc-500">{ship.customer} • {ship.carrier} ({ship.method})</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Printer className="h-4 w-4 mr-1" />
                    ラベル
                  </Button>
                  <Button variant="primary" size="sm">
                    <Truck className="h-4 w-4 mr-1" />
                    出荷
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Returns Tab */}
      {activeTab === 'returns' && returns && (
        <div className="space-y-4">
          {returns.returns?.map((ret: any) => (
            <Card key={ret.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    ret.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30' :
                    ret.status === 'received' ? 'bg-blue-100 dark:bg-blue-900/30' :
                    'bg-emerald-100 dark:bg-emerald-900/30'
                  }`}>
                    <RotateCcw className={`h-5 w-5 ${
                      ret.status === 'pending' ? 'text-amber-600' :
                      ret.status === 'received' ? 'text-blue-600' : 'text-emerald-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{ret.orderNumber}</p>
                    <p className="text-sm text-zinc-500">{ret.customer} • {ret.items}商品 • {ret.reason.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {ret.refundAmount && (
                    <span className="text-sm font-medium text-emerald-600">${ret.refundAmount?.toFixed(2)} 返金済</span>
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(ret.status)}`}>
                    {getStatusLabel(ret.status)}
                  </span>
                  {ret.status === 'pending' && (
                    <Button variant="primary" size="sm">承認</Button>
                  )}
                  {ret.status === 'received' && (
                    <Button variant="primary" size="sm">処理</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

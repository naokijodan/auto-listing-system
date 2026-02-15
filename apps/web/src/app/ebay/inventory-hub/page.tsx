'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Package,
  Warehouse,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  FileText,
  Settings,
  Search,
  Filter,
  Download,
  ClipboardList,
  Truck,
  BarChart3,
} from 'lucide-react';

type TabType = 'dashboard' | 'products' | 'warehouses' | 'restock' | 'stocktake' | 'reports';

export default function InventoryHubPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const { data: dashboard } = useSWR('/api/ebay-inventory-hub/dashboard', fetcher);
  const { data: alertsSummary } = useSWR('/api/ebay-inventory-hub/alerts/summary', fetcher);
  const { data: products } = useSWR('/api/ebay-inventory-hub/products', fetcher);
  const { data: warehouses } = useSWR('/api/ebay-inventory-hub/warehouses', fetcher);
  const { data: restockRecommendations } = useSWR('/api/ebay-inventory-hub/restock/recommendations', fetcher);
  const { data: restockOrders } = useSWR('/api/ebay-inventory-hub/restock/orders', fetcher);
  const { data: stocktakeHistory } = useSWR('/api/ebay-inventory-hub/stocktake/history', fetcher);
  const { data: inventoryReport } = useSWR('/api/ebay-inventory-hub/reports/inventory', fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'products' as TabType, label: '商品在庫', icon: Package },
    { id: 'warehouses' as TabType, label: '倉庫', icon: Warehouse },
    { id: 'restock' as TabType, label: '補充', icon: Truck },
    { id: 'stocktake' as TabType, label: '棚卸', icon: ClipboardList },
    { id: 'reports' as TabType, label: 'レポート', icon: FileText },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'low_stock': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'out_of_stock': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'overstock': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">在庫ハブ</h1>
            <p className="text-sm text-zinc-500">在庫管理・倉庫・補充・棚卸</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            移動
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            エクスポート
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            在庫追加
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
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
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
              <p className="text-sm text-zinc-500">総商品数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.totalProducts?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">総在庫数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.totalUnits?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">在庫金額</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${dashboard.totalValue?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">回転率</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.avgTurnover}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">健全性スコア</p>
              <p className="text-2xl font-bold text-blue-600">
                {dashboard.healthScore}%
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">在庫切れ</p>
                  <p className="text-2xl font-bold text-red-600">{dashboard.outOfStock}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">低在庫</p>
                  <p className="text-2xl font-bold text-amber-600">{dashboard.lowStock}</p>
                </div>
                <Package className="h-8 w-8 text-amber-500" />
              </div>
            </Card>
            <Card className="p-4 border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">過剰在庫</p>
                  <p className="text-2xl font-bold text-blue-600">{dashboard.overStock}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </Card>
          </div>

          {alertsSummary && (
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">最近のアラート</h3>
              <div className="space-y-3">
                {alertsSummary.recent?.map((alert: any) => (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20' :
                    alert.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' :
                    'bg-blue-50 dark:bg-blue-900/20'
                  }`}>
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.severity === 'critical' ? 'text-red-500' :
                        alert.severity === 'warning' ? 'text-amber-500' : 'text-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">{alert.product}</p>
                        <p className="text-sm text-zinc-500">{alert.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {new Date(alert.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && products && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="商品を検索..."
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">商品名</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">在庫</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">予約</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">利用可能</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">倉庫</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">状態</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500">金額</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {products.products?.map((product: any) => (
                  <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-sm font-mono text-zinc-600 dark:text-zinc-400">{product.sku}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-white">{product.title}</td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-700 dark:text-zinc-300">{product.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-500">{product.reserved}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-zinc-900 dark:text-white">{product.available}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{product.warehouse}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(product.status)}`}>
                        {product.status === 'normal' ? '正常' :
                         product.status === 'low_stock' ? '低在庫' :
                         product.status === 'out_of_stock' ? '在庫切れ' : '過剰'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-zinc-700 dark:text-zinc-300">${product.value?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Warehouses Tab */}
      {activeTab === 'warehouses' && warehouses && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              倉庫追加
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {warehouses.warehouses?.map((warehouse: any) => (
              <Card key={warehouse.id} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center dark:bg-orange-900/30">
                      <Warehouse className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{warehouse.name}</p>
                      <p className="text-sm text-zinc-500">{warehouse.location}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    warehouse.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}>
                    {warehouse.status === 'active' ? '稼働中' : '停止'}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">商品数</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{warehouse.products}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500">在庫数</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{warehouse.units?.toLocaleString()}</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-500">使用率</span>
                      <span className="font-medium text-zinc-900 dark:text-white">{warehouse.utilization}%</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                      <div
                        className={`h-full rounded-full ${
                          warehouse.utilization > 90 ? 'bg-red-500' :
                          warehouse.utilization > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${warehouse.utilization}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    詳細
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Restock Tab */}
      {activeTab === 'restock' && restockRecommendations && restockOrders && (
        <div className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">補充推奨</h3>
            <div className="space-y-3">
              {restockRecommendations.recommendations?.map((rec: any) => (
                <div key={rec.productId} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      rec.priority === 'critical' ? 'bg-red-500' :
                      rec.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{rec.title}</p>
                      <p className="text-sm text-zinc-500">SKU: {rec.sku} • 現在: {rec.current} • 発注点: {rec.reorderPoint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">推奨: {rec.recommended}個</p>
                      <p className="text-sm text-zinc-500">${rec.estimatedCost?.toLocaleString()}</p>
                    </div>
                    <Button variant="primary" size="sm">発注</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">発注履歴</h3>
            <div className="space-y-3">
              {restockOrders.orders?.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{order.supplier}</p>
                    <p className="text-sm text-zinc-500">{order.items}商品 • {order.createdAt}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-zinc-900 dark:text-white">${order.totalAmount?.toLocaleString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {order.status === 'delivered' ? '入荷済み' : order.status === 'shipped' ? '配送中' : '保留中'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Stocktake Tab */}
      {activeTab === 'stocktake' && stocktakeHistory && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="primary" size="sm">
              <ClipboardList className="h-4 w-4 mr-1" />
              棚卸開始
            </Button>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">棚卸履歴</h3>
            <div className="space-y-3">
              {stocktakeHistory.history?.map((st: any) => (
                <div key={st.id} className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center dark:bg-zinc-800">
                      <ClipboardList className="h-5 w-5 text-zinc-600" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{st.warehouse} - {st.type === 'full' ? '全体' : 'サイクル'}</p>
                      <p className="text-sm text-zinc-500">{st.products}商品 • {st.completedAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {st.variance > 0 && (
                      <span className="text-sm text-amber-600">{st.variance}件の差異</span>
                    )}
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs dark:bg-emerald-900/30 dark:text-emerald-400">
                      完了
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && inventoryReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">総商品数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {inventoryReport.summary?.totalProducts?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">総在庫数</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {inventoryReport.summary?.totalUnits?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">総在庫金額</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${inventoryReport.summary?.totalValue?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">平均単価</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                ${inventoryReport.summary?.avgValue?.toFixed(2)}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">ステータス別</h3>
              <div className="space-y-3">
                {inventoryReport.byStatus?.map((item: any) => (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {item.status === 'normal' ? '正常' :
                         item.status === 'low_stock' ? '低在庫' :
                         item.status === 'out_of_stock' ? '在庫切れ' : '過剰'}
                      </span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{item.products}商品</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                      <div
                        className={`h-full rounded-full ${
                          item.status === 'normal' ? 'bg-emerald-500' :
                          item.status === 'low_stock' ? 'bg-amber-500' :
                          item.status === 'out_of_stock' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">倉庫別</h3>
              <div className="space-y-3">
                {inventoryReport.byWarehouse?.map((item: any) => (
                  <div key={item.warehouse} className="flex items-center justify-between py-2">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{item.warehouse}</span>
                    <div className="text-right">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{item.products}商品</p>
                      <p className="text-sm text-zinc-500">${item.value?.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

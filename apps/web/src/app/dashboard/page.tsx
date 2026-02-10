'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  DollarSign,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  Pause,
  Clock
} from 'lucide-react';

interface DashboardStats {
  listings: {
    active: number;
    paused: number;
    pending: number;
    total: number;
  };
  byMarketplace: Array<{ marketplace: string; count: number }>;
}

interface ProfitSummary {
  totalProfitJpy: number;
  averageProfitJpy: number;
  safeCount: number;
  dangerousCount: number;
}

interface AlertItem {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'error' | 'info';
}

interface RecentOrder {
  id: string;
  productTitle: string;
  marketplace: string;
  profitJpy: number;
  orderedAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profit, setProfit] = useState<ProfitSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // モックデータ（後でAPIに置き換え）
    setStats({
      listings: { active: 28, paused: 14, pending: 5, total: 47 },
      byMarketplace: [
        { marketplace: 'JOOM', count: 33 },
        { marketplace: 'EBAY', count: 14 },
      ],
    });
    setProfit({
      totalProfitJpy: 125000,
      averageProfitJpy: 8500,
      safeCount: 42,
      dangerousCount: 3,
    });
    setAlerts([]);
    setRecentOrders([
      {
        id: 'ord-001',
        productTitle: 'セイコー プレサージュ SARX055',
        marketplace: 'JOOM',
        profitJpy: 12500,
        orderedAt: '2026-02-09T14:30:00Z',
      },
      {
        id: 'ord-002',
        productTitle: 'オリエント バンビーノ SAC00004B0',
        marketplace: 'JOOM',
        profitJpy: 8200,
        orderedAt: '2026-02-08T09:15:00Z',
      },
      {
        id: 'ord-003',
        productTitle: 'シチズン プロマスター BN0150-28E',
        marketplace: 'JOOM',
        profitJpy: 9800,
        orderedAt: '2026-02-07T18:45:00Z',
      },
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>

      {/* 出品統計 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listings.active}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">出品中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <Pause className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listings.paused}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">一時停止</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listings.pending}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">出品待ち</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.listings.total}</div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">合計</p>
          </CardContent>
        </Card>
      </div>

      {/* 利益サマリー & マーケットプレイス別 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              利益サマリー
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400">累計利益</span>
              <span className="font-bold text-lg">¥{profit?.totalProfitJpy.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400">平均利益/件</span>
              <span className="font-medium">¥{profit?.averageProfitJpy.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400">健全取引</span>
              <Badge variant="success">{profit?.safeCount}件</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-600 dark:text-zinc-400">要注意取引</span>
              <Badge variant="error">{profit?.dangerousCount}件</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              マーケットプレイス別
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.byMarketplace.map((m) => (
              <div key={m.marketplace} className="flex justify-between py-3 border-b border-zinc-200 dark:border-zinc-700 last:border-0">
                <span className="text-zinc-600 dark:text-zinc-400">{m.marketplace}</span>
                <Badge variant="default">{m.count}件</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* アラート */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            アラート
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-zinc-400" />
              <div>
                <p className="font-medium text-zinc-700 dark:text-zinc-300">在庫監視</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  現在アクティブなアラートはありません
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start gap-3 p-4 rounded-lg ${
                    alert.type === 'error'
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : alert.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-900/20'
                      : 'bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <AlertTriangle
                    className={`h-4 w-4 mt-0.5 ${
                      alert.type === 'error'
                        ? 'text-red-500'
                        : alert.type === 'warning'
                        ? 'text-amber-500'
                        : 'text-blue-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">{alert.title}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 最近の注文 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            最近の注文
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400 text-center py-4">
              注文履歴がありません
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {order.productTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="info">{order.marketplace}</Badge>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(order.orderedAt).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      +¥{order.profitJpy.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

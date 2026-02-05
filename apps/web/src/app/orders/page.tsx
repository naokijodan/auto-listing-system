'use client';

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOrders, useOrderStats, Order } from '@/lib/hooks';
import { patchApi } from '@/lib/api';
import {
  Search,
  Filter,
  Package,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  MapPin,
} from 'lucide-react';

const statusLabels: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: '保留中', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  CONFIRMED: { label: '確認済', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
  PROCESSING: { label: '処理中', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Package },
  SHIPPED: { label: '発送済', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Truck },
  DELIVERED: { label: '配達完了', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  CANCELLED: { label: 'キャンセル', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  REFUNDED: { label: '返金済', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  DISPUTE: { label: '紛争中', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: AlertCircle },
};

const paymentStatusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: '未払い', color: 'text-yellow-600 dark:text-yellow-400' },
  PAID: { label: '支払済', color: 'text-emerald-600 dark:text-emerald-400' },
  REFUNDED: { label: '返金済', color: 'text-orange-600 dark:text-orange-400' },
  FAILED: { label: '失敗', color: 'text-red-600 dark:text-red-400' },
};

const marketplaceLabels: Record<string, { label: string; color: string }> = {
  EBAY: { label: 'eBay', color: 'bg-blue-500' },
  JOOM: { label: 'Joom', color: 'bg-orange-500' },
};

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const { data: ordersResponse, isLoading, mutate } = useOrders({
    status: statusFilter || undefined,
    marketplace: marketplaceFilter || undefined,
    limit: 100,
  });
  const { data: statsResponse } = useOrderStats();

  const orders = ordersResponse?.data || [];
  const stats = statsResponse?.data;

  // Client-side search filter
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter((order) =>
      order.marketplaceOrderId.toLowerCase().includes(query) ||
      order.buyerUsername.toLowerCase().includes(query) ||
      order.buyerName?.toLowerCase().includes(query) ||
      order.sales.some((s) => s.title.toLowerCase().includes(query))
    );
  }, [orders, searchQuery]);

  const handleCopyOrderId = (orderId: string) => {
    navigator.clipboard.writeText(orderId);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await patchApi(`/api/orders/${orderId}`, { status: newStatus });
      mutate();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleAddTracking = async (orderId: string) => {
    const trackingNumber = prompt('追跡番号を入力してください:');
    if (!trackingNumber) return;

    const carrier = prompt('配送業者を入力してください (例: Japan Post, DHL, FedEx):');
    if (!carrier) return;

    try {
      await patchApi(`/api/orders/${orderId}`, {
        trackingNumber,
        trackingCarrier: carrier,
        status: 'SHIPPED',
        fulfillmentStatus: 'FULFILLED',
      });
      mutate();
    } catch (error) {
      console.error('Failed to add tracking:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">注文管理</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            eBay・Joomからの注文を管理
          </p>
        </div>
        <Button variant="outline" onClick={() => mutate()} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          更新
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="総注文数"
            value={stats.totalOrders}
            icon={Package}
            color="blue"
          />
          <StatCard
            title="要対応"
            value={stats.pendingOrders}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="発送待ち"
            value={stats.paidOrders}
            icon={Truck}
            color="purple"
          />
          <StatCard
            title="売上"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="emerald"
            subtext={`利益: $${stats.totalProfit.toLocaleString()}`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="注文ID、購入者名、商品名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのステータス</option>
          {Object.entries(statusLabels).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <select
          value={marketplaceFilter}
          onChange={(e) => setMarketplaceFilter(e.target.value)}
          className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">すべてのマーケット</option>
          <option value="EBAY">eBay</option>
          <option value="JOOM">Joom</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )}

      {/* Orders List */}
      {!isLoading && (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                <p className="mt-4 text-zinc-500 dark:text-zinc-400">
                  注文がありません
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isExpanded={expandedOrderId === order.id}
                onToggle={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                onCopyOrderId={handleCopyOrderId}
                onUpdateStatus={handleUpdateStatus}
                onAddTracking={handleAddTracking}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: typeof Package;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
  subtext?: string;
}

function StatCard({ title, value, icon: Icon, color, subtext }: StatCardProps) {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('rounded-lg p-2.5', colorStyles[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">{value}</p>
            {subtext && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface OrderCardProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  onCopyOrderId: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onAddTracking: (id: string) => void;
}

function OrderCard({ order, isExpanded, onToggle, onCopyOrderId, onUpdateStatus, onAddTracking }: OrderCardProps) {
  const status = statusLabels[order.status] || statusLabels.PENDING;
  const paymentStatus = paymentStatusLabels[order.paymentStatus] || paymentStatusLabels.PENDING;
  const marketplace = marketplaceLabels[order.marketplace] || marketplaceLabels.EBAY;
  const StatusIcon = status.icon;

  const orderDate = new Date(order.orderedAt);
  const isActionRequired = order.paymentStatus === 'PAID' && order.fulfillmentStatus === 'UNFULFILLED';

  return (
    <Card className={cn(isActionRequired && 'border-amber-500 dark:border-amber-400')}>
      <CardContent className="p-0">
        {/* Header Row */}
        <div
          className="flex cursor-pointer items-center justify-between p-4"
          onClick={onToggle}
        >
          <div className="flex items-center gap-4">
            {/* Marketplace Badge */}
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center text-white text-xs font-bold', marketplace.color)}>
              {marketplace.label.substring(0, 2)}
            </div>

            {/* Order Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-900 dark:text-white">
                  {order.marketplaceOrderId}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyOrderId(order.marketplaceOrderId);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', status.color)}>
                  {status.label}
                </span>
                {isActionRequired && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    要対応
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                <span>{order.buyerUsername}</span>
                <span>•</span>
                <span>{orderDate.toLocaleDateString()}</span>
                <span>•</span>
                <span className={paymentStatus.color}>{paymentStatus.label}</span>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                ${order.total.toFixed(2)}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {order.sales.reduce((sum, s) => sum + s.quantity, 0)}点
              </p>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-zinc-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-zinc-400" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Items */}
              <div className="lg:col-span-2">
                <h4 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  商品明細
                </h4>
                <div className="space-y-2">
                  {order.sales.map((sale) => (
                    <div
                      key={sale.id}
                      className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                    >
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {sale.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          SKU: {sale.sku} • 数量: {sale.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${sale.totalPrice.toFixed(2)}</p>
                        {sale.profitRate && (
                          <p className={cn(
                            'text-xs',
                            sale.profitRate > 0 ? 'text-emerald-600' : 'text-red-600'
                          )}>
                            利益率: {sale.profitRate.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">小計</span>
                    <span>${order.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">送料</span>
                    <span>${order.shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">税金</span>
                    <span>${order.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">マーケット手数料</span>
                    <span className="text-red-600">-${order.marketplaceFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold dark:border-zinc-700">
                    <span>合計</span>
                    <span>${order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Info */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  配送先
                </h4>
                <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />
                    <div className="text-sm">
                      <p className="font-medium">{order.buyerName || order.buyerUsername}</p>
                      {order.shippingAddress.street && <p>{order.shippingAddress.street}</p>}
                      <p>
                        {[
                          order.shippingAddress.city,
                          order.shippingAddress.state,
                          order.shippingAddress.postalCode,
                        ].filter(Boolean).join(', ')}
                      </p>
                      <p className="font-medium">{order.shippingAddress.country}</p>
                    </div>
                  </div>
                </div>

                {/* Tracking Info */}
                {order.trackingNumber && (
                  <div className="mt-3">
                    <h4 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      追跡情報
                    </h4>
                    <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {order.trackingCarrier}
                      </p>
                      <p className="text-sm">{order.trackingNumber}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 space-y-2">
                  {!order.trackingNumber && order.paymentStatus === 'PAID' && (
                    <Button
                      className="w-full"
                      onClick={() => onAddTracking(order.id)}
                    >
                      <Truck className="h-4 w-4" />
                      追跡番号を追加
                    </Button>
                  )}
                  {order.status === 'PENDING' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onUpdateStatus(order.id, 'CONFIRMED')}
                    >
                      <CheckCircle className="h-4 w-4" />
                      注文を確認
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

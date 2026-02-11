'use client';

import { useState } from 'react';
import {
  Package,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Clock,
  ShoppingCart,
  Truck,
  XCircle,
  ClipboardCheck,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { usePendingSourcing, useSourcingStats, SourcingOrder, SourcingStatus } from '@/lib/hooks';
import { patchApi, postApi } from '@/lib/api';
import { cn } from '@/lib/utils';

// 仕入れステータスの定義
const SOURCING_STATUSES: { value: SourcingStatus; label: string; color: string; icon: React.ElementType }[] = [
  { value: 'PENDING', label: '未確認', color: 'zinc', icon: Clock },
  { value: 'CONFIRMED', label: '確認済み', color: 'blue', icon: ClipboardCheck },
  { value: 'ORDERED', label: '発注済み', color: 'purple', icon: ShoppingCart },
  { value: 'RECEIVED', label: '入荷済み', color: 'green', icon: Package },
  { value: 'UNAVAILABLE', label: '入手不可', color: 'red', icon: XCircle },
];

// Stats Card Component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) {
  const colorClasses: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
          {subtext && (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtext}</p>
          )}
        </div>
        <div className={cn('rounded-lg p-3', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

// Sourcing Card Component
function SourcingCard({
  order,
  onUpdateStatus,
  isProcessing,
}: {
  order: SourcingOrder;
  onUpdateStatus: (orderId: string, status: SourcingStatus, notes?: string, costPrice?: number) => void;
  isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<SourcingStatus>(order.sourcingStatus);
  const [notes, setNotes] = useState(order.sourcingNotes || '');
  const [costPrice, setCostPrice] = useState(order.costPrice?.toString() || '');
  const [showForm, setShowForm] = useState(false);

  const currentStatus = SOURCING_STATUSES.find((s) => s.value === order.sourcingStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStatus(
      order.id,
      selectedStatus,
      notes || undefined,
      costPrice ? parseFloat(costPrice) : undefined
    );
    setShowForm(false);
  };

  const marketplaceColors: Record<string, string> = {
    JOOM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    EBAY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  const statusColorClasses: Record<string, string> = {
    PENDING: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    ORDERED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    RECEIVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    UNAVAILABLE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              marketplaceColors[order.marketplace] || 'bg-zinc-100 text-zinc-700'
            )}
          >
            {order.marketplace}
          </span>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              {order.marketplaceOrderId}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {order.buyerName || order.buyerUsername}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
              statusColorClasses[order.sourcingStatus]
            )}
          >
            {currentStatus && <currentStatus.icon className="h-3 w-3" />}
            {currentStatus?.label}
          </span>
          <span className="font-medium text-zinc-900 dark:text-white">
            {order.total.toFixed(2)} {order.currency}
          </span>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-zinc-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-zinc-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Order Items with Source Info */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                商品・仕入れ元
              </h4>
              <div className="space-y-3">
                {order.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">
                          {sale.title.slice(0, 60)}...
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          SKU: {sale.sku || 'N/A'} | 数量: {sale.quantity}
                        </p>
                        {sale.product?.brand && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            ブランド: {sale.product.brand}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        ¥{sale.product?.price?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                    {sale.product?.sourceUrl && (
                      <a
                        href={sale.product.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        仕入れ元を開く
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Order Info & Status Update */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                注文情報
              </h4>
              <div className="space-y-2 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800">
                <div className="flex justify-between">
                  <span className="text-zinc-500 dark:text-zinc-400">注文日</span>
                  <span className="font-medium text-zinc-900 dark:text-white">
                    {new Date(order.orderedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                {order.costPrice && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">仕入れコスト</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      ¥{order.costPrice.toLocaleString()}
                    </span>
                  </div>
                )}
                {order.supplierOrderId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">仕入れ注文ID</span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {order.supplierOrderId}
                    </span>
                  </div>
                )}
                {order.sourcingNotes && (
                  <div className="border-t border-zinc-200 pt-2 dark:border-zinc-700">
                    <span className="text-zinc-500 dark:text-zinc-400">メモ</span>
                    <p className="mt-1 text-zinc-900 dark:text-white">{order.sourcingNotes}</p>
                  </div>
                )}
              </div>

              {/* Status Update Form */}
              {!showForm ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowForm(true);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  ステータス更新
                </button>
              ) : (
                <form onSubmit={handleSubmit} className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      ステータス
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as SourcingStatus)}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {SOURCING_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      仕入れコスト（円）
                    </label>
                    <input
                      type="number"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="例: 5000"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      メモ
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="仕入れに関するメモ..."
                      rows={2}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SourcingPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const { data: sourcingData, error: sourcingError, mutate } = usePendingSourcing({
    status: statusFilter || undefined,
    marketplace: marketplaceFilter || undefined,
    limit: 100,
  });
  const { data: statsData } = useSourcingStats();

  const orders = sourcingData?.data || [];
  const stats = statsData?.data;
  const statusCounts = sourcingData?.statusCounts || {};

  // Filter by search
  const filteredOrders = orders.filter((o) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      o.marketplaceOrderId.toLowerCase().includes(searchLower) ||
      (o.buyerName && o.buyerName.toLowerCase().includes(searchLower)) ||
      o.buyerUsername.toLowerCase().includes(searchLower) ||
      o.sales.some((sale) => sale.title.toLowerCase().includes(searchLower))
    );
  });

  const handleUpdateStatus = async (
    orderId: string,
    status: SourcingStatus,
    notes?: string,
    costPrice?: number
  ) => {
    try {
      setProcessingOrderId(orderId);
      await patchApi(`/api/sourcing/${orderId}/status`, {
        status,
        notes,
        costPrice,
      });
      // Refresh data
      mutate();
    } catch (error) {
      console.error('Status update failed:', error);
    } finally {
      setProcessingOrderId(null);
    }
  };

  if (sourcingError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-red-500">
          <AlertCircle className="h-8 w-8" />
          <p>データの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">仕入れ管理</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          注文の仕入れ状況を管理します
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="未確認"
          value={stats?.byStatus?.PENDING || 0}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="確認済み"
          value={stats?.byStatus?.CONFIRMED || 0}
          icon={ClipboardCheck}
          color="blue"
        />
        <StatCard
          title="発注済み"
          value={stats?.byStatus?.ORDERED || 0}
          icon={ShoppingCart}
          color="purple"
        />
        <StatCard
          title="入荷済み"
          value={stats?.byStatus?.RECEIVED || 0}
          icon={Truck}
          color="green"
          subtext="発送準備OK"
        />
        <StatCard
          title="入手不可"
          value={stats?.byStatus?.UNAVAILABLE || 0}
          icon={AlertTriangle}
          color="red"
          subtext="対応必要"
        />
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">総仕入れコスト</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
              ¥{stats.costSummary.totalCost.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {stats.costSummary.ordersWithCost}件の注文
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">平均仕入れコスト</p>
            <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
              ¥{Math.round(stats.costSummary.averageCost).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">要対応</p>
            <p className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
              {stats.needsAttention}件
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              未確認 + 入手不可
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="注文ID、購入者、商品名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-4 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">全ステータス</option>
            {SOURCING_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label} ({statusCounts[s.value] || 0})
              </option>
            ))}
          </select>
        </div>

        {/* Marketplace Filter */}
        <select
          value={marketplaceFilter}
          onChange={(e) => setMarketplaceFilter(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">全マーケットプレイス</option>
          <option value="JOOM">Joom</option>
          <option value="EBAY">eBay</option>
        </select>
      </div>

      {/* Orders List */}
      {!sourcingData ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p className="mt-2 text-lg font-medium text-zinc-900 dark:text-white">
            仕入れ待ちの注文はありません
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            すべての注文が処理済みです
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredOrders.length}件の仕入れ待ち注文
          </p>
          {filteredOrders.map((order) => (
            <SourcingCard
              key={order.id}
              order={order}
              onUpdateStatus={handleUpdateStatus}
              isProcessing={processingOrderId === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

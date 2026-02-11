'use client';

import { useState } from 'react';
import {
  Truck,
  Package,
  AlertCircle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Send,
  Calendar,
  MapPin,
  Loader2,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';
import { usePendingShipments, useShipmentStats, useCarriers, PendingShipment } from '@/lib/hooks';
import { postApi } from '@/lib/api';
import { cn } from '@/lib/utils';

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

// Shipment Card Component
function ShipmentCard({
  shipment,
  carriers,
  onShip,
  isProcessing,
}: {
  shipment: PendingShipment;
  carriers: { id: string; name: string; nameJa: string }[];
  onShip: (orderId: string, trackingNumber: string, carrier: string) => void;
  isProcessing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber && carrier) {
      onShip(shipment.id, trackingNumber, carrier);
      setTrackingNumber('');
      setCarrier('');
      setShowForm(false);
    }
  };

  const marketplaceColors: Record<string, string> = {
    JOOM: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    EBAY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div
      className={cn(
        'rounded-xl border bg-white dark:bg-zinc-900 transition-all',
        shipment.isUrgent
          ? 'border-red-300 dark:border-red-800'
          : 'border-zinc-200 dark:border-zinc-800'
      )}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium',
              marketplaceColors[shipment.marketplace] || 'bg-zinc-100 text-zinc-700'
            )}
          >
            {shipment.marketplace}
          </span>
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              {shipment.marketplaceOrderId}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {shipment.buyerName || shipment.buyerUsername}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {shipment.isUrgent && (
            <span className="flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="h-3 w-3" />
              緊急
            </span>
          )}
          {shipment.hoursRemaining !== null && (
            <span className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
              <Clock className="h-4 w-4" />
              残り {shipment.hoursRemaining}時間
            </span>
          )}
          <span className="font-medium text-zinc-900 dark:text-white">
            {shipment.total.toFixed(2)} {shipment.currency}
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
            {/* Order Items */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                商品
              </h4>
              <div className="space-y-2">
                {shipment.sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-50 p-2 dark:bg-zinc-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {sale.title.slice(0, 50)}...
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        SKU: {sale.sku || 'N/A'}
                      </p>
                    </div>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      x{sale.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                配送先
              </h4>
              <div className="flex items-start gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800">
                <MapPin className="mt-0.5 h-4 w-4 text-zinc-400" />
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {shipment.shippingAddress.street && (
                    <p>{shipment.shippingAddress.street}</p>
                  )}
                  <p>
                    {[
                      shipment.shippingAddress.city,
                      shipment.shippingAddress.state,
                      shipment.shippingAddress.postalCode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="font-medium">{shipment.shippingAddress.country}</p>
                </div>
              </div>

              {/* Order Info */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">注文日:</span>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {new Date(shipment.orderedAt).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                {shipment.shipmentDeadline && (
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">発送期限:</span>
                    <p
                      className={cn(
                        'font-medium',
                        shipment.isUrgent
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-zinc-900 dark:text-white'
                      )}
                    >
                      {new Date(shipment.shipmentDeadline).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ship Form */}
          {!showForm ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowForm(true);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
            >
              <Send className="h-4 w-4" />
              発送処理
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    配送業者
                  </label>
                  <select
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    required
                  >
                    <option value="">選択してください</option>
                    {carriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameJa} ({c.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    追跡番号
                  </label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="例: 1234567890"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    required
                  />
                </div>
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
                  発送完了
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
      )}
    </div>
  );
}

export default function ShipmentsPage() {
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const { data: shipmentsData, error: shipmentsError, mutate } = usePendingShipments({
    marketplace: marketplaceFilter || undefined,
    urgentOnly,
    limit: 100,
  });
  const { data: statsData } = useShipmentStats();
  const { data: carriersData } = useCarriers();

  const shipments = shipmentsData?.data || [];
  const stats = statsData?.data;
  const carriers = carriersData?.data || [];

  // Filter by search
  const filteredShipments = shipments.filter((s) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      s.marketplaceOrderId.toLowerCase().includes(searchLower) ||
      (s.buyerName && s.buyerName.toLowerCase().includes(searchLower)) ||
      s.buyerUsername.toLowerCase().includes(searchLower) ||
      s.sales.some((sale) => sale.title.toLowerCase().includes(searchLower))
    );
  });

  const handleShip = async (orderId: string, trackingNumber: string, carrier: string) => {
    try {
      setProcessingOrderId(orderId);
      await postApi('/api/shipments', {
        orderId,
        trackingNumber,
        carrier,
      });
      // Refresh data
      mutate();
    } catch (error) {
      console.error('Shipment failed:', error);
    } finally {
      setProcessingOrderId(null);
    }
  };

  if (shipmentsError) {
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">発送管理</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          未発送注文の管理と発送処理を行います
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="未発送"
          value={stats?.pending || 0}
          icon={Package}
          color="amber"
          subtext="処理待ち"
        />
        <StatCard
          title="緊急"
          value={stats?.urgent || 0}
          icon={AlertTriangle}
          color="red"
          subtext="24時間以内"
        />
        <StatCard
          title="本日発送"
          value={stats?.shippedToday || 0}
          icon={Truck}
          color="green"
          subtext="完了済み"
        />
        <StatCard
          title="累計発送"
          value={stats?.totalShipped || 0}
          icon={BarChart3}
          color="blue"
        />
      </div>

      {/* Marketplace Breakdown */}
      {stats?.byMarketplace && Object.keys(stats.byMarketplace).length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            マーケットプレイス別未発送
          </h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(stats.byMarketplace).map(([mp, count]) => (
              <div
                key={mp}
                className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800"
              >
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    mp === 'JOOM'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  )}
                >
                  {mp}
                </span>
                <span className="font-medium text-zinc-900 dark:text-white">{count}件</span>
              </div>
            ))}
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

        {/* Marketplace Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
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

        {/* Urgent Only Toggle */}
        <button
          onClick={() => setUrgentOnly(!urgentOnly)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            urgentOnly
              ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
              : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          緊急のみ
        </button>
      </div>

      {/* Shipments List */}
      {!shipmentsData ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p className="mt-2 text-lg font-medium text-zinc-900 dark:text-white">
            未発送の注文はありません
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            すべての注文が発送済みです
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filteredShipments.length}件の未発送注文
            {shipmentsData.urgentCount > 0 && (
              <span className="ml-2 text-red-500">
                （うち{shipmentsData.urgentCount}件が緊急）
              </span>
            )}
          </p>
          {filteredShipments.map((shipment) => (
            <ShipmentCard
              key={shipment.id}
              shipment={shipment}
              carriers={carriers}
              onShip={handleShip}
              isProcessing={processingOrderId === shipment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

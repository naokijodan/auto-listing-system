'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  ChevronRight,
  ExternalLink,
  Printer,
  Tag,
  BarChart3,
  Settings,
  FileText,
  Send,
  RotateCcw,
  Plus,
  Edit3,
  Trash2,
  Plane,
  Ship,
  Timer,
  DollarSign,
  Shield,
  Calendar,
  User,
  Globe,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';

const fetcher2 = (url: string) => fetcher(url);

// 型定義
type ShipmentStatus = 'PENDING' | 'LABEL_CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION' | 'RETURNED';
type Carrier = 'USPS' | 'FEDEX' | 'UPS' | 'DHL' | 'YAMATO' | 'SAGAWA' | 'JAPAN_POST' | 'EMS' | 'OTHER';

interface TrackingEvent {
  timestamp: string;
  status: ShipmentStatus;
  location: string;
  description: string;
}

interface Shipment {
  id: string;
  orderId: string;
  orderNumber: string;
  listingId: string;
  itemTitle: string;
  buyerName: string;
  buyerAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  carrier: Carrier;
  trackingNumber: string;
  status: ShipmentStatus;
  labelUrl?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  weight: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  shippingCost: number;
  currency: string;
  insuranceAmount?: number;
  signatureRequired: boolean;
  events: TrackingEvent[];
  exception?: {
    type: string;
    description: string;
    occurredAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<ShipmentStatus, { label: string; color: string; icon: typeof Clock; bgColor: string }> = {
  PENDING: { label: '出荷待ち', color: 'text-zinc-600', icon: Clock, bgColor: 'bg-zinc-100' },
  LABEL_CREATED: { label: 'ラベル作成済', color: 'text-blue-600', icon: Tag, bgColor: 'bg-blue-50' },
  PICKED_UP: { label: '集荷済', color: 'text-indigo-600', icon: Send, bgColor: 'bg-indigo-50' },
  IN_TRANSIT: { label: '輸送中', color: 'text-purple-600', icon: Truck, bgColor: 'bg-purple-50' },
  OUT_FOR_DELIVERY: { label: '配達中', color: 'text-amber-600', icon: MapPin, bgColor: 'bg-amber-50' },
  DELIVERED: { label: '配達完了', color: 'text-emerald-600', icon: CheckCircle, bgColor: 'bg-emerald-50' },
  EXCEPTION: { label: '配送例外', color: 'text-red-600', icon: AlertTriangle, bgColor: 'bg-red-50' },
  RETURNED: { label: '返送済', color: 'text-orange-600', icon: RotateCcw, bgColor: 'bg-orange-50' },
};

const carrierConfig: Record<Carrier, { label: string; color: string }> = {
  USPS: { label: 'USPS', color: 'bg-blue-100 text-blue-700' },
  FEDEX: { label: 'FedEx', color: 'bg-purple-100 text-purple-700' },
  UPS: { label: 'UPS', color: 'bg-amber-100 text-amber-700' },
  DHL: { label: 'DHL', color: 'bg-yellow-100 text-yellow-700' },
  YAMATO: { label: 'ヤマト', color: 'bg-green-100 text-green-700' },
  SAGAWA: { label: '佐川', color: 'bg-blue-100 text-blue-700' },
  JAPAN_POST: { label: '日本郵便', color: 'bg-red-100 text-red-700' },
  EMS: { label: 'EMS', color: 'bg-indigo-100 text-indigo-700' },
  OTHER: { label: 'その他', color: 'bg-zinc-100 text-zinc-700' },
};

export default function ShipmentTrackingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'shipments' | 'labels' | 'stats' | 'settings'>('overview');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [carrierFilter, setCarrierFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

  // データ取得
  const { data: dashboardData, mutate: mutateDashboard } = useSWR(
    '/api/ebay-shipment-tracking/dashboard',
    fetcher2
  );

  const { data: shipmentsData, mutate: mutateShipments } = useSWR(
    `/api/ebay-shipment-tracking/shipments?${new URLSearchParams({
      ...(statusFilter && { status: statusFilter }),
      ...(carrierFilter && { carrier: carrierFilter }),
      ...(searchQuery && { search: searchQuery }),
    }).toString()}`,
    fetcher2
  );

  const { data: statsData } = useSWR(
    '/api/ebay-shipment-tracking/stats',
    fetcher2
  );

  const { data: labelConfigsData, mutate: mutateLabelConfigs } = useSWR(
    '/api/ebay-shipment-tracking/label-configs',
    fetcher2
  );

  const shipments: Shipment[] = shipmentsData?.shipments || [];

  // ラベル作成
  const handleCreateLabel = async (shipmentId: string) => {
    setIsCreatingLabel(true);
    try {
      await postApi(`/api/ebay-shipment-tracking/shipments/${shipmentId}/create-label`, {});
      addToast({ type: 'success', message: 'ラベルを作成しました' });
      mutateShipments();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: 'ラベル作成に失敗しました' });
    } finally {
      setIsCreatingLabel(false);
    }
  };

  // 追跡情報更新
  const handleUpdateTracking = async () => {
    setIsUpdatingTracking(true);
    try {
      await postApi('/api/ebay-shipment-tracking/shipments/bulk-track', {});
      addToast({ type: 'success', message: '追跡情報を更新しました' });
      mutateShipments();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '追跡情報の更新に失敗しました' });
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  // 例外解決
  const handleResolveException = async (shipmentId: string, resolution: string) => {
    try {
      await postApi(`/api/ebay-shipment-tracking/shipments/${shipmentId}/resolve-exception`, {
        resolution,
      });
      addToast({ type: 'success', message: '例外を解決しました' });
      setSelectedShipment(null);
      mutateShipments();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '例外解決に失敗しました' });
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'shipments', label: '出荷一覧', icon: Truck },
    { id: 'labels', label: 'ラベル設定', icon: Tag },
    { id: 'stats', label: '統計', icon: TrendingUp },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">出荷追跡</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {dashboardData?.overview?.totalShipments || 0} 件の出荷
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateTracking}
            disabled={isUpdatingTracking}
          >
            {isUpdatingTracking ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            追跡更新
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              mutateDashboard();
              mutateShipments();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* 概要タブ */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-4">
            {/* サマリーカード */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">総出荷数</p>
                    <p className="text-xl font-bold">{dashboardData.overview.totalShipments}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">出荷待ち</p>
                    <p className="text-xl font-bold">{dashboardData.overview.pending}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <Truck className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">輸送中</p>
                    <p className="text-xl font-bold">{dashboardData.overview.inTransit}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">配達完了</p>
                    <p className="text-xl font-bold">{dashboardData.overview.delivered}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">配送例外</p>
                    <p className="text-xl font-bold">{dashboardData.overview.exceptions}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* アラート */}
            {dashboardData.alerts?.filter((a: { count: number }) => a.count > 0).length > 0 && (
              <div className="space-y-2">
                {dashboardData.alerts.filter((a: { count: number }) => a.count > 0).map((alert: { type: string; count: number; message: string }, index: number) => (
                  <Card key={index} className={cn(
                    'p-3',
                    alert.type === 'EXCEPTION' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                  )}>
                    <div className="flex items-center gap-3">
                      <AlertCircle className={cn(
                        'h-5 w-5',
                        alert.type === 'EXCEPTION' ? 'text-red-600' : 'text-amber-600'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        alert.type === 'EXCEPTION' ? 'text-red-700' : 'text-amber-700'
                      )}>
                        {alert.count}件の{alert.message}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* パフォーマンスと最近のアクティビティ */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-medium mb-4">配送パフォーマンス</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">定時配達率</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {dashboardData.deliveryPerformance.onTime}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">遅延率</span>
                    <span className="text-lg font-bold text-amber-600">
                      {dashboardData.deliveryPerformance.late}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">平均配達日数</span>
                    <span className="text-lg font-bold">
                      {dashboardData.deliveryPerformance.averageDeliveryDays}日
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-4">コスト概要</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">総送料</span>
                    <span className="text-lg font-bold">
                      ${dashboardData.costs.totalShippingCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">平均送料</span>
                    <span className="text-lg font-bold">
                      ${dashboardData.costs.averageCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">保険合計</span>
                    <span className="text-lg font-bold">
                      ${dashboardData.costs.insuranceTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* 最近のアクティビティ */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">最近の出荷</h3>
              <div className="space-y-3">
                {dashboardData.recentActivity?.map((shipment: {
                  id: string;
                  orderNumber: string;
                  itemTitle: string;
                  status: ShipmentStatus;
                  carrier: Carrier;
                  trackingNumber: string;
                  updatedAt: string;
                }) => {
                  const sConfig = statusConfig[shipment.status];
                  const cConfig = carrierConfig[shipment.carrier];
                  const StatusIcon = sConfig.icon;
                  return (
                    <div
                      key={shipment.id}
                      className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg cursor-pointer hover:bg-zinc-100"
                      onClick={() => setActiveTab('shipments')}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', sConfig.bgColor)}>
                          <StatusIcon className={cn('h-4 w-4', sConfig.color)} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{shipment.orderNumber}</p>
                          <p className="text-xs text-zinc-500 truncate max-w-xs">{shipment.itemTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', cConfig.color)}>
                          {cConfig.label}
                        </span>
                        <span className={cn('px-2 py-1 rounded-full text-xs', sConfig.bgColor, sConfig.color)}>
                          {sConfig.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* 出荷一覧タブ */}
        {activeTab === 'shipments' && (
          <div className="flex gap-4 h-full">
            {/* 出荷リスト */}
            <div className="flex-1 flex flex-col">
              {/* フィルター */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="追跡番号、注文番号、商品名で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべてのステータス</option>
                  <option value="PENDING">出荷待ち</option>
                  <option value="LABEL_CREATED">ラベル作成済</option>
                  <option value="PICKED_UP">集荷済</option>
                  <option value="IN_TRANSIT">輸送中</option>
                  <option value="OUT_FOR_DELIVERY">配達中</option>
                  <option value="DELIVERED">配達完了</option>
                  <option value="EXCEPTION">配送例外</option>
                  <option value="RETURNED">返送済</option>
                </select>
                <select
                  value={carrierFilter}
                  onChange={(e) => setCarrierFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべてのキャリア</option>
                  <option value="FEDEX">FedEx</option>
                  <option value="EMS">EMS</option>
                  <option value="DHL">DHL</option>
                  <option value="JAPAN_POST">日本郵便</option>
                  <option value="USPS">USPS</option>
                  <option value="UPS">UPS</option>
                </select>
              </div>

              {/* 出荷リスト */}
              <div className="flex-1 overflow-auto space-y-2">
                {shipments.map((shipment) => {
                  const sConfig = statusConfig[shipment.status];
                  const cConfig = carrierConfig[shipment.carrier];
                  const StatusIcon = sConfig.icon;
                  return (
                    <Card
                      key={shipment.id}
                      className={cn(
                        'p-4 cursor-pointer transition-colors',
                        selectedShipment?.id === shipment.id ? 'ring-2 ring-indigo-500' : 'hover:bg-zinc-50'
                      )}
                      onClick={() => setSelectedShipment(shipment)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn('p-2 rounded-lg', sConfig.bgColor)}>
                            <StatusIcon className={cn('h-5 w-5', sConfig.color)} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{shipment.orderNumber}</p>
                              <span className={cn('px-2 py-0.5 rounded text-xs', cConfig.color)}>
                                {cConfig.label}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-500 truncate max-w-md">{shipment.itemTitle}</p>
                            <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                              <User className="h-3 w-3" />
                              <span>{shipment.buyerName}</span>
                              {shipment.trackingNumber && (
                                <>
                                  <span>•</span>
                                  <span>{shipment.trackingNumber}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className={cn('px-2 py-1 rounded-full text-xs', sConfig.bgColor, sConfig.color)}>
                              {sConfig.label}
                            </span>
                            {shipment.estimatedDelivery && shipment.status !== 'DELIVERED' && (
                              <p className="text-xs text-zinc-400 mt-1">
                                予定: {new Date(shipment.estimatedDelivery).toLocaleDateString('ja-JP')}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-zinc-400" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 出荷詳細 */}
            {selectedShipment && (
              <Card className="w-[400px] p-4 flex flex-col overflow-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">出荷詳細</h3>
                  <button onClick={() => setSelectedShipment(null)} className="text-zinc-400 hover:text-zinc-600">
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* ステータス */}
                  <div className={cn('p-3 rounded-lg', statusConfig[selectedShipment.status].bgColor)}>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const StatusIcon = statusConfig[selectedShipment.status].icon;
                        return <StatusIcon className={cn('h-5 w-5', statusConfig[selectedShipment.status].color)} />;
                      })()}
                      <span className={cn('font-medium', statusConfig[selectedShipment.status].color)}>
                        {statusConfig[selectedShipment.status].label}
                      </span>
                    </div>
                    {selectedShipment.estimatedDelivery && selectedShipment.status !== 'DELIVERED' && (
                      <p className="text-sm mt-1">
                        予定配達日: {new Date(selectedShipment.estimatedDelivery).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                    {selectedShipment.actualDelivery && (
                      <p className="text-sm mt-1">
                        配達完了: {new Date(selectedShipment.actualDelivery).toLocaleString('ja-JP')}
                      </p>
                    )}
                  </div>

                  {/* 配送例外 */}
                  {selectedShipment.exception && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-red-700">配送例外</span>
                      </div>
                      <p className="text-sm text-red-600 mb-3">{selectedShipment.exception.description}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveException(selectedShipment.id, 'ADDRESS_CORRECTED')}
                        >
                          住所修正
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveException(selectedShipment.id, 'RESHIP')}
                        >
                          再発送
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResolveException(selectedShipment.id, 'RETURN_TO_SENDER')}
                        >
                          返送
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 追跡情報 */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">追跡情報</h4>
                    <div className="p-3 bg-zinc-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('px-2 py-1 rounded text-sm', carrierConfig[selectedShipment.carrier].color)}>
                          {carrierConfig[selectedShipment.carrier].label}
                        </span>
                        {selectedShipment.trackingNumber && (
                          <a
                            href={`https://www.${selectedShipment.carrier.toLowerCase()}.com/tracking/${selectedShipment.trackingNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
                          >
                            追跡 <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {selectedShipment.trackingNumber ? (
                        <p className="text-sm font-mono">{selectedShipment.trackingNumber}</p>
                      ) : (
                        <p className="text-sm text-zinc-400">追跡番号なし</p>
                      )}
                    </div>
                  </div>

                  {/* 配送先 */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">配送先</h4>
                    <div className="p-3 bg-zinc-50 rounded-lg text-sm">
                      <p className="font-medium">{selectedShipment.buyerAddress.name}</p>
                      <p>{selectedShipment.buyerAddress.street1}</p>
                      {selectedShipment.buyerAddress.street2 && (
                        <p>{selectedShipment.buyerAddress.street2}</p>
                      )}
                      <p>
                        {selectedShipment.buyerAddress.city}, {selectedShipment.buyerAddress.state} {selectedShipment.buyerAddress.postalCode}
                      </p>
                      <p>{selectedShipment.buyerAddress.country}</p>
                    </div>
                  </div>

                  {/* 詳細情報 */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">詳細情報</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-zinc-50 rounded">
                        <p className="text-xs text-zinc-400">重量</p>
                        <p className="font-medium">{selectedShipment.weight} kg</p>
                      </div>
                      <div className="p-2 bg-zinc-50 rounded">
                        <p className="text-xs text-zinc-400">送料</p>
                        <p className="font-medium">${selectedShipment.shippingCost.toFixed(2)}</p>
                      </div>
                      {selectedShipment.insuranceAmount && (
                        <div className="p-2 bg-zinc-50 rounded">
                          <p className="text-xs text-zinc-400">保険金額</p>
                          <p className="font-medium">${selectedShipment.insuranceAmount.toFixed(2)}</p>
                        </div>
                      )}
                      <div className="p-2 bg-zinc-50 rounded">
                        <p className="text-xs text-zinc-400">署名</p>
                        <p className="font-medium">{selectedShipment.signatureRequired ? '必要' : '不要'}</p>
                      </div>
                    </div>
                  </div>

                  {/* 追跡イベント */}
                  {selectedShipment.events.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">追跡履歴</h4>
                      <div className="space-y-3">
                        {selectedShipment.events.slice().reverse().map((event, index) => (
                          <div key={index} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={cn(
                                'w-3 h-3 rounded-full',
                                index === 0 ? 'bg-indigo-500' : 'bg-zinc-300'
                              )} />
                              {index < selectedShipment.events.length - 1 && (
                                <div className="w-0.5 h-full bg-zinc-200 mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-3">
                              <p className="text-sm font-medium">{event.description}</p>
                              <p className="text-xs text-zinc-500">{event.location}</p>
                              <p className="text-xs text-zinc-400">
                                {new Date(event.timestamp).toLocaleString('ja-JP')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* アクション */}
                  <div className="flex gap-2 pt-2 border-t">
                    {selectedShipment.status === 'PENDING' && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleCreateLabel(selectedShipment.id)}
                        disabled={isCreatingLabel}
                      >
                        {isCreatingLabel ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Tag className="h-4 w-4 mr-1" />
                        )}
                        ラベル作成
                      </Button>
                    )}
                    {selectedShipment.labelUrl && (
                      <Button variant="outline" size="sm">
                        <Printer className="h-4 w-4 mr-1" />
                        印刷
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ラベル設定タブ */}
        {activeTab === 'labels' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">ラベル設定</h3>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                設定追加
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {labelConfigsData?.configs?.map((config: {
                id: string;
                carrier: Carrier;
                serviceType: string;
                labelSize: string;
                printFormat: string;
                isDefault: boolean;
              }) => (
                <Card key={config.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={cn('px-2 py-1 rounded text-sm', carrierConfig[config.carrier].color)}>
                        {carrierConfig[config.carrier].label}
                      </span>
                      {config.isDefault && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs">
                          デフォルト
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">サービス</span>
                      <span>{config.serviceType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">サイズ</span>
                      <span>{config.labelSize}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">フォーマット</span>
                      <span>{config.printFormat}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 統計タブ */}
        {activeTab === 'stats' && statsData && (
          <div className="space-y-4">
            {/* 配送統計 */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{statsData.shipments.total}</p>
                <p className="text-sm text-zinc-500">総出荷数</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{statsData.delivery.onTimeRate}%</p>
                <p className="text-sm text-zinc-500">定時配達率</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold">{statsData.delivery.averageDeliveryDays}</p>
                <p className="text-sm text-zinc-500">平均配達日数</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">${statsData.costs.averageCost.toFixed(2)}</p>
                <p className="text-sm text-zinc-500">平均送料</p>
              </Card>
            </div>

            {/* キャリア別コスト */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">キャリア別平均コスト</h3>
              <div className="space-y-3">
                {Object.entries(statsData.costs.byCarrier).map(([carrier, cost]) => (
                  <div key={carrier} className="flex items-center justify-between">
                    <span className={cn('px-2 py-1 rounded text-sm', carrierConfig[carrier as Carrier]?.color || 'bg-zinc-100')}>
                      {carrierConfig[carrier as Carrier]?.label || carrier}
                    </span>
                    <span className="font-medium">${(cost as number).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 例外統計 */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">例外タイプ別</h3>
              <div className="space-y-2">
                {Object.entries(statsData.exceptions.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{count as number}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-2xl">
            <Card className="p-4">
              <h3 className="font-medium mb-4">自動追跡更新</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">自動追跡を有効化</p>
                    <p className="text-xs text-zinc-500">定期的に追跡情報を自動更新</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">更新間隔</p>
                    <p className="text-xs text-zinc-500">追跡情報の更新頻度</p>
                  </div>
                  <select className="px-3 py-2 rounded-lg border border-zinc-200 text-sm">
                    <option value="1">1時間</option>
                    <option value="2">2時間</option>
                    <option value="4">4時間</option>
                    <option value="6">6時間</option>
                    <option value="12">12時間</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">通知設定</h3>
              <div className="space-y-4">
                {[
                  { key: 'shipmentCreated', label: '出荷作成', desc: '新しい出荷が作成された時' },
                  { key: 'labelCreated', label: 'ラベル作成', desc: 'ラベルが作成された時' },
                  { key: 'outForDelivery', label: '配達中', desc: '荷物が配達中になった時' },
                  { key: 'delivered', label: '配達完了', desc: '荷物が配達された時' },
                  { key: 'exception', label: '配送例外', desc: '配送に問題が発生した時' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-zinc-500">{item.desc}</p>
                    </div>
                    <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">保険設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">自動保険適用</p>
                    <p className="text-xs text-zinc-500">高額商品に自動で保険を適用</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">最低金額</p>
                    <p className="text-xs text-zinc-500">この金額以上の商品に保険を適用</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={100}
                    className="w-24 px-3 py-2 rounded-lg border border-zinc-200 text-sm text-right"
                  />
                </div>
              </div>
            </Card>

            <Button variant="primary">
              設定を保存
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

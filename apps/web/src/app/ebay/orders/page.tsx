'use client';

/**
 * Phase 109: eBay注文管理UI
 *
 * 注文の一覧・詳細・発送・キャンセル管理
 */

import { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  Eye,
  Send,
  Ban,
  MessageSquare,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  User,
  Mail,
  MapPin,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

interface Order {
  id: string;
  marketplaceOrderId: string;
  externalOrderId?: string;
  buyerUsername: string;
  buyerName?: string;
  buyerEmail?: string;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  currency: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  orderedAt: string;
  paidAt?: string;
  shippedAt?: string;
  items: Array<{
    id: string;
    sku?: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
  }>;
  itemCount: number;
  notes?: Array<{
    note: string;
    type: string;
    createdAt: string;
  }>;
}

interface DashboardData {
  summary: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    actionRequired: number;
  };
  period: {
    today: number;
    week: number;
    monthRevenue: number;
  };
  recentOrders: Order[];
}

interface ActionRequiredData {
  total: number;
  urgent: Order[];
  normal: Order[];
  recent: Order[];
}

function getStatusBadge(status: string) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
    PENDING: { variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' },
    CONFIRMED: { variant: 'secondary', color: 'bg-blue-100 text-blue-800' },
    PROCESSING: { variant: 'default', color: 'bg-blue-500' },
    SHIPPED: { variant: 'default', color: 'bg-green-500' },
    DELIVERED: { variant: 'default', color: 'bg-green-600' },
    CANCELLED: { variant: 'destructive', color: '' },
    REFUNDED: { variant: 'destructive', color: '' },
  };
  const cfg = config[status] || { variant: 'outline' as const, color: '' };
  return <Badge variant={cfg.variant}>{status}</Badge>;
}

function getPaymentBadge(status: string) {
  if (status === 'PAID') return <Badge variant="default" className="bg-green-500">支払済</Badge>;
  if (status === 'PENDING') return <Badge variant="secondary">支払待ち</Badge>;
  if (status === 'REFUNDED') return <Badge variant="destructive">返金済</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default function EbayOrdersPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isShipOpen, setIsShipOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Ship form
  const [shipData, setShipData] = useState({
    trackingNumber: '',
    trackingCarrier: '',
    syncToEbay: true,
  });

  // Cancel form
  const [cancelData, setCancelData] = useState({
    reason: '',
    syncToEbay: true,
  });

  // Note form
  const [noteData, setNoteData] = useState({
    note: '',
    type: 'INTERNAL',
  });

  // Fetch data
  const { data: dashboard, mutate: mutateDashboard } = useSWR<DashboardData>(
    `${API_BASE}/ebay-orders/dashboard`,
    fetcher
  );

  const { data: ordersData, mutate: mutateOrders } = useSWR<{
    orders: Order[];
    total: number;
  }>(
    `${API_BASE}/ebay-orders?status=${statusFilter === 'all' ? '' : statusFilter}&search=${searchQuery}`,
    fetcher
  );

  const { data: actionRequired } = useSWR<ActionRequiredData>(
    activeTab === 'action-required' ? `${API_BASE}/ebay-orders/action-required` : null,
    fetcher
  );

  // Ship order
  const handleShipOrder = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-orders/${selectedOrder.id}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
        body: JSON.stringify(shipData),
      });

      if (res.ok) {
        setIsShipOpen(false);
        setShipData({ trackingNumber: '', trackingCarrier: '', syncToEbay: true });
        mutateDashboard();
        mutateOrders();
        setIsDetailOpen(false);
      }
    } catch (error) {
      console.error('Failed to ship order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-orders/${selectedOrder.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
        body: JSON.stringify(cancelData),
      });

      if (res.ok) {
        setIsCancelOpen(false);
        setCancelData({ reason: '', syncToEbay: true });
        mutateDashboard();
        mutateOrders();
        setIsDetailOpen(false);
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add note
  const handleAddNote = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-orders/${selectedOrder.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
        body: JSON.stringify(noteData),
      });

      if (res.ok) {
        const result = await res.json();
        setSelectedOrder({ ...selectedOrder, notes: result.notes });
        setIsNoteOpen(false);
        setNoteData({ note: '', type: 'INTERNAL' });
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // View order detail
  const handleViewOrder = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/ebay-orders/${id}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
      });
      if (res.ok) {
        const order = await res.json();
        setSelectedOrder(order);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
    }
  };

  // Sync orders
  const handleSync = async () => {
    setIsProcessing(true);
    try {
      await fetch(`${API_BASE}/ebay-orders/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
        body: JSON.stringify({ sinceDays: 7 }),
      });
      mutateDashboard();
      mutateOrders();
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              注文管理
            </h1>
            <p className="text-muted-foreground">
              eBay注文の管理・発送・キャンセル
            </p>
          </div>
        </div>
        <Button onClick={handleSync} disabled={isProcessing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
          同期
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="action-required" className="flex items-center gap-1">
            要対応
            {dashboard?.summary.actionRequired ? (
              <Badge variant="destructive" className="ml-1">
                {dashboard.summary.actionRequired}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="orders">注文一覧</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  総注文数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.summary.total.toLocaleString() || '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  要対応
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {dashboard?.summary.actionRequired || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Truck className="h-4 w-4 text-blue-500" />
                  発送済み
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {dashboard?.summary.shipped || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  月間売上
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${dashboard?.period.monthRevenue?.toFixed(0) || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Summary */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {dashboard?.summary.pending || 0}
              </div>
              <div className="text-sm text-muted-foreground">保留中</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {dashboard?.summary.processing || 0}
              </div>
              <div className="text-sm text-muted-foreground">処理中</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {dashboard?.summary.shipped || 0}
              </div>
              <div className="text-sm text-muted-foreground">発送済み</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {dashboard?.summary.delivered || 0}
              </div>
              <div className="text-sm text-muted-foreground">配達完了</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {dashboard?.summary.cancelled || 0}
              </div>
              <div className="text-sm text-muted-foreground">キャンセル</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-600">
                {dashboard?.period.today || 0}
              </div>
              <div className="text-sm text-muted-foreground">今日</div>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>最近の注文</CardTitle>
              <CardDescription>直近10件の注文</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    注文がありません
                  </p>
                ) : (
                  dashboard?.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewOrder(order.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {order.marketplaceOrderId}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.buyerUsername} • {order.itemCount}点
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-medium">
                            ${order.total?.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.orderedAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                        {getPaymentBadge(order.paymentStatus)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Required Tab */}
        <TabsContent value="action-required" className="space-y-6">
          {actionRequired?.total === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium">すべて対応済み</h3>
              <p className="text-muted-foreground">
                要対応の注文はありません
              </p>
            </Card>
          ) : (
            <>
              {/* Urgent Orders */}
              {actionRequired?.urgent && actionRequired.urgent.length > 0 && (
                <Card className="border-red-200 bg-red-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-5 w-5" />
                      緊急 (48時間以上)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {actionRequired.urgent.map((order: any) => (
                        <OrderActionCard
                          key={order.id}
                          order={order}
                          onView={() => handleViewOrder(order.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Normal Orders */}
              {actionRequired?.normal && actionRequired.normal.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700">
                      <Clock className="h-5 w-5" />
                      要対応 (24-48時間)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {actionRequired.normal.map((order: any) => (
                        <OrderActionCard
                          key={order.id}
                          order={order}
                          onView={() => handleViewOrder(order.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Orders */}
              {actionRequired?.recent && actionRequired.recent.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      新規注文 (24時間以内)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {actionRequired.recent.map((order: any) => (
                        <OrderActionCard
                          key={order.id}
                          order={order}
                          onView={() => handleViewOrder(order.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Orders List Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="注文ID、バイヤー名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="PENDING">保留中</SelectItem>
                <SelectItem value="CONFIRMED">確認済み</SelectItem>
                <SelectItem value="PROCESSING">処理中</SelectItem>
                <SelectItem value="SHIPPED">発送済み</SelectItem>
                <SelectItem value="DELIVERED">配達完了</SelectItem>
                <SelectItem value="CANCELLED">キャンセル</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => mutateOrders()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {ordersData?.orders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    注文がありません
                  </p>
                ) : (
                  ordersData?.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {order.marketplaceOrderId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            {order.buyerUsername}
                            {order.buyerName && ` (${order.buyerName})`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.itemCount}点 •{' '}
                            {order.items[0]?.title?.substring(0, 40)}...
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-medium">
                            ${order.total?.toFixed(2)} {order.currency}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(order.orderedAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        {getStatusBadge(order.status)}
                        {getPaymentBadge(order.paymentStatus)}
                        {order.trackingNumber && (
                          <Badge variant="outline">
                            <Truck className="h-3 w-3 mr-1" />
                            追跡あり
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <div className="text-sm text-muted-foreground text-right">
            {ordersData?.total || 0} 件
          </div>
        </TabsContent>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>注文詳細</DialogTitle>
            <DialogDescription>
              {selectedOrder?.marketplaceOrderId}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedOrder.status)}
                  {getPaymentBadge(selectedOrder.paymentStatus)}
                </div>
                <div className="flex items-center gap-2">
                  {['PENDING', 'CONFIRMED', 'PROCESSING'].includes(
                    selectedOrder.status
                  ) && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setIsShipOpen(true)}
                      >
                        <Truck className="h-4 w-4 mr-1" />
                        発送
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setIsCancelOpen(true)}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        キャンセル
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsNoteOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    メモ追加
                  </Button>
                </div>
              </div>

              {/* Buyer Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">購入者情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedOrder.buyerUsername}</span>
                    {selectedOrder.buyerName && (
                      <span className="text-muted-foreground">
                        ({selectedOrder.buyerName})
                      </span>
                    )}
                  </div>
                  {selectedOrder.buyerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedOrder.buyerEmail}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">注文商品</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                      >
                        <div>
                          <div className="font-medium">{item.title}</div>
                          {item.sku && (
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div>
                            ${item.unitPrice?.toFixed(2)} × {item.quantity}
                          </div>
                          <div className="font-medium">
                            ${((item.unitPrice || 0) * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">金額</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">小計</span>
                      <span>${selectedOrder.subtotal?.toFixed(2) || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">送料</span>
                      <span>${selectedOrder.shippingCost?.toFixed(2) || '-'}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>合計</span>
                      <span>
                        ${selectedOrder.total?.toFixed(2)} {selectedOrder.currency}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Info */}
              {selectedOrder.trackingNumber && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">発送情報</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">追跡番号</span>
                        <span className="font-mono">
                          {selectedOrder.trackingNumber}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">配送業者</span>
                        <span>{selectedOrder.trackingCarrier}</span>
                      </div>
                      {selectedOrder.shippedAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">発送日</span>
                          <span>
                            {new Date(selectedOrder.shippedAt).toLocaleString(
                              'ja-JP'
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {selectedOrder.notes && selectedOrder.notes.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">メモ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedOrder.notes.map((note, idx) => (
                        <div key={idx} className="p-2 bg-muted/50 rounded">
                          <div className="flex items-center justify-between text-sm">
                            <Badge variant="outline">{note.type}</Badge>
                            <span className="text-muted-foreground">
                              {new Date(note.createdAt).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <p className="mt-1">{note.note}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">注文日時: </span>
                  {new Date(selectedOrder.orderedAt).toLocaleString('ja-JP')}
                </div>
                {selectedOrder.paidAt && (
                  <div>
                    <span className="text-muted-foreground">支払日時: </span>
                    {new Date(selectedOrder.paidAt).toLocaleString('ja-JP')}
                  </div>
                )}
                {selectedOrder.shippedAt && (
                  <div>
                    <span className="text-muted-foreground">発送日時: </span>
                    {new Date(selectedOrder.shippedAt).toLocaleString('ja-JP')}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ship Dialog */}
      <Dialog open={isShipOpen} onOpenChange={setIsShipOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>発送処理</DialogTitle>
            <DialogDescription>
              追跡番号と配送業者を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">追跡番号 *</label>
              <Input
                value={shipData.trackingNumber}
                onChange={(e) =>
                  setShipData({ ...shipData, trackingNumber: e.target.value })
                }
                placeholder="JP123456789"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">配送業者 *</label>
              <Select
                value={shipData.trackingCarrier}
                onValueChange={(v) =>
                  setShipData({ ...shipData, trackingCarrier: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="配送業者を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Japan Post">Japan Post</SelectItem>
                  <SelectItem value="DHL">DHL</SelectItem>
                  <SelectItem value="FedEx">FedEx</SelectItem>
                  <SelectItem value="UPS">UPS</SelectItem>
                  <SelectItem value="Yamato">ヤマト運輸</SelectItem>
                  <SelectItem value="Sagawa">佐川急便</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="syncToEbay"
                checked={shipData.syncToEbay}
                onChange={(e) =>
                  setShipData({ ...shipData, syncToEbay: e.target.checked })
                }
              />
              <label htmlFor="syncToEbay" className="text-sm">
                eBayに同期する
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShipOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleShipOrder}
              disabled={
                !shipData.trackingNumber ||
                !shipData.trackingCarrier ||
                isProcessing
              }
            >
              <Truck className="h-4 w-4 mr-2" />
              発送完了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注文キャンセル</DialogTitle>
            <DialogDescription>
              キャンセル理由を入力してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">キャンセル理由 *</label>
              <Textarea
                value={cancelData.reason}
                onChange={(e) =>
                  setCancelData({ ...cancelData, reason: e.target.value })
                }
                placeholder="キャンセル理由を入力..."
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cancelSyncToEbay"
                checked={cancelData.syncToEbay}
                onChange={(e) =>
                  setCancelData({ ...cancelData, syncToEbay: e.target.checked })
                }
              />
              <label htmlFor="cancelSyncToEbay" className="text-sm">
                eBayに同期する
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelOpen(false)}>
              戻る
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={!cancelData.reason || isProcessing}
            >
              <Ban className="h-4 w-4 mr-2" />
              キャンセル実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={isNoteOpen} onOpenChange={setIsNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>メモ追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">タイプ</label>
              <Select
                value={noteData.type}
                onValueChange={(v) => setNoteData({ ...noteData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL">内部メモ</SelectItem>
                  <SelectItem value="BUYER">購入者関連</SelectItem>
                  <SelectItem value="SHIPPING">発送関連</SelectItem>
                  <SelectItem value="ISSUE">問題・トラブル</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">メモ *</label>
              <Textarea
                value={noteData.note}
                onChange={(e) =>
                  setNoteData({ ...noteData, note: e.target.value })
                }
                placeholder="メモを入力..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteOpen(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteData.note || isProcessing}
            >
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Action Required Order Card Component
function OrderActionCard({
  order,
  onView,
}: {
  order: any;
  onView: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:shadow-sm"
      onClick={onView}
    >
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-muted-foreground" />
        <div>
          <div className="font-medium">{order.marketplaceOrderId}</div>
          <div className="text-sm text-muted-foreground">
            {order.buyerUsername} • ${order.total?.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">{order.hoursSinceOrder}時間経過</Badge>
        {getStatusBadge(order.status)}
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

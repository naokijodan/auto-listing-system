'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Building2,
  Plus,
  Package,
  ShoppingCart,
  Truck,
  Star,
  ExternalLink,
  Search,
  RefreshCw,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetcher, API_BASE } from '@/lib/api';
import { toast } from 'sonner';

interface Supplier {
  id: string;
  name: string;
  code: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  city?: string;
  prefecture?: string;
  country: string;
  paymentTerms?: string;
  currency: string;
  rating?: number;
  status: string;
  _count?: {
    products: number;
    orders: number;
  };
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  orderedAt?: string;
  expectedAt?: string;
  supplier: {
    id: string;
    name: string;
    code: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    receivedQty: number;
    supplierProduct: {
      id: string;
      name: string;
      sku: string;
    };
  }>;
}

interface Stats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalProducts: number;
  pendingOrders: number;
  totalOrderValue: number;
  monthlyOrderValue: number;
  monthlyOrderCount: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'アクティブ', color: 'bg-green-500' },
  INACTIVE: { label: '非アクティブ', color: 'bg-zinc-500' },
  SUSPENDED: { label: '一時停止', color: 'bg-yellow-500' },
  BLACKLISTED: { label: 'ブラックリスト', color: 'bg-red-500' },
};

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '下書き', color: 'bg-zinc-500' },
  PENDING: { label: '承認待ち', color: 'bg-yellow-500' },
  APPROVED: { label: '承認済み', color: 'bg-blue-500' },
  ORDERED: { label: '発注済み', color: 'bg-purple-500' },
  SHIPPED: { label: '出荷済み', color: 'bg-cyan-500' },
  DELIVERED: { label: '納品完了', color: 'bg-green-500' },
  CANCELLED: { label: 'キャンセル', color: 'bg-red-500' },
};

export default function SuppliersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const { data: stats, mutate: mutateStats } = useSWR<Stats>(
    `${API_BASE}/suppliers/stats`,
    fetcher
  );

  const { data: suppliersData, mutate: mutateSuppliers } = useSWR(
    `${API_BASE}/suppliers?${selectedStatus !== 'all' ? `status=${selectedStatus}&` : ''}${searchQuery ? `search=${searchQuery}` : ''}`,
    fetcher
  );

  const { data: ordersData, mutate: mutateOrders } = useSWR(
    `${API_BASE}/suppliers/orders/list`,
    fetcher
  );

  const suppliers = suppliersData?.data || [];
  const orders = ordersData?.data || [];

  const handleCreateSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(`${API_BASE}/suppliers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          code: formData.get('code'),
          description: formData.get('description'),
          contactName: formData.get('contactName'),
          contactEmail: formData.get('contactEmail'),
          contactPhone: formData.get('contactPhone'),
          website: formData.get('website'),
          address: formData.get('address'),
          city: formData.get('city'),
          prefecture: formData.get('prefecture'),
          postalCode: formData.get('postalCode'),
          paymentTerms: formData.get('paymentTerms'),
        }),
      });

      if (response.ok) {
        toast.success('サプライヤーを作成しました');
        setIsCreateOpen(false);
        mutateSuppliers();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '作成に失敗しました');
      }
    } catch {
      toast.error('作成に失敗しました');
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`${API_BASE}/suppliers/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success('ステータスを更新しました');
        mutateOrders();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '更新に失敗しました');
      }
    } catch {
      toast.error('更新に失敗しました');
    }
  };

  const formatCurrency = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">サプライヤー管理</h1>
          <p className="text-sm text-zinc-500">仕入れ先の管理と発注処理</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規サプライヤー
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>サプライヤーを追加</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">会社名 *</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">サプライヤーコード *</Label>
                  <Input id="code" name="code" required placeholder="SUP001" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea id="description" name="description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">担当者名</Label>
                  <Input id="contactName" name="contactName" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">メールアドレス</Label>
                  <Input id="contactEmail" name="contactEmail" type="email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">電話番号</Label>
                  <Input id="contactPhone" name="contactPhone" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">ウェブサイト</Label>
                  <Input id="website" name="website" type="url" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input id="address" name="address" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">市区町村</Label>
                  <Input id="city" name="city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefecture">都道府県</Label>
                  <Input id="prefecture" name="prefecture" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">郵便番号</Label>
                  <Input id="postalCode" name="postalCode" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">支払い条件</Label>
                <Input id="paymentTerms" name="paymentTerms" placeholder="月末締め翌月払い" />
              </div>
              <Button type="submit" className="w-full">
                作成
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">サプライヤー数</CardTitle>
            <Building2 className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSuppliers || 0}</div>
            <p className="text-xs text-zinc-500">アクティブ / 全{stats?.totalSuppliers || 0}社</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">登録商品数</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">処理中の発注</CardTitle>
            <ShoppingCart className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">月間発注額</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.monthlyOrderValue || 0)}
            </div>
            <p className="text-xs text-zinc-500">{stats?.monthlyOrderCount || 0}件</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">サプライヤー一覧</TabsTrigger>
          <TabsTrigger value="orders">発注管理</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="サプライヤー名/コードで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="ACTIVE">アクティブ</SelectItem>
                <SelectItem value="INACTIVE">非アクティブ</SelectItem>
                <SelectItem value="SUSPENDED">一時停止</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutateSuppliers()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Suppliers List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center text-zinc-500">
                  サプライヤーがありません
                </CardContent>
              </Card>
            ) : (
              suppliers.map((supplier: Supplier) => (
                <Card
                  key={supplier.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedSupplier(supplier)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{supplier.name}</h3>
                          <Badge className={statusConfig[supplier.status]?.color}>
                            {statusConfig[supplier.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-500">{supplier.code}</p>
                      </div>
                      {supplier.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm">{supplier.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {supplier.description && (
                      <p className="mt-2 text-sm text-zinc-600 line-clamp-2">
                        {supplier.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {supplier._count?.products || 0}商品
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {supplier._count?.orders || 0}発注
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </div>

                    {supplier.website && (
                      <a
                        href={supplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        ウェブサイト
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          {/* Orders List */}
          <div className="space-y-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-zinc-500">
                  発注がありません
                </CardContent>
              </Card>
            ) : (
              orders.map((order: PurchaseOrder) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{order.orderNumber}</h3>
                          <Badge className={orderStatusConfig[order.status]?.color}>
                            {orderStatusConfig[order.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-500">
                          {order.supplier.name} ({order.supplier.code})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(order.total, order.currency)}
                        </p>
                        {order.expectedAt && (
                          <p className="text-xs text-zinc-500">
                            予定: {new Date(order.expectedAt).toLocaleDateString('ja-JP')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="mt-4 space-y-2">
                      {order.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>
                            {item.supplierProduct.name} ({item.supplierProduct.sku})
                          </span>
                          <span>
                            {item.quantity}個 × {formatCurrency(item.unitPrice)} ={' '}
                            {formatCurrency(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-xs text-zinc-500">
                          他 {order.items.length - 3}件
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                      {order.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'PENDING')}
                        >
                          承認申請
                        </Button>
                      )}
                      {order.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'APPROVED')}
                        >
                          承認
                        </Button>
                      )}
                      {order.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'ORDERED')}
                        >
                          <Truck className="mr-1 h-3 w-3" />
                          発注確定
                        </Button>
                      )}
                      {order.status === 'ORDERED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(order.id, 'SHIPPED')}
                        >
                          出荷確認
                        </Button>
                      )}
                      {order.status === 'SHIPPED' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                        >
                          入荷完了
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Supplier Detail Dialog */}
      {selectedSupplier && (
        <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedSupplier.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>サプライヤーコード</Label>
                  <p className="mt-1">{selectedSupplier.code}</p>
                </div>
                <div>
                  <Label>ステータス</Label>
                  <div className="mt-1">
                    <Badge className={statusConfig[selectedSupplier.status]?.color}>
                      {statusConfig[selectedSupplier.status]?.label}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedSupplier.description && (
                <div>
                  <Label>説明</Label>
                  <p className="mt-1 text-sm">{selectedSupplier.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedSupplier.contactName && (
                  <div>
                    <Label>担当者</Label>
                    <p className="mt-1">{selectedSupplier.contactName}</p>
                  </div>
                )}
                {selectedSupplier.contactEmail && (
                  <div>
                    <Label>メール</Label>
                    <p className="mt-1">
                      <a
                        href={`mailto:${selectedSupplier.contactEmail}`}
                        className="text-blue-500 hover:underline"
                      >
                        {selectedSupplier.contactEmail}
                      </a>
                    </p>
                  </div>
                )}
                {selectedSupplier.contactPhone && (
                  <div>
                    <Label>電話</Label>
                    <p className="mt-1">{selectedSupplier.contactPhone}</p>
                  </div>
                )}
                {selectedSupplier.website && (
                  <div>
                    <Label>ウェブサイト</Label>
                    <p className="mt-1">
                      <a
                        href={selectedSupplier.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                      >
                        {selectedSupplier.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                )}
              </div>

              {(selectedSupplier.address || selectedSupplier.city) && (
                <div>
                  <Label>住所</Label>
                  <p className="mt-1">
                    {[
                      selectedSupplier.address,
                      selectedSupplier.city,
                      selectedSupplier.prefecture,
                      selectedSupplier.country,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              )}

              {selectedSupplier.paymentTerms && (
                <div>
                  <Label>支払い条件</Label>
                  <p className="mt-1">{selectedSupplier.paymentTerms}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label>登録商品数</Label>
                  <p className="mt-1 text-2xl font-bold">
                    {selectedSupplier._count?.products || 0}
                  </p>
                </div>
                <div>
                  <Label>発注数</Label>
                  <p className="mt-1 text-2xl font-bold">
                    {selectedSupplier._count?.orders || 0}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

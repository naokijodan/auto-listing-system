
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Package,
  AlertTriangle,
  Plus,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  ShoppingCart,
  CheckCircle,
  History,
  TrendingUp,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface RestockRule {
  id: string;
  name: string;
  lowStockThreshold: number;
  restockQuantity: number;
  supplierName?: string;
  autoOrder: boolean;
  notifyEmail: boolean;
  isActive: boolean;
  appliedCount: number;
}

interface LowStockItem {
  id: string;
  title: string;
  stockQuantity: number;
  image?: string;
  hasActiveListing: boolean;
  isOutOfStock: boolean;
  urgency: string;
}

interface RestockOrder {
  id: string;
  productTitle: string;
  productImage?: string;
  quantity: number;
  supplierName?: string;
  status: string;
  createdAt: string;
}

const urgencyColors: Record<string, string> = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
};

const orderStatusLabels: Record<string, string> = {
  PENDING: '発注待ち',
  ORDERED: '発注済み',
  SHIPPED: '配送中',
  COMPLETED: '完了',
  CANCELLED: 'キャンセル',
};

export default function EbayAutoRestockPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [restockDialogOpen, setRestockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<LowStockItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState('');

  const [newRule, setNewRule] = useState({
    name: '',
    lowStockThreshold: 5,
    restockQuantity: 10,
    autoOrder: false,
    notifyEmail: true,
  });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(`${API_BASE}/ebay-auto-restock/dashboard`, fetcher);
  const { data: rules, mutate: mutateRules } = useSWR(`${API_BASE}/ebay-auto-restock/rules`, fetcher);
  const { data: alerts, mutate: mutateAlerts } = useSWR(`${API_BASE}/ebay-auto-restock/alerts`, fetcher);
  const { data: orders, mutate: mutateOrders } = useSWR(`${API_BASE}/ebay-auto-restock/orders`, fetcher);
  const { data: history } = useSWR(`${API_BASE}/ebay-auto-restock/history?limit=50`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-auto-restock/stats`, fetcher);

  const handleCreateRule = async () => {
    if (!newRule.name) return;

    await fetch(`${API_BASE}/ebay-auto-restock/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    });

    setCreateRuleOpen(false);
    setNewRule({ name: '', lowStockThreshold: 5, restockQuantity: 10, autoOrder: false, notifyEmail: true });
    mutateRules();
  };

  const handleToggleRule = async (id: string) => {
    await fetch(`${API_BASE}/ebay-auto-restock/rules/${id}/toggle`, { method: 'POST' });
    mutateRules();
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('このルールを削除しますか？')) return;
    await fetch(`${API_BASE}/ebay-auto-restock/rules/${id}`, { method: 'DELETE' });
    mutateRules();
  };

  const handleRestock = async () => {
    if (!selectedProduct || !restockQuantity) return;

    await fetch(`${API_BASE}/ebay-auto-restock/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: selectedProduct.id,
        quantity: parseInt(restockQuantity, 10),
        source: 'manual',
      }),
    });

    setRestockDialogOpen(false);
    setSelectedProduct(null);
    setRestockQuantity('');
    mutateDashboard();
    mutateAlerts();
  };

  const handleCompleteOrder = async (id: string) => {
    await fetch(`${API_BASE}/ebay-auto-restock/orders/${id}/complete`, { method: 'POST' });
    mutateOrders();
    mutateDashboard();
  };

  const handleCancelOrder = async (id: string) => {
    if (!confirm('この発注をキャンセルしますか？')) return;
    await fetch(`${API_BASE}/ebay-auto-restock/orders/${id}/cancel`, { method: 'POST' });
    mutateOrders();
  };

  const handleRunCheck = async () => {
    await fetch(`${API_BASE}/ebay-auto-restock/check`, { method: 'POST' });
    alert('在庫チェックをキューに追加しました');
  };

  const openRestockDialog = (item: LowStockItem) => {
    setSelectedProduct(item);
    setRestockDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">eBay在庫自動補充</h1>
          <p className="text-muted-foreground">低在庫アラートと自動補充管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunCheck}>
            <RefreshCw className="mr-2 h-4 w-4" />
            在庫チェック
          </Button>
          <Button onClick={() => setCreateRuleOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            ルール作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="alerts">
            低在庫アラート
            {alerts?.total > 0 && <Badge variant="destructive" className="ml-2">{alerts.total}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="orders">発注</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">アクティブルール</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary?.activeRules || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">低在庫</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{dashboard?.summary?.lowStockCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">在庫切れ</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{dashboard?.summary?.outOfStockCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">発注待ち</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboard?.summary?.pendingOrders || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 低在庫商品 */}
          <Card>
            <CardHeader>
              <CardTitle>要対応の商品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.lowStockItems?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">低在庫商品なし</p>
                )}
                {dashboard?.lowStockItems?.map((item: LowStockItem) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    {item.image && (
                      <img src={item.image} alt="" className="w-12 h-12 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        在庫: <span className={item.isOutOfStock ? 'text-red-600' : 'text-yellow-600'}>
                          {item.stockQuantity}
                        </span>
                        {item.hasActiveListing && ' • eBay出品中'}
                      </p>
                    </div>
                    <Badge className={urgencyColors[item.urgency]}>
                      {item.isOutOfStock ? '在庫切れ' : '低在庫'}
                    </Badge>
                    <Button size="sm" onClick={() => openRestockDialog(item)}>
                      補充
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近の補充 */}
          <Card>
            <CardHeader>
              <CardTitle>最近の補充</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboard?.recentRestocks?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">補充履歴なし</p>
                )}
                {dashboard?.recentRestocks?.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{r.productTitle}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {r.previousStock} → {r.newStock} (+{r.addedStock})
                      </span>
                      <Badge variant="outline">{r.source}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* アラート */}
        <TabsContent value="alerts" className="space-y-4">
          {alerts?.alerts?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                低在庫アラートなし
              </CardContent>
            </Card>
          )}
          {alerts?.alerts?.map((item: LowStockItem) => (
            <Card key={item.id} className={item.isOutOfStock ? 'border-red-300' : 'border-yellow-300'}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {item.image && (
                    <img src={item.image} alt="" className="w-16 h-16 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm">
                      在庫: <span className={item.isOutOfStock ? 'text-red-600 font-bold' : 'text-yellow-600'}>
                        {item.stockQuantity}
                      </span>
                    </p>
                    {item.hasActiveListing && (
                      <p className="text-sm text-blue-600">eBay出品中 - 早急な対応が必要</p>
                    )}
                  </div>
                  <Badge className={urgencyColors[item.urgency]}>
                    {item.urgency === 'critical' ? '緊急' : item.urgency === 'high' ? '高' : '中'}
                  </Badge>
                  <Button onClick={() => openRestockDialog(item)}>補充する</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ルール */}
        <TabsContent value="rules" className="space-y-4">
          {rules?.rules?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                ルールが登録されていません
              </CardContent>
            </Card>
          )}
          {rules?.rules?.map((rule: RestockRule) => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        閾値: {rule.lowStockThreshold}以下 → {rule.restockQuantity}個補充
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {rule.autoOrder && <Badge variant="secondary">自動発注</Badge>}
                    {rule.notifyEmail && <Badge variant="outline">メール通知</Badge>}
                    <span className="text-sm text-muted-foreground">適用: {rule.appliedCount}回</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleRule(rule.id)}>
                        {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 発注 */}
        <TabsContent value="orders" className="space-y-4">
          {orders?.orders?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                発注なし
              </CardContent>
            </Card>
          )}
          {orders?.orders?.map((order: RestockOrder) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {order.productImage && (
                    <img src={order.productImage} alt="" className="w-12 h-12 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{order.productTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      数量: {order.quantity} • {order.supplierName || '仕入れ先未設定'}
                    </p>
                  </div>
                  <Badge>{orderStatusLabels[order.status]}</Badge>
                  {order.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => handleCompleteOrder(order.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        完了
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleCancelOrder(order.id)}>
                        キャンセル
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 履歴 */}
        <TabsContent value="history" className="space-y-4">
          {history?.history?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                補充履歴なし
              </CardContent>
            </Card>
          )}
          {history?.history?.map((h: any) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {h.productImage && (
                    <img src={h.productImage} alt="" className="w-12 h-12 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{h.productTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(h.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{h.previousStock} → {h.newStock}</p>
                    <p className="text-sm text-green-600">+{h.addedStock}</p>
                  </div>
                  <Badge variant="outline">{h.source}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* ルール作成ダイアログ */}
      <Dialog open={createRuleOpen} onOpenChange={setCreateRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>補充ルールを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ルール名</label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="低在庫アラート"
              />
            </div>
            <div>
              <label className="text-sm font-medium">低在庫閾値</label>
              <Input
                type="number"
                value={newRule.lowStockThreshold}
                onChange={(e) => setNewRule({ ...newRule, lowStockThreshold: parseInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground mt-1">この在庫数以下でアラート</p>
            </div>
            <div>
              <label className="text-sm font-medium">補充数量</label>
              <Input
                type="number"
                value={newRule.restockQuantity}
                onChange={(e) => setNewRule({ ...newRule, restockQuantity: parseInt(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">自動発注</p>
                <p className="text-sm text-muted-foreground">閾値以下で自動的に発注</p>
              </div>
              <Switch
                checked={newRule.autoOrder}
                onCheckedChange={(autoOrder) => setNewRule({ ...newRule, autoOrder })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">メール通知</p>
                <p className="text-sm text-muted-foreground">低在庫時にメールで通知</p>
              </div>
              <Switch
                checked={newRule.notifyEmail}
                onCheckedChange={(notifyEmail) => setNewRule({ ...newRule, notifyEmail })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateRuleOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreateRule}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 補充ダイアログ */}
      <Dialog open={restockDialogOpen} onOpenChange={setRestockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>在庫を補充</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                {selectedProduct.image && (
                  <img src={selectedProduct.image} alt="" className="w-16 h-16 object-cover rounded" />
                )}
                <div>
                  <p className="font-medium">{selectedProduct.title}</p>
                  <p className="text-sm text-muted-foreground">現在の在庫: {selectedProduct.stockQuantity}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">補充数量</label>
                <Input
                  type="number"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  placeholder="10"
                  min="1"
                />
              </div>
              {restockQuantity && (
                <p className="text-sm">
                  補充後の在庫: <span className="font-medium text-green-600">
                    {selectedProduct.stockQuantity + parseInt(restockQuantity, 10)}
                  </span>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleRestock}>補充する</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

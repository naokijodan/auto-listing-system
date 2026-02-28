
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
  Plus,
  Play,
  Pause,
  Settings,
  Calculator,
  ShoppingCart,
  CheckCircle,
  XCircle,
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
import { Switch } from '@/components/ui/switch';
import { fetcher, API_BASE } from '@/lib/api';
import { toast } from 'sonner';

interface InventoryForecast {
  id: string;
  productId: string;
  listingId?: string;
  currentStock: number;
  predictedDemand: number;
  demandConfidence: number;
  safetyStock: number;
  reorderPoint: number;
  daysUntilStockout?: number;
  stockoutRisk: string;
  recommendedAction?: string;
  calculatedAt: string;
}

interface AutoReorderRule {
  id: string;
  name: string;
  description?: string;
  targetType: string;
  triggerType: string;
  reorderPoint?: number;
  daysBeforeStockout?: number;
  fixedQuantity?: number;
  isActive: boolean;
  priority: number;
  requiresApproval: boolean;
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    orders: number;
  };
}

interface AutoReorderOrder {
  id: string;
  productId: string;
  quantity: number;
  estimatedTotal?: number;
  status: string;
  triggerReason: string;
  stockAtTrigger: number;
  createdAt: string;
  rule: {
    id: string;
    name: string;
  };
}

interface Stats {
  totalForecasts: number;
  criticalRisk: number;
  highRisk: number;
  activeRules: number;
  pendingOrders: number;
}

const riskConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  CRITICAL: { label: '緊急', color: 'text-red-500', bgColor: 'bg-red-500' },
  HIGH: { label: '高', color: 'text-orange-500', bgColor: 'bg-orange-500' },
  MEDIUM: { label: '中', color: 'text-yellow-500', bgColor: 'bg-yellow-500' },
  LOW: { label: '低', color: 'text-green-500', bgColor: 'bg-green-500' },
};

const actionConfig: Record<string, { label: string; color: string }> = {
  ORDER_NOW: { label: '今すぐ発注', color: 'bg-red-500' },
  ORDER_SOON: { label: '近日中に発注', color: 'bg-orange-500' },
  MONITOR: { label: '監視継続', color: 'bg-blue-500' },
  REDUCE: { label: '在庫削減検討', color: 'bg-purple-500' },
};

const orderStatusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: '承認待ち', color: 'bg-yellow-500' },
  APPROVED: { label: '承認済み', color: 'bg-green-500' },
  REJECTED: { label: '却下', color: 'bg-red-500' },
  ORDERED: { label: '発注済み', color: 'bg-blue-500' },
  CANCELLED: { label: 'キャンセル', color: 'bg-zinc-500' },
};

export default function InventoryForecastPage() {
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<string>('all');

  const { data: stats, mutate: mutateStats } = useSWR<Stats>(
    `${API_BASE}/inventory-forecast/stats`,
    fetcher
  );

  const { data: forecastsData, mutate: mutateForecasts } = useSWR<any>(
    `${API_BASE}/inventory-forecast/forecasts${selectedRisk !== 'all' ? `?risk=${selectedRisk}` : ''}`,
    fetcher
  );

  const { data: rulesData, mutate: mutateRules } = useSWR<any>(
    `${API_BASE}/inventory-forecast/rules`,
    fetcher
  );

  const { data: ordersData, mutate: mutateOrders } = useSWR<any>(
    `${API_BASE}/inventory-forecast/orders?status=PENDING`,
    fetcher
  );

  const forecasts = forecastsData?.data || [];
  const rules = rulesData?.data || [];
  const pendingOrders = ordersData?.data || [];

  const handleBulkCalculate = async () => {
    try {
      const response = await fetch(`${API_BASE}/inventory-forecast/bulk-calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forecastDays: 30, leadTime: 7 }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`${result.processed}件の予測を更新しました`);
        mutateForecasts();
        mutateStats();
      } else {
        toast.error('計算に失敗しました');
      }
    } catch {
      toast.error('計算に失敗しました');
    }
  };

  const handleCreateRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(`${API_BASE}/inventory-forecast/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          targetType: formData.get('targetType'),
          triggerType: formData.get('triggerType'),
          reorderPoint: formData.get('reorderPoint')
            ? parseInt(formData.get('reorderPoint') as string, 10)
            : undefined,
          daysBeforeStockout: formData.get('daysBeforeStockout')
            ? parseInt(formData.get('daysBeforeStockout') as string, 10)
            : undefined,
          fixedQuantity: formData.get('fixedQuantity')
            ? parseInt(formData.get('fixedQuantity') as string, 10)
            : undefined,
          requiresApproval: formData.get('requiresApproval') === 'on',
        }),
      });

      if (response.ok) {
        toast.success('ルールを作成しました');
        setIsCreateRuleOpen(false);
        mutateRules();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '作成に失敗しました');
      }
    } catch {
      toast.error('作成に失敗しました');
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const response = await fetch(`${API_BASE}/inventory-forecast/rules/${ruleId}/toggle`, {
        method: 'PATCH',
      });

      if (response.ok) {
        toast.success('ルールを更新しました');
        mutateRules();
      }
    } catch {
      toast.error('更新に失敗しました');
    }
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const response = await fetch(`${API_BASE}/inventory-forecast/orders/${orderId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('発注を承認しました');
        mutateOrders();
        mutateStats();
      }
    } catch {
      toast.error('承認に失敗しました');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    try {
      const response = await fetch(`${API_BASE}/inventory-forecast/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '手動却下' }),
      });

      if (response.ok) {
        toast.success('発注を却下しました');
        mutateOrders();
        mutateStats();
      }
    } catch {
      toast.error('却下に失敗しました');
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">在庫予測・自動発注</h1>
          <p className="text-sm text-zinc-500">需要予測に基づく在庫管理と自動発注</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBulkCalculate}>
            <Calculator className="mr-2 h-4 w-4" />
            一括計算
          </Button>
          <Dialog open={isCreateRuleOpen} onOpenChange={setIsCreateRuleOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                発注ルール作成
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>自動発注ルールを作成</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateRule} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">ルール名 *</Label>
                  <Input id="name" name="name" required placeholder="例: 人気商品自動発注" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">説明</Label>
                  <Textarea id="description" name="description" placeholder="ルールの説明" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>対象タイプ</Label>
                    <Select name="targetType" defaultValue="ALL">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">全商品</SelectItem>
                        <SelectItem value="PRODUCT">特定商品</SelectItem>
                        <SelectItem value="CATEGORY">カテゴリ</SelectItem>
                        <SelectItem value="SUPPLIER">サプライヤー</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>トリガータイプ</Label>
                    <Select name="triggerType" defaultValue="REORDER_POINT">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="REORDER_POINT">発注点到達</SelectItem>
                        <SelectItem value="STOCKOUT_FORECAST">在庫切れ予測</SelectItem>
                        <SelectItem value="SCHEDULE">スケジュール</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reorderPoint">発注点（在庫数）</Label>
                    <Input
                      id="reorderPoint"
                      name="reorderPoint"
                      type="number"
                      min={0}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="daysBeforeStockout">在庫切れ前日数</Label>
                    <Input
                      id="daysBeforeStockout"
                      name="daysBeforeStockout"
                      type="number"
                      min={1}
                      placeholder="7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fixedQuantity">発注数量</Label>
                  <Input
                    id="fixedQuantity"
                    name="fixedQuantity"
                    type="number"
                    min={1}
                    placeholder="50"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="requiresApproval">承認が必要</Label>
                  <Switch id="requiresApproval" name="requiresApproval" defaultChecked />
                </div>
                <Button type="submit" className="w-full">
                  作成
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">予測数</CardTitle>
            <TrendingUp className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalForecasts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">緊急リスク</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats?.criticalRisk || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">高リスク</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats?.highRisk || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">有効ルール</CardTitle>
            <Settings className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeRules || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">承認待ち発注</CardTitle>
            <ShoppingCart className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="forecasts">
        <TabsList>
          <TabsTrigger value="forecasts">在庫予測</TabsTrigger>
          <TabsTrigger value="rules">発注ルール</TabsTrigger>
          <TabsTrigger value="orders">承認待ち発注</TabsTrigger>
        </TabsList>

        <TabsContent value="forecasts" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Select value={selectedRisk} onValueChange={setSelectedRisk}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="リスク" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="CRITICAL">緊急</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutateForecasts()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Forecasts Table */}
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-zinc-50 dark:bg-zinc-900">
                    <th className="px-4 py-3 text-left text-sm font-medium">商品ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">現在在庫</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">予測需要</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">発注点</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">在庫切れまで</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">リスク</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">推奨</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                        予測データがありません
                      </td>
                    </tr>
                  ) : (
                    forecasts.map((forecast: InventoryForecast) => (
                      <tr key={forecast.id} className="border-b">
                        <td className="px-4 py-3 text-sm font-mono">
                          {forecast.productId.substring(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-sm">{forecast.currentStock}</td>
                        <td className="px-4 py-3 text-sm">
                          {forecast.predictedDemand.toFixed(1)}
                          <span className="ml-1 text-xs text-zinc-500">
                            ({(forecast.demandConfidence * 100).toFixed(0)}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{forecast.reorderPoint}</td>
                        <td className="px-4 py-3 text-sm">
                          {forecast.daysUntilStockout !== null
                            ? `${forecast.daysUntilStockout}日`
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={riskConfig[forecast.stockoutRisk]?.bgColor}>
                            {riskConfig[forecast.stockoutRisk]?.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {forecast.recommendedAction && (
                            <Badge
                              variant="outline"
                              className={actionConfig[forecast.recommendedAction]?.color}
                            >
                              {actionConfig[forecast.recommendedAction]?.label}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="space-y-4">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-zinc-500">
                  発注ルールがありません
                </CardContent>
              </Card>
            ) : (
              rules.map((rule: AutoReorderRule) => (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <Badge variant={rule.isActive ? 'default' : 'secondary'}>
                            {rule.isActive ? '有効' : '無効'}
                          </Badge>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-zinc-500 mt-1">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>対象: {rule.targetType}</span>
                          <span>トリガー: {rule.triggerType}</span>
                          {rule.reorderPoint && <span>発注点: {rule.reorderPoint}</span>}
                          {rule.fixedQuantity && <span>発注数: {rule.fixedQuantity}</span>}
                          <span>実行回数: {rule._count?.orders || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRule(rule.id)}
                        >
                          {rule.isActive ? (
                            <>
                              <Pause className="mr-1 h-3 w-3" />
                              無効化
                            </>
                          ) : (
                            <>
                              <Play className="mr-1 h-3 w-3" />
                              有効化
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <div className="space-y-4">
            {pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-zinc-500">
                  承認待ちの発注はありません
                </CardContent>
              </Card>
            ) : (
              pendingOrders.map((order: AutoReorderOrder) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            商品: {order.productId.substring(0, 8)}...
                          </h3>
                          <Badge className={orderStatusConfig[order.status]?.color}>
                            {orderStatusConfig[order.status]?.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-500 mt-1">
                          ルール: {order.rule.name}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>数量: {order.quantity}</span>
                          <span>予想金額: {formatCurrency(order.estimatedTotal)}</span>
                          <span>トリガー時在庫: {order.stockAtTrigger}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                          理由: {order.triggerReason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApproveOrder(order.id)}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          承認
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectOrder(order.id)}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          却下
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

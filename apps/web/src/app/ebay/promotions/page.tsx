// @ts-nocheck
'use client';

/**
 * eBayプロモーション管理ページ
 * Phase 121: プロモーション連携
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Play,
  Pause,
  Trash2,
  Copy,
  Ticket,
  TrendingUp,
  Package,
  Truck,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function EbayPromotionsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [promotionForm, setPromotionForm] = useState({
    name: '',
    type: 'MARKDOWN_SALE',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    minQuantity: 1,
    minOrderAmount: 0,
    couponCode: '',
  });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(
    `${API_BASE}/ebay-promotions/dashboard`,
    fetcher
  );

  const { data: promotions, mutate: mutatePromotions } = useSWR(
    `${API_BASE}/ebay-promotions?${statusFilter ? `status=${statusFilter}` : ''}${typeFilter ? `&type=${typeFilter}` : ''}`,
    fetcher
  );

  const { data: types } = useSWR(`${API_BASE}/ebay-promotions/types`, fetcher);
  const { data: templates } = useSWR(`${API_BASE}/ebay-promotions/templates`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-promotions/stats`, fetcher);

  const handleCreatePromotion = async () => {
    // 実際にはリスティングIDが必要
    // ここではデモのため空配列を使用
    try {
      await fetch(`${API_BASE}/ebay-promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promotionForm,
          listingIds: [], // 実際には選択されたリスティングID
        }),
      });
      mutateDashboard();
      mutatePromotions();
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Create promotion failed:', error);
    }
  };

  const handleApplyTemplate = (template: any) => {
    setPromotionForm({
      ...promotionForm,
      name: template.name,
      type: template.type,
      discountType: template.discountType,
      discountValue: template.discountValue,
      minQuantity: template.minQuantity || 1,
      minOrderAmount: template.minOrderAmount || 0,
    });
    setSelectedTemplate(template.id);
  };

  const handleBulkAction = async (action: string, promotionIds: any[]) => {
    try {
      await fetch(`${API_BASE}/ebay-promotions/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionIds,
          action,
        }),
      });
      mutateDashboard();
      mutatePromotions();
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      SCHEDULED: 'secondary',
      PAUSED: 'outline',
      ENDED: 'destructive',
      DRAFT: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      MARKDOWN_SALE: <Tag className="h-4 w-4" />,
      ORDER_DISCOUNT: <Percent className="h-4 w-4" />,
      VOLUME_PRICING: <Package className="h-4 w-4" />,
      SHIPPING_DISCOUNT: <Truck className="h-4 w-4" />,
      COUPON: <Ticket className="h-4 w-4" />,
      CODELESS_COUPON: <Ticket className="h-4 w-4" />,
    };
    return icons[type] || <Tag className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tag className="h-8 w-8" />
            プロモーション管理
          </h1>
          <p className="text-muted-foreground">
            セール、割引、クーポンを管理
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Tag className="h-4 w-4 mr-2" />
          プロモーション作成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="promotions">プロモーション一覧</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">有効なプロモーション</CardTitle>
                <Play className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.activePromotions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">予約中</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.scheduledPromotions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">終了</CardTitle>
                <Pause className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.endedPromotions || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総プロモーション</CardTitle>
                <Tag className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.totalPromotions || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* タイプ別統計 */}
          <Card>
            <CardHeader>
              <CardTitle>タイプ別プロモーション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {dashboard?.promotionTypeOptions?.map((type: any) => (
                  <div
                    key={type.type}
                    className="p-4 border rounded-lg flex items-center gap-3"
                  >
                    {getTypeIcon(type.type)}
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {dashboard?.stats?.promotionTypes?.[type.type] || 0}件
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近のプロモーション */}
          <Card>
            <CardHeader>
              <CardTitle>最近のプロモーション</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>プロモーション</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>割引</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.recentPromotions?.map((item: any) => (
                    <TableRow key={item.listingId}>
                      <TableCell className="max-w-[200px] truncate">{item.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.promotions.map((promo: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {promo.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.promotions[0] && getStatusBadge(item.promotions[0].status)}
                      </TableCell>
                      <TableCell>
                        {item.promotions[0]?.discountType === 'PERCENTAGE'
                          ? `${item.promotions[0]?.discountValue}%`
                          : `$${item.promotions[0]?.discountValue}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* プロモーション一覧 */}
        <TabsContent value="promotions" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="ACTIVE">有効</SelectItem>
                <SelectItem value="SCHEDULED">予約中</SelectItem>
                <SelectItem value="PAUSED">一時停止</SelectItem>
                <SelectItem value="ENDED">終了</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                {types?.types?.map((type: any) => (
                  <SelectItem key={type.type} value={type.type}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>プロモーション名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>割引</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>期間</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions?.data?.map((item: any) => (
                    <TableRow key={`${item.listingId}-${item.promotionId}`}>
                      <TableCell className="max-w-[150px] truncate">
                        {item.listingTitle}
                      </TableCell>
                      <TableCell>{item.promotion.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getTypeIcon(item.promotion.type)}
                          <span className="text-sm">{item.promotion.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.promotion.discountType === 'PERCENTAGE' ? (
                          <Badge variant="secondary">
                            <Percent className="h-3 w-3 mr-1" />
                            {item.promotion.discountValue}%
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <DollarSign className="h-3 w-3 mr-1" />
                            {item.promotion.discountValue}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.promotion.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.promotion.startDate).toLocaleDateString()} -
                        {new Date(item.promotion.endDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {item.promotion.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleBulkAction('pause', [
                                  { listingId: item.listingId, promotionId: item.promotionId },
                                ])
                              }
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                          {item.promotion.status === 'PAUSED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleBulkAction('activate', [
                                  { listingId: item.listingId, promotionId: item.promotionId },
                                ])
                              }
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              handleBulkAction('delete', [
                                { listingId: item.listingId, promotionId: item.promotionId },
                              ])
                            }
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* テンプレート */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>プロモーションテンプレート</CardTitle>
              <CardDescription>
                よく使うプロモーション設定をワンクリックで適用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates?.templates?.map((template: any) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleApplyTemplate(template)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeIcon(template.type)}
                      <h3 className="font-medium">{template.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {template.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {template.discountType === 'PERCENTAGE'
                          ? `${template.discountValue}% OFF`
                          : `$${template.discountValue} OFF`}
                      </Badge>
                      {template.minQuantity && (
                        <Badge variant="outline">{template.minQuantity}点以上</Badge>
                      )}
                      {template.minOrderAmount && (
                        <Badge variant="outline">${template.minOrderAmount}以上</Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-3 w-full"
                      onClick={() => {
                        handleApplyTemplate(template);
                        setCreateDialogOpen(true);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      このテンプレートを使用
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* プロモーション作成ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>プロモーション作成</DialogTitle>
            <DialogDescription>
              新しいプロモーションを設定します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>プロモーション名</Label>
              <Input
                value={promotionForm.name}
                onChange={e => setPromotionForm({ ...promotionForm, name: e.target.value })}
                placeholder="例: 週末限定セール"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>タイプ</Label>
                <Select
                  value={promotionForm.type}
                  onValueChange={value =>
                    setPromotionForm({ ...promotionForm, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types?.types?.map((type: any) => (
                      <SelectItem key={type.type} value={type.type}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>割引タイプ</Label>
                <Select
                  value={promotionForm.discountType}
                  onValueChange={value =>
                    setPromotionForm({ ...promotionForm, discountType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">パーセント割引</SelectItem>
                    <SelectItem value="FIXED_AMOUNT">固定額割引</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                割引値 {promotionForm.discountType === 'PERCENTAGE' ? '(%)' : '($)'}
              </Label>
              <Input
                type="number"
                min={0}
                value={promotionForm.discountValue}
                onChange={e =>
                  setPromotionForm({
                    ...promotionForm,
                    discountValue: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日</Label>
                <Input
                  type="date"
                  value={promotionForm.startDate}
                  onChange={e =>
                    setPromotionForm({ ...promotionForm, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>終了日</Label>
                <Input
                  type="date"
                  value={promotionForm.endDate}
                  onChange={e =>
                    setPromotionForm({ ...promotionForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            {promotionForm.type === 'COUPON' && (
              <div className="space-y-2">
                <Label>クーポンコード</Label>
                <Input
                  value={promotionForm.couponCode}
                  onChange={e =>
                    setPromotionForm({ ...promotionForm, couponCode: e.target.value })
                  }
                  placeholder="例: SAVE10"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreatePromotion}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

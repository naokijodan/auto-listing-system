// @ts-nocheck
'use client';

/**
 * eBay広告管理ページ
 * Phase 123: Promoted Listings管理
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
import { Progress } from '@/components/ui/progress';
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  MousePointer,
  Eye,
  Target,
  Play,
  Pause,
  Trash2,
  Settings,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function EbayAdsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    campaignType: 'PROMOTED_LISTINGS_STANDARD',
    biddingStrategy: 'SUGGESTED',
    adRate: 5,
    dailyBudget: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    listingIds: [] as string[],
  });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(
    `${API_BASE}/ebay-ads/dashboard`,
    fetcher
  );

  const { data: campaigns, mutate: mutateCampaigns } = useSWR(
    `${API_BASE}/ebay-ads/campaigns${statusFilter ? `?status=${statusFilter}` : ''}`,
    fetcher
  );

  const { data: types } = useSWR(`${API_BASE}/ebay-ads/types`, fetcher);
  const { data: performance } = useSWR(`${API_BASE}/ebay-ads/performance`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-ads/stats`, fetcher);

  const handleCreateCampaign = async () => {
    try {
      await fetch(`${API_BASE}/ebay-ads/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm),
      });
      mutateDashboard();
      mutateCampaigns();
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Create campaign failed:', error);
    }
  };

  const handleUpdateCampaign = async (campaignId: string, updates: Record<string, unknown>) => {
    try {
      await fetch(`${API_BASE}/ebay-ads/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      mutateCampaigns();
    } catch (error) {
      console.error('Update campaign failed:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await fetch(`${API_BASE}/ebay-ads/campaigns/${campaignId}`, {
        method: 'DELETE',
      });
      mutateCampaigns();
      mutateDashboard();
    } catch (error) {
      console.error('Delete campaign failed:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      SCHEDULED: 'secondary',
      PAUSED: 'outline',
      ENDED: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            広告管理
          </h1>
          <p className="text-muted-foreground">
            Promoted Listingsキャンペーン管理
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Megaphone className="h-4 w-4 mr-2" />
          キャンペーン作成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="campaigns">キャンペーン</TabsTrigger>
          <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">有効キャンペーン</CardTitle>
                <Play className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.activeCampaigns || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総広告費</CardTitle>
                <DollarSign className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${dashboard?.stats?.totalSpend?.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">広告売上</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${dashboard?.stats?.totalSales?.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">ROAS</CardTitle>
                <Target className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.roas?.toFixed(2) || '0.00'}x</div>
                <p className="text-xs text-muted-foreground">
                  広告費用対効果
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">クリック数</CardTitle>
                <MousePointer className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.totalClicks || 0}</div>
                <p className="text-xs text-muted-foreground">
                  CPC: ${dashboard?.stats?.cpc?.toFixed(2) || '0.00'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">インプレッション</CardTitle>
                <Eye className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(dashboard?.stats?.totalImpressions || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  CTR: {dashboard?.stats?.ctr?.toFixed(2) || '0.00'}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* キャンペーンタイプ別統計 */}
          <Card>
            <CardHeader>
              <CardTitle>キャンペーンタイプ別</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.campaignStats?.map((stat: any) => (
                  <div key={stat.type} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{stat.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {stat.count}件
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${stat.spend?.toFixed(2) || '0.00'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* キャンペーン一覧 */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="ACTIVE">有効</SelectItem>
                <SelectItem value="PAUSED">一時停止</SelectItem>
                <SelectItem value="SCHEDULED">予約中</SelectItem>
                <SelectItem value="ENDED">終了</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>キャンペーン名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>出品数</TableHead>
                    <TableHead>広告費</TableHead>
                    <TableHead>売上</TableHead>
                    <TableHead>ROAS</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns?.data?.map((campaign: any) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {campaign.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{campaign.listingCount}</TableCell>
                      <TableCell>${campaign.spend?.toFixed(2)}</TableCell>
                      <TableCell>${campaign.sales?.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={campaign.roas >= 1 ? 'text-green-600' : 'text-red-600'}>
                          {campaign.roas?.toFixed(2)}x
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {campaign.status === 'ACTIVE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateCampaign(campaign.id, { status: 'PAUSED' })}
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                          )}
                          {campaign.status === 'PAUSED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateCampaign(campaign.id, { status: 'ACTIVE' })}
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCampaign(campaign.id)}
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

        {/* パフォーマンス */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* トップパフォーマー */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  トップパフォーマー（ROAS）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品</TableHead>
                      <TableHead>ROAS</TableHead>
                      <TableHead>売上</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {performance?.topByRoas?.slice(0, 5).map((item: any) => (
                      <TableRow key={item.listingId}>
                        <TableCell className="max-w-[150px] truncate">
                          {item.title}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {item.roas?.toFixed(2)}x
                        </TableCell>
                        <TableCell>${item.sales?.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 改善推奨 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  改善推奨
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performance?.recommendations?.slice(0, 5).map((item: any) => (
                    <div key={item.listingId} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="font-medium text-sm truncate">{item.title}</div>
                      <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        {item.issue}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        推奨: {item.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 全体統計 */}
          <Card>
            <CardHeader>
              <CardTitle>広告パフォーマンス概要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="text-center">
                  <div className="text-2xl font-bold">{performance?.summary?.totalAdListings || 0}</div>
                  <div className="text-sm text-muted-foreground">広告出品数</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {(performance?.summary?.totalImpressions || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">インプレッション</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{performance?.summary?.totalClicks || 0}</div>
                  <div className="text-sm text-muted-foreground">クリック</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${performance?.summary?.totalSpend?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-muted-foreground">広告費</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    ${performance?.summary?.totalSales?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-muted-foreground">売上</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* キャンペーン作成ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>キャンペーン作成</DialogTitle>
            <DialogDescription>
              新しい広告キャンペーンを設定します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>キャンペーン名</Label>
              <Input
                value={campaignForm.name}
                onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                placeholder="例: 週末プロモーション"
              />
            </div>

            <div className="space-y-2">
              <Label>キャンペーンタイプ</Label>
              <Select
                value={campaignForm.campaignType}
                onValueChange={value =>
                  setCampaignForm({ ...campaignForm, campaignType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types?.campaignTypes?.map((type: any) => (
                    <SelectItem key={type.type} value={type.type}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>入札戦略</Label>
              <Select
                value={campaignForm.biddingStrategy}
                onValueChange={value =>
                  setCampaignForm({ ...campaignForm, biddingStrategy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types?.biddingStrategies?.map((s: any) => (
                    <SelectItem key={s.strategy} value={s.strategy}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>広告レート (%)</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={campaignForm.adRate}
                onChange={e =>
                  setCampaignForm({ ...campaignForm, adRate: parseInt(e.target.value) || 5 })
                }
              />
              <p className="text-xs text-muted-foreground">
                推奨: 5% - 成果報酬として売上から差し引かれます
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始日</Label>
                <Input
                  type="date"
                  value={campaignForm.startDate}
                  onChange={e =>
                    setCampaignForm({ ...campaignForm, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>終了日（任意）</Label>
                <Input
                  type="date"
                  value={campaignForm.endDate}
                  onChange={e =>
                    setCampaignForm({ ...campaignForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreateCampaign}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

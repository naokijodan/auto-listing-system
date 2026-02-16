'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Crown,
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  Settings,
  BarChart3,
  Users,
  Gift,
  Star,
  Award,
  Coins,
  Heart,
  Plus,
  Eye,
  Calendar,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function CustomerLoyaltyPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const { data: overview } = useSWR(`${API_BASE}/ebay/customer-loyalty/dashboard/overview`, fetcher);
  const { data: tierDistribution } = useSWR(`${API_BASE}/ebay/customer-loyalty/dashboard/tiers`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/customer-loyalty/dashboard/alerts`, fetcher);
  const { data: members } = useSWR(`${API_BASE}/ebay/customer-loyalty/members`, fetcher);
  const { data: tiers } = useSWR(`${API_BASE}/ebay/customer-loyalty/tiers`, fetcher);
  const { data: campaigns } = useSWR(`${API_BASE}/ebay/customer-loyalty/campaigns`, fetcher);
  const { data: retention } = useSWR(`${API_BASE}/ebay/customer-loyalty/analytics/retention`, fetcher);
  const { data: pointsAnalytics } = useSWR(`${API_BASE}/ebay/customer-loyalty/analytics/points`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/customer-loyalty/settings/general`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum': return 'bg-purple-100 text-purple-800';
      case 'gold': return 'bg-yellow-100 text-yellow-800';
      case 'silver': return 'bg-gray-200 text-gray-800';
      case 'bronze': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'platinum': return <Crown className="h-4 w-4 text-purple-600" />;
      case 'gold': return <Award className="h-4 w-4 text-yellow-600" />;
      case 'silver': return <Star className="h-4 w-4 text-gray-600" />;
      case 'bronze': return <Star className="h-4 w-4 text-orange-600" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'ended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-sky-600">Customer Loyalty Program</h1>
          <p className="text-muted-foreground">顧客ロイヤルティプログラム管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="members">メンバー</TabsTrigger>
          <TabsTrigger value="tiers">ティア</TabsTrigger>
          <TabsTrigger value="campaigns">キャンペーン</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総メンバー</CardTitle>
                <Users className="h-4 w-4 text-sky-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalMembers?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  アクティブ: {overview?.activeMembers?.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">リピート率</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.repeatPurchaseRate || 0}%</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +{overview?.memberGrowthRate || 0}% 成長
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">発行ポイント</CardTitle>
                <Coins className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(overview?.totalPointsIssued || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  利用済み: {(overview?.totalPointsRedeemed || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">顧客生涯価値</CardTitle>
                <BarChart3 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overview?.avgCustomerLifetimeValue || 0)}</div>
                <p className="text-xs text-muted-foreground">平均CLV</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>ティア分布</CardTitle>
                <CardDescription>メンバーのティア構成</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tierDistribution?.tiers?.map((tier: any) => (
                    <div key={tier.tier} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTierIcon(tier.tier)}
                        <div>
                          <p className="font-medium">{tier.tier}</p>
                          <p className="text-sm text-muted-foreground">{tier.members} メンバー</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{tier.percentage}%</p>
                        <p className="text-sm text-muted-foreground">平均 {formatCurrency(tier.avgSpend)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アラート</CardTitle>
                <CardDescription>注意が必要な項目</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {alert.type === 'tier_upgrade' ? (
                        <Award className="h-5 w-5 text-yellow-500" />
                      ) : alert.type === 'points_expiry' ? (
                        <Coins className="h-5 w-5 text-orange-500" />
                      ) : (
                        <Users className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{alert.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* メンバー */}
        <TabsContent value="members" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>メンバー一覧</CardTitle>
                  <CardDescription>ロイヤルティプログラムのメンバー</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={tierFilter} onValueChange={setTierFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="ティア" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-sky-600 hover:bg-sky-700">
                    <Plus className="h-4 w-4 mr-2" />
                    追加
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー名</TableHead>
                    <TableHead>ティア</TableHead>
                    <TableHead>ポイント</TableHead>
                    <TableHead>総購入額</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>加入日</TableHead>
                    <TableHead>詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members?.members?.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.username}</TableCell>
                      <TableCell>
                        <Badge className={getTierColor(member.tier)}>
                          {getTierIcon(member.tier)}
                          <span className="ml-1">{member.tier}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{member.points.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(member.totalSpend)}</TableCell>
                      <TableCell>{member.orders}</TableCell>
                      <TableCell>{member.joinDate}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ティア */}
        <TabsContent value="tiers" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {tiers?.tiers?.map((tier: any) => (
              <Card key={tier.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getTierIcon(tier.name)}
                      {tier.name}
                    </CardTitle>
                    <Badge className={getTierColor(tier.name)}>
                      {tier.minSpend > 0 ? `¥${tier.minSpend.toLocaleString()}~` : 'エントリー'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">割引率: </span>
                        <span className="font-bold">{tier.discountRate}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ポイント倍率: </span>
                        <span className="font-bold">{tier.pointsMultiplier}x</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tier.freeShipping && (
                        <Badge variant="outline">送料無料</Badge>
                      )}
                      {tier.prioritySupport && (
                        <Badge variant="outline">優先サポート</Badge>
                      )}
                    </div>
                    <Button variant="outline" className="w-full">
                      編集
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* キャンペーン */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>キャンペーン</CardTitle>
                  <CardDescription>ポイントキャンペーンの管理</CardDescription>
                </div>
                <Button className="bg-sky-600 hover:bg-sky-700">
                  <Plus className="h-4 w-4 mr-2" />
                  新規作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>キャンペーン名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>期間</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns?.campaigns?.map((campaign: any) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{campaign.type.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {campaign.startDate} ~ {campaign.endDate}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            編集
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

        {/* 分析 */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>リテンション分析</CardTitle>
                <CardDescription>ティア別リテンション率</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">全体リテンション</p>
                    <p className="text-3xl font-bold text-sky-600">{retention?.retention?.overall || 0}%</p>
                  </div>
                  {retention?.retention?.byTier?.map((tier: any) => (
                    <div key={tier.tier} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {getTierIcon(tier.tier)}
                        <span>{tier.tier}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={tier.retention} className="w-24 h-2" />
                        <span className="w-12 text-right font-bold">{tier.retention}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ポイント分析</CardTitle>
                <CardDescription>ポイントの発行と利用状況</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">発行済み</p>
                      <p className="text-xl font-bold">{(pointsAnalytics?.summary?.totalIssued || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">利用済み</p>
                      <p className="text-xl font-bold">{(pointsAnalytics?.summary?.totalRedeemed || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">利用率</span>
                      <span className="font-bold">{pointsAnalytics?.summary?.redemptionRate || 0}%</span>
                    </div>
                    <Progress value={pointsAnalytics?.summary?.redemptionRate || 0} className="h-2" />
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm text-muted-foreground">未使用ポイント</p>
                    <p className="text-xl font-bold text-orange-600">{(pointsAnalytics?.summary?.outstanding || 0).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>ロイヤルティプログラムの設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">プログラム有効</p>
                  <p className="text-sm text-muted-foreground">ロイヤルティプログラムを有効化</p>
                </div>
                <Switch checked={settings?.settings?.enableProgram || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動登録</p>
                  <p className="text-sm text-muted-foreground">新規顧客を自動的に登録</p>
                </div>
                <Switch checked={settings?.settings?.autoEnroll || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ポイント獲得通知</p>
                  <p className="text-sm text-muted-foreground">ポイント獲得時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnPointsEarned || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ティア変更通知</p>
                  <p className="text-sm text-muted-foreground">ティア変更時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnTierChange || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">有効期限通知</p>
                  <p className="text-sm text-muted-foreground">ポイント有効期限前に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnExpiry || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">有効期限通知日数</p>
                  <p className="text-sm text-muted-foreground">何日前に通知するか</p>
                </div>
                <Input
                  type="number"
                  value={settings?.settings?.expiryReminderDays || 30}
                  className="w-24"
                />
              </div>
              <Button className="bg-sky-600 hover:bg-sky-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

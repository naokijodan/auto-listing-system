'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  LayoutDashboard,
  Settings2,
  Target,
  BarChart3,
  Heart,
  TrendingUp,
  TrendingDown,
  Eye,
  Tag,
  Plus,
  UserCheck,
  UserX,
  Mail,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CustomerInsightsV2Page() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-sky-600" />
            Customer Insights V2
          </h1>
          <p className="text-muted-foreground mt-1">顧客インサイト・セグメント分析</p>
        </div>
        <Button className="bg-sky-600 hover:bg-sky-700">
          <Mail className="mr-2 h-4 w-4" />
          キャンペーン作成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            顧客
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            セグメント
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            分析
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            キャンペーン
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="customers">
          <CustomersTab />
        </TabsContent>
        <TabsContent value="segments">
          <SegmentsTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/customer-insights-v2/dashboard/overview`, fetcher);
  const { data: segments } = useSWR(`${API_BASE}/ebay/customer-insights-v2/dashboard/segments`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総顧客数</CardTitle>
            <Users className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalCustomers?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">アクティブ: {overview?.activeCustomers?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">新規顧客（30日）</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview?.newCustomers30d}</div>
            <p className="text-xs text-muted-foreground">リピート: {overview?.repeatCustomers?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均LTV</CardTitle>
            <Heart className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.avgLifetimeValue}</div>
            <p className="text-xs text-muted-foreground">平均注文: {overview?.avgOrdersPerCustomer}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">離脱率</CardTitle>
            <UserX className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.churnRate}%</div>
            <p className="text-xs text-muted-foreground">90日以上未購入</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>セグメント概要</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {segments?.segments?.map((segment: any) => (
              <div key={segment.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-sky-600" />
                  <div>
                    <p className="font-medium">{segment.name}</p>
                    <p className="text-sm text-muted-foreground">{segment.count?.toLocaleString()} 顧客</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">平均LTV: ${segment.avgLtv}</span>
                  <Badge variant="outline">{segment.share}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CustomersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-insights-v2/customers`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>顧客一覧</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="顧客検索..." className="w-64" />
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="セグメント" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="repeat">リピート</SelectItem>
                  <SelectItem value="at_risk">離脱リスク</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ユーザー名</TableHead>
                <TableHead className="text-right">注文数</TableHead>
                <TableHead className="text-right">総支出</TableHead>
                <TableHead className="text-right">平均注文額</TableHead>
                <TableHead>最終注文</TableHead>
                <TableHead>セグメント</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.customers?.map((customer: any) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.username}</TableCell>
                  <TableCell className="text-right">{customer.totalOrders}</TableCell>
                  <TableCell className="text-right">${customer.totalSpent?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${customer.avgOrderValue}</TableCell>
                  <TableCell>{customer.lastOrder}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.segment}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Tag className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SegmentsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-insights-v2/segments`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">セグメント管理</h2>
        <Button className="bg-sky-600 hover:bg-sky-700">
          <Plus className="mr-2 h-4 w-4" />
          セグメント作成
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.segments?.map((segment: any) => (
          <Card key={segment.id} className={segment.active ? 'border-sky-600' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{segment.name}</CardTitle>
                {segment.active && <Badge className="bg-sky-100 text-sky-800">有効</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{segment.criteria}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">顧客数</span>
                  <span className="font-medium">{segment.count?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">平均LTV</span>
                  <span className="font-medium">${segment.avgLtv}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  編集
                </Button>
                <Button size="sm" className="flex-1 bg-sky-600 hover:bg-sky-700">
                  顧客を見る
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { data: behavior } = useSWR(`${API_BASE}/ebay/customer-insights-v2/analytics/behavior`, fetcher);
  const { data: rfm } = useSWR(`${API_BASE}/ebay/customer-insights-v2/analytics/rfm`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>行動分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">購買パターン</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">平均購入間隔</p>
                  <p className="font-medium">{behavior?.behavior?.purchasePatterns?.avgDaysBetweenOrders}日</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">ピーク曜日</p>
                  <p className="font-medium">{behavior?.behavior?.purchasePatterns?.peakPurchaseDay}</p>
                </div>
                <div className="p-2 bg-muted rounded">
                  <p className="text-muted-foreground">ピーク時間</p>
                  <p className="font-medium">{behavior?.behavior?.purchasePatterns?.peakPurchaseHour}:00</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">カテゴリ嗜好</p>
              <div className="space-y-2">
                {behavior?.behavior?.categoryPreferences?.map((cat: any) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <span className="text-sm">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={cat.percentage} className="w-24" />
                      <span className="text-sm w-12 text-right">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RFM分析</CardTitle>
            <CardDescription>Recency, Frequency, Monetary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rfm?.rfm && Object.entries(rfm.rfm).map(([key, data]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-sm text-muted-foreground">{data.count} 顧客 ({data.percentage}%)</p>
                  </div>
                  <span className="font-medium">${data.avgLtv}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CampaignsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-insights-v2/campaigns`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">キャンペーン</h2>
        <Button className="bg-sky-600 hover:bg-sky-700">
          <Plus className="mr-2 h-4 w-4" />
          キャンペーン作成
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>キャンペーン名</TableHead>
                <TableHead>対象セグメント</TableHead>
                <TableHead>タイプ</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="text-right">送信数</TableHead>
                <TableHead className="text-right">開封率</TableHead>
                <TableHead className="text-right">コンバージョン</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.campaigns?.map((campaign: any) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>{campaign.segment}</TableCell>
                  <TableCell>{campaign.type}</TableCell>
                  <TableCell>
                    <Badge className={campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{campaign.sent}</TableCell>
                  <TableCell className="text-right">
                    {campaign.sent > 0 ? ((campaign.opened / campaign.sent) * 100).toFixed(1) : 0}%
                  </TableCell>
                  <TableCell className="text-right">{campaign.converted}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/customer-insights-v2/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動セグメンテーション</p>
              <p className="text-sm text-muted-foreground">顧客を自動的にセグメントに分類</p>
            </div>
            <Switch checked={data?.settings?.autoSegmentation} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">セグメント更新間隔</label>
            <Select defaultValue={data?.settings?.segmentationInterval}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">1時間ごと</SelectItem>
                <SelectItem value="daily">毎日</SelectItem>
                <SelectItem value="weekly">毎週</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">行動追跡</p>
              <p className="text-sm text-muted-foreground">顧客の行動パターンを追跡</p>
            </div>
            <Switch checked={data?.settings?.trackBehavior} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">離脱判定日数</label>
            <Input type="number" defaultValue={data?.settings?.churnThresholdDays} />
          </div>

          <Button className="bg-sky-600 hover:bg-sky-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

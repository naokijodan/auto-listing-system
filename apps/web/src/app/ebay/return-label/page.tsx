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
import {
  RotateCcw,
  LayoutDashboard,
  Package,
  Settings2,
  FileText,
  Truck,
  DollarSign,
  Send,
  Download,
  CheckCircle,
  Clock,
  MapPin,
  AlertTriangle,
  Scale,
  Eye,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ReturnLabelPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RotateCcw className="h-8 w-8 text-teal-600" />
            Return Label Generator
          </h1>
          <p className="text-muted-foreground mt-1">返品ラベル生成・返品管理</p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700">
          <FileText className="mr-2 h-4 w-4" />
          返品処理
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            返品一覧
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            追跡
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            ポリシー
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            レポート
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="returns">
          <ReturnsTab />
        </TabsContent>
        <TabsContent value="tracking">
          <TrackingTab />
        </TabsContent>
        <TabsContent value="policies">
          <PoliciesTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/return-label/dashboard/overview`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/return-label/dashboard/stats`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/return-label/dashboard/recent`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">待機中</Badge>;
      case 'labelSent':
        return <Badge className="bg-blue-100 text-blue-800">ラベル送信済み</Badge>;
      case 'inTransit':
        return <Badge className="bg-purple-100 text-purple-800">配送中</Badge>;
      case 'received':
        return <Badge className="bg-green-100 text-green-800">受取済み</Badge>;
      case 'refunded':
        return <Badge className="bg-teal-100 text-teal-800">返金完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総返品数</CardTitle>
            <RotateCcw className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalReturns}</div>
            <p className="text-xs text-muted-foreground">待機中: {overview?.pendingReturns}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">配送中</CardTitle>
            <Truck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.inTransit}</div>
            <p className="text-xs text-muted-foreground">完了: {overview?.completed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">返品率</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.returnRate}%</div>
            <p className="text-xs text-muted-foreground">平均処理時間: {overview?.avgProcessingTime}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ラベル発行数</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalLabelsGenerated}</div>
            <p className="text-xs text-muted-foreground">今月発行</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>返品理由別</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.byReason && Object.entries(stats.byReason).map(([reason, count]: [string, any]) => (
                <div key={reason} className="flex items-center justify-between">
                  <span className="text-sm">{reason}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${(count / 280) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-10 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近の返品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent?.returns?.map((ret: any) => (
                <div key={ret.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{ret.buyer}</p>
                    <p className="text-sm text-muted-foreground">{ret.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(ret.status)}
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ReturnsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/return-label/returns`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">待機中</Badge>;
      case 'labelSent':
        return <Badge className="bg-blue-100 text-blue-800">ラベル送信済み</Badge>;
      case 'inTransit':
        return <Badge className="bg-purple-100 text-purple-800">配送中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>返品一覧</CardTitle>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">待機中</SelectItem>
                  <SelectItem value="labelSent">ラベル送信済み</SelectItem>
                  <SelectItem value="inTransit">配送中</SelectItem>
                  <SelectItem value="received">受取済み</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="注文ID検索..." className="w-48" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>注文ID</TableHead>
                <TableHead>購入者</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>理由</TableHead>
                <TableHead>ラベル</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.returns?.map((ret: any) => (
                <TableRow key={ret.id}>
                  <TableCell className="font-mono text-sm">{ret.orderId}</TableCell>
                  <TableCell>{ret.buyer}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{ret.item}</TableCell>
                  <TableCell>{ret.reason}</TableCell>
                  <TableCell>
                    {ret.hasLabel ? (
                      <Badge className="bg-green-100 text-green-800">発行済み</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">未発行</Badge>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(ret.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!ret.hasLabel && (
                        <Button variant="ghost" size="sm" className="text-teal-600">
                          <FileText className="h-4 w-4" />
                        </Button>
                      )}
                      {ret.hasLabel && (
                        <>
                          <Button variant="ghost" size="sm">
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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

function TrackingTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>返品追跡</CardTitle>
          <CardDescription>返品商品の配送状況を確認</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input placeholder="追跡番号を入力..." className="flex-1" />
            <Button className="bg-teal-600 hover:bg-teal-700">
              <MapPin className="mr-2 h-4 w-4" />
              追跡
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>配送中の返品</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-medium">注文: order_123</p>
                  <p className="text-sm text-muted-foreground font-mono">9400111899223847583209</p>
                </div>
                <Badge className="bg-purple-100 text-purple-800">配送中</Badge>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 mt-1 rounded-full bg-green-600" />
                  <div>
                    <p className="font-medium">パッケージ受取</p>
                    <p className="text-sm text-muted-foreground">New York, NY - 2026-02-16 14:00</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 mt-1 rounded-full bg-blue-600" />
                  <div>
                    <p className="font-medium">配送中</p>
                    <p className="text-sm text-muted-foreground">Newark, NJ - 2026-02-16 18:00</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 mt-1 rounded-full bg-gray-300" />
                  <div>
                    <p className="font-medium text-muted-foreground">配達予定</p>
                    <p className="text-sm text-muted-foreground">2026-02-18</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PoliciesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/return-label/policies`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">返品ポリシー</h2>
        <Button className="bg-teal-600 hover:bg-teal-700">
          ポリシーを追加
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.policies?.map((policy: any) => (
          <Card key={policy.id} className={policy.active ? 'border-teal-600' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{policy.name}</CardTitle>
                {policy.active && <Badge className="bg-teal-100 text-teal-800">有効</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">返品期間</span>
                  <span className="font-medium">{policy.returnWindow}日</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">送料負担</span>
                  <span className="font-medium">{policy.buyerPays ? '購入者' : '出品者'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">返品手数料</span>
                  <span className="font-medium">{policy.restockingFee}%</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  編集
                </Button>
                <Switch checked={policy.active} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/return-label/reports/summary`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>サマリーレポート</CardTitle>
              <CardDescription>期間: {data?.report?.period}</CardDescription>
            </div>
            <Button variant="outline">
              レポートをエクスポート
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">総返品数</p>
              <p className="text-2xl font-bold">{data?.report?.totalReturns}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">返品率</p>
              <p className="text-2xl font-bold">{data?.report?.returnRate}%</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">総返金額</p>
              <p className="text-2xl font-bold">${data?.report?.totalRefunds?.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">ラベルコスト</p>
              <p className="text-2xl font-bold">${data?.report?.labelCost?.toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">理由別内訳</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>理由</TableHead>
                  <TableHead className="text-right">件数</TableHead>
                  <TableHead className="text-right">割合</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.report?.byReason?.map((item: any) => (
                  <TableRow key={item.reason}>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right">{item.percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/return-label/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動承認</p>
              <p className="text-sm text-muted-foreground">条件を満たす返品を自動承認</p>
            </div>
            <Switch checked={data?.settings?.autoApprove} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルトキャリア</label>
            <Select defaultValue={data?.settings?.defaultCarrier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USPS">USPS</SelectItem>
                <SelectItem value="FedEx">FedEx</SelectItem>
                <SelectItem value="UPS">UPS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">ラベル自動送信</p>
              <p className="text-sm text-muted-foreground">承認後に自動でラベルを送信</p>
            </div>
            <Switch checked={data?.settings?.autoSendLabel} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">返品通知</p>
              <p className="text-sm text-muted-foreground">返品リクエスト時にメール通知</p>
            </div>
            <Switch checked={data?.settings?.notifyOnReturn} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">返品先住所</label>
            <Input defaultValue={data?.settings?.returnAddress?.address} placeholder="住所" />
          </div>

          <Button className="bg-teal-600 hover:bg-teal-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

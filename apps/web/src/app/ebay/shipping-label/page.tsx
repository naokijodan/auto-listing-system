
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
  Package,
  LayoutDashboard,
  Printer,
  Settings2,
  Truck,
  FileText,
  DollarSign,
  RefreshCw,
  Download,
  Trash2,
  Plus,
  Check,
  Clock,
  X,
  BarChart3,
  Layers,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ShippingLabelPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Package className="h-8 w-8 text-orange-600" />
            Shipping Label Generator
          </h1>
          <p className="text-muted-foreground mt-1">配送ラベル生成・管理</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" />
          新規ラベル作成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="labels" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            ラベル一覧
          </TabsTrigger>
          <TabsTrigger value="rates" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            料金比較
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            テンプレート
          </TabsTrigger>
          <TabsTrigger value="carriers" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            キャリア
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="labels">
          <LabelsTab />
        </TabsContent>
        <TabsContent value="rates">
          <RatesTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="carriers">
          <CarriersTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/shipping-label/dashboard/overview`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/shipping-label/dashboard/stats`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/shipping-label/dashboard/recent`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総ラベル数</CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalLabels?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">今日: {overview?.todayLabels}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均コスト</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.avgLabelCost}</div>
            <p className="text-xs text-muted-foreground">総コスト: ${overview?.totalShippingCost?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">節約率</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview?.savedVsRetail}%</div>
            <p className="text-xs text-muted-foreground">小売価格との比較</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">未処理</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.pendingLabels}</div>
            <p className="text-xs text-muted-foreground">印刷待ち</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>キャリア別統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.byCarrier && Object.entries(stats.byCarrier).map(([carrier, data]: [string, any]) => (
                <div key={carrier} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{carrier}</p>
                      <p className="text-sm text-muted-foreground">{data.count?.toLocaleString()} ラベル</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${data.avgCost}</p>
                    <p className="text-sm text-muted-foreground">平均</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近のラベル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent?.labels?.map((label: any) => (
                <div key={label.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{label.carrier}</p>
                    <p className="text-sm text-muted-foreground font-mono">{label.tracking}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {label.status === 'printed' ? (
                      <Badge className="bg-green-100 text-green-800">印刷済み</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">未印刷</Badge>
                    )}
                    <Button variant="ghost" size="sm">
                      <Printer className="h-4 w-4" />
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

function LabelsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/shipping-label/labels`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'printed':
        return <Badge className="bg-green-100 text-green-800">印刷済み</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">未印刷</Badge>;
      case 'void':
        return <Badge className="bg-red-100 text-red-800">無効</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ラベル一覧</CardTitle>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="printed">印刷済み</SelectItem>
                  <SelectItem value="pending">未印刷</SelectItem>
                  <SelectItem value="void">無効</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="キャリア" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="usps">USPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>注文ID</TableHead>
                <TableHead>キャリア</TableHead>
                <TableHead>サービス</TableHead>
                <TableHead>追跡番号</TableHead>
                <TableHead className="text-right">コスト</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.labels?.map((label: any) => (
                <TableRow key={label.id}>
                  <TableCell className="font-mono text-sm">{label.orderId}</TableCell>
                  <TableCell>{label.carrier}</TableCell>
                  <TableCell>{label.service}</TableCell>
                  <TableCell className="font-mono text-sm">{label.tracking}</TableCell>
                  <TableCell className="text-right">${label.cost}</TableCell>
                  <TableCell>{getStatusBadge(label.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <X className="h-4 w-4" />
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

function RatesTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>料金比較</CardTitle>
          <CardDescription>配送先情報を入力して料金を比較</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-medium">パッケージ情報</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground">重量 (lbs)</label>
                  <Input type="number" defaultValue="2.5" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">長さ (in)</label>
                  <Input type="number" defaultValue="12" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">幅 (in)</label>
                  <Input type="number" defaultValue="8" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">高さ (in)</label>
                  <Input type="number" defaultValue="6" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-medium">配送先</h3>
              <div className="space-y-2">
                <Input placeholder="郵便番号" defaultValue="10001" />
                <Select defaultValue="US">
                  <SelectTrigger>
                    <SelectValue placeholder="国" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button className="w-full bg-orange-600 hover:bg-orange-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            料金を取得
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>料金オプション</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>キャリア</TableHead>
                <TableHead>サービス</TableHead>
                <TableHead className="text-right">料金</TableHead>
                <TableHead>配送日数</TableHead>
                <TableHead>選択</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>USPS</TableCell>
                <TableCell>Priority Mail</TableCell>
                <TableCell className="text-right">$8.50</TableCell>
                <TableCell>2-3日</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">選択</Button>
                </TableCell>
              </TableRow>
              <TableRow className="bg-orange-50">
                <TableCell>FedEx</TableCell>
                <TableCell>Ground</TableCell>
                <TableCell className="text-right">$12.50</TableCell>
                <TableCell>5-7日</TableCell>
                <TableCell>
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">選択中</Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>UPS</TableCell>
                <TableCell>Ground</TableCell>
                <TableCell className="text-right">$11.80</TableCell>
                <TableCell>5-7日</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">選択</Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/shipping-label/templates`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">テンプレート管理</h2>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="mr-2 h-4 w-4" />
          新規テンプレート
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.templates?.map((template: any) => (
          <Card key={template.id} className={template.default ? 'border-orange-600' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.default && <Badge className="bg-orange-100 text-orange-800">デフォルト</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">キャリア</span>
                  <span className="font-medium">{template.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">サービス</span>
                  <span className="font-medium">{template.service}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  編集
                </Button>
                <Button size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700">
                  使用
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CarriersTab() {
  const { data } = useSWR(`${API_BASE}/ebay/shipping-label/carriers`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>キャリア接続</CardTitle>
          <CardDescription>配送キャリアのAPI接続を管理</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.carriers?.map((carrier: any) => (
              <div key={carrier.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Truck className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{carrier.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {carrier.services.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {carrier.connected ? (
                    <Badge className="bg-green-100 text-green-800">接続済み</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">未接続</Badge>
                  )}
                  <Button variant="outline" size="sm">
                    {carrier.connected ? '設定' : '接続'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/shipping-label/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルトキャリア</label>
            <Select defaultValue={data?.settings?.defaultCarrier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FedEx">FedEx</SelectItem>
                <SelectItem value="UPS">UPS</SelectItem>
                <SelectItem value="USPS">USPS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルトサービス</label>
            <Select defaultValue={data?.settings?.defaultService}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ground">Ground</SelectItem>
                <SelectItem value="Express">Express</SelectItem>
                <SelectItem value="Priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動ラベル作成</p>
              <p className="text-sm text-muted-foreground">注文時に自動でラベルを作成</p>
            </div>
            <Switch checked={data?.settings?.autoCreateLabel} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ラベルサイズ</label>
            <Select defaultValue={data?.settings?.labelSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4x6">4 x 6 インチ</SelectItem>
                <SelectItem value="8.5x11">8.5 x 11 インチ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">小売価格を表示</p>
              <p className="text-sm text-muted-foreground">節約額の比較用に表示</p>
            </div>
            <Switch checked={data?.settings?.showRetailRates} />
          </div>

          <Button className="bg-orange-600 hover:bg-orange-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
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
  FileText,
  Globe,
  DollarSign,
  AlertTriangle,
  Settings,
  Plus,
  Eye,
  Upload,
  Download,
  BarChart3,
  CheckCircle,
  Clock,
  Search,
  Flag,
  Package,
  Plane
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function CustomsDeclarationPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/customs-declaration/dashboard/overview`, fetcher);
  const { data: pending } = useSWR(`${API_BASE}/ebay/customs-declaration/dashboard/pending`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/customs-declaration/dashboard/alerts`, fetcher);
  const { data: declarations } = useSWR(`${API_BASE}/ebay/customs-declaration/declarations`, fetcher);
  const { data: hsCodes } = useSWR(`${API_BASE}/ebay/customs-declaration/hs-codes`, fetcher);
  const { data: regulations } = useSWR(`${API_BASE}/ebay/customs-declaration/regulations`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/customs-declaration/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>;
      case 'pending_review':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />審査待ち</Badge>;
      case 'pending_docs':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><FileText className="w-3 h-3 mr-1" />書類待ち</Badge>;
      case 'rejected':
        return <Badge variant="destructive">却下</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-600">Customs Declaration</h1>
          <p className="text-gray-500">税関申告</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            申告作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="declarations">申告管理</TabsTrigger>
          <TabsTrigger value="hs-codes">HSコード</TabsTrigger>
          <TabsTrigger value="regulations">規制情報</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総申告数</CardTitle>
                <FileText className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalDeclarations?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">今月: {overview?.completedThisMonth}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">保留中</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{overview?.pendingReview}</div>
                <p className="text-xs text-muted-foreground">却下: {overview?.rejectedThisMonth}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">コンプライアンス率</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.complianceRate}%</div>
                <Progress value={overview?.complianceRate} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">関税支払額</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">¥{overview?.totalDutyPaid?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">平均処理: {overview?.avgProcessTime}</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts */}
          {alerts?.alerts?.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-5 h-5" />
                  アラート
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className={`p-3 rounded-lg ${alert.priority === 'high' ? 'bg-red-100' : alert.priority === 'medium' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant={alert.priority === 'high' ? 'destructive' : 'outline'} className="mb-1">
                            {alert.type}
                          </Badge>
                          <p className="text-sm">{alert.message}</p>
                        </div>
                        <Button size="sm" variant="outline">確認</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Declarations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                保留中の申告
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文番号</TableHead>
                    <TableHead>送付先</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>申告額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending?.declarations?.map((dec: any) => (
                    <TableRow key={dec.id}>
                      <TableCell className="font-mono">{dec.order}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Flag className="w-3 h-3 mr-1" />
                          {dec.destination}
                        </Badge>
                      </TableCell>
                      <TableCell>{dec.items}点</TableCell>
                      <TableCell>¥{dec.value?.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(dec.status)}</TableCell>
                      <TableCell>{dec.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                            <Upload className="w-3 h-3 mr-1" />
                            書類
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

        <TabsContent value="declarations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>申告一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="注文番号で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">保留中</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文番号</TableHead>
                    <TableHead>送付先</TableHead>
                    <TableHead>HSコード</TableHead>
                    <TableHead>申告額</TableHead>
                    <TableHead>関税</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations?.declarations?.map((dec: any) => (
                    <TableRow key={dec.id}>
                      <TableCell className="font-mono">{dec.order}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{dec.destination}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{dec.hsCode}</TableCell>
                      <TableCell>¥{dec.value?.toLocaleString()}</TableCell>
                      <TableCell className="text-orange-600">¥{dec.duty?.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(dec.status)}</TableCell>
                      <TableCell>{dec.createdAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hs-codes" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-orange-600" />
                  HSコード検索
                </CardTitle>
                <Input placeholder="商品名やコードで検索..." className="w-96" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HSコード</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>US関税率</TableHead>
                    <TableHead>EU関税率</TableHead>
                    <TableHead>UK関税率</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hsCodes?.codes?.map((code: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono font-bold">{code.code}</TableCell>
                      <TableCell>{code.description}</TableCell>
                      <TableCell>{code.dutyRate?.US}%</TableCell>
                      <TableCell>{code.dutyRate?.EU}%</TableCell>
                      <TableCell>{code.dutyRate?.UK}%</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regulations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-600" />
                国別規制情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>国</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>要件</TableHead>
                    <TableHead>発効日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regulations?.regulations?.map((reg: any) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <Badge variant="outline">
                          <Flag className="w-3 h-3 mr-1" />
                          {reg.country}
                        </Badge>
                      </TableCell>
                      <TableCell>{reg.category}</TableCell>
                      <TableCell>{reg.requirement}</TableCell>
                      <TableCell>{reg.effectiveDate}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-orange-600" />
                  関税分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>総関税支払額</span>
                    <span className="text-xl font-bold">¥2,850,000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均関税率</span>
                    <span className="text-xl font-bold">5.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>削減額</span>
                    <span className="text-xl font-bold text-green-600">¥450,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-orange-600" />
                  コンプライアンス
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-600">98.5%</div>
                    <div className="text-sm text-gray-500">コンプライアンス率</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">45</div>
                      <div className="text-xs text-green-700">解決済み</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">3</div>
                      <div className="text-xs text-yellow-700">保留中</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600" />
                国別関税
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                国別関税チャート
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-orange-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動分類</p>
                  <p className="text-sm text-gray-500">HSコードを自動で分類</p>
                </div>
                <Switch checked={settings?.settings?.autoClassify} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">書類自動生成</p>
                  <p className="text-sm text-gray-500">申告書類を自動で生成</p>
                </div>
                <Switch checked={settings?.settings?.autoGenerateDocs} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">却下通知</p>
                  <p className="text-sm text-gray-500">申告却下時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnRejection} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">規制変更通知</p>
                  <p className="text-sm text-gray-500">輸入規制変更時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnRegulationChange} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">デフォルト原産国</label>
                  <Select defaultValue={settings?.settings?.defaultOrigin || 'JP'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JP">日本</SelectItem>
                      <SelectItem value="CN">中国</SelectItem>
                      <SelectItem value="US">アメリカ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">通貨</label>
                  <Select defaultValue={settings?.settings?.defaultCurrency || 'JPY'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JPY">JPY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="bg-orange-600 hover:bg-orange-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

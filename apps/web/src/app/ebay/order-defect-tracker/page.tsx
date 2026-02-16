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
  AlertTriangle,
  Search,
  Download,
  RefreshCw,
  FileWarning,
  CheckCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Settings,
  BarChart3,
  ShieldAlert,
  Package,
  AlertCircle,
  Eye,
  MessageSquare,
  Target,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function OrderDefectTrackerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: overview } = useSWR(`${API_BASE}/ebay/order-defect-tracker/dashboard/overview`, fetcher);
  const { data: recentDefects } = useSWR(`${API_BASE}/ebay/order-defect-tracker/dashboard/recent`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/order-defect-tracker/dashboard/alerts`, fetcher);
  const { data: defects } = useSWR(`${API_BASE}/ebay/order-defect-tracker/defects`, fetcher);
  const { data: defectTypes } = useSWR(`${API_BASE}/ebay/order-defect-tracker/defect-types`, fetcher);
  const { data: atRiskOrders } = useSWR(`${API_BASE}/ebay/order-defect-tracker/orders/at-risk`, fetcher);
  const { data: defectAnalytics } = useSWR(`${API_BASE}/ebay/order-defect-tracker/analytics/defects`, fetcher);
  const { data: performanceAnalytics } = useSWR(`${API_BASE}/ebay/order-defect-tracker/analytics/performance`, fetcher);
  const { data: rootCause } = useSWR(`${API_BASE}/ebay/order-defect-tracker/analytics/root-cause`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/order-defect-tracker/settings/general`, fetcher);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pink-600">Order Defect Tracker</h1>
          <p className="text-muted-foreground">注文欠陥追跡・パフォーマンス管理</p>
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
          <TabsTrigger value="defects">欠陥管理</TabsTrigger>
          <TabsTrigger value="at-risk">リスク注文</TabsTrigger>
          <TabsTrigger value="types">欠陥タイプ</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">欠陥率</CardTitle>
                <FileWarning className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.defectRate || 0}%</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
                  {overview?.defectRateTrend || 0}% vs 先月
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総欠陥数</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.defectiveOrders || 0}</div>
                <p className="text-xs text-muted-foreground">
                  総注文数: {overview?.totalOrders?.toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">未解決</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.pendingResolution || 0}</div>
                <p className="text-xs text-muted-foreground">
                  解決済（今月）: {overview?.resolvedThisMonth || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均解決時間</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgResolutionTime || '-'}</div>
                <p className="text-xs text-muted-foreground">
                  最終更新: {overview?.lastUpdated?.split(' ')[0] || '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>最近の欠陥</CardTitle>
                <CardDescription>直近に検出された欠陥</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentDefects?.defects?.map((defect: any) => (
                    <div key={defect.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileWarning className="h-5 w-5 text-pink-600" />
                        <div>
                          <p className="font-medium">{defect.orderId}</p>
                          <p className="text-sm text-muted-foreground">{defect.type.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(defect.severity)}>
                          {defect.severity}
                        </Badge>
                        <Badge className={getStatusColor(defect.status)}>
                          {defect.status}
                        </Badge>
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
                      <AlertCircle className={`h-5 w-5 ${alert.priority === 'high' ? 'text-red-500' : alert.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
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

        {/* 欠陥管理 */}
        <TabsContent value="defects" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>欠陥一覧</CardTitle>
                  <CardDescription>すべての注文欠陥を管理</CardDescription>
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="open">未対応</SelectItem>
                      <SelectItem value="investigating">調査中</SelectItem>
                      <SelectItem value="resolved">解決済</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>欠陥ID</TableHead>
                    <TableHead>注文ID</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>重大度</TableHead>
                    <TableHead>バイヤー</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>検出日</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defects?.defects?.map((defect: any) => (
                    <TableRow key={defect.id}>
                      <TableCell className="font-medium">{defect.id}</TableCell>
                      <TableCell>{defect.orderId}</TableCell>
                      <TableCell>{defect.type.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(defect.severity)}>
                          {defect.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{defect.buyer}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(defect.status)}>
                          {defect.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{defect.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4" />
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

        {/* リスク注文 */}
        <TabsContent value="at-risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>リスク注文</CardTitle>
              <CardDescription>欠陥リスクのある注文を早期に検出</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文ID</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>リスクレベル</TableHead>
                    <TableHead>リスクタイプ</TableHead>
                    <TableHead>残り日数</TableHead>
                    <TableHead>推奨アクション</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRiskOrders?.orders?.map((order: any) => (
                    <TableRow key={order.orderId}>
                      <TableCell className="font-medium">{order.orderId}</TableCell>
                      <TableCell>{order.itemTitle}</TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(order.riskLevel)}>
                          {order.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.riskType.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <span className={order.daysRemaining <= 0 ? 'text-red-600 font-bold' : ''}>
                          {order.daysRemaining}日
                        </span>
                      </TableCell>
                      <TableCell>{order.action.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
                          対応
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 欠陥タイプ */}
        <TabsContent value="types" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>欠陥タイプ</CardTitle>
              <CardDescription>欠陥の種類と発生状況</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {defectTypes?.types?.map((type: any) => (
                  <div key={type.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <ShieldAlert className={`h-5 w-5 ${type.impact === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
                        <div>
                          <p className="font-medium">{type.name}</p>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{type.count}</p>
                        <Badge className={type.impact === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                          {type.impact} impact
                        </Badge>
                      </div>
                    </div>
                    <Progress value={(type.count / 85) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析 */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>欠陥分析</CardTitle>
                <CardDescription>欠陥の傾向と統計</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">総欠陥数</p>
                      <p className="text-2xl font-bold">{defectAnalytics?.summary?.totalDefects || 0}</p>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">解決率</p>
                      <p className="text-2xl font-bold">{defectAnalytics?.summary?.resolutionRate || 0}%</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">タイプ別内訳</p>
                    {defectAnalytics?.byType?.map((item: any) => (
                      <div key={item.type} className="flex items-center justify-between py-2">
                        <span className="text-sm">{item.type.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={item.percentage} className="w-24 h-2" />
                          <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>パフォーマンス指標</CardTitle>
                <CardDescription>目標値との比較</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceAnalytics?.metrics && Object.entries(performanceAnalytics.metrics).map(([key, value]: [string, any]) => {
                    const target = performanceAnalytics?.targets?.[key] || 100;
                    const isGood = key.includes('Rate') ? value <= target : value >= target;
                    return (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-sm text-muted-foreground">目標: {target}%</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                            {value}%
                          </span>
                          {isGood ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>根本原因分析</CardTitle>
              <CardDescription>欠陥の主な原因と対策</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>原因</TableHead>
                    <TableHead>欠陥数</TableHead>
                    <TableHead>割合</TableHead>
                    <TableHead>推奨対策</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rootCause?.causes?.map((cause: any) => (
                    <TableRow key={cause.cause}>
                      <TableCell className="font-medium">{cause.cause.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{cause.defects}</TableCell>
                      <TableCell>{cause.percentage}%</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{cause.recommendation}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>欠陥追跡の動作設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動検出</p>
                  <p className="text-sm text-muted-foreground">欠陥を自動的に検出する</p>
                </div>
                <Switch checked={settings?.settings?.autoDetect || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">欠陥通知</p>
                  <p className="text-sm text-muted-foreground">新しい欠陥を通知する</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnDefect || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">解決通知</p>
                  <p className="text-sm text-muted-foreground">欠陥解決時に通知する</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnResolution || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動調査</p>
                  <p className="text-sm text-muted-foreground">自動的に調査を開始する</p>
                </div>
                <Switch checked={settings?.settings?.autoInvestigate || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">日次ダイジェスト</p>
                  <p className="text-sm text-muted-foreground">毎日の欠陥サマリーを送信</p>
                </div>
                <Switch checked={settings?.settings?.dailyDigest || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">アラートしきい値</p>
                  <p className="text-sm text-muted-foreground">この数を超えたらアラート</p>
                </div>
                <Input
                  type="number"
                  value={settings?.settings?.defectAlertThreshold || 3}
                  className="w-24"
                />
              </div>
              <Button className="bg-pink-600 hover:bg-pink-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

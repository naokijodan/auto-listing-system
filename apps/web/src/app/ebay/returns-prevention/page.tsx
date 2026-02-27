// @ts-nocheck
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
  RotateCcw,
  Search,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Settings,
  BarChart3,
  AlertTriangle,
  Shield,
  Package,
  DollarSign,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ReturnsPreventionPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const { data: overview } = useSWR(`${API_BASE}/ebay/returns-prevention/dashboard/overview`, fetcher);
  const { data: atRisk } = useSWR(`${API_BASE}/ebay/returns-prevention/dashboard/at-risk`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/returns-prevention/dashboard/alerts`, fetcher);
  const { data: returns } = useSWR(`${API_BASE}/ebay/returns-prevention/returns`, fetcher);
  const { data: reasons } = useSWR(`${API_BASE}/ebay/returns-prevention/returns/reasons`, fetcher);
  const { data: predictions } = useSWR(`${API_BASE}/ebay/returns-prevention/predictions`, fetcher);
  const { data: highRiskProducts } = useSWR(`${API_BASE}/ebay/returns-prevention/products/high-risk`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/returns-prevention/analytics/trends`, fetcher);
  const { data: savings } = useSWR(`${API_BASE}/ebay/returns-prevention/analytics/savings`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/returns-prevention/settings/general`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-600">Returns Prevention System</h1>
          <p className="text-muted-foreground">返品防止・リスク予測システム</p>
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
          <TabsTrigger value="at-risk">リスク注文</TabsTrigger>
          <TabsTrigger value="returns">返品履歴</TabsTrigger>
          <TabsTrigger value="products">商品分析</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">返品率</CardTitle>
                <RotateCcw className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.returnRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {overview?.returnedOrders || 0} / {overview?.totalOrders?.toLocaleString() || 0} 注文
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">防止済み返品</CardTitle>
                <Shield className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overview?.preventedReturns || 0}</div>
                <p className="text-xs text-muted-foreground">
                  防止率: {overview?.preventionRate || 0}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">節約額（今月）</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overview?.savingsThisMonth || 0)}</div>
                <p className="text-xs text-muted-foreground">返品防止による節約</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">主な返品理由</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{overview?.topReturnReason || '-'}</div>
                <p className="text-xs text-muted-foreground">最も多い返品理由</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>リスク注文</CardTitle>
                <CardDescription>返品リスクの高い注文</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {atRisk?.orders?.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className={`h-5 w-5 ${order.riskScore >= 80 ? 'text-red-500' : order.riskScore >= 60 ? 'text-yellow-500' : 'text-green-500'}`} />
                        <div>
                          <p className="font-medium">{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.product}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getRiskColor(order.riskScore >= 80 ? 'high' : order.riskScore >= 60 ? 'medium' : 'low')}>
                          {order.riskScore}%
                        </Badge>
                        <Button size="sm" variant="outline">
                          対応
                        </Button>
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
                      <AlertTriangle className={`h-5 w-5 ${alert.priority === 'high' ? 'text-red-500' : 'text-yellow-500'}`} />
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

          <Card>
            <CardHeader>
              <CardTitle>返品理由分析</CardTitle>
              <CardDescription>返品の原因と防止可能性</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reasons?.reasons?.map((reason: any) => (
                  <div key={reason.reason} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{reason.reason.replace(/_/g, ' ')}</span>
                      {reason.preventable && (
                        <Badge className="bg-green-100 text-green-800">防止可能</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={reason.percentage} className="w-32 h-2" />
                      <span className="w-12 text-right">{reason.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* リスク注文 */}
        <TabsContent value="at-risk" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>リスク予測</CardTitle>
                  <CardDescription>返品リスクの高い注文を早期に検出</CardDescription>
                </div>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="リスク" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="high">高リスク</SelectItem>
                    <SelectItem value="medium">中リスク</SelectItem>
                    <SelectItem value="low">低リスク</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文ID</TableHead>
                    <TableHead>リスクスコア</TableHead>
                    <TableHead>リスクレベル</TableHead>
                    <TableHead>要因</TableHead>
                    <TableHead>推奨アクション</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {predictions?.predictions?.map((pred: any) => (
                    <TableRow key={pred.orderId}>
                      <TableCell className="font-medium">{pred.orderId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={pred.riskScore} className="w-16 h-2" />
                          <span>{pred.riskScore}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskColor(pred.riskLevel)}>
                          {pred.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pred.factors?.slice(0, 2).map((f: string) => (
                            <Badge key={f} variant="outline" className="text-xs">
                              {f.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{pred.recommendation.replace(/_/g, ' ')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                            <Play className="h-4 w-4" />
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

        {/* 返品履歴 */}
        <TabsContent value="returns" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>返品履歴</CardTitle>
                  <CardDescription>過去の返品とその原因</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>返品ID</TableHead>
                    <TableHead>注文ID</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>理由</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日付</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returns?.returns?.map((ret: any) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-medium">{ret.id}</TableCell>
                      <TableCell>{ret.orderId}</TableCell>
                      <TableCell>{ret.product}</TableCell>
                      <TableCell>{ret.reason.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{formatCurrency(ret.amount)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ret.status)}>
                          {ret.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{ret.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 商品分析 */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>高リスク商品</CardTitle>
              <CardDescription>返品率の高い商品と改善提案</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>返品率</TableHead>
                    <TableHead>返品数</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>主な理由</TableHead>
                    <TableHead>改善提案</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highRiskProducts?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>
                        <span className={product.returnRate > 10 ? 'text-red-600 font-bold' : ''}>
                          {product.returnRate}%
                        </span>
                      </TableCell>
                      <TableCell>{product.returns}</TableCell>
                      <TableCell>{product.orders}</TableCell>
                      <TableCell>{product.topReason.replace(/_/g, ' ')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{product.suggestion}</TableCell>
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
                <CardTitle>節約分析</CardTitle>
                <CardDescription>返品防止による節約効果</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">総節約額</p>
                      <p className="text-xl font-bold">{formatCurrency(savings?.summary?.totalSaved || 0)}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">防止済み返品</p>
                      <p className="text-xl font-bold">{savings?.summary?.preventedReturns || 0}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">平均節約額</p>
                      <p className="text-xl font-bold">{formatCurrency(savings?.summary?.avgSavingsPerReturn || 0)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">防止タイプ別</p>
                    {savings?.byPreventionType?.map((item: any) => (
                      <div key={item.type} className="flex items-center justify-between py-2">
                        <span className="text-sm">{item.type.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{formatCurrency(item.saved)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>トレンド</CardTitle>
                <CardDescription>返品率と防止率の推移</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>月</TableHead>
                      <TableHead>返品率</TableHead>
                      <TableHead>返品数</TableHead>
                      <TableHead>防止数</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trends?.trend?.map((t: any) => (
                      <TableRow key={t.month}>
                        <TableCell className="font-medium">{t.month}</TableCell>
                        <TableCell>{t.returnRate}%</TableCell>
                        <TableCell>{t.returns}</TableCell>
                        <TableCell className="text-green-600">{t.preventedReturns}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>返品防止システムの動作設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">予測機能</p>
                  <p className="text-sm text-muted-foreground">AIによるリスク予測を有効化</p>
                </div>
                <Switch checked={settings?.settings?.enablePrediction || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動アクション</p>
                  <p className="text-sm text-muted-foreground">高リスク注文に自動対応</p>
                </div>
                <Switch checked={settings?.settings?.enableAutoActions || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">高リスク通知</p>
                  <p className="text-sm text-muted-foreground">高リスク注文を通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnHighRisk || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">返品通知</p>
                  <p className="text-sm text-muted-foreground">返品リクエスト時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnReturn || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">日次ダイジェスト</p>
                  <p className="text-sm text-muted-foreground">毎日のサマリーを送信</p>
                </div>
                <Switch checked={settings?.settings?.dailyDigest || false} />
              </div>
              <Button className="bg-amber-600 hover:bg-amber-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

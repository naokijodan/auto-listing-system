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
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  DollarSign,
  Activity,
  Target,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Play,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function PriceElasticityAnalyzerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: overview } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/dashboard/overview`, fetcher);
  const { data: insights } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/dashboard/insights`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/dashboard/alerts`, fetcher);
  const { data: products } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/products`, fetcher);
  const { data: categories } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/categories`, fetcher);
  const { data: optimalPrices } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/optimal-prices`, fetcher);
  const { data: elasticityTrends } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/analytics/elasticity-trends`, fetcher);
  const { data: revenueImpact } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/analytics/revenue-impact`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/price-elasticity-analyzer/settings/general`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
  };

  const getElasticityColor = (type: string) => {
    switch (type) {
      case 'inelastic': return 'bg-green-100 text-green-800';
      case 'elastic': return 'bg-red-100 text-red-800';
      case 'unitary': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOpportunityColor = (opportunity: string) => {
    switch (opportunity) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'caution': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'increase': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'decrease': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-600">Price Elasticity Analyzer</h1>
          <p className="text-muted-foreground">価格弾力性分析・最適価格設定</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            再分析
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
          <TabsTrigger value="products">商品分析</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="optimal">最適価格</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">分析済み商品</CardTitle>
                <BarChart3 className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.analyzedProducts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  平均弾力性: {overview?.avgElasticity || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">弾力的（値下げ推奨）</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overview?.elasticProducts || 0}</div>
                <p className="text-xs text-muted-foreground">価格感度が高い</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">非弾力的（値上げ可能）</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overview?.inelasticProducts || 0}</div>
                <p className="text-xs text-muted-foreground">価格感度が低い</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">収益最適化余地</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overview?.revenueOptimizationPotential || 0)}</div>
                <p className="text-xs text-muted-foreground">最適価格適用時</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>インサイト</CardTitle>
                <CardDescription>価格最適化の機会</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights?.insights?.map((insight: any) => (
                    <div key={insight.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {insight.type === 'opportunity' ? (
                        <Lightbulb className="h-5 w-5 text-green-500" />
                      ) : insight.type === 'warning' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Activity className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{insight.product || insight.category}</p>
                          <Badge variant="outline">{insight.impact}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{insight.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アラート</CardTitle>
                <CardDescription>弾力性の変化と注意事項</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertTriangle className={`h-5 w-5 ${alert.priority === 'high' ? 'text-red-500' : alert.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
                      <div>
                        <p className="font-medium">{alert.product || alert.category}</p>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 商品分析 */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>商品別弾力性分析</CardTitle>
                  <CardDescription>各商品の価格感度と最適価格</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="商品検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="タイプ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="inelastic">非弾力的</SelectItem>
                      <SelectItem value="elastic">弾力的</SelectItem>
                      <SelectItem value="unitary">単位弾力</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>現在価格</TableHead>
                    <TableHead>弾力性</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>最適価格</TableHead>
                    <TableHead>収益ポテンシャル</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>{formatCurrency(product.currentPrice)}</TableCell>
                      <TableCell className="font-bold">{product.elasticity}</TableCell>
                      <TableCell>
                        <Badge className={getElasticityColor(product.type)}>
                          {product.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(product.optimalPrice)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${product.potential > 0 ? 'text-green-600' : product.potential < 0 ? 'text-red-600' : ''}`}>
                          {getActionIcon(product.potential > 0 ? 'increase' : product.potential < 0 ? 'decrease' : '')}
                          <span className="ml-1">{product.potential > 0 ? '+' : ''}{product.potential}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
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

        {/* カテゴリ */}
        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {categories?.categories?.map((category: any) => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{category.name}</CardTitle>
                    <Badge className={getOpportunityColor(category.opportunity)}>
                      {category.opportunity}
                    </Badge>
                  </div>
                  <CardDescription>{category.products} 商品</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">平均弾力性</span>
                      <span className="text-xl font-bold">{category.avgElasticity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">タイプ</span>
                      <Badge className={getElasticityColor(category.type)}>
                        {category.type}
                      </Badge>
                    </div>
                    <Progress
                      value={Math.abs(category.avgElasticity) * 33.3}
                      className="h-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      {category.type === 'inelastic'
                        ? '価格上昇の余地あり'
                        : category.type === 'elastic'
                        ? '価格変更に敏感'
                        : '価格変更に比例して需要変動'}
                    </p>
                    <Button variant="outline" className="w-full">
                      詳細を見る
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 最適価格 */}
        <TabsContent value="optimal" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">最適価格以下</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{optimalPrices?.summary?.belowOptimal || 0}</div>
                <p className="text-xs text-muted-foreground">値上げ推奨</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">最適価格</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{optimalPrices?.summary?.atOptimal || 0}</div>
                <p className="text-xs text-muted-foreground">変更不要</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">最適価格以上</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{optimalPrices?.summary?.aboveOptimal || 0}</div>
                <p className="text-xs text-muted-foreground">値下げ推奨</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">収益機会</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{formatCurrency(optimalPrices?.summary?.potentialRevenue || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>最適価格推奨</CardTitle>
                  <CardDescription>収益最大化のための価格調整</CardDescription>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  一括適用
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>現在価格</TableHead>
                    <TableHead>最適価格</TableHead>
                    <TableHead>差額</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>適用</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {optimalPrices?.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.title}</TableCell>
                      <TableCell>{formatCurrency(product.currentPrice)}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(product.optimalPrice)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${product.gap > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {getActionIcon(product.action)}
                          <span className="ml-1">{product.gap > 0 ? '+' : ''}{product.gap}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          適用
                        </Button>
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
          <Card>
            <CardHeader>
              <CardTitle>弾力性トレンド</CardTitle>
              <CardDescription>{elasticityTrends?.interpretation || ''}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月</TableHead>
                    <TableHead>平均弾力性</TableHead>
                    <TableHead>弾力的商品</TableHead>
                    <TableHead>非弾力的商品</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {elasticityTrends?.trend?.map((t: any) => (
                    <TableRow key={t.month}>
                      <TableCell className="font-medium">{t.month}</TableCell>
                      <TableCell className="font-bold">{t.avgElasticity}</TableCell>
                      <TableCell>{t.elasticCount}</TableCell>
                      <TableCell>{t.inelasticCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>収益インパクトシナリオ</CardTitle>
              <CardDescription>異なる価格戦略の影響</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {revenueImpact?.scenarios?.map((scenario: any, index: number) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{scenario.scenario}</span>
                      {scenario.revenueImpact > 0 ? (
                        <Badge className="bg-green-100 text-green-800">
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          +{scenario.revenueImpact}% 収益
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          {scenario.revenueImpact}% 収益
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>需要影響: {scenario.demandImpact > 0 ? '+' : ''}{scenario.demandImpact}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                推奨: {revenueImpact?.recommendation || ''}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>分析と通知の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動分析</p>
                  <p className="text-sm text-muted-foreground">定期的に弾力性を再計算</p>
                </div>
                <Switch checked={settings?.settings?.autoAnalyze || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">弾力性変化通知</p>
                  <p className="text-sm text-muted-foreground">弾力性が大きく変化した場合に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnElasticityChange || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">機会通知</p>
                  <p className="text-sm text-muted-foreground">価格最適化の機会を通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnOpportunity || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">週次レポート</p>
                  <p className="text-sm text-muted-foreground">毎週の弾力性レポート</p>
                </div>
                <Switch checked={settings?.settings?.weeklyReport || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">弾力性変化しきい値</p>
                  <p className="text-sm text-muted-foreground">この値以上の変化で通知</p>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  value={settings?.settings?.elasticityChangeThreshold || 0.2}
                  className="w-24"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">機会しきい値（%）</p>
                  <p className="text-sm text-muted-foreground">この%以上の収益機会で通知</p>
                </div>
                <Input
                  type="number"
                  value={settings?.settings?.opportunityThreshold || 5}
                  className="w-24"
                />
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

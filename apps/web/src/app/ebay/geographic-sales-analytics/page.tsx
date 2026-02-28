
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
  Globe,
  Search,
  Download,
  RefreshCw,
  MapPin,
  TrendingUp,
  TrendingDown,
  Settings,
  BarChart3,
  Map,
  Building2,
  Plane,
  DollarSign,
  Package,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function GeographicSalesAnalyticsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');

  const { data: overview } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/dashboard/overview`, fetcher);
  const { data: topRegions } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/dashboard/top-regions`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/dashboard/alerts`, fetcher);
  const { data: countries } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/countries`, fetcher);
  const { data: regions } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/regions`, fetcher);
  const { data: cities } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/cities`, fetcher);
  const { data: marketPenetration } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/analytics/market-penetration`, fetcher);
  const { data: shippingAnalytics } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/analytics/shipping`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/geographic-sales-analytics/settings/general`, fetcher);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value);
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPotentialColor = (potential: string) => {
    switch (potential) {
      case 'very_high': return 'bg-green-100 text-green-800';
      case 'high': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-teal-600">Geographic Sales Analytics</h1>
          <p className="text-muted-foreground">地域別売上分析・市場インサイト</p>
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
          <TabsTrigger value="countries">国別分析</TabsTrigger>
          <TabsTrigger value="regions">地域別</TabsTrigger>
          <TabsTrigger value="cities">都市別</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総売上</CardTitle>
                <DollarSign className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overview?.totalSales || 0)}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +{overview?.growthRate || 0}% 成長
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総注文数</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalOrders?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  平均注文額: {formatCurrency(overview?.avgOrderValue || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">対応国数</CardTitle>
                <Globe className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.activeCountries || 0}</div>
                <p className="text-xs text-muted-foreground">
                  トップ市場: {overview?.topMarket || '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">海外比率</CardTitle>
                <Plane className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.internationalRatio || 0}%</div>
                <Progress value={overview?.internationalRatio || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>トップ地域</CardTitle>
                <CardDescription>売上上位の地域</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topRegions?.regions?.map((region: any, index: number) => (
                    <div key={region.region} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-teal-600">{index + 1}</span>
                        <div>
                          <p className="font-medium">{region.region}</p>
                          <p className="text-sm text-muted-foreground">{region.orders.toLocaleString()} 注文</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(region.sales)}</p>
                        <div className={`flex items-center justify-end text-sm ${getGrowthColor(region.growth)}`}>
                          {region.growth > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {region.growth}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アラート</CardTitle>
                <CardDescription>市場の変化と機会</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <MapPin className={`h-5 w-5 ${alert.priority === 'high' ? 'text-green-500' : alert.priority === 'medium' ? 'text-yellow-500' : 'text-blue-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{alert.region}</p>
                          <Badge variant="outline">{alert.type.replace(/_/g, ' ')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 国別分析 */}
        <TabsContent value="countries" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>国別売上</CardTitle>
                  <CardDescription>各国の売上パフォーマンス</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="国名で検索..."
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
                    <TableHead>国</TableHead>
                    <TableHead>売上</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>平均注文額</TableHead>
                    <TableHead>成長率</TableHead>
                    <TableHead>詳細</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countries?.countries?.map((country: any) => (
                    <TableRow key={country.code}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{country.code === 'US' ? '🇺🇸' : country.code === 'DE' ? '🇩🇪' : country.code === 'UK' ? '🇬🇧' : country.code === 'AU' ? '🇦🇺' : country.code === 'CA' ? '🇨🇦' : '🌍'}</span>
                          <span className="font-medium">{country.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">{formatCurrency(country.sales)}</TableCell>
                      <TableCell>{country.orders.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(country.avgOrderValue)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${getGrowthColor(country.growth)}`}>
                          {country.growth > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                          {country.growth > 0 ? '+' : ''}{country.growth}%
                        </div>
                      </TableCell>
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

        {/* 地域別 */}
        <TabsContent value="regions" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {regions?.regions?.map((region: any) => (
              <Card key={region.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5 text-teal-600" />
                    {region.name}
                  </CardTitle>
                  <CardDescription>{region.countries} カ国</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">売上</span>
                      <span className="font-bold">{formatCurrency(region.sales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">注文数</span>
                      <span className="font-medium">{region.orders.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">成長率</span>
                      <span className={`font-medium ${getGrowthColor(region.growth)}`}>
                        {region.growth > 0 ? '+' : ''}{region.growth}%
                      </span>
                    </div>
                    <Progress value={(region.sales / 125000000) * 100} className="h-2" />
                    <Button variant="outline" className="w-full">
                      詳細を見る
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 都市別 */}
        <TabsContent value="cities" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>都市別売上</CardTitle>
              <CardDescription>主要都市のパフォーマンス</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>都市</TableHead>
                    <TableHead>国</TableHead>
                    <TableHead>売上</TableHead>
                    <TableHead>注文数</TableHead>
                    <TableHead>平均注文額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cities?.cities?.map((city: any) => (
                    <TableRow key={city.city}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-teal-600" />
                          <span className="font-medium">{city.city}</span>
                        </div>
                      </TableCell>
                      <TableCell>{city.country}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(city.sales)}</TableCell>
                      <TableCell>{city.orders}</TableCell>
                      <TableCell>{formatCurrency(city.avgOrderValue)}</TableCell>
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
                <CardTitle>市場浸透分析</CardTitle>
                <CardDescription>各市場のポテンシャル</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>国</TableHead>
                      <TableHead>浸透率</TableHead>
                      <TableHead>ポテンシャル</TableHead>
                      <TableHead>機会</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketPenetration?.markets?.map((market: any) => (
                      <TableRow key={market.country}>
                        <TableCell className="font-medium">{market.country}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={market.penetration} className="w-16 h-2" />
                            <span>{market.penetration}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPotentialColor(market.potential)}>
                            {market.potential.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(market.opportunity)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>配送分析</CardTitle>
                <CardDescription>地域別配送パフォーマンス</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {shippingAnalytics?.byRegion?.map((region: any) => (
                    <div key={region.region} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{region.region}</span>
                        <Badge variant="outline">{region.onTimeRate}% 定時配送</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">平均コスト: </span>
                          <span className="font-medium">{formatCurrency(region.avgCost)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">平均日数: </span>
                          <span className="font-medium">{region.avgDays}日</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>配送業者比較</CardTitle>
              <CardDescription>配送業者別パフォーマンス</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>配送業者</TableHead>
                    <TableHead>平均コスト</TableHead>
                    <TableHead>平均日数</TableHead>
                    <TableHead>満足度</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shippingAnalytics?.carriers?.map((carrier: any) => (
                    <TableRow key={carrier.carrier}>
                      <TableCell className="font-medium">{carrier.carrier}</TableCell>
                      <TableCell>{formatCurrency(carrier.avgCost)}</TableCell>
                      <TableCell>{carrier.avgDays}日</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span>{carrier.satisfaction}</span>
                        </div>
                      </TableCell>
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
              <CardDescription>地域別分析の表示設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルト通貨</p>
                  <p className="text-sm text-muted-foreground">表示に使用する通貨</p>
                </div>
                <Select defaultValue={settings?.settings?.defaultCurrency || 'JPY'}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">現地通貨表示</p>
                  <p className="text-sm text-muted-foreground">各国の現地通貨も表示する</p>
                </div>
                <Switch checked={settings?.settings?.showLocalCurrency || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ヒートマップ有効</p>
                  <p className="text-sm text-muted-foreground">地図上のヒートマップを表示</p>
                </div>
                <Switch checked={settings?.settings?.heatmapEnabled || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">新規市場アラート</p>
                  <p className="text-sm text-muted-foreground">新しい国からの注文を通知</p>
                </div>
                <Switch checked={settings?.settings?.alertOnNewMarket || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">売上減少アラート</p>
                  <p className="text-sm text-muted-foreground">売上が減少した場合に通知</p>
                </div>
                <Switch checked={settings?.settings?.alertOnDecline || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">減少しきい値</p>
                  <p className="text-sm text-muted-foreground">この%以上減少でアラート</p>
                </div>
                <Input
                  type="number"
                  value={settings?.settings?.declineThreshold || 10}
                  className="w-24"
                />
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

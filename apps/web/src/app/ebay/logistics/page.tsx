'use client';

/**
 * eBayクロスボーダー物流ページ
 * Phase 127: 国際配送最適化、キャリア比較、関税計算
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Truck,
  Package,
  Globe,
  DollarSign,
  Clock,
  Calculator,
  MapPin,
  Plane,
  Ship,
  Zap,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  FileText,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'KR', name: 'South Korea' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'SG', name: 'Singapore' },
  { code: 'CN', name: 'China' },
];

const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: '電子機器' },
  { value: 'clothing', label: '衣類' },
  { value: 'watches', label: '時計' },
  { value: 'jewelry', label: 'ジュエリー' },
  { value: 'toys', label: 'おもちゃ' },
  { value: 'other', label: 'その他' },
];

export default function EbayLogisticsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);

  const [rateForm, setRateForm] = useState({
    weight: '',
    length: '',
    width: '',
    height: '',
    destinationCountry: 'US',
    productCategory: 'other',
    productValue: '',
  });

  const { data: dashboard } = useSWR(`${API_BASE}/ebay-logistics/dashboard`, fetcher);
  const { data: carriers } = useSWR(`${API_BASE}/ebay-logistics/carriers`, fetcher);
  const { data: zones } = useSWR(`${API_BASE}/ebay-logistics/zones`, fetcher);
  const { data: suggestions } = useSWR(`${API_BASE}/ebay-logistics/optimization-suggestions`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-logistics/stats`, fetcher);

  const handleCalculateRate = async () => {
    if (!rateForm.weight || !rateForm.destinationCountry) return;

    setIsCalculating(true);
    try {
      const payload: any = {
        weight: parseFloat(rateForm.weight),
        destinationCountry: rateForm.destinationCountry,
        productCategory: rateForm.productCategory,
      };

      if (rateForm.length && rateForm.width && rateForm.height) {
        payload.dimensions = {
          length: parseFloat(rateForm.length),
          width: parseFloat(rateForm.width),
          height: parseFloat(rateForm.height),
        };
      }

      if (rateForm.productValue) {
        payload.productValue = parseFloat(rateForm.productValue);
      }

      const res = await fetch(`${API_BASE}/ebay-logistics/calculate-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setCalculationResult(data);
    } catch (error) {
      console.error('Calculate rate failed:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleTrack = async () => {
    if (!trackingNumber) return;

    try {
      const res = await fetch(`${API_BASE}/ebay-logistics/track/${trackingNumber}?carrierId=ems`);
      const data = await res.json();
      setTrackingResult(data);
    } catch (error) {
      console.error('Track failed:', error);
    }
  };

  const getCarrierTypeIcon = (type: string) => {
    switch (type) {
      case 'EXPRESS':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'STANDARD':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'ECONOMY':
        return <Ship className="h-4 w-4 text-gray-500" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getCarrierTypeBadge = (type: string) => {
    switch (type) {
      case 'EXPRESS':
        return <Badge className="bg-yellow-100 text-yellow-800">Express</Badge>;
      case 'STANDARD':
        return <Badge className="bg-blue-100 text-blue-800">Standard</Badge>;
      case 'ECONOMY':
        return <Badge className="bg-gray-100 text-gray-800">Economy</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            クロスボーダー物流
          </h1>
          <p className="text-muted-foreground">
            国際配送最適化・キャリア比較・関税計算
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="calculator">料金計算</TabsTrigger>
          <TabsTrigger value="carriers">キャリア</TabsTrigger>
          <TabsTrigger value="tracking">追跡</TabsTrigger>
          <TabsTrigger value="optimization">最適化</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総出荷数</CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.totalOrders || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総配送費</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboard?.stats?.totalShippingCost || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均配送費</CardTitle>
                <Calculator className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboard?.stats?.avgShippingCost || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">利用キャリア数</CardTitle>
                <Truck className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.activeCarriers || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 配送先ランキング */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  配送先トップ
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard?.topDestinations?.slice(0, 5).map((dest: any, idx: number) => (
                    <div key={dest.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">#{idx + 1}</span>
                        <span className="font-medium">{dest.country}</span>
                      </div>
                      <div className="text-right">
                        <div>{dest.count}件</div>
                        <div className="text-sm text-muted-foreground">平均 ${dest.avgCost?.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  キャリア別統計
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard?.carrierStats?.slice(0, 5).map((carrier: any) => (
                    <div key={carrier.carrier} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCarrierTypeIcon(carriers?.carriers?.find((c: any) => c.id === carrier.carrier)?.type || 'STANDARD')}
                        <span className="font-medium">{carrier.name}</span>
                      </div>
                      <div className="text-right">
                        <div>{carrier.count}件</div>
                        <div className="text-sm text-muted-foreground">平均 ${carrier.avgCost}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 配送パフォーマンス */}
          {stats?.deliveryPerformance && (
            <Card>
              <CardHeader>
                <CardTitle>配送パフォーマンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.deliveryPerformance.onTime}</div>
                    <div className="text-sm text-green-700">オンタイム</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{stats.deliveryPerformance.delayed}</div>
                    <div className="text-sm text-red-700">遅延</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.deliveryPerformance.onTimeRate}</div>
                    <div className="text-sm text-blue-700">オンタイム率</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 料金計算 */}
        <TabsContent value="calculator" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>配送料金計算</CardTitle>
                <CardDescription>重量とサイズから配送料金を見積もり</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>重量 (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={rateForm.weight}
                      onChange={e => setRateForm({ ...rateForm, weight: e.target.value })}
                      placeholder="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>配送先国</Label>
                    <Select
                      value={rateForm.destinationCountry}
                      onValueChange={value => setRateForm({ ...rateForm, destinationCountry: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>長さ (cm)</Label>
                    <Input
                      type="number"
                      value={rateForm.length}
                      onChange={e => setRateForm({ ...rateForm, length: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>幅 (cm)</Label>
                    <Input
                      type="number"
                      value={rateForm.width}
                      onChange={e => setRateForm({ ...rateForm, width: e.target.value })}
                      placeholder="20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>高さ (cm)</Label>
                    <Input
                      type="number"
                      value={rateForm.height}
                      onChange={e => setRateForm({ ...rateForm, height: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>商品カテゴリ（関税計算用）</Label>
                    <Select
                      value={rateForm.productCategory}
                      onValueChange={value => setRateForm({ ...rateForm, productCategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>商品価格 (USD)</Label>
                    <Input
                      type="number"
                      value={rateForm.productValue}
                      onChange={e => setRateForm({ ...rateForm, productValue: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                </div>

                <Button onClick={handleCalculateRate} disabled={isCalculating} className="w-full">
                  {isCalculating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Calculator className="h-4 w-4 mr-2" />
                  料金を計算
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>計算結果</CardTitle>
              </CardHeader>
              <CardContent>
                {calculationResult ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground">入力情報</div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>実重量: {calculationResult.input.actualWeight}kg</div>
                        <div>適用重量: {calculationResult.input.effectiveWeight}kg</div>
                        <div>配送先: {calculationResult.input.destination}</div>
                        <div>ゾーン: {calculationResult.input.zone}</div>
                      </div>
                    </div>

                    {/* キャリア別料金 */}
                    <div className="space-y-2">
                      {calculationResult.rates?.map((rate: any) => (
                        <div
                          key={rate.carrierId}
                          className={`p-3 border rounded-lg ${rate.carrierId === calculationResult.cheapest?.carrierId ? 'border-green-500 bg-green-50' : ''}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getCarrierTypeIcon(rate.type)}
                              <span className="font-medium">{rate.carrierName}</span>
                              {getCarrierTypeBadge(rate.type)}
                              {rate.carrierId === calculationResult.cheapest?.carrierId && (
                                <Badge className="bg-green-500">最安</Badge>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-bold">${rate.rateUSD}</div>
                              <div className="text-sm text-muted-foreground">¥{rate.rateJPY.toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span><Clock className="h-3 w-3 inline mr-1" />{rate.estimatedDays}日</span>
                            {rate.hasTracking && <span><CheckCircle className="h-3 w-3 inline mr-1" />追跡あり</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 関税見積もり */}
                    {calculationResult.dutyEstimate && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="font-medium flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          関税見積もり
                        </div>
                        <div className="mt-2 space-y-1 text-sm">
                          {calculationResult.dutyEstimate.isDutyFree ? (
                            <div className="text-green-600">免税（${calculationResult.dutyEstimate.threshold}以下）</div>
                          ) : (
                            <>
                              <div>関税率: {calculationResult.dutyEstimate.dutyRate}%</div>
                              <div>推定関税: ${calculationResult.dutyEstimate.estimatedDuty}</div>
                              <div className="font-medium">総着地コスト: ${calculationResult.dutyEstimate.totalLandedCost}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 推奨 */}
                    {calculationResult.recommendations?.length > 0 && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="font-medium mb-2">推奨</div>
                        <ul className="text-sm space-y-1">
                          {calculationResult.recommendations.map((rec: string, idx: number) => (
                            <li key={idx}>• {rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>重量と配送先を入力して計算してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* キャリア */}
        <TabsContent value="carriers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>利用可能キャリア</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>キャリア</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>配送日数</TableHead>
                    <TableHead>追跡</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carriers?.carriers?.map((carrier: any) => (
                    <TableRow key={carrier.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getCarrierTypeIcon(carrier.type)}
                          <span className="font-medium">{carrier.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getCarrierTypeBadge(carrier.type)}</TableCell>
                      <TableCell>{carrier.avgDays}日</TableCell>
                      <TableCell>
                        {carrier.trackingUrl ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>配送ゾーン</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ゾーン</TableHead>
                    <TableHead>地域名</TableHead>
                    <TableHead>対象国</TableHead>
                    <TableHead>料金係数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones?.zones?.map((zone: any) => (
                    <TableRow key={zone.zone}>
                      <TableCell>{zone.zone}</TableCell>
                      <TableCell className="font-medium">{zone.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {zone.countries.map((c: string) => (
                            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>×{zone.multiplier}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 追跡 */}
        <TabsContent value="tracking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>配送追跡</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  placeholder="追跡番号を入力"
                  className="flex-1"
                />
                <Button onClick={handleTrack}>
                  <Search className="h-4 w-4 mr-2" />
                  追跡
                </Button>
              </div>

              {trackingResult && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">追跡番号</div>
                        <div className="font-medium">{trackingResult.trackingNumber}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">キャリア</div>
                        <div className="font-medium">{trackingResult.carrier}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">現在のステータス</div>
                        <Badge>{trackingResult.currentStatus}</Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">配達予定</div>
                        <div className="font-medium">{trackingResult.estimatedDelivery}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="font-medium mb-3">配送履歴</div>
                    <div className="space-y-3">
                      {trackingResult.events?.map((event: any, idx: number) => (
                        <div key={idx} className="flex gap-4">
                          <div className="w-20 text-sm text-muted-foreground">
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{event.description}</div>
                            <div className="text-sm text-muted-foreground">{event.location}</div>
                          </div>
                          <Badge variant="outline">{event.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 最適化 */}
        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-500" />
                配送コスト最適化
              </CardTitle>
              <CardDescription>
                推定削減効果: {suggestions?.summary?.totalPotentialSaving}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions?.suggestions?.map((suggestion: any) => (
                  <div key={suggestion.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{suggestion.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">{suggestion.description}</div>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">削減効果: {suggestion.potentialSaving}</Badge>
                          <Badge variant={suggestion.effort === 'LOW' ? 'default' : suggestion.effort === 'MEDIUM' ? 'secondary' : 'outline'}>
                            工数: {suggestion.effort}
                          </Badge>
                          <Badge variant={suggestion.priority === 'HIGH' ? 'default' : 'secondary'}>
                            優先度: {suggestion.priority}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* クイックウィン */}
          {suggestions?.summary?.quickWins?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  クイックウィン
                </CardTitle>
                <CardDescription>すぐに実施できる低工数・高効果の施策</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {suggestions.summary.quickWins.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.potentialSaving}削減</div>
                      </div>
                      <Button size="sm">実施する</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 配送ポリシー生成 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                配送ポリシー生成
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                配送ポリシーを生成
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

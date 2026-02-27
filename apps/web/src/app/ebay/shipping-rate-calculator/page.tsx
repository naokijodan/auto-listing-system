// @ts-nocheck
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
import {
  Calculator,
  Truck,
  Globe,
  MapPin,
  Package,
  Settings,
  RefreshCw,
  DollarSign,
  ArrowRight,
  Clock,
  Plus,
  Eye,
  Trash2,
  Scale,
  Box
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ShippingRateCalculatorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/shipping-rate-calculator/dashboard/overview`, fetcher);
  const { data: popularRoutes } = useSWR(`${API_BASE}/ebay/shipping-rate-calculator/dashboard/popular-routes`, fetcher);
  const { data: carrierStats } = useSWR(`${API_BASE}/ebay/shipping-rate-calculator/dashboard/carrier-stats`, fetcher);
  const { data: carriers } = useSWR(`${API_BASE}/ebay/shipping-rate-calculator/carriers`, fetcher);
  const { data: zones } = useSWR(`${API_BASE}/ebay/shipping-rate-calculator/zones`, fetcher);
  const { data: rules } = useSWR(`${API_BASE}/ebay/shipping-rate-calculator/rules`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/shipping-rate-calculator/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-600">Shipping Rate Calculator</h1>
          <p className="text-gray-500">送料計算機</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            レート更新
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Calculator className="w-4 h-4 mr-2" />
            送料計算
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="calculate">計算</TabsTrigger>
          <TabsTrigger value="carriers">キャリア</TabsTrigger>
          <TabsTrigger value="zones">ゾーン</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">本日の計算</CardTitle>
                <Calculator className="w-4 h-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.calculationsToday}</div>
                <p className="text-xs text-muted-foreground">総計: {overview?.totalCalculations?.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均送料</CardTitle>
                <DollarSign className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overview?.avgShippingCost?.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">全キャリア平均</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">キャリア</CardTitle>
                <Truck className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.activeCarriers}</div>
                <p className="text-xs text-muted-foreground">アクティブ</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">配送ゾーン</CardTitle>
                <Globe className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.zones}</div>
                <p className="text-xs text-muted-foreground">ルール: {overview?.rulesActive}</p>
              </CardContent>
            </Card>
          </div>

          {/* Popular Routes */}
          <Card>
            <CardHeader>
              <CardTitle>人気ルート</CardTitle>
              <CardDescription>最も計算されている配送ルート</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ルート</TableHead>
                    <TableHead>計算回数</TableHead>
                    <TableHead>平均コスト</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularRoutes?.routes?.map((route: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{route.from}</span>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{route.to}</span>
                        </div>
                      </TableCell>
                      <TableCell>{route.calculations.toLocaleString()}</TableCell>
                      <TableCell>${route.avgCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Carrier Stats */}
          <Card>
            <CardHeader>
              <CardTitle>キャリア統計</CardTitle>
              <CardDescription>各キャリアの利用状況</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {carrierStats?.stats?.map((stat: any) => (
                  <div key={stat.carrier} className="border rounded-lg p-4 text-center">
                    <h3 className="font-medium">{stat.carrier}</h3>
                    <p className="text-2xl font-bold text-indigo-600 mt-2">{stat.usage}%</p>
                    <p className="text-sm text-gray-500">平均: ${stat.avgCost}</p>
                    <p className="text-xs text-gray-400">{stat.avgDays}日</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>送料計算</CardTitle>
              <CardDescription>配送先と荷物情報を入力して送料を計算</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    発送元
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="国" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="JP">Japan</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="郵便番号" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    配送先
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="国" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                        <SelectItem value="DE">Germany</SelectItem>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="JP">Japan</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="郵便番号" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  荷物情報
                </h3>
                <div className="grid grid-cols-5 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">重量</label>
                    <div className="flex gap-2">
                      <Input type="number" placeholder="1.5" />
                      <Select defaultValue="lb">
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">長さ</label>
                    <Input type="number" placeholder="10" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">幅</label>
                    <Input type="number" placeholder="8" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">高さ</label>
                    <Input type="number" placeholder="4" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">単位</label>
                    <Select defaultValue="in">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">インチ</SelectItem>
                        <SelectItem value="cm">cm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Calculator className="w-4 h-4 mr-2" />
                送料を計算
              </Button>
            </CardContent>
          </Card>

          {/* Results would show here */}
          <Card>
            <CardHeader>
              <CardTitle>計算結果</CardTitle>
              <CardDescription>利用可能な配送オプション</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>キャリア</TableHead>
                    <TableHead>サービス</TableHead>
                    <TableHead>料金</TableHead>
                    <TableHead>配送日数</TableHead>
                    <TableHead>追跡</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-green-50">
                    <TableCell className="font-medium">USPS</TableCell>
                    <TableCell>Priority Mail International</TableCell>
                    <TableCell className="font-bold text-green-600">$38.50</TableCell>
                    <TableCell>6-10日</TableCell>
                    <TableCell><Badge variant="default">あり</Badge></TableCell>
                    <TableCell>
                      <Badge variant="secondary">推奨</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">FedEx</TableCell>
                    <TableCell>International Economy</TableCell>
                    <TableCell>$48.00</TableCell>
                    <TableCell>4-6日</TableCell>
                    <TableCell><Badge variant="default">あり</Badge></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">UPS</TableCell>
                    <TableCell>Worldwide Expedited</TableCell>
                    <TableCell>$52.00</TableCell>
                    <TableCell>3-5日</TableCell>
                    <TableCell><Badge variant="default">あり</Badge></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">DHL</TableCell>
                    <TableCell>Express Worldwide</TableCell>
                    <TableCell>$65.00</TableCell>
                    <TableCell>2-3日</TableCell>
                    <TableCell><Badge variant="default">あり</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline">最速</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="carriers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>キャリア管理</CardTitle>
              <CardDescription>配送キャリアの設定</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>キャリア</TableHead>
                    <TableHead>コード</TableHead>
                    <TableHead>レート更新</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carriers?.carriers?.map((carrier: any) => (
                    <TableRow key={carrier.id}>
                      <TableCell className="font-medium">{carrier.name}</TableCell>
                      <TableCell className="font-mono">{carrier.code}</TableCell>
                      <TableCell>{carrier.ratesUpdated}</TableCell>
                      <TableCell>
                        <Switch checked={carrier.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
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

        <TabsContent value="zones" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>配送ゾーン</CardTitle>
                  <CardDescription>国・地域別の送料設定</CardDescription>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  ゾーン追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {zones?.zones?.map((zone: any) => (
                  <div key={zone.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{zone.name}</h3>
                        <p className="text-sm text-gray-500">{zone.countries.join(', ')}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-indigo-600">基本料金: ${zone.baseRate}</span>
                        <Button variant="outline" size="sm">編集</Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>送料ルール</CardTitle>
                  <CardDescription>送料計算ルールの設定</CardDescription>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  ルール追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ルール名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>条件</TableHead>
                    <TableHead>値</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules?.rules?.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{rule.condition}</TableCell>
                      <TableCell>{rule.value ? `$${rule.value}` : '-'}</TableCell>
                      <TableCell>
                        <Switch checked={rule.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
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

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>送料計算の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルトキャリア</p>
                  <p className="text-sm text-gray-500">優先キャリア</p>
                </div>
                <Select defaultValue={settings?.settings?.defaultCarrier}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usps">USPS</SelectItem>
                    <SelectItem value="ups">UPS</SelectItem>
                    <SelectItem value="fedex">FedEx</SelectItem>
                    <SelectItem value="dhl">DHL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">重量単位</p>
                  <p className="text-sm text-gray-500">デフォルトの重量単位</p>
                </div>
                <Select defaultValue={settings?.settings?.weightUnit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lb">ポンド (lb)</SelectItem>
                    <SelectItem value="kg">キログラム (kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">寸法単位</p>
                  <p className="text-sm text-gray-500">デフォルトの寸法単位</p>
                </div>
                <Select defaultValue={settings?.settings?.dimensionUnit}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">インチ (in)</SelectItem>
                    <SelectItem value="cm">センチ (cm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ハンドリング料金</p>
                  <p className="text-sm text-gray-500">送料に追加</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>$</span>
                  <Input type="number" defaultValue={settings?.settings?.handlingFee} className="w-24" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">切り上げ</p>
                  <p className="text-sm text-gray-500">送料を切り上げ</p>
                </div>
                <Switch checked={settings?.settings?.roundUp} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">レートキャッシュ</p>
                  <p className="text-sm text-gray-500">計算結果をキャッシュ</p>
                </div>
                <Switch checked={settings?.settings?.cacheRates} />
              </div>

              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Settings className="w-4 h-4 mr-2" />
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

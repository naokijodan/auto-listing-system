'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 271: eBay Shipping Cost Optimizer（送料最適化システム）
// テーマカラー: emerald-600

export default function EbayShippingOptimizerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-shipping-optimizer/dashboard', fetcher);
  const { data: profilesData } = useSWR('/api/ebay-shipping-optimizer/profiles', fetcher);
  const { data: carriersData } = useSWR('/api/ebay-shipping-optimizer/carriers', fetcher);
  const { data: zonesData } = useSWR('/api/ebay-shipping-optimizer/zones', fetcher);
  const { data: analyticsData } = useSWR('/api/ebay-shipping-optimizer/analytics/cost-breakdown', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-shipping-optimizer/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-600">送料最適化システム</h1>
        <p className="text-gray-600">送料を最適化してコストを削減</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="profiles">プロファイル</TabsTrigger>
          <TabsTrigger value="carriers">キャリア</TabsTrigger>
          <TabsTrigger value="zones">ゾーン</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">総出荷数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{dashboardData?.totalShipments?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均送料</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${dashboardData?.avgShippingCost?.toFixed(2) || '0.00'}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">節約額</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${dashboardData?.costSavings?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">節約率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboardData?.savingsPercent || 0}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>トップキャリア</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.topCarriers?.map((carrier: any) => (
                    <div key={carrier.carrier} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-emerald-600 font-bold text-xs">{carrier.carrier.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="font-medium">{carrier.carrier}</div>
                          <div className="text-sm text-gray-500">{carrier.shipments} 件</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${carrier.avgCost?.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">平均送料</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アラート</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm font-medium text-yellow-800">料金変更通知</p>
                    <p className="text-sm text-yellow-700">UPSの料金が3月1日から5%上昇予定</p>
                  </div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                    <p className="text-sm font-medium text-blue-800">最適化提案</p>
                    <p className="text-sm text-blue-700">50件の出荷でUSPSを使用すると$200節約できます</p>
                  </div>
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                    <p className="text-sm font-medium text-red-800">予算警告</p>
                    <p className="text-sm text-red-700">月間送料が予算の80%に到達</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* プロファイル管理 */}
        <TabsContent value="profiles">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>送料プロファイル</CardTitle>
                <Button className="bg-emerald-600 hover:bg-emerald-700">新規作成</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="検索..." className="max-w-sm" />
                <Select>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="キャリア" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="USPS">USPS</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="FEDEX">FedEx</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {profilesData?.profiles?.map((profile: any) => (
                  <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-medium">{profile.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="bg-emerald-50">{profile.carrier}</Badge>
                        <Badge variant="outline">{profile.serviceType}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${profile.baseCost?.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">基本料金</div>
                      </div>
                      <Badge variant={profile.isActive ? "default" : "secondary"}>
                        {profile.isActive ? '有効' : '無効'}
                      </Badge>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* キャリア管理 */}
        <TabsContent value="carriers">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {carriersData?.carriers?.map((carrier: any) => (
              <Card key={carrier.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <span className="text-emerald-600 font-bold">{carrier.id.slice(0, 2)}</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">{carrier.name}</CardTitle>
                        <Badge variant={carrier.accountLinked ? "default" : "secondary"} className="mt-1">
                          {carrier.accountLinked ? '連携済み' : '未連携'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ステータス</span>
                      <Badge variant={carrier.isActive ? "default" : "secondary"}>
                        {carrier.isActive ? '有効' : '無効'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">料金同期</Button>
                      <Button variant="outline" size="sm" className="flex-1">設定</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ゾーン管理 */}
        <TabsContent value="zones">
          <Card>
            <CardHeader>
              <CardTitle>配送ゾーン</CardTitle>
              <CardDescription>地域別の配送設定を管理</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {zonesData?.zones?.map((zone: any) => (
                  <div key={zone.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <h3 className="font-medium">{zone.name}</h3>
                      <div className="flex gap-1 mt-1">
                        {zone.countries?.slice(0, 5).map((country: string) => (
                          <Badge key={country} variant="outline" className="text-xs">{country}</Badge>
                        ))}
                        {zone.countries?.length > 5 && (
                          <Badge variant="outline" className="text-xs">+{zone.countries.length - 5}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">${zone.avgShippingCost?.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">平均送料</div>
                      </div>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析 */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>コスト内訳</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.breakdown?.map((item: any) => (
                    <div key={item.category}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-sm text-gray-500">${item.amount?.toLocaleString()} ({item.percent}%)</span>
                      </div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="font-medium">合計</span>
                    <span className="font-bold text-emerald-600">${analyticsData?.total?.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>キャリア比較</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 gap-2 text-sm font-medium text-gray-600 pb-2 border-b">
                    <span>キャリア</span>
                    <span>平均送料</span>
                    <span>配達日数</span>
                    <span>時間通り</span>
                    <span>評価</span>
                  </div>
                  {[
                    { carrier: 'USPS', avgCost: 10.50, avgDelivery: 3.2, onTime: 95, rating: 4.5 },
                    { carrier: 'UPS', avgCost: 14.00, avgDelivery: 2.8, onTime: 97, rating: 4.7 },
                    { carrier: 'FedEx', avgCost: 15.50, avgDelivery: 2.5, onTime: 98, rating: 4.6 },
                    { carrier: 'DHL', avgCost: 25.00, avgDelivery: 4.0, onTime: 92, rating: 4.3 },
                  ].map((item) => (
                    <div key={item.carrier} className="grid grid-cols-5 gap-2 text-sm py-2 border-b last:border-b-0">
                      <span className="font-medium">{item.carrier}</span>
                      <span>${item.avgCost.toFixed(2)}</span>
                      <span>{item.avgDelivery}日</span>
                      <span>{item.onTime}%</span>
                      <span>⭐ {item.rating}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>送料計算ツール</CardTitle>
                <CardDescription>最適な配送オプションを計算</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium">重量 (lb)</label>
                    <Input type="number" placeholder="0.0" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">寸法 (L x W x H)</label>
                    <div className="flex gap-1">
                      <Input type="number" placeholder="L" />
                      <Input type="number" placeholder="W" />
                      <Input type="number" placeholder="H" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">配送先</label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="国を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">アメリカ</SelectItem>
                        <SelectItem value="CA">カナダ</SelectItem>
                        <SelectItem value="UK">イギリス</SelectItem>
                        <SelectItem value="DE">ドイツ</SelectItem>
                        <SelectItem value="JP">日本</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700">計算</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>デフォルト設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">デフォルトキャリア</label>
                  <Select defaultValue={settingsData?.defaultCarrier}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USPS">USPS</SelectItem>
                      <SelectItem value="UPS">UPS</SelectItem>
                      <SelectItem value="FEDEX">FedEx</SelectItem>
                      <SelectItem value="DHL">DHL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">デフォルトサービス</label>
                  <Input defaultValue={settingsData?.defaultService} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">自動最適化</div>
                    <div className="text-sm text-gray-500">最安の配送オプションを自動選択</div>
                  </div>
                  <Badge variant={settingsData?.autoOptimize ? "default" : "secondary"}>
                    {settingsData?.autoOptimize ? 'ON' : 'OFF'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>予算設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">月間予算上限</label>
                  <Input type="number" defaultValue={settingsData?.budgetLimit} />
                </div>
                <div>
                  <label className="text-sm font-medium">警告しきい値 (%)</label>
                  <Input type="number" defaultValue={settingsData?.budgetAlertPercent} />
                </div>
                <div>
                  <label className="text-sm font-medium">保険適用しきい値 ($)</label>
                  <Input type="number" defaultValue={settingsData?.insuranceThreshold} />
                </div>
                <div>
                  <label className="text-sm font-medium">署名要求しきい値 ($)</label>
                  <Input type="number" defaultValue={settingsData?.signatureThreshold} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700">設定を保存</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

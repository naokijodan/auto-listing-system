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

// Phase 274: eBay Tax Calculator（税金計算システム）
// テーマカラー: slate-600

export default function EbayTaxCalculatorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-tax-calculator/dashboard', fetcher);
  const { data: nexusData } = useSWR('/api/ebay-tax-calculator/nexus', fetcher);
  const { data: filingsData } = useSWR('/api/ebay-tax-calculator/filings', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-tax-calculator/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-600">税金計算システム</h1>
        <p className="text-gray-600">売上税・VAT・関税を管理</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="calculator">計算</TabsTrigger>
          <TabsTrigger value="nexus">ネクサス</TabsTrigger>
          <TabsTrigger value="filings">申告</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">徴収済み税金</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-600">${dashboardData?.totalTaxCollected?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">納付済み</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">${dashboardData?.totalTaxRemitted?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">未納付</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">${dashboardData?.pendingRemittance?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">コンプライアンス</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.complianceScore || 0}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>税種別内訳</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { type: 'Sales Tax (US)', amount: 8000, percent: 53 },
                    { type: 'VAT (EU)', amount: 4000, percent: 27 },
                    { type: 'GST (AU/CA)', amount: 2000, percent: 13 },
                    { type: 'Import Duty', amount: 1000, percent: 7 },
                  ].map((item) => (
                    <div key={item.type}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">{item.type}</span>
                        <span className="text-sm">${item.amount.toLocaleString()} ({item.percent}%)</span>
                      </div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>アラート</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
                    <p className="text-sm font-medium text-red-800">申告期限</p>
                    <p className="text-sm text-red-700">カリフォルニア州の申告期限が3日後</p>
                  </div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm font-medium text-yellow-800">税率変更</p>
                    <p className="text-sm text-yellow-700">テキサス州の税率が4月から変更</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calculator">
          <Card>
            <CardHeader>
              <CardTitle>税金計算</CardTitle>
              <CardDescription>商品価格と配送先から税金を計算</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div><label className="text-sm font-medium">商品価格</label><Input type="number" placeholder="100.00" /></div>
                <div><label className="text-sm font-medium">送料</label><Input type="number" placeholder="10.00" /></div>
                <div>
                  <label className="text-sm font-medium">配送先国</label>
                  <Select><SelectTrigger><SelectValue placeholder="国を選択" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">アメリカ</SelectItem>
                      <SelectItem value="GB">イギリス</SelectItem>
                      <SelectItem value="DE">ドイツ</SelectItem>
                      <SelectItem value="AU">オーストラリア</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end"><Button className="w-full bg-slate-600 hover:bg-slate-700">計算</Button></div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div><div className="text-sm text-gray-500">小計</div><div className="text-lg font-bold">$110.00</div></div>
                  <div><div className="text-sm text-gray-500">税率</div><div className="text-lg font-bold">8.5%</div></div>
                  <div><div className="text-sm text-gray-500">税額</div><div className="text-lg font-bold text-slate-600">$9.35</div></div>
                  <div><div className="text-sm text-gray-500">合計</div><div className="text-lg font-bold">$119.35</div></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nexus">
          <Card>
            <CardHeader><CardTitle>ネクサス管理</CardTitle><CardDescription>州別の課税義務状況</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {nexusData?.nexusStates?.map((state: any) => (
                  <div key={state.state} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600">{state.state}</div>
                      <div>
                        <div className="font-medium">{state.state}</div>
                        <div className="text-sm text-gray-500">売上: ${state.currentSales?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Progress value={(state.currentSales / state.salesThreshold) * 100} className="w-32 h-2" />
                      <Badge className={state.hasNexus ? 'bg-green-100 text-green-700' : state.type === 'approaching' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}>
                        {state.hasNexus ? 'ネクサスあり' : state.type === 'approaching' ? '接近中' : 'なし'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filings">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>申告一覧</CardTitle><Badge variant="outline">未申告: {filingsData?.upcomingCount || 0}</Badge></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filingsData?.filings?.map((filing: any) => (
                  <div key={filing.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{filing.jurisdiction}</div>
                      <div className="text-sm text-gray-500">{filing.period} • 期限: {filing.dueDate}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold">${filing.amount?.toLocaleString()}</div>
                      </div>
                      <Badge className={filing.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'}>{filing.status}</Badge>
                      <Button variant="outline" size="sm">申告</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>月別推移</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ period: '2026-01', collected: 4500, remitted: 4000 },{ period: '2026-02', collected: 5200, remitted: 4500 },{ period: '2026-03', collected: 5300, remitted: 3500 }].map((item) => (
                    <div key={item.period} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">{item.period}</span>
                      <div className="flex gap-4">
                        <span className="text-green-600">徴収: ${item.collected.toLocaleString()}</span>
                        <span className="text-blue-600">納付: ${item.remitted.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>コンプライアンス</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-slate-600">98%</div>
                  <div className="text-gray-500">コンプライアンススコア</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">45</div><div className="text-sm">期限内申告</div></div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center"><div className="text-2xl font-bold text-yellow-600">1</div><div className="text-sm">遅延申告</div></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>基本設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動徴収</div><div className="text-sm text-gray-500">チェックアウト時に税金を自動計算</div></div><Badge variant={settingsData?.autoCollect ? "default" : "secondary"}>{settingsData?.autoCollect ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">デフォルトHSコード</label><Input defaultValue={settingsData?.defaultHsCode} /></div>
                <div><label className="text-sm font-medium">リマインダー日数</label><Input type="number" defaultValue={settingsData?.reminderDays} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>自動申告</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動申告</div><div className="text-sm text-gray-500">期限前に自動で申告を提出</div></div><Badge variant={settingsData?.autoFileEnabled ? "default" : "secondary"}>{settingsData?.autoFileEnabled ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-slate-600 hover:bg-slate-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

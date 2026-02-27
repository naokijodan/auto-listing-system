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
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 291: eBay Category Explorer（カテゴリエクスプローラー）
// テーマカラー: teal-600

export default function EbayCategoryExplorerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-category-explorer/dashboard', fetcher);
  const { data: categoriesData } = useSWR('/api/ebay-category-explorer/categories', fetcher);
  const { data: trendsData } = useSWR('/api/ebay-category-explorer/trends', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-category-explorer/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-teal-600">カテゴリエクスプローラー</h1>
        <p className="text-gray-600">カテゴリ構造の探索・分析</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="browse">ブラウズ</TabsTrigger>
          <TabsTrigger value="search">検索</TabsTrigger>
          <TabsTrigger value="trends">トレンド</TabsTrigger>
          <TabsTrigger value="mapping">マッピング</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">総カテゴリ数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-teal-600">{dashboardData?.totalCategories?.toLocaleString() || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">使用中</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.categoriesUsed || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">トレンドカテゴリ</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.trendingCategories || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">最終更新</CardTitle></CardHeader>
              <CardContent><div className="text-lg font-medium">{dashboardData?.lastUpdated || '-'}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>人気カテゴリ</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Watches, Parts & Accessories', listings: 15000, growth: 12 },
                    { name: 'Consumer Electronics', listings: 12000, growth: 8 },
                    { name: 'Collectibles & Art', listings: 8000, growth: 15 },
                  ].map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{cat.name}</div><div className="text-sm text-gray-500">{cat.listings.toLocaleString()} 出品</div></div>
                      <Badge className="bg-green-100 text-green-700">+{cat.growth}%</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>カテゴリ分布</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Watches', percent: 35 },{ name: 'Electronics', percent: 25 },{ name: 'Collectibles', percent: 20 },{ name: 'Other', percent: 20 }].map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between mb-1"><span className="text-sm">{item.name}</span><span className="text-sm">{item.percent}%</span></div>
                      <Progress value={item.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="browse">
          <Card>
            <CardHeader><CardTitle>カテゴリツリー</CardTitle><CardDescription>カテゴリ階層をブラウズ</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categoriesData?.categories?.map((cat: any) => (
                  <div key={cat.id} className="border rounded-lg">
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">📁</span>
                        <div><div className="font-medium">{cat.name}</div><div className="text-sm text-gray-500">{cat.subcategories} サブカテゴリ • {cat.listings.toLocaleString()} 出品</div></div>
                      </div>
                      <Button variant="outline" size="sm">展開</Button>
                    </div>
                  </div>
                )) || (
                  <>
                    <div className="border rounded-lg">
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3"><span className="text-lg">📁</span><div><div className="font-medium">Jewelry & Watches</div><div className="text-sm text-gray-500">25 サブカテゴリ • 50,000 出品</div></div></div>
                        <Button variant="outline" size="sm">展開</Button>
                      </div>
                    </div>
                    <div className="border rounded-lg">
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center gap-3"><span className="text-lg">📁</span><div><div className="font-medium">Consumer Electronics</div><div className="text-sm text-gray-500">40 サブカテゴリ • 80,000 出品</div></div></div>
                        <Button variant="outline" size="sm">展開</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader><CardTitle>カテゴリ検索</CardTitle><CardDescription>キーワードでカテゴリを検索</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="カテゴリ名を入力..." className="max-w-md" />
                <Button className="bg-teal-600 hover:bg-teal-700">検索</Button>
              </div>
              <div className="space-y-3">
                {[
                  { id: '31387', name: 'Wristwatches', path: 'Jewelry & Watches > Watches > Wristwatches', listings: 25000 },
                  { id: '14324', name: 'Watch Parts', path: 'Jewelry & Watches > Watches > Parts', listings: 8000 },
                  { id: '57855', name: 'Pocket Watches', path: 'Jewelry & Watches > Watches > Pocket Watches', listings: 3000 },
                ].map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-gray-500">{result.path}</div>
                      <div className="text-sm text-teal-600">ID: {result.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{result.listings.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">出品</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>成長カテゴリ</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendsData?.growing?.map((cat: any) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div><div className="font-medium">{cat.name}</div><div className="text-sm text-gray-500">{cat.listings.toLocaleString()} 出品</div></div>
                      <Badge className="bg-green-100 text-green-700">+{cat.growth}%</Badge>
                    </div>
                  )) || (
                    <>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg"><div><div className="font-medium">Smartwatches</div><div className="text-sm text-gray-500">5,000 出品</div></div><Badge className="bg-green-100 text-green-700">+25%</Badge></div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg"><div><div className="font-medium">Vintage Watches</div><div className="text-sm text-gray-500">8,000 出品</div></div><Badge className="bg-green-100 text-green-700">+18%</Badge></div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>衰退カテゴリ</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendsData?.declining?.map((cat: any) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div><div className="font-medium">{cat.name}</div><div className="text-sm text-gray-500">{cat.listings.toLocaleString()} 出品</div></div>
                      <Badge className="bg-red-100 text-red-700">{cat.growth}%</Badge>
                    </div>
                  )) || (
                    <>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg"><div><div className="font-medium">DVD Players</div><div className="text-sm text-gray-500">1,000 出品</div></div><Badge className="bg-red-100 text-red-700">-15%</Badge></div>
                      <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg"><div><div className="font-medium">MP3 Players</div><div className="text-sm text-gray-500">500 出品</div></div><Badge className="bg-red-100 text-red-700">-20%</Badge></div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mapping">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>カテゴリマッピング</CardTitle><Button className="bg-teal-600 hover:bg-teal-700">新規マッピング</Button></div></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { source: 'ヤフオク: 腕時計', target: 'eBay: Wristwatches', status: 'active' },
                  { source: 'メルカリ: 時計パーツ', target: 'eBay: Watch Parts', status: 'active' },
                  { source: 'Amazon JP: 懐中時計', target: 'eBay: Pocket Watches', status: 'pending' },
                ].map((mapping, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-center"><div className="text-sm text-gray-500">ソース</div><div className="font-medium">{mapping.source}</div></div>
                      <span className="text-gray-400">→</span>
                      <div className="text-center"><div className="text-sm text-gray-500">ターゲット</div><div className="font-medium">{mapping.target}</div></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={mapping.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{mapping.status === 'active' ? '有効' : '保留'}</Badge>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>同期設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">自動同期</div><div className="text-sm text-gray-500">eBayカテゴリを自動更新</div></div><Badge variant={settingsData?.autoSync ? "default" : "secondary"}>{settingsData?.autoSync ? 'ON' : 'OFF'}</Badge></div>
                <div><label className="text-sm font-medium">同期間隔（日）</label><Input type="number" defaultValue={settingsData?.syncInterval || 7} /></div>
                <div><label className="text-sm font-medium">マーケットプレイス</label>
                  <Select defaultValue={settingsData?.marketplace || 'US'}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">eBay US</SelectItem>
                      <SelectItem value="UK">eBay UK</SelectItem>
                      <SelectItem value="DE">eBay DE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>表示設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">出品数表示</div><div className="text-sm text-gray-500">各カテゴリの出品数を表示</div></div><Badge variant={settingsData?.showListingCount !== false ? "default" : "secondary"}>{settingsData?.showListingCount !== false ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">トレンド表示</div><div className="text-sm text-gray-500">成長率を表示</div></div><Badge variant={settingsData?.showTrends !== false ? "default" : "secondary"}>{settingsData?.showTrends !== false ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-teal-600 hover:bg-teal-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

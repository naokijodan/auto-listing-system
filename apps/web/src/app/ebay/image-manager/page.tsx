// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function EbayImageManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-image-manager/dashboard', fetcher);
  const { data: imagesData } = useSWR('/api/ebay-image-manager/images', fetcher);
  const { data: foldersData } = useSWR('/api/ebay-image-manager/folders', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-image-manager/settings', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-fuchsia-600">画像管理システム</h1>
        <p className="text-gray-600">商品画像の管理・加工</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="images">画像</TabsTrigger>
          <TabsTrigger value="folders">フォルダ</TabsTrigger>
          <TabsTrigger value="enhance">加工</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">総画像数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-fuchsia-600">{dashboardData?.totalImages?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">ストレージ使用</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.storageUsed || 0}GB<span className="text-sm text-gray-500">/ {dashboardData?.storageLimit || 0}GB</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">今月のアップロード</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardData?.imagesThisMonth || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">平均画像数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.avgImagesPerListing || 0}枚/Product</div>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>タイプ別内訳</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ type: 'Product', count: 12000, percent: 80 },{ type: 'Lifestyle', count: 2000, percent: 13 },{ type: 'Detail', count: 1000, percent: 7 }].map((t) => (
                    <div key={t.type}>
                      <div className="flex justify-between mb-1"><span>{t.type}</span><span>{t.count.toLocaleString()} ({t.percent}%)</span></div>
                      <Progress value={t.percent} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>アラート</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-sm font-medium text-yellow-800">ストレージ</p>
                    <p className="text-sm text-yellow-700">使用率80%に到達</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>画像一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="検索..." className="max-w-xs" />
                  <Button className="bg-fuchsia-600 hover:bg-fuchsia-700">アップロード</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {imagesData?.images?.map((img: any) => (
                  <div key={img.id} className="border rounded-lg p-2 hover:shadow-md">
                    <div className="h-24 bg-gray-100 rounded mb-2 flex items-center justify-center text-gray-400">IMG</div>
                    <div className="text-sm font-medium truncate">{img.filename}</div>
                    <div className="text-xs text-gray-500">{img.size}MB</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folders">
          <Card>
            <CardHeader>
              <div className="flex justify-between">
                <CardTitle>フォルダ</CardTitle>
                <Button className="bg-fuchsia-600 hover:bg-fuchsia-700">新規フォルダ</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {foldersData?.folders?.map((f: any) => (
                  <Card key={f.id} className="hover:shadow-md">
                    <CardContent className="pt-4">
                      <div className="font-medium">{f.name}</div>
                      <div className="text-sm text-gray-500">{f.imageCount}枚</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enhance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>背景削除</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-gray-500">画像をドラッグ&ドロップ</div>
                </div>
                <Button className="w-full bg-fuchsia-600 hover:bg-fuchsia-700">背景を削除</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>一括加工</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {['明度調整', 'コントラスト', 'リサイズ', 'ウォーターマーク'].map((op) => (
                    <label key={op} className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />{op}
                    </label>
                  ))}
                </div>
                <Button className="w-full bg-fuchsia-600 hover:bg-fuchsia-700">選択画像を加工</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>ストレージ使用量</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-fuchsia-600">42.5%</div>
                  <div className="text-gray-500">8.5GB / 20GB</div>
                </div>
                <Progress value={42.5} className="h-4" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>品質スコア</CardTitle></CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-5xl font-bold text-green-600">85</div>
                  <div className="text-gray-500">平均品質スコア</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>加工設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>自動加工</span>
                  <Badge variant={settingsData?.autoEnhance ? "default" : "secondary"}>{settingsData?.autoEnhance ? 'ON' : 'OFF'}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">デフォルトサイズ</label>
                  <Input defaultValue={settingsData?.defaultSize} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>ウォーターマーク</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>ウォーターマーク有効</span>
                  <Badge variant={settingsData?.watermarkEnabled ? "default" : "secondary"}>{settingsData?.watermarkEnabled ? 'ON' : 'OFF'}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end">
            <Button className="bg-fuchsia-600 hover:bg-fuchsia-700">設定を保存</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

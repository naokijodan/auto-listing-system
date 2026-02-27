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

// Phase 292: eBay Listing Templates V3（出品テンプレートV3）
// テーマカラー: indigo-600

export default function EbayListingTemplatesV3Page() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-listing-templates-v3/dashboard', fetcher);
  const { data: templatesData } = useSWR('/api/ebay-listing-templates-v3/templates', fetcher);
  const { data: categoriesData } = useSWR('/api/ebay-listing-templates-v3/categories', fetcher);
  const { data: variablesData } = useSWR('/api/ebay-listing-templates-v3/variables', fetcher);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-indigo-600">出品テンプレートV3</h1>
        <p className="text-gray-600">高度なテンプレート管理・変数システム</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ</TabsTrigger>
          <TabsTrigger value="variables">変数</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">総テンプレート数</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-indigo-600">{dashboardData?.totalTemplates || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">アクティブ</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{dashboardData?.activeTemplates || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">下書き</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-yellow-600">{dashboardData?.drafts || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">使用率</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.avgUsageRate || 0}%</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>人気テンプレート</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Watch Listing Pro', usage: 500, rate: 12.5 },
                    { name: 'Electronics Standard', usage: 350, rate: 10.2 },
                    { name: 'Collectibles Special', usage: 200, rate: 8.5 },
                  ].map((template, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{template.name}</div><div className="text-sm text-gray-500">{template.usage} 回使用</div></div>
                      <Badge className="bg-indigo-100 text-indigo-700">{template.rate}% CVR</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>カテゴリ別分布</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ name: 'Watches', percent: 35 },{ name: 'Electronics', percent: 28 },{ name: 'Collectibles', percent: 22 },{ name: 'Other', percent: 15 }].map((item) => (
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

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>テンプレート一覧</CardTitle><CardDescription>出品用テンプレートを管理</CardDescription></div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">+ 新規作成</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input placeholder="テンプレート名で検索..." className="max-w-md" />
                <Select><SelectTrigger className="w-40"><SelectValue placeholder="カテゴリ" /></SelectTrigger><SelectContent><SelectItem value="all">全て</SelectItem><SelectItem value="watches">Watches</SelectItem><SelectItem value="electronics">Electronics</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-3">
                {(templatesData?.templates || [
                  { id: 't1', name: 'Watch Listing Pro', category: 'Watches', status: 'active', usageCount: 500 },
                  { id: 't2', name: 'Electronics Standard', category: 'Electronics', status: 'active', usageCount: 350 },
                  { id: 't3', name: 'Collectibles Special', category: 'Collectibles', status: 'draft', usageCount: 0 },
                ]).map((template: any) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-bold">{template.name.charAt(0)}</div>
                      <div><div className="font-medium">{template.name}</div><div className="text-sm text-gray-500">{template.category} • {template.usageCount} 回使用</div></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.status === 'active' ? 'default' : 'secondary'}>{template.status}</Badge>
                      <Button variant="outline" size="sm">編集</Button>
                      <Button variant="outline" size="sm">複製</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>カテゴリ管理</CardTitle><CardDescription>テンプレートカテゴリを整理</CardDescription></div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">+ カテゴリ追加</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(categoriesData?.categories || [
                  { id: 'c1', name: 'Watches', templateCount: 45 },
                  { id: 'c2', name: 'Electronics', templateCount: 35 },
                  { id: 'c3', name: 'Collectibles', templateCount: 25 },
                ]).map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3"><span className="text-lg">📁</span><div><div className="font-medium">{cat.name}</div><div className="text-sm text-gray-500">{cat.templateCount} テンプレート</div></div></div>
                    <div className="flex gap-2"><Button variant="outline" size="sm">編集</Button><Button variant="outline" size="sm" className="text-red-600">削除</Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="variables">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div><CardTitle>変数管理</CardTitle><CardDescription>テンプレートで使用する変数・プレースホルダー</CardDescription></div>
                <Button className="bg-indigo-600 hover:bg-indigo-700">+ 変数追加</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(variablesData?.variables || [
                  { name: 'brand', type: 'text', description: 'ブランド名' },
                  { name: 'model', type: 'text', description: 'モデル名' },
                  { name: 'price', type: 'number', description: '価格' },
                  { name: 'condition', type: 'select', description: '商品状態' },
                ]).map((variable: any) => (
                  <div key={variable.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm">{'{{' + variable.name + '}}'}</code>
                      <div><div className="font-medium">{variable.name}</div><div className="text-sm text-gray-500">{variable.type} • {variable.description}</div></div>
                    </div>
                    <div className="flex gap-2"><Button variant="outline" size="sm">編集</Button><Button variant="outline" size="sm" className="text-red-600">削除</Button></div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">総使用回数</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-indigo-600">5,000</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">平均CVR</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">8.5%</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm">今月の使用</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">1,200</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>テンプレート比較</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Watch Pro', views: 5000, sales: 250, cvr: 5.0 },
                  { name: 'Electronics Standard', views: 3000, sales: 180, cvr: 6.0 },
                  { name: 'Collectibles Special', views: 2000, sales: 140, cvr: 7.0 },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="font-medium">{item.name}</div>
                    <div className="flex gap-6 text-sm">
                      <span>{item.views.toLocaleString()} views</span>
                      <span>{item.sales} sales</span>
                      <Badge className="bg-green-100 text-green-700">{item.cvr}% CVR</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>設定</CardTitle><CardDescription>テンプレートシステムの設定</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium">デフォルトカテゴリ</label><Select><SelectTrigger><SelectValue placeholder="カテゴリを選択" /></SelectTrigger><SelectContent><SelectItem value="watches">Watches</SelectItem><SelectItem value="electronics">Electronics</SelectItem></SelectContent></Select></div>
                <div><label className="text-sm font-medium">プレビューモード</label><Select><SelectTrigger><SelectValue placeholder="モードを選択" /></SelectTrigger><SelectContent><SelectItem value="live">ライブ</SelectItem><SelectItem value="static">静的</SelectItem></SelectContent></Select></div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div><div className="font-medium">自動保存</div><div className="text-sm text-gray-500">編集中のテンプレートを自動保存</div></div>
                <Button variant="outline">有効</Button>
              </div>
              <Button className="bg-indigo-600 hover:bg-indigo-700">設定を保存</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

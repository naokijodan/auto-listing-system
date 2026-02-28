
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
  Hash,
  FileText,
  Settings,
  Plus,
  RefreshCw,
  Copy,
  Eye,
  Trash2,
  Wand2,
  AlertTriangle,
  CheckCircle,
  Layers,
  Code
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SkuGeneratorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/sku-generator/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/sku-generator/dashboard/recent`, fetcher);
  const { data: skus } = useSWR(`${API_BASE}/ebay/sku-generator/skus`, fetcher);
  const { data: templates } = useSWR(`${API_BASE}/ebay/sku-generator/templates`, fetcher);
  const { data: rules } = useSWR(`${API_BASE}/ebay/sku-generator/rules`, fetcher);
  const { data: duplicates } = useSWR(`${API_BASE}/ebay/sku-generator/duplicates`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/sku-generator/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-violet-600">SKU Generator</h1>
          <p className="text-gray-500">SKU生成</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Wand2 className="w-4 h-4 mr-2" />
            SKU生成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="skus">SKU一覧</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="rules">ルール</TabsTrigger>
          <TabsTrigger value="duplicates">重複</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総SKU数</CardTitle>
                <Hash className="w-4 h-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalSkus?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">本日生成: {overview?.generatedToday}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">テンプレート</CardTitle>
                <Layers className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.templates}</div>
                <p className="text-xs text-muted-foreground">アクティブルール: {overview?.activeRules}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">重複チェック</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.duplicateChecks}</div>
                <p className="text-xs text-muted-foreground">今月実行</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均SKU長</CardTitle>
                <Code className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgSkuLength}文字</div>
                <p className="text-xs text-muted-foreground">標準フォーマット</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Generated */}
          <Card>
            <CardHeader>
              <CardTitle>最近の生成</CardTitle>
              <CardDescription>直近で生成されたSKU</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>商品名</TableHead>
                    <TableHead>生成日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent?.recent?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                      <TableCell>{item.product}</TableCell>
                      <TableCell>{item.createdAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Generate */}
          <Card>
            <CardHeader>
              <CardTitle>クイック生成</CardTitle>
              <CardDescription>商品情報からSKUを生成</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <Input placeholder="ブランド" />
                <Input placeholder="モデル" />
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="watches">Watches</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="parts">Parts</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="テンプレート" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Watch Standard</SelectItem>
                    <SelectItem value="basic">Accessory Basic</SelectItem>
                    <SelectItem value="parts">Parts Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="bg-violet-600 hover:bg-violet-700">
                <Wand2 className="w-4 h-4 mr-2" />
                SKUを生成
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skus" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>SKU一覧</CardTitle>
                  <CardDescription>生成済みSKUの管理</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="SKU検索..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="カテゴリ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="watches">Watches</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>商品名</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>テンプレート</TableHead>
                    <TableHead>生成日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skus?.skus?.map((sku: any) => (
                    <TableRow key={sku.id}>
                      <TableCell className="font-mono font-medium">{sku.sku}</TableCell>
                      <TableCell>{sku.product}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sku.category}</Badge>
                      </TableCell>
                      <TableCell>{sku.template}</TableCell>
                      <TableCell>{sku.createdAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Copy className="w-4 h-4" />
                          </Button>
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

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>テンプレート</CardTitle>
                  <CardDescription>SKU生成テンプレートの管理</CardDescription>
                </div>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />
                  テンプレート作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates?.templates?.map((template: any) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm font-mono text-gray-500">{template.format}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">{template.skusGenerated}件生成</span>
                        <Switch checked={template.active} />
                        <Button variant="outline" size="sm">編集</Button>
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
                  <CardTitle>ルール</CardTitle>
                  <CardDescription>SKU生成ルールの設定</CardDescription>
                </div>
                <Button className="bg-violet-600 hover:bg-violet-700">
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
                      <TableCell className="font-mono">{rule.value}</TableCell>
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

        <TabsContent value="duplicates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>重複チェック</CardTitle>
                  <CardDescription>重複SKUの検出と解決</CardDescription>
                </div>
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重複チェック実行
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {duplicates?.duplicates?.length > 0 ? (
                <div className="space-y-4">
                  {duplicates.duplicates.map((dup: any) => (
                    <div key={dup.id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <div>
                          <p className="font-mono font-medium">{dup.sku}</p>
                          <p className="text-sm text-gray-500">使用中: {dup.products.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{dup.detectedAt}</span>
                        <Button variant="outline" size="sm">解決</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                  <p className="mt-4 text-lg font-medium">重複なし</p>
                  <p className="text-gray-500">すべてのSKUはユニークです</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>SKU生成の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルトテンプレート</p>
                  <p className="text-sm text-gray-500">新規生成時のデフォルト</p>
                </div>
                <Select defaultValue={settings?.settings?.defaultTemplate}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="template_001">Watch Standard</SelectItem>
                    <SelectItem value="template_002">Accessory Basic</SelectItem>
                    <SelectItem value="template_003">Parts Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動生成</p>
                  <p className="text-sm text-gray-500">新規商品でSKUを自動生成</p>
                </div>
                <Switch checked={settings?.settings?.autoGenerate} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">重複チェック</p>
                  <p className="text-sm text-gray-500">生成時に重複を自動チェック</p>
                </div>
                <Switch checked={settings?.settings?.duplicateCheck} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">大文字変換</p>
                  <p className="text-sm text-gray-500">SKUを大文字に変換</p>
                </div>
                <Switch checked={settings?.settings?.uppercase} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">区切り文字</p>
                  <p className="text-sm text-gray-500">SKUコンポーネント間の区切り</p>
                </div>
                <Select defaultValue={settings?.settings?.separator}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-">ハイフン (-)</SelectItem>
                    <SelectItem value="_">アンダースコア (_)</SelectItem>
                    <SelectItem value="">なし</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">連番開始</p>
                  <p className="text-sm text-gray-500">連番の開始値</p>
                </div>
                <Input type="number" defaultValue={settings?.settings?.sequenceStart} className="w-24" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">連番桁数</p>
                  <p className="text-sm text-gray-500">連番のゼロパディング</p>
                </div>
                <Select defaultValue={String(settings?.settings?.sequencePadding)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2桁</SelectItem>
                    <SelectItem value="3">3桁</SelectItem>
                    <SelectItem value="4">4桁</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="bg-violet-600 hover:bg-violet-700">
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

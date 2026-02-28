
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
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileSpreadsheet,
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Play,
  History,
  FileText,
  Layers,
  RefreshCw,
  Download,
  Trash2,
  Eye
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function BulkListingCreatorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/bulk-listing-creator/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/bulk-listing-creator/dashboard/recent`, fetcher);
  const { data: sources } = useSWR(`${API_BASE}/ebay/bulk-listing-creator/sources`, fetcher);
  const { data: listings } = useSWR(`${API_BASE}/ebay/bulk-listing-creator/listings`, fetcher);
  const { data: templates } = useSWR(`${API_BASE}/ebay/bulk-listing-creator/templates`, fetcher);
  const { data: history } = useSWR(`${API_BASE}/ebay/bulk-listing-creator/history`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/bulk-listing-creator/settings/general`, fetcher);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-600">Bulk Listing Creator</h1>
          <p className="text-gray-500">一括出品作成</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            テンプレート
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Upload className="w-4 h-4 mr-2" />
            ファイルをアップロード
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="create">作成</TabsTrigger>
          <TabsTrigger value="listings">リスティング</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="history">履歴</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総リスティング</CardTitle>
                <Package className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalListings?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">本日作成: {overview?.createdToday || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">公開済み</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.published?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">成功率: {overview?.avgCreationTime}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">レビュー待ち</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.pendingReview || 0}</div>
                <p className="text-xs text-muted-foreground">下書き: {overview?.drafts || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">テンプレート</CardTitle>
                <Layers className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.templatesUsed || 0}</div>
                <p className="text-xs text-muted-foreground">使用中</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Creations */}
          <Card>
            <CardHeader>
              <CardTitle>最近の作成</CardTitle>
              <CardDescription>直近の一括作成ジョブ</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>アイテム数</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent?.recent?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.items}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'published' ? 'default' : item.status === 'pending' ? 'secondary' : 'outline'}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.createdAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>ファイルアップロード</CardTitle>
              <CardDescription>CSV、Excel、またはAPIから商品データをインポート</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-4 text-lg">ファイルをドロップまたはクリックしてアップロード</p>
                <p className="text-sm text-gray-500">CSV, XLSX形式に対応</p>
                <Button className="mt-4" variant="outline">
                  ファイルを選択
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {sources?.sources?.map((source: any) => (
                  <Card key={source.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                        <span className="font-medium">{source.name}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">最終使用: {source.lastUsed}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Create Job */}
          <Card>
            <CardHeader>
              <CardTitle>一括作成を開始</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">テンプレート</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="テンプレートを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="watch">Watch Standard</SelectItem>
                      <SelectItem value="electronics">Electronics Basic</SelectItem>
                      <SelectItem value="parts">Parts Template</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">マーケットプレイス</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="マーケットプレイスを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">eBay US</SelectItem>
                      <SelectItem value="uk">eBay UK</SelectItem>
                      <SelectItem value="de">eBay DE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="bg-orange-600 hover:bg-orange-700">
                <Play className="w-4 h-4 mr-2" />
                一括作成を開始
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>リスティング一覧</CardTitle>
                  <CardDescription>作成済みリスティングの管理</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input placeholder="検索..." className="w-64" />
                  <Select>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="ステータス" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="published">公開済み</SelectItem>
                      <SelectItem value="pending">保留中</SelectItem>
                      <SelectItem value="draft">下書き</SelectItem>
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
                    <TableHead>タイトル</TableHead>
                    <TableHead>価格</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>マーケット</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings?.listings?.map((listing: any) => (
                    <TableRow key={listing.id}>
                      <TableCell className="font-mono text-sm">{listing.sku}</TableCell>
                      <TableCell className="font-medium">{listing.title}</TableCell>
                      <TableCell>${listing.price.toFixed(2)}</TableCell>
                      <TableCell>{listing.quantity}</TableCell>
                      <TableCell>{listing.marketplace}</TableCell>
                      <TableCell>
                        <Badge variant={listing.status === 'published' ? 'default' : listing.status === 'pending' ? 'secondary' : 'outline'}>
                          {listing.status}
                        </Badge>
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

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>テンプレート管理</CardTitle>
                  <CardDescription>フィールドマッピングテンプレート</CardDescription>
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700">
                  <FileText className="w-4 h-4 mr-2" />
                  新規テンプレート
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {templates?.templates?.map((template: any) => (
                  <Card key={template.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="outline">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">フィールド数: {template.fields}</p>
                      <p className="text-xs text-gray-400">最終使用: {template.lastUsed}</p>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm">編集</Button>
                        <Button variant="outline" size="sm">複製</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>作成履歴</CardTitle>
              <CardDescription>過去の一括作成ジョブ</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ジョブID</TableHead>
                    <TableHead>ソース</TableHead>
                    <TableHead>総数</TableHead>
                    <TableHead>成功</TableHead>
                    <TableHead>失敗</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history?.history?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.jobId}</TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell>{item.totalItems}</TableCell>
                      <TableCell className="text-green-600">{item.success}</TableCell>
                      <TableCell className="text-red-600">{item.failed}</TableCell>
                      <TableCell>{item.createdAt}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
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
              <CardDescription>一括出品作成の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">デフォルトマーケットプレイス</p>
                  <p className="text-sm text-gray-500">新規作成時のデフォルト</p>
                </div>
                <Select defaultValue={settings?.settings?.defaultMarketplace}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eBay US">eBay US</SelectItem>
                    <SelectItem value="eBay UK">eBay UK</SelectItem>
                    <SelectItem value="eBay DE">eBay DE</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動公開</p>
                  <p className="text-sm text-gray-500">作成後に自動で公開</p>
                </div>
                <Switch checked={settings?.settings?.autoPublish} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">作成前バリデーション</p>
                  <p className="text-sm text-gray-500">データをバリデーション</p>
                </div>
                <Switch checked={settings?.settings?.validateBeforeCreate} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">重複チェック</p>
                  <p className="text-sm text-gray-500">SKU重複をチェック</p>
                </div>
                <Switch checked={settings?.settings?.duplicateCheck} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">画像処理</p>
                  <p className="text-sm text-gray-500">画像を自動最適化</p>
                </div>
                <Switch checked={settings?.settings?.imageProcessing} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">完了通知</p>
                  <p className="text-sm text-gray-500">ジョブ完了時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnComplete} />
              </div>

              <Button className="bg-orange-600 hover:bg-orange-700">
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

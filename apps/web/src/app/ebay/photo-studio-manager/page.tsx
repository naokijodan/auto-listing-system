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
  Camera,
  Image,
  Wand2,
  Clock,
  Settings,
  Plus,
  Eye,
  Trash2,
  Upload,
  Download,
  BarChart3,
  Sparkles,
  Crop,
  Palette,
  Droplet,
  Type,
  CheckCircle,
  RefreshCw,
  HardDrive
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function PhotoStudioManagerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: overview } = useSWR(`${API_BASE}/ebay/photo-studio-manager/dashboard/overview`, fetcher);
  const { data: queue } = useSWR(`${API_BASE}/ebay/photo-studio-manager/dashboard/queue`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/photo-studio-manager/dashboard/recent`, fetcher);
  const { data: photos } = useSWR(`${API_BASE}/ebay/photo-studio-manager/photos`, fetcher);
  const { data: presets } = useSWR(`${API_BASE}/ebay/photo-studio-manager/presets`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/photo-studio-manager/settings/general`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>;
      case 'editing':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Wand2 className="w-3 h-3 mr-1" />編集中</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><Clock className="w-3 h-3 mr-1" />待機中</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-amber-600">Photo Studio Manager</h1>
          <p className="text-gray-500">写真スタジオ管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            レポート
          </Button>
          <Button className="bg-amber-600 hover:bg-amber-700">
            <Upload className="w-4 h-4 mr-2" />
            アップロード
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="photos">写真管理</TabsTrigger>
          <TabsTrigger value="editor">編集</TabsTrigger>
          <TabsTrigger value="presets">プリセット</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総写真数</CardTitle>
                <Image className="w-4 h-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalPhotos?.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">編集待ち: {overview?.pendingEdit}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">今日の完了</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.completedToday}</div>
                <p className="text-xs text-muted-foreground">平均編集時間: {overview?.avgEditTime}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">品質スコア</CardTitle>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.qualityScore}%</div>
                <Progress value={overview?.qualityScore} className="h-2 mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">ストレージ</CardTitle>
                <HardDrive className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.storageUsed}</div>
                <Progress value={(parseFloat(overview?.storageUsed || '0') / parseFloat(overview?.storageLimit || '100')) * 100} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">上限: {overview?.storageLimit}</p>
              </CardContent>
            </Card>
          </div>

          {/* Edit Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                編集キュー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>優先度</TableHead>
                    <TableHead>アップロード日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue?.queue?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.product}</TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Badge variant={item.priority === 'high' ? 'destructive' : item.priority === 'medium' ? 'outline' : 'secondary'}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{item.uploadedAt}</TableCell>
                      <TableCell>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                          <Wand2 className="w-3 h-3 mr-1" />
                          編集
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Edits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                最近の編集
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4">
                {recent?.photos?.map((photo: any) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-medium truncate">{photo.product}</p>
                      <p className="text-xs text-gray-500">品質: {photo.quality}%</p>
                    </div>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Button size="sm" variant="secondary"><Eye className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>写真一覧</CardTitle>
                <div className="flex gap-2">
                  <Input placeholder="ファイル名/商品名で検索..." className="w-64" />
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">すべて</SelectItem>
                      <SelectItem value="pending">待機中</SelectItem>
                      <SelectItem value="completed">完了</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Upload className="w-4 h-4 mr-2" />
                    アップロード
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ファイル名</TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>サイズ</TableHead>
                    <TableHead>解像度</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>日時</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {photos?.photos?.map((photo: any) => (
                    <TableRow key={photo.id}>
                      <TableCell className="font-mono text-sm">{photo.filename}</TableCell>
                      <TableCell className="font-medium">{photo.product}</TableCell>
                      <TableCell>{photo.size}</TableCell>
                      <TableCell>{photo.dimensions}</TableCell>
                      <TableCell>{getStatusBadge(photo.status)}</TableCell>
                      <TableCell>{photo.uploadedAt}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Wand2 className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-amber-600" />
                編集ツール
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Droplet className="w-6 h-6 mb-1" />
                  <span>背景除去</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Sparkles className="w-6 h-6 mb-1" />
                  <span>画質向上</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Crop className="w-6 h-6 mb-1" />
                  <span>リサイズ</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Palette className="w-6 h-6 mb-1" />
                  <span>色補正</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Type className="w-6 h-6 mb-1" />
                  <span>ウォーターマーク</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <RefreshCw className="w-6 h-6 mb-1" />
                  <span>一括処理</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>編集プレビュー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Image className="w-16 h-16 mx-auto mb-2" />
                  <p>写真を選択してください</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presets" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>編集プリセット</CardTitle>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  プリセット作成
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>プリセット名</TableHead>
                    <TableHead>ステップ</TableHead>
                    <TableHead>使用回数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {presets?.presets?.map((preset: any) => (
                    <TableRow key={preset.id}>
                      <TableCell className="font-medium">{preset.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {preset.steps?.map((step: string, idx: number) => (
                            <Badge key={idx} variant="outline">{step}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{preset.usageCount}回</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline">使用</Button>
                          <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  品質分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>平均スコア</span>
                    <span className="text-xl font-bold">94.5%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="text-xl font-bold text-green-600">8,500</div>
                      <div className="text-xs text-green-700">優秀</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-xl font-bold text-yellow-600">4,500</div>
                      <div className="text-xs text-yellow-700">良好</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <div className="text-xl font-bold text-red-600">2,000</div>
                      <div className="text-xs text-red-700">要改善</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-amber-600" />
                  生産性分析
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>今日のアップロード</span>
                    <span className="text-xl font-bold">125</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>今日の編集完了</span>
                    <span className="text-xl font-bold">85</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>平均編集時間</span>
                    <span className="text-xl font-bold">2.5分</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600" />
                一般設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">自動処理</p>
                  <p className="text-sm text-gray-500">アップロード時に自動で編集を適用</p>
                </div>
                <Switch checked={settings?.settings?.autoProcess} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">ウォーターマーク</p>
                  <p className="text-sm text-gray-500">全ての写真にウォーターマークを追加</p>
                </div>
                <Switch checked={settings?.settings?.watermarkEnabled} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">出力形式</label>
                  <Select defaultValue={settings?.settings?.outputFormat || 'jpg'}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpg">JPEG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                      <SelectItem value="webp">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">品質（%）</label>
                  <Input type="number" defaultValue={settings?.settings?.outputQuality || 90} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">最大解像度（px）</label>
                <Input type="number" defaultValue={settings?.settings?.maxDimension || 2000} />
              </div>

              <div>
                <label className="text-sm font-medium">ウォーターマークテキスト</label>
                <Input defaultValue={settings?.settings?.watermarkText || 'RAKUDA'} />
              </div>

              <Button className="bg-amber-600 hover:bg-amber-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

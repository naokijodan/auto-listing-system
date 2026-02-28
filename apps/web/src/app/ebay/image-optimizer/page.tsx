
'use client';

import { useState } from 'react';
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
  Image,
  LayoutDashboard,
  Images,
  Wand2,
  Settings2,
  RefreshCw,
  Download,
  Trash2,
  Upload,
  Zap,
  HardDrive,
  Eye,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Palette,
  Maximize,
  RotateCcw,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ImageOptimizerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Image className="h-8 w-8 text-amber-600" />
            Image Optimizer
          </h1>
          <p className="text-muted-foreground mt-1">画像最適化・圧縮管理</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Upload className="mr-2 h-4 w-4" />
          画像アップロード
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <Images className="h-4 w-4" />
            画像一覧
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            一括最適化
          </TabsTrigger>
          <TabsTrigger value="presets" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            プリセット
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            分析
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="images">
          <ImagesTab />
        </TabsContent>
        <TabsContent value="bulk">
          <BulkTab />
        </TabsContent>
        <TabsContent value="presets">
          <PresetsTab />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/image-optimizer/dashboard/overview`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/image-optimizer/dashboard/stats`, fetcher);
  const { data: queue } = useSWR(`${API_BASE}/ebay/image-optimizer/dashboard/queue`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総画像数</CardTitle>
            <Images className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalImages?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">最適化済み: {overview?.optimizedImages?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均圧縮率</CardTitle>
            <Zap className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.avgCompressionRate}%</div>
            <p className="text-xs text-muted-foreground">削減容量: {overview?.totalSavedBytes}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">品質スコア</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.qualityScore}</div>
            <p className="text-xs text-muted-foreground">100点満点</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">最適化待ち</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.pendingOptimization?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">処理中: {queue?.queue?.processing}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>キュー状況</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>処理進捗</span>
                <span>{queue?.queue?.completed?.toLocaleString()} / {(queue?.queue?.completed + queue?.queue?.pending)?.toLocaleString()}</span>
              </div>
              <Progress value={queue?.queue?.completed / (queue?.queue?.completed + queue?.queue?.pending) * 100 || 0} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>待機中</span>
                <span className="font-medium">{queue?.queue?.pending?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>処理中</span>
                <span className="font-medium">{queue?.queue?.processing}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>完了</span>
                <span className="font-medium text-green-600">{queue?.queue?.completed?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>失敗</span>
                <span className="font-medium text-red-600">{queue?.queue?.failed}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">処理速度: {queue?.processingSpeed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>フォーマット別統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.byFormat && Object.entries(stats.byFormat).map(([format, data]: [string, any]) => (
                <div key={format} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="uppercase font-medium">{format}</span>
                    <span>{data.count?.toLocaleString()} 画像</span>
                  </div>
                  <Progress value={data.optimized / data.count * 100} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>平均サイズ: {data.avgSize}</span>
                    <span>最適化済み: {data.optimized?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ImagesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/image-optimizer/images`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimized':
        return <Badge className="bg-green-100 text-green-800">最適化済み</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">待機中</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">処理中</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>画像一覧</CardTitle>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="optimized">最適化済み</SelectItem>
                  <SelectItem value="pending">待機中</SelectItem>
                  <SelectItem value="failed">失敗</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="ファイル名で検索..." className="w-64" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ファイル名</TableHead>
                <TableHead>元サイズ</TableHead>
                <TableHead>最適化後</TableHead>
                <TableHead>圧縮率</TableHead>
                <TableHead>品質</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.images?.map((image: any) => (
                <TableRow key={image.id}>
                  <TableCell className="font-medium">{image.filename}</TableCell>
                  <TableCell>{image.originalSize}</TableCell>
                  <TableCell>{image.optimizedSize || '-'}</TableCell>
                  <TableCell>
                    {image.compressionRate ? (
                      <span className="text-green-600">-{image.compressionRate}%</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{image.quality || '-'}</TableCell>
                  <TableCell>{getStatusBadge(image.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Wand2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BulkTab() {
  const { data: history } = useSWR(`${API_BASE}/ebay/image-optimizer/bulk/history`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>一括最適化</CardTitle>
            <CardDescription>複数の画像を一度に最適化</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">対象画像</label>
              <Select defaultValue="pending">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">未最適化の画像</SelectItem>
                  <SelectItem value="all">すべての画像</SelectItem>
                  <SelectItem value="selected">選択した画像</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">プリセット</label>
              <Select defaultValue="standard">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">eBay Standard</SelectItem>
                  <SelectItem value="high">High Quality</SelectItem>
                  <SelectItem value="web">Web Optimized</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-amber-600 hover:bg-amber-700">
              <Zap className="mr-2 h-4 w-4" />
              一括最適化を開始
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>背景除去</CardTitle>
            <CardDescription>AIによる自動背景除去</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">対象画像</label>
              <Select defaultValue="selected">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="selected">選択した画像</SelectItem>
                  <SelectItem value="all">すべての画像</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">背景色</label>
              <Select defaultValue="white">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">透明</SelectItem>
                  <SelectItem value="white">白</SelectItem>
                  <SelectItem value="custom">カスタム</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" variant="outline">
              <Wand2 className="mr-2 h-4 w-4" />
              背景除去を開始
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>処理履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ジョブID</TableHead>
                <TableHead>開始日時</TableHead>
                <TableHead>完了日時</TableHead>
                <TableHead>処理数</TableHead>
                <TableHead>成功</TableHead>
                <TableHead>失敗</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.history?.map((job: any) => (
                <TableRow key={job.jobId}>
                  <TableCell className="font-mono text-sm">{job.jobId}</TableCell>
                  <TableCell>{job.startedAt}</TableCell>
                  <TableCell>{job.completedAt}</TableCell>
                  <TableCell>{job.total}</TableCell>
                  <TableCell className="text-green-600">{job.success}</TableCell>
                  <TableCell className="text-red-600">{job.failed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function PresetsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/image-optimizer/presets`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">プリセット管理</h2>
        <Button className="bg-amber-600 hover:bg-amber-700">
          新規プリセット作成
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.presets?.map((preset: any) => (
          <Card key={preset.id} className={preset.active ? 'border-amber-600' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{preset.name}</CardTitle>
                {preset.active && <Badge className="bg-amber-100 text-amber-800">アクティブ</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">品質</span>
                  <span className="font-medium">{preset.quality}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最大幅</span>
                  <span className="font-medium">{preset.maxWidth}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最大高さ</span>
                  <span className="font-medium">{preset.maxHeight}px</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">フォーマット</span>
                  <span className="font-medium uppercase">{preset.format}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  編集
                </Button>
                <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700">
                  適用
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { data: quality } = useSWR(`${API_BASE}/ebay/image-optimizer/analytics/quality`, fetcher);
  const { data: storage } = useSWR(`${API_BASE}/ebay/image-optimizer/analytics/storage`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>品質分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="text-muted-foreground">平均品質スコア</span>
              <span className="text-3xl font-bold text-amber-600">{quality?.avgQuality}</span>
            </div>
            <div className="space-y-3">
              {quality?.distribution && Object.entries(quality.distribution).map(([range, count]: [string, any]) => (
                <div key={range} className="flex items-center justify-between">
                  <span className="text-sm">{range}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={count / 45000 * 100} className="w-32" />
                    <span className="text-sm w-16 text-right">{count?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ストレージ分析</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">元サイズ</p>
                <p className="text-xl font-bold">{storage?.totalOriginal}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">最適化後</p>
                <p className="text-xl font-bold">{storage?.totalOptimized}</p>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <p className="text-sm text-green-700">削減量</p>
                <p className="text-xl font-bold text-green-700">{storage?.totalSaved}</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600">{storage?.savingsPercent}%</p>
                <p className="text-sm text-muted-foreground">ストレージ削減</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>品質問題</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quality?.issues?.map((issue: any) => (
              <div key={issue.type} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">{issue.description}</p>
                    <p className="text-sm text-muted-foreground">{issue.count} 画像</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  確認
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/image-optimizer/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動最適化</p>
              <p className="text-sm text-muted-foreground">アップロード時に自動で最適化</p>
            </div>
            <Switch checked={data?.settings?.autoOptimize} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルトプリセット</label>
            <Select defaultValue={data?.settings?.defaultPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preset_001">eBay Standard</SelectItem>
                <SelectItem value="preset_002">High Quality</SelectItem>
                <SelectItem value="preset_003">Web Optimized</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">最大ファイルサイズ</label>
            <Input defaultValue={data?.settings?.maxFileSize} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">同時処理数</label>
            <Input type="number" defaultValue={data?.settings?.concurrentJobs} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">失敗時リトライ</p>
              <p className="text-sm text-muted-foreground">処理失敗時に自動リトライ</p>
            </div>
            <Switch checked={data?.settings?.retryOnFailure} />
          </div>

          <Button className="bg-amber-600 hover:bg-amber-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

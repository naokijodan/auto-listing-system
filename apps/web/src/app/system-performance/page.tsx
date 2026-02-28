
'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Gauge,
  Database,
  Zap,
  Clock,
  Server,
  HardDrive,
  Wifi,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Globe,
} from 'lucide-react';
import { API_BASE, postApi, patchApi, deleteApi } from '@/lib/api';

const fetcher = (url: string) => fetch(`${API_BASE}${url}`).then((res) => res.json());

export default function SystemPerformancePage() {
  const [period, setPeriod] = useState('24h');
  const [isCreateCdnDialogOpen, setIsCreateCdnDialogOpen] = useState(false);
  const [isCreateRuleDialogOpen, setIsCreateRuleDialogOpen] = useState(false);

  const { data: stats, mutate: refreshStats } = useSWR(
    `/api/system-performance/stats?period=${period}`,
    fetcher,
    { refreshInterval: 30000 }
  );
  const { data: realtime } = useSWR('/api/system-performance/realtime', fetcher, {
    refreshInterval: 5000,
  });
  const { data: dbHealth } = useSWR('/api/system-performance/db-health', fetcher, {
    refreshInterval: 60000,
  });
  const { data: cacheStats } = useSWR(
    `/api/system-performance/cache-stats?period=${period}`,
    fetcher
  );
  const { data: cdnConfigs, mutate: refreshCdnConfigs } = useSWR(
    '/api/system-performance/cdn-configs',
    fetcher
  );
  const { data: optimizationRules, mutate: refreshRules } = useSWR(
    '/api/system-performance/optimization-rules',
    fetcher
  );

  const handleCreateCdn = async (formData: any) => {
    try {
      await postApi('/api/system-performance/cdn-configs', formData);
      refreshCdnConfigs();
      setIsCreateCdnDialogOpen(false);
    } catch (error) {
      console.error('Failed to create CDN config:', error);
    }
  };

  const handleActivateCdn = async (id: string) => {
    try {
      await postApi(`/api/system-performance/cdn-configs/${id}/activate`);
      refreshCdnConfigs();
    } catch (error) {
      console.error('Failed to activate CDN:', error);
    }
  };

  const handleToggleRule = async (id: string) => {
    try {
      await patchApi(`/api/system-performance/optimization-rules/${id}/toggle`);
      refreshRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('このルールを削除しますか？')) return;
    try {
      await deleteApi(`/api/system-performance/optimization-rules/${id}`);
      refreshRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const getHealthStatus = (status: string) => {
    if (status === 'healthy') return <Badge className="bg-green-500">正常</Badge>;
    if (status === 'degraded') return <Badge className="bg-yellow-500">低下</Badge>;
    return <Badge variant="destructive">遅延</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">システムパフォーマンス</h1>
          <p className="text-muted-foreground">
            API・データベース・キャッシュの監視と最適化
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">過去1時間</SelectItem>
              <SelectItem value="6h">過去6時間</SelectItem>
              <SelectItem value="24h">過去24時間</SelectItem>
              <SelectItem value="7d">過去7日</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refreshStats()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* リアルタイムメトリクス */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">リクエスト/分</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtime?.requestsPerMinute || 0}</div>
            <p className="text-xs text-muted-foreground">
              5分間: {realtime?.requestsPerFiveMinutes || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均レイテンシ</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realtime?.avgLatencyMs || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              {realtime?.avgLatencyMs < 100 ? '良好' : realtime?.avgLatencyMs < 300 ? '普通' : '遅い'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">エラー数</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(realtime?.errorCountLastMinute || 0) > 0 ? 'text-red-600' : ''}`}>
              {realtime?.errorCountLastMinute || 0}
            </div>
            <p className="text-xs text-muted-foreground">過去1分間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">キャッシュヒット率</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats?.cacheHitRate || 0)}%
            </div>
            <Progress value={stats?.cacheHitRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">DB健全性</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getHealthStatus(dbHealth?.status || 'unknown')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              レイテンシ: {dbHealth?.latencyMs || '-'}ms
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="endpoints">エンドポイント</TabsTrigger>
          <TabsTrigger value="cache">キャッシュ</TabsTrigger>
          <TabsTrigger value="cdn">CDN</TabsTrigger>
          <TabsTrigger value="optimization">最適化</TabsTrigger>
          <TabsTrigger value="database">データベース</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>パフォーマンスサマリー</CardTitle>
                <CardDescription>期間: {period}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>総リクエスト数</span>
                  <span className="font-bold">{stats?.totalRequests?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>平均レスポンス時間</span>
                  <span className="font-bold">{stats?.avgResponseTimeMs || 0}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>エラー率</span>
                  <span className={`font-bold ${(stats?.errorRate || 0) > 1 ? 'text-red-600' : ''}`}>
                    {(stats?.errorRate || 0).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>キャッシュヒット率</span>
                  <span className="font-bold">{(stats?.cacheHitRate || 0).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>ステータスコード分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats?.statusCodeDistribution?.map((item: any) => (
                    <div key={item.statusCode} className="flex justify-between items-center">
                      <Badge
                        variant={
                          item.statusCode < 300
                            ? 'default'
                            : item.statusCode < 400
                            ? 'secondary'
                            : item.statusCode < 500
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {item.statusCode}
                      </Badge>
                      <span>{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>トップエンドポイント</CardTitle>
                <CardDescription>リクエスト数順</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>エンドポイント</TableHead>
                      <TableHead className="text-right">リクエスト</TableHead>
                      <TableHead className="text-right">平均時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.topEndpoints?.map((ep: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{ep.endpoint}</TableCell>
                        <TableCell className="text-right">{ep.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{ep.avgResponseTimeMs}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>遅いエンドポイント</CardTitle>
                <CardDescription>平均レスポンス時間順</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>エンドポイント</TableHead>
                      <TableHead className="text-right">平均時間</TableHead>
                      <TableHead className="text-right">リクエスト</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.slowestEndpoints?.map((ep: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{ep.endpoint}</TableCell>
                        <TableCell className="text-right">
                          <span className={ep.avgResponseTimeMs > 500 ? 'text-red-600' : ''}>
                            {ep.avgResponseTimeMs}ms
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{ep.count.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>キャッシュパフォーマンス</CardTitle>
              <CardDescription>エンドポイント別キャッシュ効率</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(cacheStats?.overallHitRate || 0).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">全体ヒット率</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {(cacheStats?.totalHits || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">ヒット数</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {(cacheStats?.totalMisses || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">ミス数</div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>エンドポイント</TableHead>
                    <TableHead className="text-right">ヒット</TableHead>
                    <TableHead className="text-right">ミス</TableHead>
                    <TableHead className="text-right">ヒット率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cacheStats?.byEndpoint?.map((ep: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{ep.endpoint}</TableCell>
                      <TableCell className="text-right">{ep.hits.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{ep.misses.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <span className={ep.hitRate > 80 ? 'text-green-600' : ep.hitRate > 50 ? '' : 'text-red-600'}>
                          {ep.hitRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cdn" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isCreateCdnDialogOpen} onOpenChange={setIsCreateCdnDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  CDN設定追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>CDN設定追加</DialogTitle>
                  <DialogDescription>画像配信用CDNを設定します</DialogDescription>
                </DialogHeader>
                <CreateCdnForm
                  onSubmit={handleCreateCdn}
                  onCancel={() => setIsCreateCdnDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>CDN設定</CardTitle>
              <CardDescription>画像・静的ファイル配信の設定</CardDescription>
            </CardHeader>
            <CardContent>
              {cdnConfigs?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  CDN設定がありません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>名前</TableHead>
                      <TableHead>プロバイダー</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>オリジン</TableHead>
                      <TableHead>画像最適化</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cdnConfigs?.map((config: any) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">{config.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{config.provider}</Badge>
                        </TableCell>
                        <TableCell>
                          {config.status === 'ACTIVE' ? (
                            <Badge className="bg-green-500">有効</Badge>
                          ) : (
                            <Badge variant="secondary">{config.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{config.originUrl}</TableCell>
                        <TableCell>
                          {config.imageOptimization ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {config.status !== 'ACTIVE' && (
                            <Button
                              size="sm"
                              onClick={() => handleActivateCdn(config.id)}
                            >
                              有効化
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateRuleDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              最適化ルール追加
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>クエリ最適化ルール</CardTitle>
              <CardDescription>パフォーマンス改善のための自動最適化ルール</CardDescription>
            </CardHeader>
            <CardContent>
              {optimizationRules?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  最適化ルールがありません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ルール名</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>対象</TableHead>
                      <TableHead>優先度</TableHead>
                      <TableHead>マッチ数</TableHead>
                      <TableHead>有効</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimizationRules?.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            {rule.description && (
                              <div className="text-xs text-muted-foreground">
                                {rule.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{rule.optimizationType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {rule.targetEndpoint || rule.targetTable || '-'}
                        </TableCell>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell>{rule.matchCount}</TableCell>
                        <TableCell>
                          <Switch
                            checked={rule.isEnabled}
                            onCheckedChange={() => handleToggleRule(rule.id)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            削除
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>テーブル統計</CardTitle>
                <CardDescription>行数・サイズ順</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>テーブル</TableHead>
                      <TableHead className="text-right">行数</TableHead>
                      <TableHead className="text-right">サイズ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dbHealth?.tableStats?.map((table: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{table.table_name}</TableCell>
                        <TableCell className="text-right">
                          {Number(table.row_count).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">{table.total_size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>インデックス使用状況</CardTitle>
                <CardDescription>スキャン数順</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>インデックス</TableHead>
                      <TableHead className="text-right">スキャン</TableHead>
                      <TableHead className="text-right">読取</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dbHealth?.indexStats?.map((idx: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{idx.index_name}</TableCell>
                        <TableCell className="text-right">
                          {Number(idx.scans).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(idx.tuples_read).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateCdnForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [originUrl, setOriginUrl] = useState('');
  const [cdnUrl, setCdnUrl] = useState('');
  const [imageOptimization, setImageOptimization] = useState(true);

  const handleSubmit = () => {
    onSubmit({
      name,
      provider,
      originUrl,
      cdnUrl: cdnUrl || undefined,
      imageOptimization,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>名前</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: production-cdn"
        />
      </div>

      <div className="space-y-2">
        <Label>プロバイダー</Label>
        <Select value={provider} onValueChange={setProvider}>
          <SelectTrigger>
            <SelectValue placeholder="選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CLOUDFLARE">Cloudflare</SelectItem>
            <SelectItem value="AWS_CLOUDFRONT">AWS CloudFront</SelectItem>
            <SelectItem value="FASTLY">Fastly</SelectItem>
            <SelectItem value="BUNNY_CDN">Bunny CDN</SelectItem>
            <SelectItem value="IMGIX">imgix</SelectItem>
            <SelectItem value="CLOUDINARY">Cloudinary</SelectItem>
            <SelectItem value="CUSTOM">カスタム</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>オリジンURL</Label>
        <Input
          value={originUrl}
          onChange={(e) => setOriginUrl(e.target.value)}
          placeholder="https://origin.example.com"
        />
      </div>

      <div className="space-y-2">
        <Label>CDN URL（オプション）</Label>
        <Input
          value={cdnUrl}
          onChange={(e) => setCdnUrl(e.target.value)}
          placeholder="https://cdn.example.com"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={imageOptimization}
          onCheckedChange={setImageOptimization}
        />
        <Label>画像最適化を有効化</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} disabled={!name || !provider || !originUrl}>
          作成
        </Button>
      </div>
    </div>
  );
}

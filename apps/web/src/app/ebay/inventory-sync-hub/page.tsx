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
  RefreshCw,
  LayoutDashboard,
  Package,
  Settings2,
  Globe,
  Layers,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Link2,
  Play,
  Pause,
  RotateCcw,
  X,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function InventorySyncHubPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <RefreshCw className="h-8 w-8 text-pink-600" />
            Inventory Sync Hub
          </h1>
          <p className="text-muted-foreground mt-1">在庫同期ハブ・マルチチャネル管理</p>
        </div>
        <Button className="bg-pink-600 hover:bg-pink-700">
          <RefreshCw className="mr-2 h-4 w-4" />
          全チャネル同期
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="skus" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            SKU管理
          </TabsTrigger>
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            チャネル
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            ルール
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            ジョブ
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="skus">
          <SkusTab />
        </TabsContent>
        <TabsContent value="channels">
          <ChannelsTab />
        </TabsContent>
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
        <TabsContent value="jobs">
          <JobsTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/dashboard/overview`, fetcher);
  const { data: syncStatus } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/dashboard/sync-status`, fetcher);
  const { data: activity } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/dashboard/recent-activity`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-100 text-green-800">同期済み</Badge>;
      case 'syncing':
        return <Badge className="bg-blue-100 text-blue-800">同期中</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">エラー</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総SKU数</CardTitle>
            <Package className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalSkus?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">同期済み: {overview?.syncedSkus?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">同期待ち</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.pendingSync}</div>
            <p className="text-xs text-muted-foreground">エラー: {overview?.syncErrors}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">接続チャネル</CardTitle>
            <Link2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.connectedChannels}</div>
            <p className="text-xs text-muted-foreground">アクティブルール: {overview?.activeRules}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均同期時間</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.avgSyncTime}</div>
            <p className="text-xs text-muted-foreground">最終フル同期: {overview?.lastFullSync?.split(' ')[1]}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>チャネル同期ステータス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {syncStatus?.channels?.map((channel: any) => (
                <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{channel.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {channel.syncedCount?.toLocaleString()} SKU / 待ち: {channel.pendingCount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(channel.status)}
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最近のアクティビティ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity?.activities?.map((act: any) => (
                <div key={act.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {act.type === 'sync_complete' && <CheckCircle className="h-5 w-5 text-green-600" />}
                    {act.type === 'stock_update' && <Package className="h-5 w-5 text-blue-600" />}
                    {act.type === 'sync_error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                    {act.type === 'rule_triggered' && <Zap className="h-5 w-5 text-yellow-600" />}
                    <div>
                      <p className="font-medium">
                        {act.type === 'sync_complete' && `${act.channel} 同期完了`}
                        {act.type === 'stock_update' && `在庫更新: ${act.sku}`}
                        {act.type === 'sync_error' && `エラー: ${act.channel}`}
                        {act.type === 'rule_triggered' && `ルール発動: ${act.rule}`}
                      </p>
                      <p className="text-xs text-muted-foreground">{act.timestamp}</p>
                    </div>
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

function SkusTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/skus`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge className="bg-green-100 text-green-800">同期済み</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">待機中</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">エラー</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SKU一覧</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="SKU検索..." className="w-64" />
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="synced">同期済み</SelectItem>
                  <SelectItem value="pending">待機中</SelectItem>
                  <SelectItem value="error">エラー</SelectItem>
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
                <TableHead className="text-right">総在庫</TableHead>
                <TableHead>チャネル配分</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.skus?.map((sku: any) => (
                <TableRow key={sku.sku}>
                  <TableCell className="font-mono">{sku.sku}</TableCell>
                  <TableCell className="font-medium">{sku.title}</TableCell>
                  <TableCell className="text-right">{sku.totalQty}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {Object.entries(sku.channels || {}).map(([ch, qty]: [string, any]) => (
                        <Badge key={ch} variant="outline" className="text-xs">
                          {ch}: {qty}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(sku.status)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
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

function ChannelsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/channels`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {data?.channels?.map((channel: any) => (
          <Card key={channel.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {channel.name}
                </CardTitle>
                {channel.connected ? (
                  <Badge className="bg-green-100 text-green-800">接続中</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">未接続</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">タイプ</span>
                  <span className="font-medium uppercase">{channel.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU数</span>
                  <span className="font-medium">{channel.skuCount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">最終同期</span>
                  <span className="font-medium">{channel.lastSync?.split(' ')[1]}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  設定
                </Button>
                <Button size="sm" className="flex-1 bg-pink-600 hover:bg-pink-700">
                  <RefreshCw className="mr-1 h-4 w-4" />
                  同期
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">同期ルール</h2>
        <Button className="bg-pink-600 hover:bg-pink-700">
          ルールを追加
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {data?.rules?.map((rule: any) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Layers className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      条件: {rule.condition} → アクション: {rule.action}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{rule.type}</Badge>
                  <Switch checked={rule.active} />
                  <Button variant="ghost" size="sm">
                    編集
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function JobsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/jobs`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">完了</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">実行中</Badge>;
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
          <CardTitle>同期ジョブ</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ジョブID</TableHead>
                <TableHead>タイプ</TableHead>
                <TableHead>チャネル</TableHead>
                <TableHead>進捗</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>開始時刻</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.jobs?.map((job: any) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-sm">{job.id}</TableCell>
                  <TableCell>{job.type}</TableCell>
                  <TableCell>{job.channel}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={job.progress} className="w-20" />
                      <span className="text-sm">{job.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(job.status)}</TableCell>
                  <TableCell className="text-sm">{job.startedAt}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {job.status === 'failed' && (
                        <Button variant="ghost" size="sm">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {job.status === 'running' && (
                        <Button variant="ghost" size="sm">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
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

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/inventory-sync-hub/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルト同期間隔（分）</label>
            <Input type="number" defaultValue={data?.settings?.defaultSyncInterval} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動同期</p>
              <p className="text-sm text-muted-foreground">定期的に自動で同期を実行</p>
            </div>
            <Switch checked={data?.settings?.autoSyncEnabled} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">在庫バッファ</label>
            <Input type="number" defaultValue={data?.settings?.stockBuffer} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">低在庫閾値</label>
            <Input type="number" defaultValue={data?.settings?.lowStockThreshold} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">在庫切れ時のアクション</label>
            <Select defaultValue={data?.settings?.outOfStockAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pause_listing">リスティングを一時停止</SelectItem>
                <SelectItem value="end_listing">リスティングを終了</SelectItem>
                <SelectItem value="notify_only">通知のみ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">エラー時に通知</p>
              <p className="text-sm text-muted-foreground">同期エラー発生時にメール通知</p>
            </div>
            <Switch checked={data?.settings?.notifyOnError} />
          </div>

          <Button className="bg-pink-600 hover:bg-pink-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

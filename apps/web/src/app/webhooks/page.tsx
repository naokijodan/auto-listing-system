
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Switch } from '@/components/ui/switch';
import {
  Webhook,
  RefreshCw,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  Copy,
  Play,
  RotateCcw,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface WebhookEndpoint {
  id: string;
  name: string;
  description: string | null;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryPolicy: string;
  maxRetries: number;
  timeoutMs: number;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  successCount: number;
  failureCount: number;
  createdAt: string;
  _count?: { deliveries: number };
}

interface WebhookDelivery {
  id: string;
  event: string;
  status: string;
  responseStatus: number | null;
  latencyMs: number | null;
  attempts: number;
  errorMessage: string | null;
  createdAt: string;
  endpoint: { name: string; url: string };
}

interface WebhookEvent {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isActive: boolean;
}

interface Stats {
  endpoints: { total: number; active: number };
  deliveries: {
    total: number;
    pending: number;
    delivered: number;
    failed: number;
    successRate: string;
  };
  events: {
    total: number;
    byEvent: { event: string; _count: number }[];
  };
  recentDeliveries: WebhookDelivery[];
}

export default function WebhooksPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEndpointDialogOpen, setIsEndpointDialogOpen] = useState(false);
  const [showSecret, setShowSecret] = useState<string | null>(null);

  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    description: '',
    url: '',
    events: [] as string[],
    retryPolicy: 'EXPONENTIAL',
    maxRetries: 5,
    timeoutMs: 30000,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, endpointsRes, deliveriesRes, eventsRes] = await Promise.all([
        fetch(`${API_BASE}/webhook-delivery/stats`),
        fetch(`${API_BASE}/webhook-delivery/endpoints`),
        fetch(`${API_BASE}/webhook-delivery/deliveries?limit=20`),
        fetch(`${API_BASE}/webhook-delivery/events`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (endpointsRes.ok) {
        const data = await endpointsRes.json();
        setEndpoints(data.endpoints || []);
      }
      if (deliveriesRes.ok) {
        const data = await deliveriesRes.json();
        setDeliveries(data.deliveries || []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSetupDefaults = async () => {
    try {
      const res = await fetch(`${API_BASE}/webhook-delivery/setup-defaults`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('デフォルトイベントを設定しました');
        fetchData();
      }
    } catch (error) {
      toast.error('設定に失敗しました');
    }
  };

  const handleCreateEndpoint = async () => {
    if (!newEndpoint.name || !newEndpoint.url) {
      toast.error('名前とURLを入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/webhook-delivery/endpoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEndpoint),
      });

      if (res.ok) {
        toast.success('エンドポイントを作成しました');
        setIsEndpointDialogOpen(false);
        setNewEndpoint({
          name: '',
          description: '',
          url: '',
          events: [],
          retryPolicy: 'EXPONENTIAL',
          maxRetries: 5,
          timeoutMs: 30000,
        });
        fetchData();
      }
    } catch (error) {
      toast.error('作成に失敗しました');
    }
  };

  const handleToggleEndpoint = async (endpointId: string) => {
    try {
      const res = await fetch(`${API_BASE}/webhook-delivery/endpoints/${endpointId}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('エンドポイントを更新しました');
        fetchData();
      }
    } catch (error) {
      toast.error('更新に失敗しました');
    }
  };

  const handleTestEndpoint = async (endpointId: string) => {
    try {
      const res = await fetch(`${API_BASE}/webhook-delivery/endpoints/${endpointId}/test`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('テストWebhookを送信しました');
        fetchData();
      }
    } catch (error) {
      toast.error('テストに失敗しました');
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      const res = await fetch(`${API_BASE}/webhook-delivery/deliveries/${deliveryId}/retry`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('リトライをキューに追加しました');
        fetchData();
      }
    } catch (error) {
      toast.error('リトライに失敗しました');
    }
  };

  const handleRotateSecret = async (endpointId: string) => {
    try {
      const res = await fetch(`${API_BASE}/webhook-delivery/endpoints/${endpointId}/rotate-secret`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('シークレットを再生成しました');
        fetchData();
      }
    } catch (error) {
      toast.error('再生成に失敗しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('コピーしました');
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      DELIVERED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      FAILED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      RETRYING: { color: 'bg-orange-100 text-orange-800', icon: <RotateCcw className="h-3 w-3" /> },
      EXHAUSTED: { color: 'bg-gray-100 text-gray-800', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    const { color, icon } = config[status] || { color: 'bg-gray-100', icon: null };
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhook管理</h1>
          <p className="text-muted-foreground">イベント通知とWebhook配信</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新
          </Button>
          {events.length === 0 && (
            <Button onClick={handleSetupDefaults}>
              <Settings className="mr-2 h-4 w-4" />
              デフォルト設定
            </Button>
          )}
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">エンドポイント</CardTitle>
            <Webhook className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.endpoints.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              有効: {stats?.endpoints.active || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">配信数</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deliveries.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              成功率: {stats?.deliveries.successRate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.deliveries.delivered || 0}</div>
            <p className="text-xs text-muted-foreground">
              配信済み
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失敗</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.deliveries.failed || 0}</div>
            <p className="text-xs text-muted-foreground">
              保留: {stats?.deliveries.pending || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* タブコンテンツ */}
      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">エンドポイント</TabsTrigger>
          <TabsTrigger value="deliveries">配信履歴</TabsTrigger>
          <TabsTrigger value="events">イベント</TabsTrigger>
        </TabsList>

        {/* エンドポイント */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Webhookエンドポイント</CardTitle>
                  <CardDescription>イベント通知を受け取るURL</CardDescription>
                </div>
                <Dialog open={isEndpointDialogOpen} onOpenChange={setIsEndpointDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      エンドポイント追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>新規エンドポイント</DialogTitle>
                      <DialogDescription>Webhook通知を受け取るエンドポイントを設定します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>エンドポイント名</Label>
                        <Input
                          value={newEndpoint.name}
                          onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                          placeholder="例：注文通知"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL</Label>
                        <Input
                          value={newEndpoint.url}
                          onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
                          placeholder="https://example.com/webhook"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>リトライポリシー</Label>
                          <Select
                            value={newEndpoint.retryPolicy}
                            onValueChange={(v) => setNewEndpoint({ ...newEndpoint, retryPolicy: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">リトライなし</SelectItem>
                              <SelectItem value="LINEAR">線形</SelectItem>
                              <SelectItem value="EXPONENTIAL">指数バックオフ</SelectItem>
                              <SelectItem value="FIXED">固定間隔</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>最大リトライ数</Label>
                          <Input
                            type="number"
                            value={newEndpoint.maxRetries}
                            onChange={(e) => setNewEndpoint({ ...newEndpoint, maxRetries: parseInt(e.target.value) })}
                            min={0}
                            max={10}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>説明（任意）</Label>
                        <Textarea
                          value={newEndpoint.description}
                          onChange={(e) => setNewEndpoint({ ...newEndpoint, description: e.target.value })}
                          placeholder="このエンドポイントの説明..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEndpointDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateEndpoint}>作成</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>シークレット</TableHead>
                    <TableHead>成功/失敗</TableHead>
                    <TableHead>最終配信</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-medium">{endpoint.name}</TableCell>
                      <TableCell className="font-mono text-sm max-w-[200px] truncate">
                        {endpoint.url}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {showSecret === endpoint.id
                              ? endpoint.secret.slice(0, 20) + '...'
                              : '••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSecret(showSecret === endpoint.id ? null : endpoint.id)}
                          >
                            {showSecret === endpoint.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(endpoint.secret)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-green-600">{endpoint.successCount}</span>
                        {' / '}
                        <span className="text-red-600">{endpoint.failureCount}</span>
                      </TableCell>
                      <TableCell>
                        {endpoint.lastDeliveryAt
                          ? new Date(endpoint.lastDeliveryAt).toLocaleString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={endpoint.isActive}
                          onCheckedChange={() => handleToggleEndpoint(endpoint.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestEndpoint(endpoint.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRotateSecret(endpoint.id)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {endpoints.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        エンドポイントがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 配信履歴 */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>配信履歴</CardTitle>
              <CardDescription>Webhook配信のログ</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>エンドポイント</TableHead>
                    <TableHead>イベント</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>レスポンス</TableHead>
                    <TableHead>レイテンシ</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>{new Date(delivery.createdAt).toLocaleString('ja-JP')}</TableCell>
                      <TableCell>{delivery.endpoint.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{delivery.event}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                      <TableCell>
                        {delivery.responseStatus ? (
                          <Badge className={delivery.responseStatus < 300 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {delivery.responseStatus}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{delivery.latencyMs ? `${delivery.latencyMs}ms` : '-'}</TableCell>
                      <TableCell>
                        {['FAILED', 'EXHAUSTED'].includes(delivery.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryDelivery(delivery.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {deliveries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        配信履歴がありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* イベント */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhookイベント</CardTitle>
              <CardDescription>利用可能なイベントタイプ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(
                  events.reduce((acc: Record<string, WebhookEvent[]>, event) => {
                    if (!acc[event.category]) acc[event.category] = [];
                    acc[event.category].push(event);
                    return acc;
                  }, {})
                ).map(([category, categoryEvents]) => (
                  <Card key={category}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium capitalize">{category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {categoryEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div>
                              <code className="text-xs">{event.name}</code>
                              {event.description && (
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                              )}
                            </div>
                            {event.isActive ? (
                              <Badge className="bg-green-100 text-green-800">有効</Badge>
                            ) : (
                              <Badge variant="secondary">無効</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {events.length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    イベントがありません。「デフォルト設定」をクリックしてください。
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

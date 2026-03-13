
'use client';

import { useState, useEffect } from 'react';
import { addToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Link2,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plug,
  Unplug,
  ExternalLink,
  History,
} from 'lucide-react';
import {
  Integration,
  IntegrationType,
  Stats,
  IntegrationsResponseSchema,
  IntegrationTypeSchema,
  StatsSchema,
} from '@/app/integrations/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Types moved to types.ts

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [types, setTypes] = useState<IntegrationType[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [filter, setFilter] = useState({ type: '', status: '' });

  // フォーム状態
  const [formData, setFormData] = useState({
    type: '',
    name: '',
    description: '',
    apiEndpoint: '',
    syncInterval: 60,
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);

      const [integrationsRes, typesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/external-integrations?${params}`),
        fetch(`${API_URL}/api/external-integrations/types`),
        fetch(`${API_URL}/api/external-integrations/stats`),
      ]);

      const integrationsJson = await integrationsRes.json();
      const typesJson = await typesRes.json();
      const statsJson = await statsRes.json();

      const integrationsParsed = IntegrationsResponseSchema.safeParse(integrationsJson);
      if (integrationsParsed.success) {
        setIntegrations(integrationsParsed.data.data);
      } else {
        addToast({ type: 'error', message: '連携一覧の取得に失敗しました' });
        setIntegrations(integrationsJson?.data ?? []);
      }

      const typesParsed = Array.isArray(typesJson?.types)
        ? typesJson.types.map((t: unknown) => IntegrationTypeSchema.safeParse(t))
        : null;
      if (typesParsed && typesParsed.every((r) => r.success)) {
        setTypes(typesJson.types as IntegrationType[]);
      } else {
        addToast({ type: 'error', message: '連携タイプの取得に失敗しました' });
        setTypes(typesJson?.types ?? []);
      }

      const statsParsed = StatsSchema.safeParse(statsJson);
      if (statsParsed.success) {
        setStats(statsParsed.data);
      } else {
        addToast({ type: 'error', message: '統計情報の取得に失敗しました' });
        setStats(statsJson);
      }
    } catch (error) {
      addToast({ type: 'error', message: 'データの取得に失敗しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/external-integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        setFormData({ type: '', name: '', description: '', apiEndpoint: '', syncInterval: 60 });
        fetchData();
      }
    } catch (error) {
      addToast({ type: 'error', message: '連携の作成に失敗しました' });
    }
  };

  const handleSync = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/external-integrations/${id}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'INCREMENTAL' }),
      });
      fetchData();
    } catch (error) {
      addToast({ type: 'error', message: '同期に失敗しました' });
    }
  };

  const handleConnect = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/external-integrations/${id}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: 'demo-token',
          tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      fetchData();
    } catch (error) {
      addToast({ type: 'error', message: '接続に失敗しました' });
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`${API_URL}/api/external-integrations/${id}/disconnect`, {
        method: 'POST',
      });
      fetchData();
    } catch (error) {
      addToast({ type: 'error', message: '切断に失敗しました' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この連携を削除しますか？')) return;

    try {
      await fetch(`${API_URL}/api/external-integrations/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      INACTIVE: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
      CONNECTING: { color: 'bg-blue-100 text-blue-800', icon: <Clock className="h-3 w-3" /> },
      ERROR: { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
      SUSPENDED: { color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="h-3 w-3" /> },
    };
    const { color, icon } = config[status] || config.INACTIVE;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {status}
      </Badge>
    );
  };

  const getTypeLabel = (type: string) => {
    const found = types.find(t => t.value === type);
    return found?.label || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" aria-busy="true" aria-live="polite">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">外部連携</h1>
          <p className="text-gray-500">外部サービスとの連携を管理</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              連携追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>外部連携を追加</DialogTitle>
              <DialogDescription>新しい外部サービスとの連携を設定します</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>連携タイプ</Label>
                <Select
                  aria-describedby="integration-type-desc"
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="タイプを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p id="integration-type-desc" className="sr-only">連携する外部サービスのタイプを選択</p>
              </div>
              <div>
                <Label>名前</Label>
                <Input
                  aria-describedby="integration-name-desc"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="連携の名前"
                />
                <p id="integration-name-desc" className="sr-only">この連携の表示名</p>
              </div>
              <div>
                <Label>説明</Label>
                <Input
                  aria-describedby="integration-description-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="連携の説明（任意）"
                />
                <p id="integration-description-desc" className="sr-only">連携の説明（任意）</p>
              </div>
              <div>
                <Label>同期間隔（分）</Label>
                <Input
                  type="number"
                  aria-describedby="integration-interval-desc"
                  value={formData.syncInterval}
                  onChange={(e) => setFormData({ ...formData, syncInterval: parseInt(e.target.value) })}
                />
                <p id="integration-interval-desc" className="sr-only">自動同期の間隔（分）</p>
              </div>
              <Button onClick={handleCreate} className="w-full">
                作成
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card role="status" aria-live="polite">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">総連携数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card role="status" aria-live="polite">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">アクティブ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card role="status" aria-live="polite">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">未接続</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
            </CardContent>
          </Card>
          <Card role="status" aria-live="polite">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">同期成功率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.syncSuccessRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">連携一覧</TabsTrigger>
          <TabsTrigger value="types">連携タイプ</TabsTrigger>
          <TabsTrigger value="logs">同期ログ</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* フィルター */}
          <div className="flex gap-4">
            <Select
              value={filter.type}
              onValueChange={(value) => setFilter({ ...filter, type: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="タイプで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                {types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filter.status}
              onValueChange={(value) => setFilter({ ...filter, status: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="ステータスで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="ACTIVE">アクティブ</SelectItem>
                <SelectItem value="INACTIVE">未接続</SelectItem>
                <SelectItem value="ERROR">エラー</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 連携一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-5 w-5 text-gray-500" />
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                    </div>
                    {getStatusBadge(integration.status)}
                  </div>
                  <CardDescription>
                    {getTypeLabel(integration.type)}
                    {integration.description && ` - ${integration.description}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">同期数:</span>{' '}
                        <span className="font-medium">{integration.totalSynced}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">エラー:</span>{' '}
                        <span className="font-medium text-red-600">{integration.totalErrors}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">成功率:</span>{' '}
                        <span className="font-medium">{integration.successRate}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">最終同期:</span>{' '}
                        <span className="font-medium">
                          {integration.lastSyncAt
                            ? new Date(integration.lastSyncAt).toLocaleString('ja-JP')
                            : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      {integration.status === 'ACTIVE' ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSync(integration.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            同期
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnect(integration.id)}
                          >
                            <Unplug className="h-4 w-4 mr-1" />
                            切断
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                        >
                          <Plug className="h-4 w-4 mr-1" />
                          接続
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDelete(integration.id)}
                        aria-label="連携を削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {integrations.length === 0 && (
            <div className="text-center py-12 text-gray-500" role="status" aria-live="polite">
              外部連携がありません
            </div>
          )}
        </TabsContent>

        <TabsContent value="types">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {types.map((type) => (
              <Card key={type.value}>
                <CardHeader>
                  <CardTitle>{type.label}</CardTitle>
                  <CardDescription>{type.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {type.features.map((feature) => (
                        <Badge key={feature} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500">
                      認証方式: {type.authType === 'oauth' ? 'OAuth' : type.authType === 'api_key' ? 'APIキー' : 'カスタム'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          {stats?.recentSyncs && stats.recentSyncs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>連携</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>開始日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentSyncs.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{sync.integration.name}</div>
                        <div className="text-sm text-gray-500">{sync.integration.type}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          sync.status === 'SUCCESS'
                            ? 'bg-green-100 text-green-800'
                            : sync.status === 'RUNNING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {sync.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(sync.startedAt).toLocaleString('ja-JP')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500" role="status" aria-live="polite">
              同期ログがありません
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


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
import { Textarea } from '@/components/ui/textarea';
import {
  KeyRound,
  Users,
  Shield,
  Activity,
  Plus,
  Settings,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { API_BASE, postApi, deleteApi } from '@/lib/api';

const fetcher = (url: string) => fetch(`${API_BASE}${url}`).then((res) => res.json());

export default function SSOPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);

  const { data: stats } = useSWR('/api/sso/stats', fetcher);
  const { data: providerTypes } = useSWR('/api/sso/provider-types', fetcher);
  const { data: providers, mutate: refreshProviders } = useSWR('/api/sso/providers', fetcher);
  const { data: sessions } = useSWR('/api/sso/sessions?limit=50', fetcher);
  const { data: auditLogs } = useSWR('/api/sso/audit-logs?limit=100', fetcher);

  const handleCreateProvider = async (formData: any) => {
    try {
      await postApi('/api/sso/providers', formData);
      refreshProviders();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create provider:', error);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await postApi(`/api/sso/providers/${id}/activate`);
      refreshProviders();
    } catch (error) {
      console.error('Failed to activate provider:', error);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await postApi(`/api/sso/providers/${id}/deactivate`);
      refreshProviders();
    } catch (error) {
      console.error('Failed to deactivate provider:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このプロバイダーを削除しますか？')) return;
    try {
      await deleteApi(`/api/sso/providers/${id}`);
      refreshProviders();
    } catch (error) {
      console.error('Failed to delete provider:', error);
    }
  };

  const handleRevokeSession = async (id: string) => {
    try {
      await postApi(`/api/sso/sessions/${id}/revoke`);
      mutate('/api/sso/sessions?limit=50');
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      ACTIVE: { variant: 'default', label: '有効' },
      INACTIVE: { variant: 'secondary', label: '無効' },
      CONFIGURING: { variant: 'outline', label: '設定中' },
      TESTING: { variant: 'outline', label: 'テスト中' },
      ERROR: { variant: 'destructive', label: 'エラー' },
      SUSPENDED: { variant: 'destructive', label: '停止中' },
    };
    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getProviderIcon = (type: string) => {
    const icons: Record<string, string> = {
      GOOGLE: '🔵',
      MICROSOFT: '🟦',
      OKTA: '🟣',
      AUTH0: '🔴',
      SAML: '🔐',
      OIDC: '🔑',
      LDAP: '📁',
    };
    return icons[type] || '🔑';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SSO / シングルサインオン</h1>
          <p className="text-muted-foreground">
            外部IDプロバイダーとの連携を管理
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              プロバイダー追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>SSOプロバイダー追加</DialogTitle>
              <DialogDescription>
                新しいIDプロバイダーを設定します
              </DialogDescription>
            </DialogHeader>
            <CreateProviderForm
              providerTypes={providerTypes || []}
              onSubmit={handleCreateProvider}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">プロバイダー数</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProviders || 0}</div>
            <p className="text-xs text-muted-foreground">
              有効: {stats?.activeProviders || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">アクティブセッション</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
            <p className="text-xs text-muted-foreground">現在ログイン中</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">本日のログイン</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayLogins || 0}</div>
            <p className="text-xs text-muted-foreground">SSO経由</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">失敗ログイン</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failedLogins || 0}</div>
            <p className="text-xs text-muted-foreground">過去24時間</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">プロバイダー</TabsTrigger>
          <TabsTrigger value="sessions">セッション</TabsTrigger>
          <TabsTrigger value="audit">監査ログ</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SSOプロバイダー</CardTitle>
              <CardDescription>
                設定済みのIDプロバイダー一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              {providers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  プロバイダーがありません
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>プロバイダー</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>セッション</TableHead>
                      <TableHead>自動プロビジョニング</TableHead>
                      <TableHead>最終同期</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers?.map((provider: any) => (
                      <TableRow key={provider.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getProviderIcon(provider.type)}</span>
                            <div>
                              <div className="font-medium">{provider.displayName}</div>
                              <div className="text-xs text-muted-foreground">{provider.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{provider.type}</TableCell>
                        <TableCell>{getStatusBadge(provider.status)}</TableCell>
                        <TableCell>{provider.activeSessions}</TableCell>
                        <TableCell>
                          {provider.autoProvision ? (
                            <Badge variant="outline">有効</Badge>
                          ) : (
                            <Badge variant="secondary">無効</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {provider.lastSyncAt
                            ? new Date(provider.lastSyncAt).toLocaleString('ja-JP')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {provider.status === 'ACTIVE' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeactivate(provider.id)}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivate(provider.id)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProvider(provider)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(provider.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* 利用可能なプロバイダータイプ */}
          <Card>
            <CardHeader>
              <CardTitle>利用可能なプロバイダー</CardTitle>
              <CardDescription>
                サポートされているIDプロバイダー
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {providerTypes?.map((type: any) => (
                  <div
                    key={type.type}
                    className="flex items-center gap-3 p-4 border rounded-lg"
                  >
                    <span className="text-2xl">{getProviderIcon(type.type)}</span>
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>アクティブセッション</CardTitle>
              <CardDescription>
                SSO経由でログイン中のセッション
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>プロバイダー</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>IPアドレス</TableHead>
                    <TableHead>最終アクティビティ</TableHead>
                    <TableHead>有効期限</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions?.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.userId}</div>
                          <div className="text-xs text-muted-foreground">
                            {session.externalUserId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getProviderIcon(session.provider.type)}</span>
                          {session.provider.displayName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {session.status === 'ACTIVE' ? (
                          <Badge>アクティブ</Badge>
                        ) : (
                          <Badge variant="secondary">{session.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{session.ipAddress || '-'}</TableCell>
                      <TableCell>
                        {new Date(session.lastActivityAt).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        {new Date(session.expiresAt).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell className="text-right">
                        {session.status === 'ACTIVE' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            無効化
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SSO監査ログ</CardTitle>
              <CardDescription>
                認証関連のイベントログ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>プロバイダー</TableHead>
                    <TableHead>ユーザー</TableHead>
                    <TableHead>IPアドレス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.logs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.createdAt).toLocaleString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : log.status === 'FAILURE' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        )}
                      </TableCell>
                      <TableCell>{log.provider?.name || '-'}</TableCell>
                      <TableCell>{log.userId || log.externalUserId || '-'}</TableCell>
                      <TableCell>{log.ipAddress || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateProviderForm({
  providerTypes,
  onSubmit,
  onCancel,
}: {
  providerTypes: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState('');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [issuerUrl, setIssuerUrl] = useState('');
  const [entityId, setEntityId] = useState('');
  const [ssoUrl, setSsoUrl] = useState('');
  const [certificate, setCertificate] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [autoProvision, setAutoProvision] = useState(true);

  const selectedType = providerTypes.find((t) => t.type === type);

  const handleSubmit = () => {
    onSubmit({
      type,
      name,
      displayName,
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      issuerUrl: issuerUrl || undefined,
      entityId: entityId || undefined,
      ssoUrl: ssoUrl || undefined,
      certificate: certificate || undefined,
      allowedDomains: allowedDomains ? allowedDomains.split(',').map((d) => d.trim()) : [],
      autoProvision,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>プロバイダータイプ</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="タイプを選択" />
            </SelectTrigger>
            <SelectContent>
              {providerTypes.map((t) => (
                <SelectItem key={t.type} value={t.type}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>識別名</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: company-google"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>表示名</Label>
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="例: Google Workspace"
        />
      </div>

      {selectedType?.configFields?.includes('clientId') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Client ID</Label>
            <Input
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Client Secret</Label>
            <Input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>
        </div>
      )}

      {selectedType?.configFields?.includes('issuerUrl') && (
        <div className="space-y-2">
          <Label>Issuer URL</Label>
          <Input
            value={issuerUrl}
            onChange={(e) => setIssuerUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      {type === 'SAML' && (
        <>
          <div className="space-y-2">
            <Label>Entity ID</Label>
            <Input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>SSO URL</Label>
            <Input
              value={ssoUrl}
              onChange={(e) => setSsoUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>証明書 (PEM)</Label>
            <Textarea
              value={certificate}
              onChange={(e) => setCertificate(e.target.value)}
              rows={5}
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>許可ドメイン（カンマ区切り）</Label>
        <Input
          value={allowedDomains}
          onChange={(e) => setAllowedDomains(e.target.value)}
          placeholder="例: example.com, company.co.jp"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={autoProvision}
          onCheckedChange={setAutoProvision}
        />
        <Label>自動プロビジョニング（初回ログイン時にユーザー自動作成）</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          キャンセル
        </Button>
        <Button onClick={handleSubmit} disabled={!type || !name || !displayName}>
          作成
        </Button>
      </div>
    </div>
  );
}

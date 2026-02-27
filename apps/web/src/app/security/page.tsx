// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  Shield,
  Key,
  Smartphone,
  Globe,
  Monitor,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Lock,
  Eye,
  Download,
  LogOut,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Stats {
  twoFactorEnabled: number;
  activeSessions: number;
  loginAttempts24h: number;
  failedLogins24h: number;
  loginSuccessRate: number;
  ipWhitelistEntries: number;
  criticalEvents7d: number;
}

interface AuditLog {
  id: string;
  action: string;
  category: string;
  severity: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  status: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

interface Session {
  id: string;
  userId: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  isActive: boolean;
  lastActivityAt: string;
  createdAt: string;
}

interface IpWhitelistEntry {
  id: string;
  ipAddress: string;
  ipType: string;
  name?: string;
  description?: string;
  scope: string;
  isActive: boolean;
  lastUsedAt?: string;
  useCount: number;
  createdAt: string;
}

interface TwoFactorStatus {
  enabled: boolean;
  verified: boolean;
  method?: string;
  enabledAt?: string;
  lastUsedAt?: string;
  remainingBackupCodes?: number;
}

export default function SecurityPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [ipWhitelist, setIpWhitelist] = useState<IpWhitelistEntry[]>([]);
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddIpOpen, setIsAddIpOpen] = useState(false);
  const [is2FASetupOpen, setIs2FASetupOpen] = useState(false);
  const [setupData, setSetupData] = useState<{ secret?: string; otpAuthUrl?: string; backupCodes?: string[] } | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  // フィルター
  const [logFilter, setLogFilter] = useState({ action: '', severity: '', status: '' });

  // IP追加フォーム
  const [ipForm, setIpForm] = useState({
    ipAddress: '',
    name: '',
    description: '',
    scope: 'GLOBAL',
  });

  // デモ用のユーザーID
  const currentUserId = 'demo-user-1';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [logFilter]);

  const fetchData = async () => {
    try {
      const [statsRes, sessionsRes, ipRes, twoFactorRes] = await Promise.all([
        fetch(`${API_URL}/api/security/stats`),
        fetch(`${API_URL}/api/security/sessions?userId=${currentUserId}`),
        fetch(`${API_URL}/api/security/ip-whitelist`),
        fetch(`${API_URL}/api/security/2fa/status/${currentUserId}`),
      ]);

      const statsData = await statsRes.json();
      const sessionsData = await sessionsRes.json();
      const ipData = await ipRes.json();
      const twoFactorData = await twoFactorRes.json();

      setStats(statsData);
      setSessions(sessionsData.data || []);
      setIpWhitelist(ipData.data || []);
      setTwoFactorStatus(twoFactorData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (logFilter.action) params.append('action', logFilter.action);
      if (logFilter.severity) params.append('severity', logFilter.severity);
      if (logFilter.status) params.append('status', logFilter.status);

      const res = await fetch(`${API_URL}/api/security/audit-logs?${params}`);
      const data = await res.json();
      setAuditLogs(data.data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const res = await fetch(`${API_URL}/api/security/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const data = await res.json();
      setSetupData(data);
      setIs2FASetupOpen(true);
    } catch (error) {
      console.error('Failed to setup 2FA:', error);
    }
  };

  const handleVerify2FA = async () => {
    try {
      const res = await fetch(`${API_URL}/api/security/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, code: verificationCode }),
      });

      if (res.ok) {
        setIs2FASetupOpen(false);
        setSetupData(null);
        setVerificationCode('');
        fetchData();
      } else {
        alert('認証コードが正しくありません');
      }
    } catch (error) {
      console.error('Failed to verify 2FA:', error);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('2FAを無効化するには、現在の認証コードを入力してください');
    if (!code) return;

    try {
      const res = await fetch(`${API_URL}/api/security/2fa/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, code }),
      });

      if (res.ok) {
        fetchData();
      } else {
        alert('認証コードが正しくありません');
      }
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
    }
  };

  const handleAddIp = async () => {
    try {
      const res = await fetch(`${API_URL}/api/security/ip-whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ipForm,
          createdBy: currentUserId,
        }),
      });

      if (res.ok) {
        setIsAddIpOpen(false);
        setIpForm({ ipAddress: '', name: '', description: '', scope: 'GLOBAL' });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to add IP:', error);
    }
  };

  const handleDeleteIp = async (id: string) => {
    if (!confirm('このIPを削除しますか？')) return;

    try {
      await fetch(`${API_URL}/api/security/ip-whitelist/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete IP:', error);
    }
  };

  const handleRevokeSession = async (id: string) => {
    if (!confirm('このセッションを無効化しますか？')) return;

    try {
      await fetch(`${API_URL}/api/security/sessions/${id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokedBy: currentUserId }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, string> = {
      DEBUG: 'bg-gray-100 text-gray-800',
      INFO: 'bg-blue-100 text-blue-800',
      WARNING: 'bg-yellow-100 text-yellow-800',
      ERROR: 'bg-red-100 text-red-800',
      CRITICAL: 'bg-red-200 text-red-900',
    };
    return <Badge className={config[severity] || config.INFO}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      SUCCESS: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      FAILURE: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      BLOCKED: { color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="h-3 w-3" /> },
      PENDING: { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-3 w-3" /> },
    };
    const { color, icon } = config[status] || config.PENDING;
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {status}
      </Badge>
    );
  };

  const getDeviceIcon = (type?: string) => {
    switch (type) {
      case 'MOBILE':
        return <Smartphone className="h-4 w-4" />;
      case 'DESKTOP':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">セキュリティ</h1>
          <p className="text-gray-500">アカウントのセキュリティ設定を管理</p>
        </div>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">2FA有効ユーザー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.twoFactorEnabled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">アクティブセッション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSessions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">ログイン成功率(24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.loginSuccessRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">重大イベント(7日)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.criticalEvents7d}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="2fa">
        <TabsList>
          <TabsTrigger value="2fa">2要素認証</TabsTrigger>
          <TabsTrigger value="sessions">セッション</TabsTrigger>
          <TabsTrigger value="ip">IPホワイトリスト</TabsTrigger>
          <TabsTrigger value="logs">監査ログ</TabsTrigger>
        </TabsList>

        <TabsContent value="2fa" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                2要素認証 (2FA)
              </CardTitle>
              <CardDescription>
                アカウントのセキュリティを強化するために2要素認証を設定します
              </CardDescription>
            </CardHeader>
            <CardContent>
              {twoFactorStatus?.enabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">2FAが有効です</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">認証方式:</span>{' '}
                      <span className="font-medium">{twoFactorStatus.method}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">有効化日:</span>{' '}
                      <span className="font-medium">
                        {twoFactorStatus.enabledAt
                          ? new Date(twoFactorStatus.enabledAt).toLocaleDateString('ja-JP')
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">最終使用:</span>{' '}
                      <span className="font-medium">
                        {twoFactorStatus.lastUsedAt
                          ? new Date(twoFactorStatus.lastUsedAt).toLocaleString('ja-JP')
                          : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">残りバックアップコード:</span>{' '}
                      <span className="font-medium">{twoFactorStatus.remainingBackupCodes}</span>
                    </div>
                  </div>
                  <Button variant="destructive" onClick={handleDisable2FA}>
                    2FAを無効化
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-500">
                    2要素認証を有効にすると、ログイン時にパスワードに加えて認証コードが必要になります。
                  </p>
                  <Button onClick={handleSetup2FA}>
                    <Shield className="h-4 w-4 mr-2" />
                    2FAを設定
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2FA設定ダイアログ */}
          <Dialog open={is2FASetupOpen} onOpenChange={setIs2FASetupOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>2要素認証の設定</DialogTitle>
                <DialogDescription>
                  認証アプリでQRコードをスキャンしてください
                </DialogDescription>
              </DialogHeader>
              {setupData && (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-gray-100 rounded">
                    <p className="text-sm text-gray-500 mb-2">シークレットキー:</p>
                    <code className="text-sm font-mono">{setupData.secret}</code>
                  </div>
                  <div>
                    <Label>認証コード</Label>
                    <Input
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="6桁のコードを入力"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>バックアップコード</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {setupData.backupCodes?.map((code, i) => (
                        <code key={i} className="text-xs bg-gray-100 p-1 rounded text-center">
                          {code}
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      これらのコードを安全な場所に保存してください
                    </p>
                  </div>
                  <Button onClick={handleVerify2FA} className="w-full">
                    確認して有効化
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                アクティブセッション
              </CardTitle>
              <CardDescription>
                現在ログインしているデバイス一覧
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>デバイス</TableHead>
                      <TableHead>IP / 場所</TableHead>
                      <TableHead>最終アクティビティ</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDeviceIcon(session.deviceType)}
                            <div>
                              <div className="font-medium">{session.deviceName || 'Unknown Device'}</div>
                              <div className="text-sm text-gray-500">
                                {session.browser} / {session.os}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{session.ipAddress}</div>
                            <div className="text-sm text-gray-500">
                              {session.city}, {session.country}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(session.lastActivityAt).toLocaleString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            <LogOut className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  アクティブなセッションがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ip" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddIpOpen} onOpenChange={setIsAddIpOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  IPを追加
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>IPホワイトリストに追加</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>IPアドレス</Label>
                    <Input
                      value={ipForm.ipAddress}
                      onChange={(e) => setIpForm({ ...ipForm, ipAddress: e.target.value })}
                      placeholder="192.168.1.1 or 192.168.1.0/24"
                    />
                  </div>
                  <div>
                    <Label>名前</Label>
                    <Input
                      value={ipForm.name}
                      onChange={(e) => setIpForm({ ...ipForm, name: e.target.value })}
                      placeholder="オフィス"
                    />
                  </div>
                  <div>
                    <Label>スコープ</Label>
                    <Select
                      value={ipForm.scope}
                      onValueChange={(value) => setIpForm({ ...ipForm, scope: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GLOBAL">グローバル</SelectItem>
                        <SelectItem value="ORGANIZATION">組織</SelectItem>
                        <SelectItem value="USER">ユーザー</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddIp} className="w-full">
                    追加
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              {ipWhitelist.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IPアドレス</TableHead>
                      <TableHead>名前</TableHead>
                      <TableHead>スコープ</TableHead>
                      <TableHead>使用回数</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ipWhitelist.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <code className="text-sm">{entry.ipAddress}</code>
                        </TableCell>
                        <TableCell>{entry.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.scope}</Badge>
                        </TableCell>
                        <TableCell>{entry.useCount}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDeleteIp(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  IPホワイトリストが空です
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          {/* フィルター */}
          <div className="flex gap-4">
            <Select
              value={logFilter.severity}
              onValueChange={(value) => setLogFilter({ ...logFilter, severity: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="重要度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARNING">WARNING</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
                <SelectItem value="CRITICAL">CRITICAL</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={logFilter.status}
              onValueChange={(value) => setLogFilter({ ...logFilter, status: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                <SelectItem value="FAILURE">FAILURE</SelectItem>
                <SelectItem value="BLOCKED">BLOCKED</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchAuditLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>

          <Card>
            <CardContent className="pt-6">
              {auditLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>日時</TableHead>
                      <TableHead>アクション</TableHead>
                      <TableHead>重要度</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.action}</div>
                            <div className="text-sm text-gray-500">{log.category}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="text-sm">{log.ipAddress || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  監査ログがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

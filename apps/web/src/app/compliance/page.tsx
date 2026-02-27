// @ts-nocheck
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
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  RefreshCw,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Eye,
  Trash2,
  Download,
  Settings,
  History,
  Users,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface RetentionPolicy {
  id: string;
  name: string;
  description: string | null;
  dataType: string;
  retentionDays: number;
  action: 'DELETE' | 'ARCHIVE' | 'ANONYMIZE';
  isActive: boolean;
  lastExecutedAt: string | null;
  executions: {
    id: string;
    status: string;
    recordsProcessed: number;
    executedAt: string;
  }[];
}

interface GdprRequest {
  id: string;
  type: string;
  userId: string;
  requestedBy: string;
  status: string;
  description: string | null;
  dueDate: string;
  completedAt: string | null;
  createdAt: string;
  activities: {
    id: string;
    action: string;
    performedBy: string;
    createdAt: string;
  }[];
}

interface MaskingRule {
  id: string;
  name: string;
  description: string | null;
  fieldPattern: string;
  maskingType: string;
  maskingPattern: string | null;
  priority: number;
  isActive: boolean;
}

interface ConsentRecord {
  id: string;
  userId: string;
  consentType: string;
  purpose: string;
  status: string;
  expiresAt: string | null;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  performedBy: string;
  ipAddress: string | null;
  createdAt: string;
}

interface ComplianceStats {
  retentionPolicies: { total: number; active: number };
  gdprRequests: { pending: number; completed: number };
  maskingRules: { total: number; active: number };
  consents: { total: number; active: number };
  auditLogs: { last24Hours: number };
  complianceScore: number;
}

export default function CompliancePage() {
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [gdprRequests, setGdprRequests] = useState<GdprRequest[]>([]);
  const [maskingRules, setMaskingRules] = useState<MaskingRule[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolicyDialogOpen, setIsPolicyDialogOpen] = useState(false);
  const [isGdprDialogOpen, setIsGdprDialogOpen] = useState(false);
  const [isMaskingDialogOpen, setIsMaskingDialogOpen] = useState(false);

  // 新規ポリシーフォーム
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    dataType: 'logs',
    retentionDays: 90,
    action: 'DELETE' as const,
  });

  // GDPRリクエストフォーム
  const [newGdprRequest, setNewGdprRequest] = useState({
    type: 'ACCESS' as const,
    userId: '',
    requestedBy: '',
    description: '',
  });

  // マスキングルールフォーム
  const [newMaskingRule, setNewMaskingRule] = useState({
    name: '',
    description: '',
    fieldPattern: '',
    maskingType: 'PARTIAL' as const,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, policiesRes, gdprRes, maskingRes, consentsRes, logsRes] = await Promise.all([
        fetch(`${API_BASE}/compliance/stats`),
        fetch(`${API_BASE}/compliance/retention-policies`),
        fetch(`${API_BASE}/compliance/gdpr-requests`),
        fetch(`${API_BASE}/compliance/masking-rules`),
        fetch(`${API_BASE}/compliance/consents?limit=20`),
        fetch(`${API_BASE}/compliance/audit-logs?limit=50`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (policiesRes.ok) {
        const data = await policiesRes.json();
        setPolicies(data.policies || []);
      }
      if (gdprRes.ok) {
        const data = await gdprRes.json();
        setGdprRequests(data.requests || []);
      }
      if (maskingRes.ok) {
        const data = await maskingRes.json();
        setMaskingRules(data.rules || []);
      }
      if (consentsRes.ok) {
        const data = await consentsRes.json();
        setConsents(data.consents || []);
      }
      if (logsRes.ok) {
        const data = await logsRes.json();
        setAuditLogs(data.logs || []);
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
      const res = await fetch(`${API_BASE}/compliance/setup-defaults`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('デフォルト設定を適用しました');
        fetchData();
      }
    } catch (error) {
      toast.error('設定に失敗しました');
    }
  };

  const handleCreatePolicy = async () => {
    try {
      const res = await fetch(`${API_BASE}/compliance/retention-policies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPolicy),
      });
      if (res.ok) {
        toast.success('ポリシーを作成しました');
        setIsPolicyDialogOpen(false);
        setNewPolicy({ name: '', description: '', dataType: 'logs', retentionDays: 90, action: 'DELETE' });
        fetchData();
      }
    } catch (error) {
      toast.error('作成に失敗しました');
    }
  };

  const handleCreateGdprRequest = async () => {
    try {
      const res = await fetch(`${API_BASE}/compliance/gdpr-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGdprRequest),
      });
      if (res.ok) {
        toast.success('GDPRリクエストを作成しました');
        setIsGdprDialogOpen(false);
        setNewGdprRequest({ type: 'ACCESS', userId: '', requestedBy: '', description: '' });
        fetchData();
      }
    } catch (error) {
      toast.error('作成に失敗しました');
    }
  };

  const handleCreateMaskingRule = async () => {
    try {
      const res = await fetch(`${API_BASE}/compliance/masking-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMaskingRule),
      });
      if (res.ok) {
        toast.success('マスキングルールを作成しました');
        setIsMaskingDialogOpen(false);
        setNewMaskingRule({ name: '', description: '', fieldPattern: '', maskingType: 'PARTIAL' });
        fetchData();
      }
    } catch (error) {
      toast.error('作成に失敗しました');
    }
  };

  const handleExecutePolicy = async (policyId: string) => {
    try {
      const res = await fetch(`${API_BASE}/compliance/retention-policies/${policyId}/execute`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('ポリシー実行を開始しました');
        fetchData();
      }
    } catch (error) {
      toast.error('実行に失敗しました');
    }
  };

  const handleProcessGdprRequest = async (requestId: string) => {
    try {
      const res = await fetch(`${API_BASE}/compliance/gdpr-requests/${requestId}/process`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('リクエストの処理を開始しました');
        fetchData();
      }
    } catch (error) {
      toast.error('処理に失敗しました');
    }
  };

  const getGdprTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ACCESS: 'データアクセス',
      ERASURE: 'データ削除',
      PORTABILITY: 'データポータビリティ',
      RECTIFICATION: 'データ訂正',
      RESTRICTION: '処理制限',
      OBJECTION: '処理異議',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      IN_PROGRESS: { color: 'bg-blue-100 text-blue-800', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      REJECTED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
    };
    const { color, icon } = config[status] || { color: 'bg-gray-100', icon: null };
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        {status}
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
          <h1 className="text-3xl font-bold">コンプライアンス管理</h1>
          <p className="text-muted-foreground">GDPR対応・データ保持・監査ログ</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新
          </Button>
          {policies.length === 0 && maskingRules.length === 0 && (
            <Button onClick={handleSetupDefaults}>
              <Settings className="mr-2 h-4 w-4" />
              デフォルト設定
            </Button>
          )}
        </div>
      </div>

      {/* コンプライアンススコア */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>コンプライアンススコア</CardTitle>
              <CardDescription>総合的なコンプライアンス対応状況</CardDescription>
            </div>
            <div className={`text-5xl font-bold ${getScoreColor(stats?.complianceScore || 0)}`}>
              {stats?.complianceScore || 0}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={stats?.complianceScore || 0} className="h-3" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.retentionPolicies.active || 0}</div>
              <div className="text-sm text-muted-foreground">有効ポリシー</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.gdprRequests.pending || 0}</div>
              <div className="text-sm text-muted-foreground">未処理GDPR</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.maskingRules.active || 0}</div>
              <div className="text-sm text-muted-foreground">マスキングルール</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.consents.active || 0}</div>
              <div className="text-sm text-muted-foreground">有効同意</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats?.auditLogs.last24Hours || 0}</div>
              <div className="text-sm text-muted-foreground">24h監査ログ</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* タブコンテンツ */}
      <Tabs defaultValue="retention" className="space-y-4">
        <TabsList>
          <TabsTrigger value="retention">データ保持</TabsTrigger>
          <TabsTrigger value="gdpr">GDPRリクエスト</TabsTrigger>
          <TabsTrigger value="masking">データマスキング</TabsTrigger>
          <TabsTrigger value="consent">同意管理</TabsTrigger>
          <TabsTrigger value="audit">監査ログ</TabsTrigger>
        </TabsList>

        {/* データ保持ポリシー */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>データ保持ポリシー</CardTitle>
                  <CardDescription>データの保持期間と処理アクション</CardDescription>
                </div>
                <Dialog open={isPolicyDialogOpen} onOpenChange={setIsPolicyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      ポリシー追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規データ保持ポリシー</DialogTitle>
                      <DialogDescription>データ保持ルールを定義します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>ポリシー名</Label>
                        <Input
                          value={newPolicy.name}
                          onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                          placeholder="ログデータ保持ポリシー"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>説明</Label>
                        <Textarea
                          value={newPolicy.description}
                          onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                          placeholder="このポリシーの説明..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>データタイプ</Label>
                          <Select
                            value={newPolicy.dataType}
                            onValueChange={(value) => setNewPolicy({ ...newPolicy, dataType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="logs">ログ</SelectItem>
                              <SelectItem value="sessions">セッション</SelectItem>
                              <SelectItem value="orders">注文</SelectItem>
                              <SelectItem value="analytics">分析</SelectItem>
                              <SelectItem value="messages">メッセージ</SelectItem>
                              <SelectItem value="uploads">アップロード</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>保持日数</Label>
                          <Input
                            type="number"
                            value={newPolicy.retentionDays}
                            onChange={(e) => setNewPolicy({ ...newPolicy, retentionDays: parseInt(e.target.value) })}
                            min={1}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>アクション</Label>
                        <Select
                          value={newPolicy.action}
                          onValueChange={(value: 'DELETE' | 'ARCHIVE' | 'ANONYMIZE') => setNewPolicy({ ...newPolicy, action: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DELETE">削除</SelectItem>
                            <SelectItem value="ARCHIVE">アーカイブ</SelectItem>
                            <SelectItem value="ANONYMIZE">匿名化</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPolicyDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreatePolicy}>作成</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ポリシー名</TableHead>
                    <TableHead>データタイプ</TableHead>
                    <TableHead>保持期間</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>最終実行</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{policy.dataType}</Badge>
                      </TableCell>
                      <TableCell>{policy.retentionDays}日</TableCell>
                      <TableCell>
                        <Badge className={
                          policy.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                          policy.action === 'ARCHIVE' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {policy.action === 'DELETE' ? '削除' : policy.action === 'ARCHIVE' ? 'アーカイブ' : '匿名化'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {policy.lastExecutedAt
                          ? new Date(policy.lastExecutedAt).toLocaleString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {policy.isActive ? (
                          <Badge className="bg-green-100 text-green-800">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExecutePolicy(policy.id)}
                        >
                          実行
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {policies.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        ポリシーが登録されていません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GDPRリクエスト */}
        <TabsContent value="gdpr" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>GDPRリクエスト</CardTitle>
                  <CardDescription>データ主体からのリクエスト管理</CardDescription>
                </div>
                <Dialog open={isGdprDialogOpen} onOpenChange={setIsGdprDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      リクエスト追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規GDPRリクエスト</DialogTitle>
                      <DialogDescription>データ主体からのリクエストを登録します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>リクエストタイプ</Label>
                        <Select
                          value={newGdprRequest.type}
                          onValueChange={(value: any) => setNewGdprRequest({ ...newGdprRequest, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACCESS">データアクセス</SelectItem>
                            <SelectItem value="ERASURE">データ削除</SelectItem>
                            <SelectItem value="PORTABILITY">データポータビリティ</SelectItem>
                            <SelectItem value="RECTIFICATION">データ訂正</SelectItem>
                            <SelectItem value="RESTRICTION">処理制限</SelectItem>
                            <SelectItem value="OBJECTION">処理異議</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ユーザーID</Label>
                          <Input
                            value={newGdprRequest.userId}
                            onChange={(e) => setNewGdprRequest({ ...newGdprRequest, userId: e.target.value })}
                            placeholder="user_123"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>リクエスト者</Label>
                          <Input
                            value={newGdprRequest.requestedBy}
                            onChange={(e) => setNewGdprRequest({ ...newGdprRequest, requestedBy: e.target.value })}
                            placeholder="user@example.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>説明</Label>
                        <Textarea
                          value={newGdprRequest.description}
                          onChange={(e) => setNewGdprRequest({ ...newGdprRequest, description: e.target.value })}
                          placeholder="リクエストの詳細..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsGdprDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateGdprRequest}>作成</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイプ</TableHead>
                    <TableHead>ユーザーID</TableHead>
                    <TableHead>リクエスト者</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>期限</TableHead>
                    <TableHead>作成日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gdprRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Badge variant="outline">{getGdprTypeLabel(request.type)}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{request.userId}</TableCell>
                      <TableCell>{request.requestedBy}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.dueDate).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell>{new Date(request.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                      <TableCell>
                        {request.status === 'PENDING' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessGdprRequest(request.id)}
                          >
                            処理開始
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {gdprRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        GDPRリクエストがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* データマスキング */}
        <TabsContent value="masking" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>データマスキングルール</CardTitle>
                  <CardDescription>機密データの保護ルール</CardDescription>
                </div>
                <Dialog open={isMaskingDialogOpen} onOpenChange={setIsMaskingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      ルール追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規マスキングルール</DialogTitle>
                      <DialogDescription>データマスキングルールを定義します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>ルール名</Label>
                        <Input
                          value={newMaskingRule.name}
                          onChange={(e) => setNewMaskingRule({ ...newMaskingRule, name: e.target.value })}
                          placeholder="メールアドレスマスキング"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>フィールドパターン</Label>
                        <Input
                          value={newMaskingRule.fieldPattern}
                          onChange={(e) => setNewMaskingRule({ ...newMaskingRule, fieldPattern: e.target.value })}
                          placeholder="*.email"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>マスキングタイプ</Label>
                        <Select
                          value={newMaskingRule.maskingType}
                          onValueChange={(value: any) => setNewMaskingRule({ ...newMaskingRule, maskingType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FULL">完全マスク</SelectItem>
                            <SelectItem value="PARTIAL">部分マスク</SelectItem>
                            <SelectItem value="HASH">ハッシュ化</SelectItem>
                            <SelectItem value="TOKENIZE">トークン化</SelectItem>
                            <SelectItem value="REDACT">墨消し</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>説明</Label>
                        <Textarea
                          value={newMaskingRule.description}
                          onChange={(e) => setNewMaskingRule({ ...newMaskingRule, description: e.target.value })}
                          placeholder="ルールの説明..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsMaskingDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateMaskingRule}>作成</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ルール名</TableHead>
                    <TableHead>フィールドパターン</TableHead>
                    <TableHead>マスキングタイプ</TableHead>
                    <TableHead>優先度</TableHead>
                    <TableHead>状態</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maskingRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="font-mono">{rule.fieldPattern}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.maskingType}</Badge>
                      </TableCell>
                      <TableCell>{rule.priority}</TableCell>
                      <TableCell>
                        {rule.isActive ? (
                          <Badge className="bg-green-100 text-green-800">有効</Badge>
                        ) : (
                          <Badge variant="secondary">無効</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {maskingRules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        マスキングルールがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 同意管理 */}
        <TabsContent value="consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>同意記録</CardTitle>
              <CardDescription>ユーザーの同意状況</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ユーザーID</TableHead>
                    <TableHead>同意タイプ</TableHead>
                    <TableHead>目的</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>有効期限</TableHead>
                    <TableHead>取得日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consents.map((consent) => (
                    <TableRow key={consent.id}>
                      <TableCell className="font-mono">{consent.userId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{consent.consentType}</Badge>
                      </TableCell>
                      <TableCell>{consent.purpose}</TableCell>
                      <TableCell>
                        {consent.status === 'ACTIVE' ? (
                          <Badge className="bg-green-100 text-green-800">有効</Badge>
                        ) : consent.status === 'WITHDRAWN' ? (
                          <Badge className="bg-red-100 text-red-800">撤回</Badge>
                        ) : (
                          <Badge variant="secondary">{consent.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {consent.expiresAt
                          ? new Date(consent.expiresAt).toLocaleDateString('ja-JP')
                          : '無期限'}
                      </TableCell>
                      <TableCell>{new Date(consent.createdAt).toLocaleDateString('ja-JP')}</TableCell>
                    </TableRow>
                  ))}
                  {consents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        同意記録がありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 監査ログ */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>監査ログ</CardTitle>
                  <CardDescription>コンプライアンス関連のアクティビティログ</CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  エクスポート
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>リソース</TableHead>
                    <TableHead>実行者</TableHead>
                    <TableHead>IPアドレス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{new Date(log.createdAt).toLocaleString('ja-JP')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        {log.resource}
                        {log.resourceId && <span className="text-muted-foreground ml-1">({log.resourceId.slice(0, 8)}...)</span>}
                      </TableCell>
                      <TableCell>{log.performedBy}</TableCell>
                      <TableCell className="font-mono">{log.ipAddress || '-'}</TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        監査ログがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

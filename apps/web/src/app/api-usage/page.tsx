
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Key,
  RefreshCw,
  Plus,
  Activity,
  Shield,
  Clock,
  Copy,
  Eye,
  EyeOff,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Settings,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiKeyItem {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  permissions: string[];
  scopes: string[];
  rateLimit: number;
  rateLimitWindow: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  usageCount: number;
  ipWhitelist: string[];
  createdAt: string;
}

interface RateLimitRule {
  id: string;
  name: string;
  description: string | null;
  target: string;
  targetValue: string | null;
  limit: number;
  windowSeconds: number;
  action: string;
  isActive: boolean;
  priority: number;
  currentCount: number;
  createdAt: string;
}

interface Quota {
  id: string;
  quotaType: string;
  limit: number;
  used: number;
  percentage: string;
  remaining: number;
  alertThreshold: number;
  periodStart: string;
  periodEnd: string;
}

interface Stats {
  apiKeys: { total: number; active: number };
  rateLimits: { total: number; active: number };
  today: {
    requests: number;
    errors: number;
    avgLatencyMs: number;
  };
  quotas: { type: string; limit: number; used: number; percentage: string }[];
  trend: { date: string; _sum: { totalRequests: number; errorCount: number } }[];
}

export default function ApiUsagePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [rules, setRules] = useState<RateLimitRule[]>([]);
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  const [newKey, setNewKey] = useState({
    name: '',
    description: '',
    rateLimit: 1000,
    rateLimitWindow: 3600,
    permissions: [] as string[],
  });

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    target: 'GLOBAL',
    targetValue: '',
    limit: 1000,
    windowSeconds: 3600,
    action: 'REJECT',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, keysRes, rulesRes, quotasRes] = await Promise.all([
        fetch(`${API_BASE}/api-usage/stats`),
        fetch(`${API_BASE}/api-usage/keys`),
        fetch(`${API_BASE}/api-usage/rate-limits`),
        fetch(`${API_BASE}/api-usage/quotas`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.keys || []);
      }
      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }
      if (quotasRes.ok) {
        const data = await quotasRes.json();
        setQuotas(data.quotas || []);
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
      const res = await fetch(`${API_BASE}/api-usage/setup-defaults`, {
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

  const handleCreateKey = async () => {
    if (!newKey.name) {
      toast.error('APIキー名を入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api-usage/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      });

      if (res.ok) {
        const data = await res.json();
        setNewApiKey(data.key);
        toast.success('APIキーを作成しました');
        setNewKey({
          name: '',
          description: '',
          rateLimit: 1000,
          rateLimitWindow: 3600,
          permissions: [],
        });
        fetchData();
      }
    } catch (error) {
      toast.error('作成に失敗しました');
    }
  };

  const handleCreateRule = async () => {
    if (!newRule.name) {
      toast.error('ルール名を入力してください');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api-usage/rate-limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      if (res.ok) {
        toast.success('ルールを作成しました');
        setIsRuleDialogOpen(false);
        setNewRule({
          name: '',
          description: '',
          target: 'GLOBAL',
          targetValue: '',
          limit: 1000,
          windowSeconds: 3600,
          action: 'REJECT',
        });
        fetchData();
      }
    } catch (error) {
      toast.error('作成に失敗しました');
    }
  };

  const handleToggleKey = async (keyId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api-usage/keys/${keyId}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('APIキーを更新しました');
        fetchData();
      }
    } catch (error) {
      toast.error('更新に失敗しました');
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api-usage/rate-limits/${ruleId}/toggle`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('ルールを更新しました');
        fetchData();
      }
    } catch (error) {
      toast.error('更新に失敗しました');
    }
  };

  const handleResetRule = async (ruleId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api-usage/rate-limits/${ruleId}/reset`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('カウンターをリセットしました');
        fetchData();
      }
    } catch (error) {
      toast.error('リセットに失敗しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('コピーしました');
  };

  const formatWindowSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${seconds / 60}分`;
    return `${seconds / 3600}時間`;
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-amber-600';
    return 'text-green-600';
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
          <h1 className="text-3xl font-bold">API利用統計</h1>
          <p className="text-muted-foreground">APIキーとレート制限の管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            更新
          </Button>
          {rules.length === 0 && (
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
            <CardTitle className="text-sm font-medium">APIキー</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.apiKeys.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              有効: {stats?.apiKeys.active || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日のリクエスト</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today.requests.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              エラー: {stats?.today.errors || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均レイテンシ</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.today.avgLatencyMs.toFixed(0) || 0}ms
            </div>
            <p className="text-xs text-muted-foreground">
              本日の平均
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">レート制限</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.rateLimits.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              有効ルール
            </p>
          </CardContent>
        </Card>
      </div>

      {/* クォータ状況 */}
      {quotas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>クォータ使用状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {quotas.map((quota) => (
                <div key={quota.id} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{quota.quotaType.replace('_', ' ')}</span>
                    <span className={getQuotaColor(parseFloat(quota.percentage))}>
                      {quota.percentage}%
                    </span>
                  </div>
                  <Progress value={parseFloat(quota.percentage)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{quota.used.toLocaleString()} 使用</span>
                    <span>{quota.limit.toLocaleString()} 上限</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* タブコンテンツ */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">APIキー</TabsTrigger>
          <TabsTrigger value="limits">レート制限</TabsTrigger>
          <TabsTrigger value="usage">使用状況</TabsTrigger>
        </TabsList>

        {/* APIキー */}
        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>APIキー</CardTitle>
                  <CardDescription>API認証用のキー管理</CardDescription>
                </div>
                <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      APIキー作成
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規APIキー</DialogTitle>
                      <DialogDescription>新しいAPIキーを作成します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>キー名</Label>
                        <Input
                          value={newKey.name}
                          onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                          placeholder="例：本番用APIキー"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>レート制限（回/時間）</Label>
                          <Input
                            type="number"
                            value={newKey.rateLimit}
                            onChange={(e) => setNewKey({ ...newKey, rateLimit: parseInt(e.target.value) })}
                            min={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>ウィンドウ（秒）</Label>
                          <Input
                            type="number"
                            value={newKey.rateLimitWindow}
                            onChange={(e) => setNewKey({ ...newKey, rateLimitWindow: parseInt(e.target.value) })}
                            min={60}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>説明（任意）</Label>
                        <Input
                          value={newKey.description}
                          onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                          placeholder="このAPIキーの説明..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsKeyDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateKey}>作成</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* 新規作成したキーの表示 */}
              {newApiKey && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-amber-800">新しいAPIキー（一度だけ表示されます）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-white rounded border font-mono text-sm">
                      {newApiKey}
                    </code>
                    <Button size="sm" onClick={() => copyToClipboard(newApiKey)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setNewApiKey(null)}
                  >
                    閉じる
                  </Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead>キープレフィックス</TableHead>
                    <TableHead>レート制限</TableHead>
                    <TableHead>使用回数</TableHead>
                    <TableHead>最終使用</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{key.keyPrefix}...</code>
                      </TableCell>
                      <TableCell>
                        {key.rateLimit.toLocaleString()} / {formatWindowSeconds(key.rateLimitWindow)}
                      </TableCell>
                      <TableCell>{key.usageCount.toLocaleString()}</TableCell>
                      <TableCell>
                        {key.lastUsedAt
                          ? new Date(key.lastUsedAt).toLocaleString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={key.isActive}
                          onCheckedChange={() => handleToggleKey(key.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {apiKeys.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        APIキーがありません
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* レート制限 */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>レート制限ルール</CardTitle>
                  <CardDescription>APIリクエストの制限設定</CardDescription>
                </div>
                <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      ルール追加
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新規レート制限ルール</DialogTitle>
                      <DialogDescription>レート制限ルールを設定します</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>ルール名</Label>
                        <Input
                          value={newRule.name}
                          onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                          placeholder="例：API制限"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>ターゲット</Label>
                          <Select
                            value={newRule.target}
                            onValueChange={(v) => setNewRule({ ...newRule, target: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GLOBAL">グローバル</SelectItem>
                              <SelectItem value="ORGANIZATION">組織</SelectItem>
                              <SelectItem value="API_KEY">APIキー</SelectItem>
                              <SelectItem value="IP_ADDRESS">IPアドレス</SelectItem>
                              <SelectItem value="ENDPOINT">エンドポイント</SelectItem>
                              <SelectItem value="USER">ユーザー</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>アクション</Label>
                          <Select
                            value={newRule.action}
                            onValueChange={(v) => setNewRule({ ...newRule, action: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="REJECT">拒否</SelectItem>
                              <SelectItem value="THROTTLE">スロットル</SelectItem>
                              <SelectItem value="QUEUE">キュー</SelectItem>
                              <SelectItem value="LOG_ONLY">ログのみ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>制限回数</Label>
                          <Input
                            type="number"
                            value={newRule.limit}
                            onChange={(e) => setNewRule({ ...newRule, limit: parseInt(e.target.value) })}
                            min={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>ウィンドウ（秒）</Label>
                          <Input
                            type="number"
                            value={newRule.windowSeconds}
                            onChange={(e) => setNewRule({ ...newRule, windowSeconds: parseInt(e.target.value) })}
                            min={1}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={handleCreateRule}>作成</Button>
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
                    <TableHead>ターゲット</TableHead>
                    <TableHead>制限</TableHead>
                    <TableHead>アクション</TableHead>
                    <TableHead>現在のカウント</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.target}</Badge>
                        {rule.targetValue && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({rule.targetValue})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {rule.limit.toLocaleString()} / {formatWindowSeconds(rule.windowSeconds)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          rule.action === 'REJECT' ? 'bg-red-100 text-red-800' :
                          rule.action === 'THROTTLE' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {rule.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{rule.currentCount.toLocaleString()}</span>
                          <Progress
                            value={(rule.currentCount / rule.limit) * 100}
                            className="w-20 h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleRule(rule.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetRule(rule.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        ルールがありません。「デフォルト設定」をクリックしてください。
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 使用状況 */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API使用状況トレンド</CardTitle>
              <CardDescription>過去7日間のリクエスト数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.trend.map((day, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-24 text-sm">
                      {new Date(day.date).toLocaleDateString('ja-JP', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    <div className="flex-1">
                      <Progress
                        value={(day._sum.totalRequests / Math.max(...stats.trend.map(t => t._sum.totalRequests))) * 100}
                        className="h-6"
                      />
                    </div>
                    <span className="w-20 text-right text-sm">
                      {day._sum.totalRequests.toLocaleString()}
                    </span>
                  </div>
                ))}
                {(!stats?.trend || stats.trend.length === 0) && (
                  <p className="text-center py-8 text-muted-foreground">
                    使用状況データがありません
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

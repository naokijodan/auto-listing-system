// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  Play,
  Pause,
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  Shield,
  AlertOctagon,
  CheckCircle,
  XCircle,
  History,
  TestTube,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface AutomationStats {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  todayExecutions: number;
}

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: string;
  triggerConfig: Record<string, any>;
  conditions: any[];
  action: string;
  actionConfig: Record<string, any>;
  scheduleType: string;
  cronExpression?: string;
  isActive: boolean;
  requiresConfirmation: boolean;
  maxExecutionsPerDay?: number;
  cooldownMinutes: number;
  lastExecutedAt?: string;
  executionCount: number;
  successCount: number;
  failureCount: number;
  _count?: { executions: number };
}

interface AutomationExecution {
  id: string;
  status: string;
  triggeredBy: string;
  triggerReason?: string;
  targetCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  isDryRun: boolean;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  rule?: { name: string; action: string; trigger: string };
}

interface SafetySettings {
  maxDailyEndListings: number;
  maxDailyPriceChanges: number;
  maxDailyRelists: number;
  requireConfirmationAbove?: number;
  minListingAge: number;
  protectHighValue: boolean;
  highValueThreshold: number;
  allowWeekendExecution: boolean;
  allowedHoursStart: number;
  allowedHoursEnd: number;
  emergencyStopEnabled: boolean;
}

export default function AutomationRulesPage() {
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);
  const [safetySettings, setSafetySettings] = useState<SafetySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger: 'LOW_PERFORMANCE',
    action: 'NOTIFY',
    scheduleType: 'DAILY',
    requiresConfirmation: true,
    maxExecutionsPerDay: 100,
    cooldownMinutes: 60,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, rulesRes, executionsRes, safetyRes] = await Promise.all([
        fetch(`${API_BASE}/automation-rules/stats`),
        fetch(`${API_BASE}/automation-rules/rules`),
        fetch(`${API_BASE}/automation-rules/executions?limit=20`),
        fetch(`${API_BASE}/automation-rules/safety-settings`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (executionsRes.ok) {
        const data = await executionsRes.json();
        setExecutions(data.executions || []);
      }
      if (safetyRes.ok) setSafetySettings(await safetyRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    try {
      const res = await fetch(`${API_BASE}/automation-rules/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      if (res.ok) {
        setIsRuleDialogOpen(false);
        setNewRule({
          name: '',
          description: '',
          trigger: 'LOW_PERFORMANCE',
          action: 'NOTIFY',
          scheduleType: 'DAILY',
          requiresConfirmation: true,
          maxExecutionsPerDay: 100,
          cooldownMinutes: 60,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const toggleRule = async (id: string) => {
    try {
      await fetch(`${API_BASE}/automation-rules/rules/${id}/toggle`, {
        method: 'PATCH',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('このルールを削除しますか？')) return;
    try {
      await fetch(`${API_BASE}/automation-rules/rules/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const testRule = async (rule: AutomationRule) => {
    setSelectedRule(rule);
    setIsTestDialogOpen(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_BASE}/automation-rules/rules/${rule.id}/test`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (error) {
      console.error('Failed to test rule:', error);
    }
  };

  const executeRule = async (id: string) => {
    if (!confirm('このルールを実行しますか？')) return;
    try {
      await fetch(`${API_BASE}/automation-rules/rules/${id}/execute`, {
        method: 'POST',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to execute rule:', error);
    }
  };

  const toggleEmergencyStop = async (enable: boolean) => {
    if (enable && !confirm('緊急停止を有効にすると、全ての自動化ルールが無効になります。続行しますか？')) {
      return;
    }
    try {
      await fetch(`${API_BASE}/automation-rules/emergency-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle emergency stop:', error);
    }
  };

  const updateSafetySettings = async (settings: Partial<SafetySettings>) => {
    try {
      await fetch(`${API_BASE}/automation-rules/safety-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update safety settings:', error);
    }
  };

  const getTriggerName = (trigger: string) => {
    const names: Record<string, string> = {
      SCHEDULE: '定期実行',
      LOW_PERFORMANCE: '低パフォーマンス',
      DAYS_LISTED: '出品日数',
      NO_VIEWS: '閲覧なし',
      NO_WATCHERS: 'ウォッチなし',
      PRICE_CHANGE: '価格変動',
      MANUAL: '手動',
    };
    return names[trigger] || trigger;
  };

  const getActionName = (action: string) => {
    const names: Record<string, string> = {
      END_LISTING: '出品終了',
      DELIST: '非公開',
      RELIST: '再出品',
      PRICE_REDUCE: '値下げ',
      PRICE_INCREASE: '値上げ',
      APPLY_SUGGESTION: '提案適用',
      NOTIFY: '通知',
      TAG: 'タグ付け',
    };
    return names[action] || action;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDING: { variant: 'outline', label: '待機中' },
      RUNNING: { variant: 'secondary', label: '実行中' },
      COMPLETED: { variant: 'default', label: '完了' },
      FAILED: { variant: 'destructive', label: '失敗' },
      CANCELLED: { variant: 'outline', label: 'キャンセル' },
      DRY_RUN_COMPLETED: { variant: 'secondary', label: 'テスト完了' },
    };
    const { variant, label } = config[status] || { variant: 'outline', label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">自動アクション設定</h1>
          <p className="text-muted-foreground">出品の自動管理ルールを設定</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                ルール作成
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>自動化ルール作成</DialogTitle>
                <DialogDescription>新しい自動アクションルールを作成します</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>ルール名</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="30日経過で自動値下げ"
                  />
                </div>
                <div>
                  <Label>トリガー</Label>
                  <Select
                    value={newRule.trigger}
                    onValueChange={(v) => setNewRule({ ...newRule, trigger: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW_PERFORMANCE">低パフォーマンス</SelectItem>
                      <SelectItem value="DAYS_LISTED">出品日数経過</SelectItem>
                      <SelectItem value="NO_VIEWS">閲覧なし</SelectItem>
                      <SelectItem value="NO_WATCHERS">ウォッチなし</SelectItem>
                      <SelectItem value="SCHEDULE">定期スケジュール</SelectItem>
                      <SelectItem value="MANUAL">手動実行のみ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>アクション</Label>
                  <Select
                    value={newRule.action}
                    onValueChange={(v) => setNewRule({ ...newRule, action: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOTIFY">通知のみ</SelectItem>
                      <SelectItem value="PRICE_REDUCE">値下げ</SelectItem>
                      <SelectItem value="APPLY_SUGGESTION">改善提案適用</SelectItem>
                      <SelectItem value="DELIST">非公開化</SelectItem>
                      <SelectItem value="RELIST">再出品</SelectItem>
                      <SelectItem value="END_LISTING">出品終了</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>スケジュール</Label>
                  <Select
                    value={newRule.scheduleType}
                    onValueChange={(v) => setNewRule({ ...newRule, scheduleType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">手動</SelectItem>
                      <SelectItem value="HOURLY">毎時</SelectItem>
                      <SelectItem value="DAILY">毎日</SelectItem>
                      <SelectItem value="WEEKLY">毎週</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>日次上限</Label>
                  <Input
                    type="number"
                    value={newRule.maxExecutionsPerDay}
                    onChange={(e) =>
                      setNewRule({ ...newRule, maxExecutionsPerDay: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="col-span-2 flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRule.requiresConfirmation}
                      onCheckedChange={(v) =>
                        setNewRule({ ...newRule, requiresConfirmation: v })
                      }
                    />
                    <Label>実行前に確認を要求</Label>
                  </div>
                </div>
                <div className="col-span-2">
                  <Label>説明</Label>
                  <Textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="ルールの説明"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={createRule}>作成</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 緊急停止アラート */}
      {safetySettings?.emergencyStopEnabled && (
        <Alert variant="destructive">
          <AlertOctagon className="h-4 w-4" />
          <AlertTitle>緊急停止が有効です</AlertTitle>
          <AlertDescription>
            全ての自動化ルールが無効化されています。
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => toggleEmergencyStop(false)}
            >
              解除する
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ルール数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRules || 0}</div>
            <p className="text-xs text-muted-foreground">有効: {stats?.activeRules || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日の実行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.todayExecutions || 0}</div>
            <p className="text-xs text-muted-foreground">累計: {stats?.totalExecutions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">成功</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.successfulExecutions || 0}
            </div>
            <p className="text-xs text-muted-foreground">成功率: {stats?.successRate || 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">失敗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failedExecutions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">安全設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safetySettings?.emergencyStopEnabled ? (
                <span className="text-red-600">停止中</span>
              ) : (
                <span className="text-green-600">正常</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">
            <Zap className="h-4 w-4 mr-2" />
            ルール
          </TabsTrigger>
          <TabsTrigger value="executions">
            <History className="h-4 w-4 mr-2" />
            実行履歴
          </TabsTrigger>
          <TabsTrigger value="safety">
            <Shield className="h-4 w-4 mr-2" />
            安全設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>自動化ルール</CardTitle>
              <CardDescription>出品の自動管理ルール一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    ルールがありません
                  </p>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        rule.isActive ? 'border-green-200 bg-green-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Zap className={`h-8 w-8 ${rule.isActive ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{getTriggerName(rule.trigger)}</Badge>
                            <span>→</span>
                            <Badge variant="secondary">{getActionName(rule.action)}</Badge>
                            <span>（{rule.scheduleType}）</span>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground">
                          <div>実行: {rule.executionCount}回</div>
                          <div>成功: {rule.successCount}回</div>
                        </div>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
                        <Button variant="outline" size="sm" onClick={() => testRule(rule)}>
                          <TestTube className="h-4 w-4 mr-1" />
                          テスト
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => executeRule(rule.id)}
                          disabled={!rule.isActive}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          実行
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* テスト結果ダイアログ */}
          <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>テスト実行結果（ドライラン）</DialogTitle>
                <DialogDescription>
                  {selectedRule?.name}のテスト結果
                </DialogDescription>
              </DialogHeader>
              {testResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span>テスト完了</span>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm">
                      <p>対象出品数: {testResult.affectedListings}件</p>
                      <p>アクション: {getActionName(selectedRule?.action || '')}</p>
                    </div>
                  </div>
                  {testResult.results && testResult.results.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">対象出品</h4>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {testResult.results.slice(0, 5).map((result: any, i: number) => (
                          <div key={i} className="text-sm p-2 bg-muted rounded">
                            {result.title}
                          </div>
                        ))}
                        {testResult.results.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            他 {testResult.results.length - 5}件
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setIsTestDialogOpen(false)}>閉じる</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>実行履歴</CardTitle>
              <CardDescription>自動化ルールの実行履歴</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {executions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    実行履歴がありません
                  </p>
                ) : (
                  executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <History className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{execution.rule?.name || 'Unknown'}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              {execution.successCount}/{execution.targetCount} 成功
                            </span>
                            {execution.isDryRun && <Badge variant="outline">テスト</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(execution.status)}
                        <span className="text-sm text-muted-foreground">
                          {execution.completedAt
                            ? new Date(execution.completedAt).toLocaleString('ja-JP')
                            : '実行中...'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>安全設定</CardTitle>
              <CardDescription>自動化の安全ガードを設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 緊急停止 */}
              <div className="p-4 border rounded-lg bg-red-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-medium">緊急停止</h4>
                      <p className="text-sm text-muted-foreground">
                        全ての自動化ルールを即座に無効化
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={safetySettings?.emergencyStopEnabled ? 'outline' : 'destructive'}
                    onClick={() => toggleEmergencyStop(!safetySettings?.emergencyStopEnabled)}
                  >
                    {safetySettings?.emergencyStopEnabled ? '解除' : '緊急停止'}
                  </Button>
                </div>
              </div>

              {/* 日次上限 */}
              <div>
                <h4 className="font-medium mb-4">日次実行上限</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>出品終了</Label>
                    <Input
                      type="number"
                      value={safetySettings?.maxDailyEndListings || 50}
                      onChange={(e) =>
                        updateSafetySettings({ maxDailyEndListings: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>価格変更</Label>
                    <Input
                      type="number"
                      value={safetySettings?.maxDailyPriceChanges || 100}
                      onChange={(e) =>
                        updateSafetySettings({ maxDailyPriceChanges: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>再出品</Label>
                    <Input
                      type="number"
                      value={safetySettings?.maxDailyRelists || 50}
                      onChange={(e) =>
                        updateSafetySettings({ maxDailyRelists: parseInt(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* 保護設定 */}
              <div>
                <h4 className="font-medium mb-4">保護設定</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>高額商品を保護</Label>
                      <p className="text-sm text-muted-foreground">
                        閾値以上の商品は自動アクション対象外
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        className="w-24"
                        value={safetySettings?.highValueThreshold || 500}
                        onChange={(e) =>
                          updateSafetySettings({ highValueThreshold: parseFloat(e.target.value) })
                        }
                      />
                      <span>USD</span>
                      <Switch
                        checked={safetySettings?.protectHighValue || false}
                        onCheckedChange={(v) => updateSafetySettings({ protectHighValue: v })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>最低出品日数</Label>
                      <p className="text-sm text-muted-foreground">
                        この日数未満の出品は対象外
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        className="w-24"
                        value={safetySettings?.minListingAge || 7}
                        onChange={(e) =>
                          updateSafetySettings({ minListingAge: parseInt(e.target.value) })
                        }
                      />
                      <span>日</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>週末の実行</Label>
                      <p className="text-sm text-muted-foreground">
                        土日の自動実行を許可
                      </p>
                    </div>
                    <Switch
                      checked={safetySettings?.allowWeekendExecution || false}
                      onCheckedChange={(v) => updateSafetySettings({ allowWeekendExecution: v })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

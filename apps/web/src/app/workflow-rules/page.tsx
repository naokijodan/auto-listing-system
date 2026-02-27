// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { fetcher } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  GitBranch,
  Play,
  Pause,
  Plus,
  Trash2,
  Settings,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  History,
} from 'lucide-react';

interface WorkflowRule {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: number;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  conditions: unknown[];
  actions: unknown[];
  cronExpression: string | null;
  maxExecutionsPerDay: number | null;
  cooldownMinutes: number | null;
  executionCount: number;
  lastExecutedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowExecution {
  id: string;
  ruleId: string;
  rule: { name: string };
  triggerType: string;
  entityType: string | null;
  entityId: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  actionResults: unknown[];
  error: string | null;
  createdAt: string;
}

interface TriggerType {
  value: string;
  label: string;
  labelEn: string;
  category: string;
}

interface ActionType {
  value: string;
  label: string;
  labelEn: string;
  description: string;
}

interface WorkflowStats {
  totalRules: number;
  activeRules: number;
  inactiveRules: number;
  recentExecutions: number;
  failedExecutions: number;
  successRate: string;
  byTriggerType: Array<{ triggerType: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export default function WorkflowRulesPage() {
  const { t, locale } = useTranslation();
  const [selectedTrigger, setSelectedTrigger] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    triggerType: '',
    priority: 0,
    actions: [] as Array<{ type: string; config: Record<string, string> }>,
  });

  // データ取得
  const { data: statsData, mutate: mutateStats } = useSWR<{ success: boolean; data: WorkflowStats }>(
    '/api/workflow-rules/stats',
    fetcher
  );
  const stats = statsData?.data;

  const { data: rulesData, mutate: mutateRules } = useSWR<{ success: boolean; data: { rules: WorkflowRule[]; total: number } }>(
    `/api/workflow-rules${selectedTrigger ? `?triggerType=${selectedTrigger}` : ''}`,
    fetcher
  );
  const rules = rulesData?.data?.rules || [];

  const { data: executionsData, mutate: mutateExecutions } = useSWR<{ success: boolean; data: { executions: WorkflowExecution[]; total: number } }>(
    '/api/workflow-rules/executions/list?limit=20',
    fetcher
  );
  const executions = executionsData?.data?.executions || [];

  const { data: triggerTypesData } = useSWR<{ success: boolean; data: TriggerType[] }>(
    '/api/workflow-rules/trigger-types',
    fetcher
  );
  const triggerTypes = triggerTypesData?.data || [];

  const { data: actionTypesData } = useSWR<{ success: boolean; data: ActionType[] }>(
    '/api/workflow-rules/action-types',
    fetcher
  );
  const actionTypes = actionTypesData?.data || [];

  // ルールの有効/無効切り替え
  const handleToggleRule = async (ruleId: string) => {
    try {
      await fetch(`/api/workflow-rules/${ruleId}/toggle`, { method: 'PATCH' });
      mutateRules();
      mutateStats();
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  // ルールの削除
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('このルールを削除しますか？実行履歴も削除されます。')) return;
    try {
      await fetch(`/api/workflow-rules/${ruleId}`, { method: 'DELETE' });
      mutateRules();
      mutateStats();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  // ルールの手動実行
  const handleTriggerRule = async (rule: WorkflowRule) => {
    try {
      await fetch('/api/workflow-rules/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          triggerType: rule.triggerType,
          data: { manual: true, ruleId: rule.id },
        }),
      });
      mutateRules();
      mutateStats();
      mutateExecutions();
    } catch (error) {
      console.error('Error triggering rule:', error);
    }
  };

  // 新規ルール作成
  const handleCreateRule = async () => {
    if (!newRule.name || !newRule.triggerType || newRule.actions.length === 0) {
      alert('名前、トリガータイプ、アクションは必須です');
      return;
    }
    try {
      await fetch('/api/workflow-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      setIsCreateDialogOpen(false);
      setNewRule({ name: '', description: '', triggerType: '', priority: 0, actions: [] });
      mutateRules();
      mutateStats();
    } catch (error) {
      console.error('Error creating rule:', error);
    }
  };

  // デフォルトルールをセットアップ
  const handleSetupDefaults = async () => {
    try {
      await fetch('/api/workflow-rules/setup-defaults', { method: 'POST' });
      mutateRules();
      mutateStats();
    } catch (error) {
      console.error('Error setting up defaults:', error);
    }
  };

  // アクションを追加
  const addAction = () => {
    setNewRule({
      ...newRule,
      actions: [...newRule.actions, { type: '', config: {} }],
    });
  };

  // アクションを削除
  const removeAction = (index: number) => {
    setNewRule({
      ...newRule,
      actions: newRule.actions.filter((_, i) => i !== index),
    });
  };

  // アクションを更新
  const updateAction = (index: number, field: string, value: string) => {
    const updatedActions = [...newRule.actions];
    if (field === 'type') {
      updatedActions[index] = { type: value, config: {} };
    } else {
      updatedActions[index] = {
        ...updatedActions[index],
        config: { ...updatedActions[index].config, [field]: value },
      };
    }
    setNewRule({ ...newRule, actions: updatedActions });
  };

  // ステータスバッジを取得
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="mr-1 h-3 w-3" />完了</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="mr-1 h-3 w-3" />失敗</Badge>;
      case 'RUNNING':
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="mr-1 h-3 w-3 animate-spin" />実行中</Badge>;
      case 'SKIPPED':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="mr-1 h-3 w-3" />スキップ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // トリガータイプのラベルを取得
  const getTriggerLabel = (triggerType: string) => {
    const type = triggerTypes.find(t => t.value === triggerType);
    if (!type) return triggerType;
    return locale === 'ja' ? type.label : type.labelEn;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ワークフロー自動化</h1>
          <p className="text-sm text-zinc-500">イベント駆動型のワークフロールールを管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSetupDefaults}>
            <Settings className="mr-2 h-4 w-4" />
            デフォルト設定
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                ルール追加
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>新規ワークフロールール</DialogTitle>
                <DialogDescription>
                  イベント発生時に自動実行されるルールを作成します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">ルール名</label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="例: 新規注文通知"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">説明</label>
                  <Textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    placeholder="このルールの説明"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">トリガータイプ</label>
                  <Select
                    value={newRule.triggerType}
                    onValueChange={(value) => setNewRule({ ...newRule, triggerType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="トリガーを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {locale === 'ja' ? type.label : type.labelEn}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">優先度</label>
                  <Input
                    type="number"
                    value={newRule.priority}
                    onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">アクション</label>
                    <Button variant="outline" size="sm" onClick={addAction}>
                      <Plus className="mr-1 h-3 w-3" />
                      追加
                    </Button>
                  </div>
                  {newRule.actions.map((action, index) => (
                    <div key={index} className="flex gap-2 mb-2 p-3 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Select
                          value={action.type}
                          onValueChange={(value) => updateAction(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="アクションタイプ" />
                          </SelectTrigger>
                          <SelectContent>
                            {actionTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {locale === 'ja' ? type.label : type.labelEn}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {action.type === 'SEND_NOTIFICATION' && (
                          <>
                            <Input
                              placeholder="タイトル"
                              value={action.config.title || ''}
                              onChange={(e) => updateAction(index, 'title', e.target.value)}
                            />
                            <Textarea
                              placeholder="メッセージ（{{変数}}使用可）"
                              value={action.config.message || ''}
                              onChange={(e) => updateAction(index, 'message', e.target.value)}
                            />
                          </>
                        )}
                        {action.type === 'SEND_SLACK' && (
                          <Textarea
                            placeholder="メッセージ（{{変数}}使用可）"
                            value={action.config.message || ''}
                            onChange={(e) => updateAction(index, 'message', e.target.value)}
                          />
                        )}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeAction(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleCreateRule}>作成</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総ルール数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats?.totalRules || 0}</span>
            </div>
            <p className="text-xs text-zinc-500">
              アクティブ: {stats?.activeRules || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">24時間の実行</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats?.recentExecutions || 0}</span>
            </div>
            <p className="text-xs text-zinc-500">
              成功率: {stats?.successRate || '100'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">失敗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats?.failedExecutions || 0}</span>
            </div>
            <p className="text-xs text-zinc-500">24時間以内</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">非アクティブ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-gray-500" />
              <span className="text-2xl font-bold">{stats?.inactiveRules || 0}</span>
            </div>
            <p className="text-xs text-zinc-500">無効なルール</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">ルール管理</TabsTrigger>
          <TabsTrigger value="executions">実行履歴</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ワークフロールール</CardTitle>
                  <CardDescription>
                    イベント発生時に自動実行されるルールを管理
                  </CardDescription>
                </div>
                <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="トリガーでフィルター" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">すべて</SelectItem>
                    {triggerTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {locale === 'ja' ? type.label : type.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {rules.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <GitBranch className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>ワークフロールールがありません</p>
                  <p className="text-sm mt-2">「デフォルト設定」でサンプルルールを追加できます</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => handleToggleRule(rule.id)}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{rule.name}</span>
                            <Badge variant="outline">
                              {getTriggerLabel(rule.triggerType)}
                            </Badge>
                            {rule.priority > 0 && (
                              <Badge variant="secondary">優先度: {rule.priority}</Badge>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-zinc-500">{rule.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
                            <span>実行回数: {rule.executionCount}</span>
                            {rule.lastExecutedAt && (
                              <span>
                                最終実行: {new Date(rule.lastExecutedAt).toLocaleString('ja-JP')}
                              </span>
                            )}
                            {rule.lastError && (
                              <span className="text-red-500">エラーあり</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTriggerRule(rule)}
                          disabled={!rule.isActive}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>実行履歴</CardTitle>
              <CardDescription>
                ワークフローの実行履歴を確認
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <History className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>実行履歴がありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusBadge(execution.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{execution.rule?.name || 'Unknown'}</span>
                            <Badge variant="outline">
                              {getTriggerLabel(execution.triggerType)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-zinc-400">
                            <span>
                              {new Date(execution.createdAt).toLocaleString('ja-JP')}
                            </span>
                            {execution.duration && (
                              <span>{execution.duration}ms</span>
                            )}
                            {execution.entityType && (
                              <span>
                                {execution.entityType}: {execution.entityId}
                              </span>
                            )}
                          </div>
                          {execution.error && (
                            <p className="text-xs text-red-500 mt-1">{execution.error}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

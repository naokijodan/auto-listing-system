
'use client';

/**
 * eBayメッセージ自動応答ページ
 * Phase 125: AI自動応答、ルール管理、応答分析
 */

import { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Bot,
  Zap,
  Clock,
  Settings,
  Play,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Sparkles,
  BarChart3,
  Mail,
  Send,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function EbayAutoMessagesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState<any>(null);

  const [ruleForm, setRuleForm] = useState({
    name: '',
    trigger: 'NEW_MESSAGE',
    responseMode: 'TEMPLATE',
    templateId: '',
    aiPrompt: '',
    priority: 'MEDIUM',
    enabled: true,
  });

  const [generateForm, setGenerateForm] = useState({
    messageContent: '',
    messageSubject: '',
    buyerName: '',
    tone: 'professional',
    language: 'en',
  });

  const { data: dashboard } = useSWR(`${API_BASE}/ebay-auto-messages/dashboard`, fetcher);
  const { data: triggers } = useSWR(`${API_BASE}/ebay-auto-messages/triggers`, fetcher);
  const { data: modes } = useSWR(`${API_BASE}/ebay-auto-messages/modes`, fetcher);
  const { data: templates } = useSWR(`${API_BASE}/ebay-auto-messages/templates`, fetcher);
  const { data: rules } = useSWR(`${API_BASE}/ebay-auto-messages/rules`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-auto-messages/stats`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay-auto-messages/settings`, fetcher);

  const handleCreateRule = async () => {
    try {
      const res = await fetch(`${API_BASE}/ebay-auto-messages/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleForm),
      });
      if (res.ok) {
        setRuleDialogOpen(false);
        setRuleForm({
          name: '',
          trigger: 'NEW_MESSAGE',
          responseMode: 'TEMPLATE',
          templateId: '',
          aiPrompt: '',
          priority: 'MEDIUM',
          enabled: true,
        });
      }
    } catch (error) {
      console.error('Create rule failed:', error);
    }
  };

  const handleGenerateResponse = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-auto-messages/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateForm),
      });
      const data = await res.json();
      setGeneratedResponse(data);
    } catch (error) {
      console.error('Generate response failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'TEMPLATE':
        return <Mail className="h-4 w-4" />;
      case 'AI_GENERATED':
        return <Sparkles className="h-4 w-4" />;
      case 'HYBRID':
        return <Zap className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8" />
            自動応答
          </h1>
          <p className="text-muted-foreground">
            AI・テンプレートによるメッセージ自動応答
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGenerateDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            AI生成テスト
          </Button>
          <Button onClick={() => setRuleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            ルール作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="rules">ルール管理</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">有効ルール</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.enabledRules || 0}</div>
                <p className="text-xs text-muted-foreground">
                  / {dashboard?.stats?.totalRules || 0} ルール
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">自動応答率</CardTitle>
                <Bot className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.autoResponseRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  過去7日間
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">自動応答数</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.autoRespondedCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  過去7日間
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均応答時間</CardTitle>
                <Clock className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.avgResponseTimeMinutes || 0}分</div>
                <p className="text-xs text-muted-foreground">
                  自動応答含む
                </p>
              </CardContent>
            </Card>
          </div>

          {/* トリガー別統計 */}
          {dashboard?.triggerStats?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>トリガー別統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.triggerStats.map((stat: any) => (
                    <div key={stat.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{stat.name}</Badge>
                        <span className="text-sm text-muted-foreground">{stat.description}</span>
                      </div>
                      <div className="font-medium">{stat.count}件</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 有効なルール */}
          <Card>
            <CardHeader>
              <CardTitle>有効なルール</CardTitle>
              <CardDescription>現在アクティブな自動応答ルール</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard?.rules?.map((rule: any) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getModeIcon(rule.responseMode)}
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {triggers?.triggers?.find((t: any) => t.type === rule.trigger)?.name || rule.trigger}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(rule.priority)}>{rule.priority}</Badge>
                      <span className="text-sm text-muted-foreground">
                        成功率: {rule.stats?.triggered > 0
                          ? ((rule.stats.successful / rule.stats.triggered) * 100).toFixed(0)
                          : 0}%
                      </span>
                    </div>
                  </div>
                ))}
                {(!dashboard?.rules || dashboard.rules.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    有効なルールがありません
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ルール管理 */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>自動応答ルール</CardTitle>
              <CardDescription>メッセージに対する自動応答ルールを管理</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ルール名</TableHead>
                    <TableHead>トリガー</TableHead>
                    <TableHead>モード</TableHead>
                    <TableHead>優先度</TableHead>
                    <TableHead>統計</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules?.rules?.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {triggers?.triggers?.find((t: any) => t.type === rule.trigger)?.name || rule.trigger}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getModeIcon(rule.responseMode)}
                          <span>{modes?.modes?.find((m: any) => m.mode === rule.responseMode)?.name || rule.responseMode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(rule.priority)}>{rule.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>トリガー: {rule.stats?.triggered || 0}</div>
                          <div className="text-muted-foreground">
                            成功: {rule.stats?.successful || 0} / 失敗: {rule.stats?.failed || 0}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={rule.enabled} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* テンプレート */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>応答テンプレート</CardTitle>
              <CardDescription>自動応答で使用するテンプレート</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {templates?.templates?.map((template: any) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge variant="outline">
                          {triggers?.triggers?.find((t: any) => t.type === template.trigger)?.name || template.trigger}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <div className="text-sm font-medium">件名:</div>
                          <div className="text-sm text-muted-foreground">{template.subject}</div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">本文:</div>
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            {template.body}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium">変数:</div>
                          <div className="flex flex-wrap gap-1">
                            {template.variables?.slice(0, 5).map((v: string) => (
                              <Badge key={v} variant="secondary" className="text-xs">
                                {`{${v}}`}
                              </Badge>
                            ))}
                            {template.variables?.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.variables.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析 */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">総メッセージ数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview?.totalMessages || 0}</div>
                <p className="text-xs text-muted-foreground">過去30日間</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">自動応答平均時間</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview?.avgAutoResponseTime || 0}分</div>
                <p className="text-xs text-muted-foreground">手動: {stats?.overview?.avgManualResponseTime || 0}分</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">自動応答数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.overview?.autoResponded || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.overview?.totalMessages > 0
                    ? ((stats.overview.autoResponded / stats.overview.totalMessages) * 100).toFixed(1)
                    : 0}% の応答を自動化
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 応答時間分布 */}
          <Card>
            <CardHeader>
              <CardTitle>応答時間分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.responseTimeDistribution && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>5分未満</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(stats.responseTimeDistribution.under5min / stats.overview.totalMessages) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.responseTimeDistribution.under5min}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>5-15分</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500"
                            style={{
                              width: `${(stats.responseTimeDistribution.under15min / stats.overview.totalMessages) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.responseTimeDistribution.under15min}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>15分-1時間</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500"
                            style={{
                              width: `${(stats.responseTimeDistribution.under1hour / stats.overview.totalMessages) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.responseTimeDistribution.under1hour}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>1-24時間</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{
                              width: `${(stats.responseTimeDistribution.under24hours / stats.overview.totalMessages) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.responseTimeDistribution.under24hours}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>24時間以上</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500"
                            style={{
                              width: `${(stats.responseTimeDistribution.over24hours / stats.overview.totalMessages) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium">{stats.responseTimeDistribution.over24hours}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>自動応答設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">自動応答を有効化</div>
                  <div className="text-sm text-muted-foreground">
                    メッセージを受信したときに自動的に応答します
                  </div>
                </div>
                <Switch checked={settings?.autoResponseEnabled} />
              </div>

              <div className="space-y-2">
                <Label>デフォルト応答モード</Label>
                <Select defaultValue={settings?.defaultResponseMode || 'HYBRID'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modes?.modes?.map((mode: any) => (
                      <SelectItem key={mode.mode} value={mode.mode}>
                        {mode.name} - {mode.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>1日あたりの最大自動応答数</Label>
                <Input
                  type="number"
                  defaultValue={settings?.maxDailyAutoResponses || 100}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">営業時間設定</h3>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-medium">営業時間外は自動応答</div>
                    <div className="text-sm text-muted-foreground">
                      営業時間外のメッセージに自動応答テンプレートを使用
                    </div>
                  </div>
                  <Switch checked={settings?.businessHours?.enabled} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>開始時刻</Label>
                    <Input type="time" defaultValue={settings?.businessHours?.start || '09:00'} />
                  </div>
                  <div className="space-y-2">
                    <Label>終了時刻</Label>
                    <Input type="time" defaultValue={settings?.businessHours?.end || '18:00'} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">AI設定</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label>デフォルトトーン</Label>
                    <Select defaultValue={settings?.aiSettings?.defaultTone || 'professional'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">プロフェッショナル</SelectItem>
                        <SelectItem value="friendly">フレンドリー</SelectItem>
                        <SelectItem value="formal">フォーマル</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>デフォルト言語</Label>
                    <Select defaultValue={settings?.aiSettings?.defaultLanguage || 'en'}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ja">日本語</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button>設定を保存</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ルール作成ダイアログ */}
      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>自動応答ルール作成</DialogTitle>
            <DialogDescription>
              メッセージに対する自動応答ルールを設定します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ルール名</Label>
              <Input
                value={ruleForm.name}
                onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder="例: 配送問い合わせ自動応答"
              />
            </div>

            <div className="space-y-2">
              <Label>トリガー</Label>
              <Select
                value={ruleForm.trigger}
                onValueChange={value => setRuleForm({ ...ruleForm, trigger: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {triggers?.triggers?.map((t: any) => (
                    <SelectItem key={t.type} value={t.type}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>応答モード</Label>
              <Select
                value={ruleForm.responseMode}
                onValueChange={value => setRuleForm({ ...ruleForm, responseMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modes?.modes?.map((m: any) => (
                    <SelectItem key={m.mode} value={m.mode}>
                      {m.name} - {m.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {ruleForm.responseMode === 'TEMPLATE' && (
              <div className="space-y-2">
                <Label>テンプレート</Label>
                <Select
                  value={ruleForm.templateId}
                  onValueChange={value => setRuleForm({ ...ruleForm, templateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="テンプレートを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.templates?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(ruleForm.responseMode === 'AI_GENERATED' || ruleForm.responseMode === 'HYBRID') && (
              <div className="space-y-2">
                <Label>AIプロンプト</Label>
                <Textarea
                  value={ruleForm.aiPrompt}
                  onChange={e => setRuleForm({ ...ruleForm, aiPrompt: e.target.value })}
                  placeholder="AIへの指示を入力..."
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>優先度</Label>
              <Select
                value={ruleForm.priority}
                onValueChange={value => setRuleForm({ ...ruleForm, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">低</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="HIGH">高</SelectItem>
                  <SelectItem value="URGENT">緊急</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={ruleForm.enabled}
                onCheckedChange={checked => setRuleForm({ ...ruleForm, enabled: checked })}
              />
              <Label>作成時に有効化</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreateRule}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI生成テストダイアログ */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI応答生成テスト</DialogTitle>
            <DialogDescription>
              メッセージを入力してAI応答を生成します
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>バイヤー名</Label>
                <Input
                  value={generateForm.buyerName}
                  onChange={e => setGenerateForm({ ...generateForm, buyerName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>件名</Label>
                <Input
                  value={generateForm.messageSubject}
                  onChange={e => setGenerateForm({ ...generateForm, messageSubject: e.target.value })}
                  placeholder="Shipping inquiry"
                />
              </div>
              <div className="space-y-2">
                <Label>メッセージ内容</Label>
                <Textarea
                  value={generateForm.messageContent}
                  onChange={e => setGenerateForm({ ...generateForm, messageContent: e.target.value })}
                  placeholder="When will my order arrive?"
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>トーン</Label>
                  <Select
                    value={generateForm.tone}
                    onValueChange={value => setGenerateForm({ ...generateForm, tone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">プロフェッショナル</SelectItem>
                      <SelectItem value="friendly">フレンドリー</SelectItem>
                      <SelectItem value="formal">フォーマル</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>言語</Label>
                  <Select
                    value={generateForm.language}
                    onValueChange={value => setGenerateForm({ ...generateForm, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ja">日本語</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleGenerateResponse} disabled={isGenerating} className="w-full">
                {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Sparkles className="h-4 w-4 mr-2" />
                生成
              </Button>
            </div>
            <div className="space-y-4">
              <div className="font-medium">生成結果</div>
              {generatedResponse ? (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-1">件名:</div>
                    <div className="text-sm">{generatedResponse.response?.subject}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium mb-1">本文:</div>
                    <div className="text-sm whitespace-pre-wrap">{generatedResponse.response?.body}</div>
                  </div>
                  {generatedResponse.analysis && (
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm font-medium mb-2">分析結果:</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>インテント: {generatedResponse.analysis.detectedIntent}</div>
                        <div>優先度: {generatedResponse.analysis.suggestedPriority}</div>
                        <div>信頼度: {(generatedResponse.analysis.confidence * 100).toFixed(0)}%</div>
                        <div>トークン: {generatedResponse.tokensUsed}</div>
                      </div>
                    </div>
                  )}
                  <Button variant="outline" className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    この応答を送信
                  </Button>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground border rounded-lg">
                  メッセージを入力して生成してください
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

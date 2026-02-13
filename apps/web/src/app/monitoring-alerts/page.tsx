'use client';

import { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Plus,
  Settings,
  Send,
  Trash2,
  Eye,
  Volume2,
  VolumeX,
  AlertCircle,
  Info,
  Zap,
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface AlertStats {
  totalRules: number;
  activeRules: number;
  totalIncidents: number;
  openIncidents: number;
  acknowledgedIncidents: number;
  resolvedIncidents: number;
  criticalIncidents: number;
  incidentsLast24h: number;
  totalChannels: number;
  activeChannels: number;
}

interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metricName: string;
  condition: string;
  threshold: number;
  thresholdUnit?: string;
  windowMinutes: number;
  evaluationPeriods: number;
  severity: string;
  isActive: boolean;
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  _count?: { incidents: number; escalations: number };
}

interface AlertIncident {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metricValue?: number;
  threshold?: number;
  rootCause?: string;
  resolution?: string;
  rule?: { name: string; metricName: string };
  _count?: { notifications: number };
}

interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  channelType: string;
  configuration: Record<string, any>;
  isActive: boolean;
  isDefault: boolean;
  testStatus?: string;
  lastTestedAt?: string;
  lastErrorMessage?: string;
}

export default function MonitoringAlertsPage() {
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [incidents, setIncidents] = useState<AlertIncident[]>([]);
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<AlertIncident | null>(null);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    metricName: '',
    condition: 'GREATER_THAN',
    threshold: 80,
    thresholdUnit: '%',
    windowMinutes: 5,
    evaluationPeriods: 1,
    severity: 'WARNING',
    cooldownMinutes: 30,
  });

  const [newChannel, setNewChannel] = useState({
    name: '',
    description: '',
    channelType: 'EMAIL',
    configuration: {},
  });

  const [resolveData, setResolveData] = useState({
    rootCause: '',
    resolution: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, rulesRes, incidentsRes, channelsRes] = await Promise.all([
        fetch(`${API_BASE}/monitoring-alerts/stats`),
        fetch(`${API_BASE}/monitoring-alerts/rules`),
        fetch(`${API_BASE}/monitoring-alerts/incidents`),
        fetch(`${API_BASE}/monitoring-alerts/channels`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (rulesRes.ok) setRules(await rulesRes.json());
      if (incidentsRes.ok) {
        const data = await incidentsRes.json();
        setIncidents(data.incidents || []);
      }
      if (channelsRes.ok) setChannels(await channelsRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRule = async () => {
    try {
      const res = await fetch(`${API_BASE}/monitoring-alerts/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });

      if (res.ok) {
        setIsRuleDialogOpen(false);
        setNewRule({
          name: '',
          description: '',
          metricName: '',
          condition: 'GREATER_THAN',
          threshold: 80,
          thresholdUnit: '%',
          windowMinutes: 5,
          evaluationPeriods: 1,
          severity: 'WARNING',
          cooldownMinutes: 30,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    }
  };

  const toggleRule = async (id: string) => {
    try {
      await fetch(`${API_BASE}/monitoring-alerts/rules/${id}/toggle`, {
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
      await fetch(`${API_BASE}/monitoring-alerts/rules/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const acknowledgeIncident = async (id: string) => {
    try {
      await fetch(`${API_BASE}/monitoring-alerts/incidents/${id}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: 'user' }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to acknowledge incident:', error);
    }
  };

  const resolveIncident = async () => {
    if (!selectedIncident) return;
    try {
      await fetch(`${API_BASE}/monitoring-alerts/incidents/${selectedIncident.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolvedBy: 'user',
          ...resolveData,
        }),
      });
      setIsResolveDialogOpen(false);
      setSelectedIncident(null);
      setResolveData({ rootCause: '', resolution: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to resolve incident:', error);
    }
  };

  const createChannel = async () => {
    try {
      const res = await fetch(`${API_BASE}/monitoring-alerts/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel),
      });

      if (res.ok) {
        setIsChannelDialogOpen(false);
        setNewChannel({
          name: '',
          description: '',
          channelType: 'EMAIL',
          configuration: {},
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const testChannel = async (id: string) => {
    try {
      await fetch(`${API_BASE}/monitoring-alerts/channels/${id}/test`, {
        method: 'POST',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to test channel:', error);
    }
  };

  const sendTestAlert = async () => {
    try {
      await fetch(`${API_BASE}/monitoring-alerts/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severity: 'INFO' }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to send test alert:', error);
    }
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      CRITICAL: { variant: 'destructive', icon: XCircle },
      ERROR: { variant: 'destructive', icon: AlertCircle },
      WARNING: { variant: 'secondary', icon: AlertTriangle },
      INFO: { variant: 'outline', icon: Info },
    };
    const { variant, icon: Icon } = config[severity] || config.INFO;
    return (
      <Badge variant={variant}>
        <Icon className="h-3 w-3 mr-1" />
        {severity}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      OPEN: 'destructive',
      ACKNOWLEDGED: 'secondary',
      IN_PROGRESS: 'secondary',
      RESOLVED: 'default',
      CLOSED: 'outline',
      SUPPRESSED: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const getChannelIcon = (type: string) => {
    const icons: Record<string, any> = {
      EMAIL: '📧',
      SLACK: '💬',
      DISCORD: '🎮',
      WEBHOOK: '🔗',
      SMS: '📱',
      PAGERDUTY: '📟',
      OPSGENIE: '🔔',
      TEAMS: '👥',
    };
    return icons[type] || '📢';
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
          <h1 className="text-3xl font-bold">監視アラート</h1>
          <p className="text-muted-foreground">システム監視とアラート管理</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button variant="outline" onClick={sendTestAlert}>
            <Send className="h-4 w-4 mr-2" />
            テストアラート
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
                <DialogTitle>アラートルール作成</DialogTitle>
                <DialogDescription>新しい監視ルールを作成します</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ルール名</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="CPU使用率アラート"
                  />
                </div>
                <div>
                  <Label>メトリクス名</Label>
                  <Input
                    value={newRule.metricName}
                    onChange={(e) => setNewRule({ ...newRule, metricName: e.target.value })}
                    placeholder="cpu_usage"
                  />
                </div>
                <div>
                  <Label>条件</Label>
                  <Select
                    value={newRule.condition}
                    onValueChange={(v) => setNewRule({ ...newRule, condition: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GREATER_THAN">より大きい</SelectItem>
                      <SelectItem value="LESS_THAN">より小さい</SelectItem>
                      <SelectItem value="EQUALS">等しい</SelectItem>
                      <SelectItem value="NOT_EQUALS">等しくない</SelectItem>
                      <SelectItem value="ANOMALY">異常検知</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>閾値</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newRule.threshold}
                      onChange={(e) =>
                        setNewRule({ ...newRule, threshold: parseFloat(e.target.value) })
                      }
                    />
                    <Input
                      value={newRule.thresholdUnit || ''}
                      onChange={(e) =>
                        setNewRule({ ...newRule, thresholdUnit: e.target.value })
                      }
                      placeholder="単位"
                      className="w-20"
                    />
                  </div>
                </div>
                <div>
                  <Label>評価ウィンドウ（分）</Label>
                  <Input
                    type="number"
                    value={newRule.windowMinutes}
                    onChange={(e) =>
                      setNewRule({ ...newRule, windowMinutes: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>重要度</Label>
                  <Select
                    value={newRule.severity}
                    onValueChange={(v) => setNewRule({ ...newRule, severity: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARNING">WARNING</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                      <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>クールダウン（分）</Label>
                  <Input
                    type="number"
                    value={newRule.cooldownMinutes}
                    onChange={(e) =>
                      setNewRule({ ...newRule, cooldownMinutes: parseInt(e.target.value) })
                    }
                  />
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

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">アラートルール</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRules || 0}</div>
            <p className="text-xs text-muted-foreground">有効: {stats?.activeRules || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">オープン</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.openIncidents || 0}</div>
            <p className="text-xs text-muted-foreground">
              確認済: {stats?.acknowledgedIncidents || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">クリティカル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.criticalIncidents || 0}
            </div>
            <p className="text-xs text-muted-foreground">要対応</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">24時間</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.incidentsLast24h || 0}</div>
            <p className="text-xs text-muted-foreground">インシデント</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">通知チャンネル</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalChannels || 0}</div>
            <p className="text-xs text-muted-foreground">有効: {stats?.activeChannels || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="incidents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="incidents">
            <AlertTriangle className="h-4 w-4 mr-2" />
            インシデント
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Settings className="h-4 w-4 mr-2" />
            ルール
          </TabsTrigger>
          <TabsTrigger value="channels">
            <Bell className="h-4 w-4 mr-2" />
            通知チャンネル
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>アラートインシデント</CardTitle>
              <CardDescription>発生したアラートの一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    インシデントがありません
                  </p>
                ) : (
                  incidents.map((incident) => (
                    <div
                      key={incident.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Zap className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{incident.title}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {incident.rule && <span>{incident.rule.name}</span>}
                            {incident.metricValue !== undefined && (
                              <span>
                                値: {incident.metricValue} / 閾値: {incident.threshold}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getSeverityBadge(incident.severity)}
                        {getStatusBadge(incident.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(incident.triggeredAt).toLocaleString('ja-JP')}
                        </span>
                        <div className="flex gap-2">
                          {incident.status === 'OPEN' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => acknowledgeIncident(incident.id)}
                            >
                              確認
                            </Button>
                          )}
                          {(incident.status === 'OPEN' ||
                            incident.status === 'ACKNOWLEDGED') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedIncident(incident);
                                setIsResolveDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              解決
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* 解決ダイアログ */}
          <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>インシデント解決</DialogTitle>
                <DialogDescription>インシデントを解決済みとしてマークします</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>根本原因</Label>
                  <Textarea
                    value={resolveData.rootCause}
                    onChange={(e) =>
                      setResolveData({ ...resolveData, rootCause: e.target.value })
                    }
                    placeholder="原因を記載"
                  />
                </div>
                <div>
                  <Label>解決方法</Label>
                  <Textarea
                    value={resolveData.resolution}
                    onChange={(e) =>
                      setResolveData({ ...resolveData, resolution: e.target.value })
                    }
                    placeholder="対応内容を記載"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                  キャンセル
                </Button>
                <Button onClick={resolveIncident}>解決</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>アラートルール</CardTitle>
              <CardDescription>監視ルールの設定</CardDescription>
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
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Settings className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <code className="bg-muted px-1 rounded">{rule.metricName}</code>
                            <span>{rule.condition}</span>
                            <span>
                              {rule.threshold}
                              {rule.thresholdUnit}
                            </span>
                            {getSeverityBadge(rule.severity)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm text-muted-foreground">
                          <div>インシデント: {rule._count?.incidents || 0}</div>
                          <div>ウィンドウ: {rule.windowMinutes}分</div>
                        </div>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => toggleRule(rule.id)}
                        />
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
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>通知チャンネル</CardTitle>
                <CardDescription>アラート通知の送信先</CardDescription>
              </div>
              <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    チャンネル追加
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>通知チャンネル作成</DialogTitle>
                    <DialogDescription>新しい通知先を追加します</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>チャンネル名</Label>
                      <Input
                        value={newChannel.name}
                        onChange={(e) =>
                          setNewChannel({ ...newChannel, name: e.target.value })
                        }
                        placeholder="Slack通知"
                      />
                    </div>
                    <div>
                      <Label>タイプ</Label>
                      <Select
                        value={newChannel.channelType}
                        onValueChange={(v) =>
                          setNewChannel({ ...newChannel, channelType: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EMAIL">Email</SelectItem>
                          <SelectItem value="SLACK">Slack</SelectItem>
                          <SelectItem value="DISCORD">Discord</SelectItem>
                          <SelectItem value="WEBHOOK">Webhook</SelectItem>
                          <SelectItem value="SMS">SMS</SelectItem>
                          <SelectItem value="PAGERDUTY">PagerDuty</SelectItem>
                          <SelectItem value="TEAMS">Microsoft Teams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>説明</Label>
                      <Textarea
                        value={newChannel.description}
                        onChange={(e) =>
                          setNewChannel({ ...newChannel, description: e.target.value })
                        }
                        placeholder="チャンネルの説明"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsChannelDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={createChannel}>作成</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {channels.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    通知チャンネルがありません
                  </p>
                ) : (
                  channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{getChannelIcon(channel.channelType)}</span>
                        <div>
                          <h4 className="font-medium">{channel.name}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{channel.channelType}</Badge>
                            {channel.isDefault && <Badge>デフォルト</Badge>}
                            {channel.description && <span>{channel.description}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {channel.testStatus && (
                          <Badge
                            variant={
                              channel.testStatus === 'SUCCESS' ? 'default' : 'destructive'
                            }
                          >
                            {channel.testStatus === 'SUCCESS' ? '✓ テスト成功' : '✗ テスト失敗'}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testChannel(channel.id)}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          テスト
                        </Button>
                        <Switch checked={channel.isActive} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

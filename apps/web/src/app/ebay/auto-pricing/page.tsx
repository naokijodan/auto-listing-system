// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Zap,
  Settings,
  Plus,
  Play,
  Pause,
  Trash2,
  History,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PricingRule {
  id: string;
  name: string;
  description?: string;
  type: string;
  conditions: any[];
  actions: any[];
  marketplace?: string;
  category?: string;
  priority: number;
  isActive: boolean;
  safetyConfig?: {
    minPrice?: number;
    maxPrice?: number;
    maxChangePercent?: number;
  };
  appliedCount: number;
  lastAppliedAt?: string;
  createdAt: string;
}

interface PriceChange {
  id: string;
  listingId: string;
  productTitle: string;
  productImage?: string;
  ruleName?: string;
  oldPrice: number;
  newPrice: number;
  changePercent: string;
  source: string;
  reason?: string;
  platformUpdated: boolean;
  createdAt: string;
}

const ruleTypeLabels: Record<string, string> = {
  COMPETITOR_FOLLOW: '競合追従',
  MIN_MARGIN: '最低マージン',
  MAX_DISCOUNT: '最大値下げ',
  DEMAND_BASED: '需要ベース',
  TIME_BASED: '時間ベース',
  CUSTOM: 'カスタム',
};

const sourceLabels: Record<string, string> = {
  auto: '自動',
  rule: 'ルール',
  manual: '手動',
  ai: 'AI',
};

export default function EbayAutoPricingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    type: 'COMPETITOR_FOLLOW',
    actions: [{ type: 'undercut', value: 5 }],
    priority: 0,
    safetyConfig: { minPrice: 0, maxPrice: 0, maxChangePercent: 15 },
  });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(`${API_BASE}/ebay-auto-pricing/dashboard`, fetcher);
  const { data: rules, mutate: mutateRules } = useSWR(`${API_BASE}/ebay-auto-pricing/rules`, fetcher);
  const { data: history, mutate: mutateHistory } = useSWR(`${API_BASE}/ebay-auto-pricing/history?limit=50`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay-auto-pricing/stats`, fetcher);
  const { data: settings, mutate: mutateSettings } = useSWR(`${API_BASE}/ebay-auto-pricing/settings`, fetcher);

  const handleCreateRule = async () => {
    if (!newRule.name) return;

    await fetch(`${API_BASE}/ebay-auto-pricing/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    });

    setCreateDialogOpen(false);
    setNewRule({
      name: '',
      description: '',
      type: 'COMPETITOR_FOLLOW',
      actions: [{ type: 'undercut', value: 5 }],
      priority: 0,
      safetyConfig: { minPrice: 0, maxPrice: 0, maxChangePercent: 15 },
    });
    mutateRules();
  };

  const handleToggleRule = async (id: string) => {
    await fetch(`${API_BASE}/ebay-auto-pricing/rules/${id}/toggle`, { method: 'POST' });
    mutateRules();
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('このルールを削除しますか？')) return;
    await fetch(`${API_BASE}/ebay-auto-pricing/rules/${id}`, { method: 'DELETE' });
    mutateRules();
  };

  const handleDryRun = async () => {
    setIsExecuting(true);
    const res = await fetch(`${API_BASE}/ebay-auto-pricing/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId: selectedRule?.id, dryRun: true }),
    });
    const data = await res.json();
    setDryRunResult(data);
    setIsExecuting(false);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    await fetch(`${API_BASE}/ebay-auto-pricing/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId: selectedRule?.id, dryRun: false }),
    });
    setIsExecuting(false);
    setExecuteDialogOpen(false);
    setDryRunResult(null);
    mutateDashboard();
    mutateHistory();
    alert('価格調整を実行しました');
  };

  const handleSaveSettings = async (newSettings: any) => {
    await fetch(`${API_BASE}/ebay-auto-pricing/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    });
    mutateSettings();
    setSettingsDialogOpen(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">eBay自動価格調整</h1>
          <p className="text-muted-foreground">競合価格に基づく自動価格調整</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSettingsDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            設定
          </Button>
          <Button variant="outline" onClick={() => { setSelectedRule(null); setExecuteDialogOpen(true); }}>
            <Play className="mr-2 h-4 w-4" />
            手動実行
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            ルール作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="rules">ルール管理</TabsTrigger>
          <TabsTrigger value="history">変更履歴</TabsTrigger>
          <TabsTrigger value="stats">統計</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">アクティブルール</CardTitle>
                <Zap className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary?.activeRules || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">価格変更（30日）</CardTitle>
                <History className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.summary?.totalChanges || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">ルール適用</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboard?.summary?.ruleCount || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">自動調整</CardTitle>
                <RefreshCw className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboard?.summary?.autoCount || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* 最近の変更 */}
          <Card>
            <CardHeader>
              <CardTitle>最近の価格変更</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentChanges?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">変更履歴なし</p>
                )}
                {dashboard?.recentChanges?.map((change: any) => (
                  <div key={change.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{change.productTitle}</p>
                      <p className="text-sm text-muted-foreground">{change.reason}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm line-through text-muted-foreground">${change.oldPrice?.toFixed(2)}</p>
                        <p className="font-medium">${change.newPrice?.toFixed(2)}</p>
                      </div>
                      <Badge variant={parseFloat(change.changePercent) < 0 ? 'destructive' : 'default'}>
                        {parseFloat(change.changePercent) > 0 ? '+' : ''}{change.changePercent}%
                      </Badge>
                      <Badge variant="outline">{sourceLabels[change.source] || change.source}</Badge>
                      {change.platformUpdated ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ルール管理 */}
        <TabsContent value="rules" className="space-y-4">
          {rules?.rules?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                ルールが登録されていません
              </CardContent>
            </Card>
          )}
          {rules?.rules?.map((rule: PricingRule) => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <h3 className="font-medium">{rule.name}</h3>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge>{ruleTypeLabels[rule.type] || rule.type}</Badge>
                    <span className="text-sm text-muted-foreground">優先度: {rule.priority}</span>
                    <span className="text-sm text-muted-foreground">適用: {rule.appliedCount}回</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => { setSelectedRule(rule); setExecuteDialogOpen(true); }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleToggleRule(rule.id)}>
                        {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 text-green-500" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
                {rule.safetyConfig && (
                  <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
                    {rule.safetyConfig.minPrice && <span>最低価格: ${rule.safetyConfig.minPrice}</span>}
                    {rule.safetyConfig.maxPrice && <span>最高価格: ${rule.safetyConfig.maxPrice}</span>}
                    {rule.safetyConfig.maxChangePercent && <span>最大変更: {rule.safetyConfig.maxChangePercent}%</span>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 変更履歴 */}
        <TabsContent value="history" className="space-y-4">
          {history?.history?.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                変更履歴なし
              </CardContent>
            </Card>
          )}
          {history?.history?.map((h: PriceChange) => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {h.productImage && (
                    <img src={h.productImage} alt="" className="w-12 h-12 object-cover rounded" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{h.productTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {h.ruleName && <span className="mr-2">ルール: {h.ruleName}</span>}
                      {h.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm line-through text-muted-foreground">${h.oldPrice?.toFixed(2)}</p>
                      <p className="font-medium">${h.newPrice?.toFixed(2)}</p>
                    </div>
                    <Badge variant={parseFloat(h.changePercent) < 0 ? 'destructive' : 'default'}>
                      {parseFloat(h.changePercent) > 0 ? '+' : ''}{h.changePercent}%
                    </Badge>
                    <Badge variant="outline">{sourceLabels[h.source] || h.source}</Badge>
                    {h.platformUpdated ? (
                      <CheckCircle className="h-4 w-4 text-green-500" title="eBay同期済み" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" title="同期待ち" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(h.createdAt).toLocaleString('ja-JP')}
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* 統計 */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">総変更回数（30日）</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.stats?.totalChanges || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">平均変更率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.stats?.avgChangePercent || '0'}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">ソース別</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {stats?.stats?.bySource?.map((s: any) => (
                    <div key={s.source} className="flex justify-between">
                      <span>{sourceLabels[s.source] || s.source}</span>
                      <span className="font-medium">{s.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ルール作成ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>価格調整ルールを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">ルール名</label>
              <Input
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                placeholder="競合追従ルール"
              />
            </div>
            <div>
              <label className="text-sm font-medium">説明</label>
              <Input
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                placeholder="競合価格より5%安く設定"
              />
            </div>
            <div>
              <label className="text-sm font-medium">ルールタイプ</label>
              <Select value={newRule.type} onValueChange={(v) => setNewRule({ ...newRule, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ruleTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">アクション値（%）</label>
              <Input
                type="number"
                value={newRule.actions[0]?.value || 0}
                onChange={(e) => setNewRule({
                  ...newRule,
                  actions: [{ type: 'undercut', value: parseFloat(e.target.value) }],
                })}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-1">競合より何%安くするか</p>
            </div>
            <div>
              <label className="text-sm font-medium">優先度</label>
              <Input
                type="number"
                value={newRule.priority}
                onChange={(e) => setNewRule({ ...newRule, priority: parseInt(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm font-medium">最低価格</label>
                <Input
                  type="number"
                  value={newRule.safetyConfig.minPrice}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    safetyConfig: { ...newRule.safetyConfig, minPrice: parseFloat(e.target.value) },
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">最高価格</label>
                <Input
                  type="number"
                  value={newRule.safetyConfig.maxPrice}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    safetyConfig: { ...newRule.safetyConfig, maxPrice: parseFloat(e.target.value) },
                  })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">最大変更%</label>
                <Input
                  type="number"
                  value={newRule.safetyConfig.maxChangePercent}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    safetyConfig: { ...newRule.safetyConfig, maxChangePercent: parseFloat(e.target.value) },
                  })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>キャンセル</Button>
            <Button onClick={handleCreateRule}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 実行ダイアログ */}
      <Dialog open={executeDialogOpen} onOpenChange={(open) => { setExecuteDialogOpen(open); if (!open) setDryRunResult(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? `ルール「${selectedRule.name}」を実行` : '価格調整を実行'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!dryRunResult && (
              <p className="text-muted-foreground">
                まずドライランで変更内容を確認してから実行してください。
              </p>
            )}
            {dryRunResult && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <p className="font-medium">{dryRunResult.count}件の価格変更が予定されています</p>
                {dryRunResult.adjustments?.map((adj: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded">
                    <span className="truncate flex-1">{adj.productTitle}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">${adj.currentPrice?.toFixed(2)}</span>
                      <span>→</span>
                      <span className="font-medium">${adj.newPrice?.toFixed(2)}</span>
                      <Badge variant={parseFloat(adj.changePercent) < 0 ? 'destructive' : 'default'}>
                        {adj.changePercent}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExecuteDialogOpen(false)}>閉じる</Button>
            <Button variant="outline" onClick={handleDryRun} disabled={isExecuting}>
              {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
              ドライラン
            </Button>
            {dryRunResult && dryRunResult.count > 0 && (
              <Button onClick={handleExecute} disabled={isExecuting}>
                {isExecuting ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : null}
                実行する
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 設定ダイアログ */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自動価格調整設定</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">自動調整を有効化</p>
                <p className="text-sm text-muted-foreground">スケジュールに従って自動で価格を調整</p>
              </div>
              <Switch
                checked={settings?.settings?.enabled}
                onCheckedChange={(enabled) => handleSaveSettings({ ...settings?.settings, enabled })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">実行間隔</label>
              <Select
                value={settings?.settings?.interval || 'daily'}
                onValueChange={(interval) => handleSaveSettings({ ...settings?.settings, interval })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">毎時</SelectItem>
                  <SelectItem value="daily">毎日</SelectItem>
                  <SelectItem value="manual">手動のみ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">実行時刻</label>
              <Input
                type="time"
                value={settings?.settings?.runTime || '03:00'}
                onChange={(e) => handleSaveSettings({ ...settings?.settings, runTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">1日の最大調整数</label>
              <Input
                type="number"
                value={settings?.settings?.maxDailyAdjustments || 50}
                onChange={(e) => handleSaveSettings({
                  ...settings?.settings,
                  maxDailyAdjustments: parseInt(e.target.value),
                })}
              />
            </div>
            <div className="flex items-center justify-between">
              <p className="font-medium">変更時に通知</p>
              <Switch
                checked={settings?.settings?.notifyOnChange}
                onCheckedChange={(notifyOnChange) => handleSaveSettings({ ...settings?.settings, notifyOnChange })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setSettingsDialogOpen(false)}>閉じる</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

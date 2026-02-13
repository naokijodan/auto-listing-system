'use client';

import { useState, useEffect } from 'react';
import {
  Lightbulb,
  Sparkles,
  Check,
  X,
  RefreshCw,
  Zap,
  Play,
  History,
  TrendingUp,
  DollarSign,
  Type,
  FileText,
  Image,
  Tag,
  Package,
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
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ImprovementStats {
  totalSuggestions: number;
  pendingSuggestions: number;
  appliedSuggestions: number;
  rejectedSuggestions: number;
  applicationRate: number;
  totalBulkActions: number;
  completedBulkActions: number;
  totalHistories: number;
  avgEffectiveness: number;
}

interface Suggestion {
  id: string;
  listingId: string;
  suggestionType: string;
  priority: number;
  currentValue?: string;
  suggestedValue?: string;
  explanation?: string;
  confidenceScore: number;
  expectedImpact?: string;
  expectedImpactScore?: number;
  status: string;
  appliedAt?: string;
  rejectedAt?: string;
  listing?: { title: string; price: number; views: number };
}

interface BulkAction {
  id: string;
  name: string;
  description?: string;
  actionType: string;
  parameters: Record<string, any>;
  targetCount: number;
  status: string;
  processedCount: number;
  successCount: number;
  failedCount: number;
  startedAt?: string;
  completedAt?: string;
}

interface ActionHistory {
  id: string;
  listingId: string;
  actionType: string;
  actionSource: string;
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  effectivenessScore?: number;
  performedAt: string;
}

interface Effectiveness {
  totalApplied: number;
  byType: { type: string; count: number; avgExpectedImpact: number }[];
  topPerformingActions: ActionHistory[];
}

export default function ListingImprovementPage() {
  const [stats, setStats] = useState<ImprovementStats | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [bulkActions, setBulkActions] = useState<BulkAction[]>([]);
  const [histories, setHistories] = useState<ActionHistory[]>([]);
  const [effectiveness, setEffectiveness] = useState<Effectiveness | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);

  const [bulkActionData, setBulkActionData] = useState({
    name: '',
    actionType: 'PRICE_ADJUST_PERCENT',
    parameters: { adjustPercent: -10 },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, suggestionsRes, bulkRes, historyRes, effectRes] = await Promise.all([
        fetch(`${API_BASE}/listing-improvement/stats`),
        fetch(`${API_BASE}/listing-improvement/suggestions?status=PENDING`),
        fetch(`${API_BASE}/listing-improvement/bulk-actions`),
        fetch(`${API_BASE}/listing-improvement/history?limit=20`),
        fetch(`${API_BASE}/listing-improvement/effectiveness`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json();
        setSuggestions(data.suggestions || []);
      }
      if (bulkRes.ok) {
        const data = await bulkRes.json();
        setBulkActions(data.actions || []);
      }
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistories(data.histories || []);
      }
      if (effectRes.ok) setEffectiveness(await effectRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAllSuggestions = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/listing-improvement/generate-all`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        alert(`提案生成完了: ${data.totalGenerated}件`);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setGenerating(false);
    }
  };

  const applySuggestion = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/listing-improvement/apply/${id}`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    }
  };

  const rejectSuggestion = async (id: string) => {
    try {
      await fetch(`${API_BASE}/listing-improvement/reject/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manually rejected' }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
    }
  };

  const executeBulkAction = async () => {
    try {
      const res = await fetch(`${API_BASE}/listing-improvement/bulk-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bulkActionData,
          targetListings: selectedSuggestions.map(id => {
            const s = suggestions.find(sug => sug.id === id);
            return s?.listingId;
          }).filter(Boolean),
        }),
      });

      if (res.ok) {
        setIsBulkDialogOpen(false);
        setSelectedSuggestions([]);
        setBulkActionData({
          name: '',
          actionType: 'PRICE_ADJUST_PERCENT',
          parameters: { adjustPercent: -10 },
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to execute bulk action:', error);
    }
  };

  const getSuggestionIcon = (type: string) => {
    const icons: Record<string, any> = {
      TITLE: Type,
      DESCRIPTION: FileText,
      ITEM_SPECIFICS: Tag,
      PRICE_REDUCE: DollarSign,
      PRICE_INCREASE: DollarSign,
      PHOTOS: Image,
      RELIST: Package,
    };
    const Icon = icons[type] || Lightbulb;
    return <Icon className="h-5 w-5" />;
  };

  const getSuggestionTypeName = (type: string) => {
    const names: Record<string, string> = {
      TITLE: 'タイトル改善',
      DESCRIPTION: '説明文改善',
      ITEM_SPECIFICS: 'Item Specifics追加',
      PRICE_REDUCE: '値下げ',
      PRICE_INCREASE: '値上げ',
      PHOTOS: '画像追加',
      SHIPPING: '送料設定',
      RELIST: '再出品',
      PROMOTE: 'プロモーション',
    };
    return names[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      PENDING: { variant: 'secondary', label: '保留' },
      APPROVED: { variant: 'outline', label: '承認済' },
      APPLIED: { variant: 'default', label: '適用済' },
      REJECTED: { variant: 'destructive', label: '却下' },
      RUNNING: { variant: 'secondary', label: '実行中' },
      COMPLETED: { variant: 'default', label: '完了' },
      FAILED: { variant: 'destructive', label: '失敗' },
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
          <h1 className="text-3xl font-bold">改善提案エンジン</h1>
          <p className="text-muted-foreground">AIによる出品改善提案と一括操作</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button onClick={generateAllSuggestions} disabled={generating}>
            {generating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            AI提案生成
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">保留中提案</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.pendingSuggestions || 0}</div>
            <p className="text-xs text-muted-foreground">
              全体: {stats?.totalSuggestions || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">適用済み</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.appliedSuggestions || 0}</div>
            <p className="text-xs text-muted-foreground">
              適用率: {stats?.applicationRate || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">却下</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.rejectedSuggestions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">一括操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBulkActions || 0}</div>
            <p className="text-xs text-muted-foreground">
              完了: {stats?.completedBulkActions || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均効果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgEffectiveness ? `${stats.avgEffectiveness.toFixed(1)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">改善率</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suggestions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suggestions">
            <Lightbulb className="h-4 w-4 mr-2" />
            改善提案
          </TabsTrigger>
          <TabsTrigger value="bulk-actions">
            <Zap className="h-4 w-4 mr-2" />
            一括操作
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            履歴
          </TabsTrigger>
          <TabsTrigger value="effectiveness">
            <TrendingUp className="h-4 w-4 mr-2" />
            効果測定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>保留中の改善提案</CardTitle>
                <CardDescription>AIが生成した改善提案をワンクリックで適用</CardDescription>
              </div>
              {selectedSuggestions.length > 0 && (
                <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Zap className="h-4 w-4 mr-2" />
                      選択した{selectedSuggestions.length}件に一括操作
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>一括操作</DialogTitle>
                      <DialogDescription>
                        選択した{selectedSuggestions.length}件の出品に対して操作を実行
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>操作名</Label>
                        <Input
                          value={bulkActionData.name}
                          onChange={(e) =>
                            setBulkActionData({ ...bulkActionData, name: e.target.value })
                          }
                          placeholder="一括値下げ"
                        />
                      </div>
                      <div>
                        <Label>操作タイプ</Label>
                        <Select
                          value={bulkActionData.actionType}
                          onValueChange={(v) =>
                            setBulkActionData({ ...bulkActionData, actionType: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PRICE_ADJUST_PERCENT">価格調整（%）</SelectItem>
                            <SelectItem value="PRICE_ADJUST_FIXED">価格調整（固定額）</SelectItem>
                            <SelectItem value="APPLY_SUGGESTIONS">提案を適用</SelectItem>
                            <SelectItem value="DELIST">非公開化</SelectItem>
                            <SelectItem value="RELIST">再出品</SelectItem>
                            <SelectItem value="END_LISTING">出品終了</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {bulkActionData.actionType === 'PRICE_ADJUST_PERCENT' && (
                        <div>
                          <Label>調整率（%）</Label>
                          <Input
                            type="number"
                            value={bulkActionData.parameters.adjustPercent || 0}
                            onChange={(e) =>
                              setBulkActionData({
                                ...bulkActionData,
                                parameters: { adjustPercent: parseFloat(e.target.value) },
                              })
                            }
                            placeholder="-10"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            負の値で値下げ、正の値で値上げ
                          </p>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>
                        キャンセル
                      </Button>
                      <Button onClick={executeBulkAction}>実行</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suggestions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    保留中の提案がありません。「AI提案生成」ボタンで生成してください。
                  </p>
                ) : (
                  suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedSuggestions.includes(suggestion.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSuggestions([...selectedSuggestions, suggestion.id]);
                          } else {
                            setSelectedSuggestions(selectedSuggestions.filter(id => id !== suggestion.id));
                          }
                        }}
                      />
                      <div className="p-2 bg-muted rounded-lg">
                        {getSuggestionIcon(suggestion.suggestionType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{getSuggestionTypeName(suggestion.suggestionType)}</Badge>
                          <span className="text-sm text-muted-foreground">
                            信頼度: {Math.round(suggestion.confidenceScore * 100)}%
                          </span>
                        </div>
                        <h4 className="font-medium">{suggestion.listing?.title || 'Unknown'}</h4>
                        {suggestion.currentValue && suggestion.suggestedValue && (
                          <div className="mt-2 text-sm">
                            <div className="text-muted-foreground line-through">{suggestion.currentValue}</div>
                            <div className="text-green-600 font-medium">→ {suggestion.suggestedValue}</div>
                          </div>
                        )}
                        {suggestion.explanation && (
                          <p className="text-sm text-muted-foreground mt-1">{suggestion.explanation}</p>
                        )}
                        {suggestion.expectedImpact && (
                          <Badge variant="secondary" className="mt-2">
                            期待効果: {suggestion.expectedImpact}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => applySuggestion(suggestion.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          適用
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rejectSuggestion(suggestion.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          却下
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>一括操作履歴</CardTitle>
              <CardDescription>実行された一括操作の一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bulkActions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    一括操作の履歴がありません
                  </p>
                ) : (
                  bulkActions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Zap className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <h4 className="font-medium">{action.name || action.actionType}</h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{action.actionType}</Badge>
                            <span>対象: {action.targetCount}件</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {action.status === 'COMPLETED' && (
                            <div className="text-sm">
                              <span className="text-green-600">成功: {action.successCount}</span>
                              {action.failedCount > 0 && (
                                <span className="text-red-600 ml-2">失敗: {action.failedCount}</span>
                              )}
                            </div>
                          )}
                          {action.status === 'RUNNING' && (
                            <Progress value={(action.processedCount / action.targetCount) * 100} className="w-24" />
                          )}
                        </div>
                        {getStatusBadge(action.status)}
                        <span className="text-sm text-muted-foreground">
                          {action.completedAt
                            ? new Date(action.completedAt).toLocaleString('ja-JP')
                            : action.startedAt
                            ? '実行中...'
                            : '待機中'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>アクション履歴</CardTitle>
              <CardDescription>実行されたすべての改善アクション</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {histories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    履歴がありません
                  </p>
                ) : (
                  histories.map((history) => (
                    <div
                      key={history.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <History className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{history.actionType}</Badge>
                            <Badge variant="secondary">{history.actionSource}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Listing: {history.listingId.substring(0, 12)}...
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {history.effectivenessScore && (
                          <Badge variant="default">
                            効果: +{history.effectivenessScore.toFixed(1)}%
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(history.performedAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>効果測定レポート</CardTitle>
              <CardDescription>改善提案の効果を分析</CardDescription>
            </CardHeader>
            <CardContent>
              {effectiveness ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-center">
                          {effectiveness.totalApplied}
                        </div>
                        <p className="text-sm text-muted-foreground text-center">適用済み提案</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-center text-green-600">
                          {effectiveness.byType.length}
                        </div>
                        <p className="text-sm text-muted-foreground text-center">提案タイプ数</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-center">
                          {effectiveness.topPerformingActions.length}
                        </div>
                        <p className="text-sm text-muted-foreground text-center">効果測定済み</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="font-medium mb-4">タイプ別統計</h3>
                    <div className="space-y-2">
                      {effectiveness.byType.map((item) => (
                        <div
                          key={item.type}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getSuggestionIcon(item.type)}
                            <span>{getSuggestionTypeName(item.type)}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              {item.count}件適用
                            </span>
                            <Badge variant="secondary">
                              期待効果: +{item.avgExpectedImpact?.toFixed(1) || 0}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  効果測定データがありません
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingDown,
  Eye,
  Heart,
  RefreshCw,
  AlertTriangle,
  Settings,
  Trash2,
  Plus,
  Target,
  Zap,
  Filter,
  Download,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface PerformanceStats {
  totalListings: number;
  lowPerformers: number;
  lowPerformerRate: number;
  avgViews: number;
  avgWatchers: number;
  totalFlags: number;
  activeFlags: number;
  totalThresholds: number;
  activeThresholds: number;
  totalBenchmarks: number;
}

interface ListingPerformance {
  id: string;
  listingId: string;
  ebayItemId?: string;
  title: string;
  price: number;
  currency: string;
  category?: string;
  views: number;
  watchers: number;
  impressions: number;
  clicks: number;
  ctr: number;
  daysListed: number;
  performanceScore?: number;
  isLowPerformer: boolean;
  lowPerformerReason?: string;
  _count?: { flags: number; suggestions: number };
}

interface PerformanceThreshold {
  id: string;
  name: string;
  description?: string;
  metric: string;
  operator: string;
  absoluteValue?: number;
  relativePercentile?: number;
  daysListedMin?: number;
  actionOnMatch: string;
  isActive: boolean;
  priority: number;
}

interface LowPerformanceFlag {
  id: string;
  reason: string;
  score?: number;
  metrics: Record<string, number>;
  suggestedActions: string[];
  status: string;
  listing?: { title: string; views: number; watchers: number; price: number };
}

interface CategoryBenchmark {
  id: string;
  categoryId: string;
  categoryName: string;
  avgViews: number;
  avgWatchers: number;
  avgImpressions: number;
  avgCtr: number;
  sampleSize: number;
}

export default function ListingPerformancePage() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [listings, setListings] = useState<ListingPerformance[]>([]);
  const [lowPerformers, setLowPerformers] = useState<ListingPerformance[]>([]);
  const [thresholds, setThresholds] = useState<PerformanceThreshold[]>([]);
  const [flags, setFlags] = useState<LowPerformanceFlag[]>([]);
  const [benchmarks, setBenchmarks] = useState<CategoryBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isThresholdDialogOpen, setIsThresholdDialogOpen] = useState(false);

  const [newThreshold, setNewThreshold] = useState({
    name: '',
    description: '',
    metric: 'VIEWS',
    operator: 'LESS_THAN',
    absoluteValue: 10,
    daysListedMin: 30,
    actionOnMatch: 'FLAG',
    priority: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, listingsRes, lowRes, thresholdsRes, flagsRes, benchmarksRes] = await Promise.all([
        fetch(`${API_BASE}/listing-performance/stats`),
        fetch(`${API_BASE}/listing-performance/listings?limit=20`),
        fetch(`${API_BASE}/listing-performance/low-performers?limit=20`),
        fetch(`${API_BASE}/listing-performance/thresholds`),
        fetch(`${API_BASE}/listing-performance/flags?status=ACTIVE`),
        fetch(`${API_BASE}/listing-performance/category-benchmark`),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data.listings || []);
      }
      if (lowRes.ok) {
        const data = await lowRes.json();
        setLowPerformers(data.listings || []);
      }
      if (thresholdsRes.ok) setThresholds(await thresholdsRes.json());
      if (flagsRes.ok) {
        const data = await flagsRes.json();
        setFlags(data.flags || []);
      }
      if (benchmarksRes.ok) setBenchmarks(await benchmarksRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncListings = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/listing-performance/sync`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        alert(`同期完了: ${data.synced}件, 低パフォーマンス: ${data.lowPerformersDetected}件`);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      setSyncing(false);
    }
  };

  const calculateBenchmarks = async () => {
    try {
      const res = await fetch(`${API_BASE}/listing-performance/calculate-benchmarks`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Failed to calculate benchmarks:', error);
    }
  };

  const createThreshold = async () => {
    try {
      const res = await fetch(`${API_BASE}/listing-performance/thresholds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThreshold),
      });

      if (res.ok) {
        setIsThresholdDialogOpen(false);
        setNewThreshold({
          name: '',
          description: '',
          metric: 'VIEWS',
          operator: 'LESS_THAN',
          absoluteValue: 10,
          daysListedMin: 30,
          actionOnMatch: 'FLAG',
          priority: 0,
        });
        fetchData();
      }
    } catch (error) {
      console.error('Failed to create threshold:', error);
    }
  };

  const deleteThreshold = async (id: string) => {
    if (!confirm('この閾値を削除しますか？')) return;
    try {
      await fetch(`${API_BASE}/listing-performance/thresholds/${id}`, {
        method: 'DELETE',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to delete threshold:', error);
    }
  };

  const dismissFlag = async (id: string) => {
    try {
      await fetch(`${API_BASE}/listing-performance/flags/${id}/dismiss`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manually dismissed' }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to dismiss flag:', error);
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-500';
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score?: number) => {
    if (!score) return <Badge variant="outline">N/A</Badge>;
    if (score >= 70) return <Badge variant="default">Good</Badge>;
    if (score >= 40) return <Badge variant="secondary">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
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
          <h1 className="text-3xl font-bold">出品パフォーマンス分析</h1>
          <p className="text-muted-foreground">eBay出品のパフォーマンスを分析・改善</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button variant="outline" onClick={calculateBenchmarks}>
            <BarChart3 className="h-4 w-4 mr-2" />
            ベンチマーク計算
          </Button>
          <Button onClick={syncListings} disabled={syncing}>
            {syncing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            eBay同期
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総出品数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalListings || 0}</div>
            <p className="text-xs text-muted-foreground">アクティブ出品</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">低パフォーマンス</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.lowPerformers || 0}</div>
            <p className="text-xs text-muted-foreground">
              全体の {stats?.lowPerformerRate || 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均閲覧数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgViews || 0}</div>
            <p className="text-xs text-muted-foreground">出品あたり</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均ウォッチ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgWatchers || 0}</div>
            <p className="text-xs text-muted-foreground">出品あたり</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">アクティブフラグ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.activeFlags || 0}</div>
            <p className="text-xs text-muted-foreground">要対応</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="low-performers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="low-performers">
            <TrendingDown className="h-4 w-4 mr-2" />
            低パフォーマンス
          </TabsTrigger>
          <TabsTrigger value="all-listings">
            <BarChart3 className="h-4 w-4 mr-2" />
            全出品
          </TabsTrigger>
          <TabsTrigger value="thresholds">
            <Target className="h-4 w-4 mr-2" />
            閾値設定
          </TabsTrigger>
          <TabsTrigger value="benchmarks">
            <Zap className="h-4 w-4 mr-2" />
            ベンチマーク
          </TabsTrigger>
        </TabsList>

        <TabsContent value="low-performers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>低パフォーマンス出品</CardTitle>
              <CardDescription>改善が必要な出品の一覧</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowPerformers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    低パフォーマンス出品がありません
                  </p>
                ) : (
                  lowPerformers.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-red-50 dark:bg-red-900/10"
                    >
                      <div className="flex items-center gap-4">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                        <div>
                          <h4 className="font-medium">{listing.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {listing.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" /> {listing.watchers}
                            </span>
                            <span>${listing.price}</span>
                            <span>{listing.daysListed}日経過</span>
                          </div>
                          {listing.lowPerformerReason && (
                            <p className="text-xs text-red-600 mt-1">
                              {listing.lowPerformerReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={`text-lg font-bold ${getScoreColor(listing.performanceScore)}`}>
                            {listing.performanceScore?.toFixed(1) || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">スコア</div>
                        </div>
                        {getScoreBadge(listing.performanceScore)}
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/listing-improvement?listingId=${listing.id}`}>
                            改善提案
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* フラグ一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>アクティブフラグ</CardTitle>
              <CardDescription>対応が必要なアラート</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {flags.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    アクティブフラグがありません
                  </p>
                ) : (
                  flags.map((flag) => (
                    <div
                      key={flag.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{flag.listing?.title || 'Unknown'}</h4>
                        <p className="text-sm text-muted-foreground">{flag.reason}</p>
                        <div className="flex gap-2 mt-2">
                          {flag.suggestedActions.map((action: string) => (
                            <Badge key={action} variant="outline">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Score: {flag.score?.toFixed(1)}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => dismissFlag(flag.id)}>
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

        <TabsContent value="all-listings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>全出品一覧</CardTitle>
              <CardDescription>パフォーマンススコア順</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {listings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    出品がありません。「eBay同期」ボタンでデータを取得してください。
                  </p>
                ) : (
                  listings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 text-center">
                          <div className={`text-lg font-bold ${getScoreColor(listing.performanceScore)}`}>
                            {listing.performanceScore?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium">{listing.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {listing.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3" /> {listing.watchers}
                            </span>
                            <span>CTR: {listing.ctr.toFixed(2)}%</span>
                            <span>${listing.price}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {listing.isLowPerformer && (
                          <Badge variant="destructive">Low</Badge>
                        )}
                        {getScoreBadge(listing.performanceScore)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>閾値設定</CardTitle>
                <CardDescription>低パフォーマンス判定の基準</CardDescription>
              </div>
              <Dialog open={isThresholdDialogOpen} onOpenChange={setIsThresholdDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    閾値追加
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>閾値設定追加</DialogTitle>
                    <DialogDescription>低パフォーマンス判定の新しい基準を追加</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>名前</Label>
                      <Input
                        value={newThreshold.name}
                        onChange={(e) => setNewThreshold({ ...newThreshold, name: e.target.value })}
                        placeholder="30日以上で閲覧数10未満"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>メトリクス</Label>
                        <Select
                          value={newThreshold.metric}
                          onValueChange={(v) => setNewThreshold({ ...newThreshold, metric: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIEWS">閲覧数</SelectItem>
                            <SelectItem value="WATCHERS">ウォッチ数</SelectItem>
                            <SelectItem value="IMPRESSIONS">インプレッション</SelectItem>
                            <SelectItem value="CTR">CTR</SelectItem>
                            <SelectItem value="PERFORMANCE_SCORE">スコア</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>条件</Label>
                        <Select
                          value={newThreshold.operator}
                          onValueChange={(v) => setNewThreshold({ ...newThreshold, operator: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LESS_THAN">未満</SelectItem>
                            <SelectItem value="GREATER_THAN">より大きい</SelectItem>
                            <SelectItem value="PERCENTILE_BELOW">下位%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>閾値</Label>
                        <Input
                          type="number"
                          value={newThreshold.absoluteValue}
                          onChange={(e) =>
                            setNewThreshold({ ...newThreshold, absoluteValue: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div>
                        <Label>最低出品日数</Label>
                        <Input
                          type="number"
                          value={newThreshold.daysListedMin || ''}
                          onChange={(e) =>
                            setNewThreshold({ ...newThreshold, daysListedMin: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>アクション</Label>
                      <Select
                        value={newThreshold.actionOnMatch}
                        onValueChange={(v) => setNewThreshold({ ...newThreshold, actionOnMatch: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FLAG">フラグ付け</SelectItem>
                          <SelectItem value="NOTIFY">通知</SelectItem>
                          <SelectItem value="SUGGEST_IMPROVEMENT">改善提案</SelectItem>
                          <SelectItem value="AUTO_PRICE_REDUCE">自動値下げ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsThresholdDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={createThreshold}>作成</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {thresholds.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    閾値設定がありません
                  </p>
                ) : (
                  thresholds.map((threshold) => (
                    <div
                      key={threshold.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{threshold.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline">{threshold.metric}</Badge>
                          <span>{threshold.operator}</span>
                          <span>{threshold.absoluteValue}</span>
                          {threshold.daysListedMin && (
                            <span>（{threshold.daysListedMin}日以上）</span>
                          )}
                          <Badge variant="secondary">{threshold.actionOnMatch}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={threshold.isActive} />
                        <Button variant="ghost" size="icon" onClick={() => deleteThreshold(threshold.id)}>
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

        <TabsContent value="benchmarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>カテゴリベンチマーク</CardTitle>
              <CardDescription>カテゴリ別の平均パフォーマンス</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {benchmarks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    ベンチマークがありません。「ベンチマーク計算」ボタンで計算してください。
                  </p>
                ) : (
                  benchmarks.map((benchmark) => (
                    <div
                      key={benchmark.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">{benchmark.categoryName}</h4>
                        <Badge variant="outline">{benchmark.sampleSize} 件</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">平均閲覧数</div>
                          <div className="text-lg font-bold">{benchmark.avgViews.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">平均ウォッチ</div>
                          <div className="text-lg font-bold">{benchmark.avgWatchers.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">平均インプレッション</div>
                          <div className="text-lg font-bold">{benchmark.avgImpressions.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">平均CTR</div>
                          <div className="text-lg font-bold">{benchmark.avgCtr.toFixed(2)}%</div>
                        </div>
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

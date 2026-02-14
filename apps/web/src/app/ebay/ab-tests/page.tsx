'use client';

/**
 * eBay A/Bテスト管理ページ
 * Phase 119: AI最適化の効果測定
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Beaker,
  Play,
  Pause,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Sparkles,
  Trophy,
  AlertCircle,
  Clock,
  Target,
  Percent,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function EbayABTestsPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOptimizations, setSelectedOptimizations] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [testConfig, setTestConfig] = useState({
    trafficPercent: 50,
    minSampleSize: 100,
    durationDays: 14,
  });

  const { data: dashboard, mutate: mutateDashboard } = useSWR(
    `${API_BASE}/ebay-ab-tests/dashboard`,
    fetcher
  );

  const { data: tests, mutate: mutateTests } = useSWR(
    `${API_BASE}/ebay-ab-tests${statusFilter ? `?status=${statusFilter}` : ''}`,
    fetcher
  );

  const { data: testResults } = useSWR(
    selectedTestId ? `${API_BASE}/ebay-ab-tests/${selectedTestId}` : null,
    fetcher
  );

  const { data: stats } = useSWR(`${API_BASE}/ebay-ab-tests/stats`, fetcher);

  const handleCreateTest = async (optimizationId: string) => {
    try {
      await fetch(`${API_BASE}/ebay-ab-tests/from-optimization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizationId,
          ...testConfig,
        }),
      });
      mutateDashboard();
      mutateTests();
    } catch (error) {
      console.error('Failed to create test:', error);
    }
  };

  const handleBulkCreate = async () => {
    if (selectedOptimizations.length === 0) return;
    try {
      await fetch(`${API_BASE}/ebay-ab-tests/bulk-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          optimizationIds: selectedOptimizations,
          ...testConfig,
        }),
      });
      setSelectedOptimizations([]);
      setCreateDialogOpen(false);
      mutateDashboard();
      mutateTests();
    } catch (error) {
      console.error('Failed to bulk create:', error);
    }
  };

  const handleStartTest = async (testId: string) => {
    try {
      await fetch(`${API_BASE}/ebay-ab-tests/${testId}/start`, { method: 'POST' });
      mutateTests();
    } catch (error) {
      console.error('Failed to start test:', error);
    }
  };

  const handleStopTest = async (testId: string) => {
    try {
      await fetch(`${API_BASE}/ebay-ab-tests/${testId}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual stop' }),
      });
      mutateTests();
    } catch (error) {
      console.error('Failed to stop test:', error);
    }
  };

  const handleCompleteTest = async (testId: string) => {
    try {
      await fetch(`${API_BASE}/ebay-ab-tests/${testId}/complete`, { method: 'POST' });
      mutateTests();
    } catch (error) {
      console.error('Failed to complete test:', error);
    }
  };

  const handleApplyWinner = async (testId: string) => {
    try {
      await fetch(`${API_BASE}/ebay-ab-tests/${testId}/apply-winner`, { method: 'POST' });
      mutateTests();
      mutateDashboard();
    } catch (error) {
      console.error('Failed to apply winner:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      DRAFT: { variant: 'outline', icon: <Clock className="h-3 w-3" /> },
      RUNNING: { variant: 'default', icon: <Play className="h-3 w-3" /> },
      PAUSED: { variant: 'secondary', icon: <Pause className="h-3 w-3" /> },
      COMPLETED: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
      CANCELLED: { variant: 'destructive', icon: <AlertCircle className="h-3 w-3" /> },
    };
    const config = variants[status] || { variant: 'outline', icon: null };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const toggleOptimization = (id: string) => {
    setSelectedOptimizations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Beaker className="h-8 w-8" />
            eBay A/Bテスト
          </h1>
          <p className="text-muted-foreground">
            AI最適化提案の効果を測定・検証
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Sparkles className="h-4 w-4 mr-2" />
          一括テスト作成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="tests">テスト一覧</TabsTrigger>
          <TabsTrigger value="optimizations">テスト可能な提案</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* 統計カード */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">実行中テスト</CardTitle>
                <Play className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.running || 0}</div>
                <p className="text-xs text-muted-foreground">
                  全{dashboard?.stats?.total || 0}件中
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">完了テスト</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.completed || 0}</div>
                <p className="text-xs text-muted-foreground">
                  有意: {dashboard?.stats?.significantTests || 0}件
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">有意差率</CardTitle>
                <Target className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.significantRate || 0}%</div>
                <p className="text-xs text-muted-foreground">統計的有意な結果</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">保留中の提案</CardTitle>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.stats?.pendingOptimizations || 0}
                </div>
                <p className="text-xs text-muted-foreground">テスト可能</p>
              </CardContent>
            </Card>
          </div>

          {/* 最近のテスト */}
          <Card>
            <CardHeader>
              <CardTitle>最近のテスト</CardTitle>
              <CardDescription>直近のA/Bテスト結果</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>テスト名</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>コントロール</TableHead>
                    <TableHead>バリアント</TableHead>
                    <TableHead>結果</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.recentTests?.map((test: any) => {
                    const control = test.variants?.find((v: any) => v.isControl);
                    const variant = test.variants?.find((v: any) => !v.isControl);
                    const controlRate = control?.views > 0
                      ? ((control.sales / control.views) * 100).toFixed(2)
                      : '0.00';
                    const variantRate = variant?.views > 0
                      ? ((variant.sales / variant.views) * 100).toFixed(2)
                      : '0.00';
                    const lift = control?.views > 0 && variant?.views > 0
                      ? (((variant.sales / variant.views) - (control.sales / control.views)) /
                          (control.sales / control.views) * 100).toFixed(2)
                      : '0.00';

                    return (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium">{test.name}</TableCell>
                        <TableCell>{getStatusBadge(test.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{controlRate}%</span>
                            <span className="text-muted-foreground ml-1">
                              ({control?.sales || 0}/{control?.views || 0})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="font-medium">{variantRate}%</span>
                            <span className="text-muted-foreground ml-1">
                              ({variant?.sales || 0}/{variant?.views || 0})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {test.status === 'COMPLETED' ? (
                            <div className="flex items-center gap-1">
                              {parseFloat(lift) > 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                              ) : parseFloat(lift) < 0 ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                              ) : null}
                              <span
                                className={
                                  parseFloat(lift) > 0
                                    ? 'text-green-500'
                                    : parseFloat(lift) < 0
                                    ? 'text-red-500'
                                    : ''
                                }
                              >
                                {parseFloat(lift) > 0 ? '+' : ''}{lift}%
                              </span>
                              {test.isSignificant && (
                                <Badge variant="outline" className="ml-1 text-xs">
                                  有意
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {test.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartTest(test.id)}
                              >
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            {test.status === 'RUNNING' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStopTest(test.id)}
                                >
                                  <Pause className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCompleteTest(test.id)}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {test.status === 'COMPLETED' && test.winningVariantId && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplyWinner(test.id)}
                              >
                                <Trophy className="h-3 w-3 mr-1" />
                                適用
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedTestId(test.id);
                                setResultDialogOpen(true);
                              }}
                            >
                              <BarChart3 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* パフォーマンス統計 */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>全体パフォーマンス</CardTitle>
                <CardDescription>A/Bテストによる改善効果</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">平均改善率</div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.performance?.avgLiftFormatted || '+0.00%'}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">最適化適用率</div>
                    <div className="text-2xl font-bold">
                      {stats.optimizations?.applicationRate || 0}%
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">有意差検出率</div>
                    <div className="text-2xl font-bold">
                      {stats.tests?.significantRate || 0}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* テスト一覧 */}
        <TabsContent value="tests" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">すべて</SelectItem>
                <SelectItem value="DRAFT">下書き</SelectItem>
                <SelectItem value="RUNNING">実行中</SelectItem>
                <SelectItem value="PAUSED">一時停止</SelectItem>
                <SelectItem value="COMPLETED">完了</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>テスト名</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>サンプル数</TableHead>
                    <TableHead>コンバージョン率</TableHead>
                    <TableHead>リフト</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests?.data?.map((test: any) => {
                    const control = test.variants?.find((v: any) => v.isControl);
                    const variant = test.variants?.find((v: any) => !v.isControl);
                    const totalViews = (control?.views || 0) + (variant?.views || 0);

                    return (
                      <TableRow key={test.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {test.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{test.testType}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(test.status)}</TableCell>
                        <TableCell>{totalViews}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">C:</span>
                            <span>
                              {control?.views > 0
                                ? ((control.sales / control.views) * 100).toFixed(1)
                                : '0.0'}
                              %
                            </span>
                            <span className="text-muted-foreground">V:</span>
                            <span>
                              {variant?.views > 0
                                ? ((variant.sales / variant.views) * 100).toFixed(1)
                                : '0.0'}
                              %
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {test.status === 'COMPLETED' && test.isSignificant ? (
                            <Badge
                              variant={
                                test.winningVariantId && !control?.id.includes(test.winningVariantId)
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {test.winningVariantId ? '有意' : '-'}
                            </Badge>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {test.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartTest(test.id)}
                              >
                                開始
                              </Button>
                            )}
                            {test.status === 'RUNNING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteTest(test.id)}
                              >
                                完了
                              </Button>
                            )}
                            {test.status === 'COMPLETED' && test.winningVariantId && (
                              <Button
                                size="sm"
                                onClick={() => handleApplyWinner(test.id)}
                              >
                                勝者適用
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* テスト可能な最適化提案 */}
        <TabsContent value="optimizations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>テスト可能な最適化提案</CardTitle>
              <CardDescription>
                Phase 118のAI最適化提案からA/Bテストを作成
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <input
                        type="checkbox"
                        checked={
                          selectedOptimizations.length ===
                          (dashboard?.testableOptimizations?.length || 0)
                        }
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedOptimizations(
                              dashboard?.testableOptimizations?.map((o: any) => o.id) || []
                            );
                          } else {
                            setSelectedOptimizations([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>商品</TableHead>
                    <TableHead>タイプ</TableHead>
                    <TableHead>元の値</TableHead>
                    <TableHead>提案値</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.testableOptimizations?.map((opt: any) => (
                    <TableRow key={opt.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedOptimizations.includes(opt.id)}
                          onChange={() => toggleOptimization(opt.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {opt.listing?.product?.titleEn || opt.listing?.product?.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{opt.type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {opt.originalValue?.substring(0, 50)}...
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {opt.suggestedValue?.substring(0, 50)}...
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleCreateTest(opt.id)}
                        >
                          テスト作成
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedOptimizations.length > 0 && (
                <div className="mt-4 flex items-center justify-between p-4 bg-muted rounded-lg">
                  <span>{selectedOptimizations.length}件選択中</span>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    一括テスト作成
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 一括作成ダイアログ */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A/Bテスト一括作成</DialogTitle>
            <DialogDescription>
              {selectedOptimizations.length}件の最適化提案からテストを作成します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>トラフィック配分 (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={testConfig.trafficPercent}
                  onChange={e =>
                    setTestConfig({ ...testConfig, trafficPercent: parseInt(e.target.value) })
                  }
                />
                <Percent className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>最小サンプルサイズ</Label>
              <Input
                type="number"
                min={10}
                value={testConfig.minSampleSize}
                onChange={e =>
                  setTestConfig({ ...testConfig, minSampleSize: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>テスト期間（日）</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={testConfig.durationDays}
                onChange={e =>
                  setTestConfig({ ...testConfig, durationDays: parseInt(e.target.value) })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleBulkCreate}>作成</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 結果詳細ダイアログ */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>テスト結果詳細</DialogTitle>
            <DialogDescription>
              {testResults?.test?.name}
            </DialogDescription>
          </DialogHeader>
          {testResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">ステータス</div>
                  <div className="font-medium">{testResults.test?.status}</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="text-sm text-muted-foreground">サンプル数</div>
                  <div className="font-medium">
                    {testResults.summary?.totalSamples} / {testResults.test?.minSampleSize}
                  </div>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>バリアント</TableHead>
                    <TableHead>閲覧数</TableHead>
                    <TableHead>販売数</TableHead>
                    <TableHead>コンバージョン率</TableHead>
                    <TableHead>収益</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.variants?.map((variant: any) => (
                    <TableRow key={variant.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {variant.name}
                          {variant.isControl && (
                            <Badge variant="outline">コントロール</Badge>
                          )}
                          {testResults.summary?.winningVariantId === variant.id && (
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{variant.views}</TableCell>
                      <TableCell>{variant.sales}</TableCell>
                      <TableCell>{variant.conversionRate?.toFixed(2)}%</TableCell>
                      <TableCell>${variant.revenue?.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {testResults.summary?.conclusion && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-medium mb-1">結論</div>
                  <p className="text-sm">{testResults.summary.conclusion}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultDialogOpen(false)}>
              閉じる
            </Button>
            {testResults?.summary?.winningVariantId && testResults?.test?.status === 'COMPLETED' && (
              <Button onClick={() => handleApplyWinner(testResults.test.id)}>
                勝者を適用
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

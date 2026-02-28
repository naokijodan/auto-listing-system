
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  FlaskConical,
  Plus,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetcher, API_BASE } from '@/lib/api';
import { toast } from 'sonner';

interface ABTest {
  id: string;
  name: string;
  description?: string;
  testType: string;
  targetEntity: string;
  targetField: string;
  status: string;
  startAt: string;
  endAt?: string;
  primaryMetric: string;
  minSampleSize: number;
  confidenceLevel: number;
  isSignificant: boolean;
  winningVariantId?: string;
  conclusion?: string;
  variants: Array<{
    id: string;
    name: string;
    isControl: boolean;
    weight: number;
    sales: number;
    views: number;
  }>;
  _count?: {
    assignments: number;
  };
}

interface Stats {
  total: number;
  running: number;
  completed: number;
  totalAssignments: number;
  significantCount: number;
  significantRate: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '下書き', color: 'bg-zinc-500' },
  SCHEDULED: { label: 'スケジュール済み', color: 'bg-blue-500' },
  RUNNING: { label: '実行中', color: 'bg-green-500' },
  PAUSED: { label: '一時停止', color: 'bg-yellow-500' },
  COMPLETED: { label: '完了', color: 'bg-purple-500' },
  CANCELLED: { label: 'キャンセル', color: 'bg-red-500' },
};

const testTypeLabels: Record<string, string> = {
  TITLE: 'タイトルテスト',
  DESCRIPTION: '説明文テスト',
  PRICE: '価格テスト',
  IMAGE: '画像テスト',
  MULTI: '複合テスト',
};

const metricLabels: Record<string, string> = {
  CONVERSION_RATE: 'コンバージョン率',
  CLICK_RATE: 'クリック率',
  VIEW_TO_SALE: '閲覧→購入率',
  REVENUE: '収益',
  PROFIT: '利益',
  AVG_ORDER_VALUE: '平均注文額',
};

export default function ABTestsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);

  const { data: stats, mutate: mutateStats } = useSWR<Stats>(
    `${API_BASE}/ab-tests/stats`,
    fetcher
  );

  const { data: testsData, mutate: mutateTests } = useSWR<any>(
    `${API_BASE}/ab-tests${selectedStatus !== 'all' ? `?status=${selectedStatus}` : ''}`,
    fetcher
  );

  const tests = testsData?.data || [];

  const handleCreateTest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch(`${API_BASE}/ab-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description'),
          testType: formData.get('testType'),
          targetEntity: formData.get('targetEntity'),
          targetField: formData.get('targetField'),
          startAt: new Date(formData.get('startAt') as string),
          endAt: formData.get('endAt') ? new Date(formData.get('endAt') as string) : undefined,
          primaryMetric: formData.get('primaryMetric'),
          minSampleSize: parseInt(formData.get('minSampleSize') as string, 10),
          variants: [
            { name: 'コントロール', isControl: true, changes: {}, weight: 50 },
            { name: 'バリアントA', isControl: false, changes: {}, weight: 50 },
          ],
        }),
      });

      if (response.ok) {
        toast.success('A/Bテストを作成しました');
        setIsCreateOpen(false);
        mutateTests();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '作成に失敗しました');
      }
    } catch {
      toast.error('作成に失敗しました');
    }
  };

  const handleStartTest = async (testId: string) => {
    try {
      const response = await fetch(`${API_BASE}/ab-tests/${testId}/start`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('テストを開始しました');
        mutateTests();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '開始に失敗しました');
      }
    } catch {
      toast.error('開始に失敗しました');
    }
  };

  const handleStopTest = async (testId: string) => {
    try {
      const response = await fetch(`${API_BASE}/ab-tests/${testId}/stop`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('テストを停止しました');
        mutateTests();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '停止に失敗しました');
      }
    } catch {
      toast.error('停止に失敗しました');
    }
  };

  const handleCompleteTest = async (testId: string) => {
    try {
      const response = await fetch(`${API_BASE}/ab-tests/${testId}/complete`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('テストを完了しました');
        mutateTests();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '完了に失敗しました');
      }
    } catch {
      toast.error('完了に失敗しました');
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm('このテストを削除しますか？')) return;

    try {
      const response = await fetch(`${API_BASE}/ab-tests/${testId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('テストを削除しました');
        mutateTests();
        mutateStats();
      } else {
        const error = await response.json();
        toast.error(error.error || '削除に失敗しました');
      }
    } catch {
      toast.error('削除に失敗しました');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">A/Bテスト</h1>
          <p className="text-sm text-zinc-500">タイトル、価格、説明文などの最適化テスト</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              新規テスト
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>A/Bテストを作成</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">テスト名</Label>
                <Input id="name" name="name" required placeholder="例: 高級時計タイトルテスト" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea id="description" name="description" placeholder="テストの目的や仮説を記入" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>テストタイプ</Label>
                  <Select name="testType" defaultValue="TITLE">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TITLE">タイトルテスト</SelectItem>
                      <SelectItem value="DESCRIPTION">説明文テスト</SelectItem>
                      <SelectItem value="PRICE">価格テスト</SelectItem>
                      <SelectItem value="IMAGE">画像テスト</SelectItem>
                      <SelectItem value="MULTI">複合テスト</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>対象</Label>
                  <Select name="targetEntity" defaultValue="listing">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="listing">出品</SelectItem>
                      <SelectItem value="product">商品</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>対象フィールド</Label>
                  <Select name="targetField" defaultValue="title">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">タイトル</SelectItem>
                      <SelectItem value="description">説明文</SelectItem>
                      <SelectItem value="price">価格</SelectItem>
                      <SelectItem value="images">画像</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>成功指標</Label>
                  <Select name="primaryMetric" defaultValue="CONVERSION_RATE">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONVERSION_RATE">コンバージョン率</SelectItem>
                      <SelectItem value="CLICK_RATE">クリック率</SelectItem>
                      <SelectItem value="REVENUE">収益</SelectItem>
                      <SelectItem value="AVG_ORDER_VALUE">平均注文額</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startAt">開始日時</Label>
                  <Input
                    id="startAt"
                    name="startAt"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endAt">終了日時（任意）</Label>
                  <Input
                    id="endAt"
                    name="endAt"
                    type="datetime-local"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minSampleSize">最小サンプルサイズ</Label>
                <Input
                  id="minSampleSize"
                  name="minSampleSize"
                  type="number"
                  defaultValue={100}
                  min={10}
                />
              </div>
              <Button type="submit" className="w-full">
                作成
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総テスト数</CardTitle>
            <FlaskConical className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">実行中</CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.running || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">完了</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">有意な結果率</CardTitle>
            <Target className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.significantRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tests">
        <TabsList>
          <TabsTrigger value="tests">テスト一覧</TabsTrigger>
          <TabsTrigger value="results">結果分析</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="DRAFT">下書き</SelectItem>
                <SelectItem value="RUNNING">実行中</SelectItem>
                <SelectItem value="PAUSED">一時停止</SelectItem>
                <SelectItem value="COMPLETED">完了</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => mutateTests()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Tests List */}
          <div className="space-y-4">
            {tests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-zinc-500">
                  テストがありません
                </CardContent>
              </Card>
            ) : (
              tests.map((test: ABTest) => (
                <Card key={test.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{test.name}</h3>
                          <Badge className={statusConfig[test.status]?.color}>
                            {statusConfig[test.status]?.label}
                          </Badge>
                          <Badge variant="outline">
                            {testTypeLabels[test.testType]}
                          </Badge>
                        </div>
                        {test.description && (
                          <p className="text-sm text-zinc-500">{test.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>指標: {metricLabels[test.primaryMetric]}</span>
                          <span>対象: {test.targetEntity}/{test.targetField}</span>
                          <span>割当: {test._count?.assignments || 0}件</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {test.status === 'DRAFT' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartTest(test.id)}
                          >
                            <Play className="mr-1 h-3 w-3" />
                            開始
                          </Button>
                        )}
                        {test.status === 'RUNNING' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStopTest(test.id)}
                            >
                              <Pause className="mr-1 h-3 w-3" />
                              停止
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleCompleteTest(test.id)}
                            >
                              <CheckCircle className="mr-1 h-3 w-3" />
                              完了
                            </Button>
                          </>
                        )}
                        {test.status === 'PAUSED' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartTest(test.id)}
                          >
                            <Play className="mr-1 h-3 w-3" />
                            再開
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTest(test)}
                        >
                          <BarChart3 className="mr-1 h-3 w-3" />
                          詳細
                        </Button>
                        {test.status !== 'RUNNING' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteTest(test.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Variants Summary */}
                    {test.variants && test.variants.length > 0 && (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {test.variants.map((variant) => {
                          const convRate = variant.views > 0
                            ? (variant.sales / variant.views * 100).toFixed(2)
                            : '0.00';
                          return (
                            <div
                              key={variant.id}
                              className={`rounded-lg border p-3 ${
                                variant.isControl ? 'bg-zinc-50 dark:bg-zinc-900' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{variant.name}</span>
                                  {variant.isControl && (
                                    <Badge variant="secondary">コントロール</Badge>
                                  )}
                                </div>
                                <span className="text-sm text-zinc-500">
                                  {variant.weight}%
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-4 text-sm">
                                <span>閲覧: {variant.views}</span>
                                <span>購入: {variant.sales}</span>
                                <span className="font-medium">
                                  CVR: {convRate}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Conclusion */}
                    {test.status === 'COMPLETED' && test.conclusion && (
                      <div className="mt-4 rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                        <div className="flex items-center gap-2">
                          {test.isSignificant ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-zinc-400" />
                          )}
                          <span className="text-sm">{test.conclusion}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>テスト結果サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-zinc-500 py-8">
                テストを選択すると詳細な結果分析が表示されます
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Detail Dialog */}
      {selectedTest && (
        <Dialog open={!!selectedTest} onOpenChange={() => setSelectedTest(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTest.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>ステータス</Label>
                  <div className="mt-1">
                    <Badge className={statusConfig[selectedTest.status]?.color}>
                      {statusConfig[selectedTest.status]?.label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label>テストタイプ</Label>
                  <p className="mt-1">{testTypeLabels[selectedTest.testType]}</p>
                </div>
                <div>
                  <Label>成功指標</Label>
                  <p className="mt-1">{metricLabels[selectedTest.primaryMetric]}</p>
                </div>
                <div>
                  <Label>最小サンプルサイズ</Label>
                  <p className="mt-1">{selectedTest.minSampleSize}</p>
                </div>
              </div>

              {selectedTest.description && (
                <div>
                  <Label>説明</Label>
                  <p className="mt-1 text-sm text-zinc-600">{selectedTest.description}</p>
                </div>
              )}

              <div>
                <Label>バリアント</Label>
                <div className="mt-2 space-y-2">
                  {selectedTest.variants.map((variant) => {
                    const convRate = variant.views > 0
                      ? (variant.sales / variant.views * 100).toFixed(2)
                      : '0.00';
                    return (
                      <div
                        key={variant.id}
                        className="rounded-lg border p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{variant.name}</span>
                          <div className="flex items-center gap-2">
                            {variant.isControl && (
                              <Badge variant="secondary">コントロール</Badge>
                            )}
                            <span className="text-sm">{variant.weight}%</span>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-zinc-500">閲覧</span>
                            <p className="font-medium">{variant.views}</p>
                          </div>
                          <div>
                            <span className="text-zinc-500">購入</span>
                            <p className="font-medium">{variant.sales}</p>
                          </div>
                          <div>
                            <span className="text-zinc-500">CVR</span>
                            <p className="font-medium">{convRate}%</p>
                          </div>
                          <div>
                            <span className="text-zinc-500">配分</span>
                            <p className="font-medium">{variant.weight}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedTest.conclusion && (
                <div>
                  <Label>結論</Label>
                  <div className="mt-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900">
                    <p className="text-sm">{selectedTest.conclusion}</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

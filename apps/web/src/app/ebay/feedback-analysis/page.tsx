'use client';

/**
 * eBay評価分析・改善ページ
 * Phase 126: フィードバック分析、AI改善提案、トレンド分析
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
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Sparkles,
  Target,
  BarChart3,
  Loader2,
  Clock,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

export default function EbayFeedbackAnalysisPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [responseTone, setResponseTone] = useState('professional');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: dashboard } = useSWR(`${API_BASE}/ebay-feedback-analysis/dashboard`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay-feedback-analysis/trends`, fetcher);
  const { data: categoryData } = useSWR(`${API_BASE}/ebay-feedback-analysis/by-category`, fetcher);
  const { data: sentiment } = useSWR(`${API_BASE}/ebay-feedback-analysis/sentiment`, fetcher);
  const { data: improvements } = useSWR(`${API_BASE}/ebay-feedback-analysis/improvements`, fetcher);
  const { data: forecast } = useSWR(`${API_BASE}/ebay-feedback-analysis/forecast`, fetcher);
  const { data: benchmark } = useSWR(`${API_BASE}/ebay-feedback-analysis/benchmark`, fetcher);

  const handleGenerateResponse = async () => {
    if (!selectedFeedback) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-feedback-analysis/generate-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: selectedFeedback.id,
          comment: selectedFeedback.comment,
          rating: selectedFeedback.rating,
          tone: responseTone,
        }),
      });
      const data = await res.json();
      setGeneratedResponse(data.suggestedResponse);
    } catch (error) {
      console.error('Generate response failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const openResponseDialog = (feedback: any) => {
    setSelectedFeedback(feedback);
    setGeneratedResponse('');
    setResponseDialogOpen(true);
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'POSITIVE':
        return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'NEGATIVE':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'DECLINING':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800',
      HIGH: 'bg-orange-100 text-orange-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-green-100 text-green-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'TOP_PERFORMER':
        return 'text-green-600';
      case 'ABOVE_AVERAGE':
        return 'text-blue-600';
      case 'BELOW_AVERAGE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8" />
            評価分析
          </h1>
          <p className="text-muted-foreground">
            フィードバック分析・改善提案
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="trends">トレンド</TabsTrigger>
          <TabsTrigger value="categories">カテゴリ分析</TabsTrigger>
          <TabsTrigger value="improvements">改善提案</TabsTrigger>
          <TabsTrigger value="benchmark">ベンチマーク</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">ポジティブ率</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.positiveRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  過去30日間
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">総フィードバック</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.totalFeedback || 0}</div>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600">+{dashboard?.stats?.positiveFeedback || 0}</span>
                  <span className="text-yellow-600">{dashboard?.stats?.neutralFeedback || 0}</span>
                  <span className="text-red-600">-{dashboard?.stats?.negativeFeedback || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">未対応</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{dashboard?.stats?.unrespondedCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  要対応フィードバック
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">平均応答時間</CardTitle>
                <Clock className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard?.stats?.averageResponseTime || 'N/A'}</div>
              </CardContent>
            </Card>
          </div>

          {/* スコア予測 */}
          {dashboard?.scoreForecast && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>スコア予測</CardTitle>
                  {getTrendIcon(dashboard.scoreForecast.trend)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">現在</div>
                    <div className="text-2xl font-bold">{dashboard.stats.positiveRate}%</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">30日後予測</div>
                    <div className="text-2xl font-bold">{dashboard.scoreForecast.next30Days}%</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">90日後予測</div>
                    <div className="text-2xl font-bold">{dashboard.scoreForecast.next90Days}%</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="outline">信頼度: {dashboard.scoreForecast.confidence}</Badge>
                  <Badge variant={dashboard.scoreForecast.trend === 'IMPROVING' ? 'default' : dashboard.scoreForecast.trend === 'DECLINING' ? 'destructive' : 'secondary'}>
                    {dashboard.scoreForecast.trend === 'IMPROVING' ? '改善傾向' : dashboard.scoreForecast.trend === 'DECLINING' ? '悪化傾向' : '安定'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 緊急対応が必要なフィードバック */}
          {dashboard?.urgentActions?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  要対応フィードバック
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.urgentActions.map((action: any) => (
                    <div key={action.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {getRatingIcon(action.rating)}
                        <div>
                          <div className="font-medium">{action.buyerUsername || 'Anonymous'}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">{action.comment}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {action.daysSinceReceived}日前
                          </div>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => openResponseDialog(action)}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI返信
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 改善提案サマリー */}
          {dashboard?.improvements?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  改善提案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.improvements.map((imp: any) => (
                    <div key={imp.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge className={getPriorityColor(imp.priority)}>{imp.priority}</Badge>
                        <div>
                          <div className="font-medium">{imp.title}</div>
                          <div className="text-sm text-muted-foreground">{imp.expectedImpact}</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* トレンド */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>評価トレンド（過去90日）</CardTitle>
                {trends?.trend && getTrendIcon(trends.trend)}
              </div>
            </CardHeader>
            <CardContent>
              {/* ポジティブ率トレンドグラフ */}
              <div className="h-[200px] flex items-end gap-1 mb-4">
                {trends?.positiveRateTrend?.map((week: any, idx: number) => {
                  const rate = parseFloat(week.rate);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${rate * 2}px` }}
                        title={`${week.weekStart}: ${week.rate}%`}
                      />
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {week.weekStart.split('-').slice(1).join('/')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">総フィードバック</div>
                  <div className="text-2xl font-bold">{trends?.summary?.totalFeedback || 0}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">平均ポジティブ率</div>
                  <div className="text-2xl font-bold">{trends?.summary?.averagePositiveRate || 0}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 週別データ */}
          <Card>
            <CardHeader>
              <CardTitle>週別詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trends?.weeklyData?.map((week: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="font-medium">{week.weekStart}</div>
                    <div className="flex items-center gap-4">
                      <span className="text-green-600">+{week.positive}</span>
                      <span className="text-yellow-600">{week.neutral}</span>
                      <span className="text-red-600">-{week.negative}</span>
                      <Badge variant="outline">
                        {week.total > 0 ? ((week.positive / week.total) * 100).toFixed(1) : 100}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* カテゴリ分析 */}
        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 問題領域 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  問題領域
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData?.problemAreas?.length > 0 ? (
                  <div className="space-y-3">
                    {categoryData.problemAreas.map((area: any) => (
                      <div key={area.category} className="p-3 border border-red-200 rounded-lg bg-red-50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{area.name}</div>
                          <Badge variant="destructive">{area.negativeCount}件</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">問題領域はありません</p>
                )}
              </CardContent>
            </Card>

            {/* 強み */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  強み
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData?.strengths?.length > 0 ? (
                  <div className="space-y-3">
                    {categoryData.strengths.map((strength: any) => (
                      <div key={strength.category} className="p-3 border border-green-200 rounded-lg bg-green-50">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{strength.name}</div>
                          <Badge className="bg-green-500">{strength.positiveCount}件</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">データがありません</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 改善推奨 */}
          {categoryData?.recommendations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>改善推奨</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{rec.categoryName}</Badge>
                      </div>
                      <div className="text-sm text-red-600 mb-2">{rec.issue}</div>
                      <div className="text-sm">{rec.suggestion}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* センチメント分析 */}
          <Card>
            <CardHeader>
              <CardTitle>センチメント分析</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2 mb-4">
                <div className="text-center p-3 bg-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{sentiment?.distribution?.veryPositive || 0}</div>
                  <div className="text-xs text-green-600">非常にポジティブ</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{sentiment?.distribution?.positive || 0}</div>
                  <div className="text-xs text-green-500">ポジティブ</div>
                </div>
                <div className="text-center p-3 bg-gray-100 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{sentiment?.distribution?.neutral || 0}</div>
                  <div className="text-xs text-gray-500">ニュートラル</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{sentiment?.distribution?.negative || 0}</div>
                  <div className="text-xs text-red-500">ネガティブ</div>
                </div>
                <div className="text-center p-3 bg-red-100 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{sentiment?.distribution?.veryNegative || 0}</div>
                  <div className="text-xs text-red-600">非常にネガティブ</div>
                </div>
              </div>

              {/* よく使われるキーワード */}
              {sentiment?.topKeywords?.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">よく使われるキーワード</div>
                  <div className="flex flex-wrap gap-2">
                    {sentiment.topKeywords.slice(0, 15).map((kw: any) => (
                      <Badge key={kw.keyword} variant="outline">
                        {kw.keyword} ({kw.count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 改善提案 */}
        <TabsContent value="improvements" className="space-y-4">
          {improvements?.byPriority?.map((priorityGroup: any) => (
            priorityGroup.items?.length > 0 && (
              <Card key={priorityGroup.priority}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge className={getPriorityColor(priorityGroup.priority)}>{priorityGroup.name}</Badge>
                    <span className="text-muted-foreground text-sm">- {priorityGroup.impact}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {priorityGroup.items.map((item: any) => (
                      <div key={item.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground mt-1">{item.description}</div>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">工数: {item.effort}</Badge>
                              <Badge variant="outline">{item.expectedImpact}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          ))}

          {/* クイックウィン */}
          {improvements?.quickWins?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  クイックウィン（低工数で高効果）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {improvements.quickWins.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                      <div>
                        <div className="font-medium">{item.title}</div>
                        <div className="text-sm text-muted-foreground">{item.expectedImpact}</div>
                      </div>
                      <Badge className="bg-green-500">実施推奨</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ベンチマーク */}
        <TabsContent value="benchmark" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>あなたの評価</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-muted rounded-lg">
                    <div className="text-4xl font-bold">{benchmark?.yourStats?.positiveRate || 0}%</div>
                    <div className="text-sm text-muted-foreground">ポジティブ率</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{benchmark?.yourStats?.totalFeedback || 0}</div>
                      <div className="text-xs text-muted-foreground">総フィードバック</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-xl font-bold">{benchmark?.yourStats?.responseRate || 0}%</div>
                      <div className="text-xs text-muted-foreground">返信率</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>業界ベンチマーク</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>業界平均</span>
                    <span className="font-bold">{benchmark?.industryBenchmarks?.averagePositiveRate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>トップセラー</span>
                    <span className="font-bold">{benchmark?.industryBenchmarks?.topSellerRate || 0}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span>平均返信率</span>
                    <span className="font-bold">{benchmark?.industryBenchmarks?.responseRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 比較結果 */}
          <Card>
            <CardHeader>
              <CardTitle>パフォーマンス評価</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-6">
                <div className={`text-2xl font-bold ${getPerformanceColor(benchmark?.comparison?.performance)}`}>
                  {benchmark?.comparison?.performance === 'TOP_PERFORMER' ? 'トップパフォーマー' :
                   benchmark?.comparison?.performance === 'ABOVE_AVERAGE' ? '平均以上' : '平均以下'}
                </div>
                <div className="text-muted-foreground mt-2">
                  業界平均との差: {benchmark?.comparison?.positiveRateVsAverage > 0 ? '+' : ''}{benchmark?.comparison?.positiveRateVsAverage}%
                </div>
              </div>

              {benchmark?.recommendations?.length > 0 && (
                <div className="mt-6">
                  <div className="font-medium mb-3">推奨アクション</div>
                  <div className="space-y-2">
                    {benchmark.recommendations.map((rec: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                        <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 目標分析 */}
          {forecast?.targetAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>目標達成分析</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">目標レート</div>
                    <div className="text-2xl font-bold">{forecast.targetAnalysis.targetRate}</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">現在とのギャップ</div>
                    <div className="text-2xl font-bold text-orange-600">{forecast.targetAnalysis.currentGap}%</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">必要な連続ポジティブ</div>
                    <div className="text-2xl font-bold">{forecast.targetAnalysis.neededConsecutivePositive}件</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* AI返信生成ダイアログ */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI返信生成</DialogTitle>
            <DialogDescription>
              フィードバックに対する返信を生成します
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFeedback && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getRatingIcon(selectedFeedback.rating)}
                  <span className="font-medium">{selectedFeedback.buyerUsername || 'Anonymous'}</span>
                </div>
                <div className="text-sm">{selectedFeedback.comment}</div>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium">トーン</div>
              <Select value={responseTone} onValueChange={setResponseTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apologetic">謝罪的</SelectItem>
                  <SelectItem value="professional">プロフェッショナル</SelectItem>
                  <SelectItem value="friendly">フレンドリー</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerateResponse} disabled={isGenerating} className="w-full">
              {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Sparkles className="h-4 w-4 mr-2" />
              返信を生成
            </Button>

            {generatedResponse && (
              <div className="space-y-2">
                <div className="text-sm font-medium">生成された返信</div>
                <Textarea
                  value={generatedResponse}
                  onChange={e => setGeneratedResponse(e.target.value)}
                  rows={6}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {generatedResponse.length} / 500文字
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
              キャンセル
            </Button>
            {generatedResponse && (
              <Button>
                返信を送信
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

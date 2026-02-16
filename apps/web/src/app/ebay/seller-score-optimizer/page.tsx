'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Settings,
  BarChart3,
  Star,
  Target,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  ThumbsUp,
  Zap,
  ArrowUpRight,
  Shield,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SellerScoreOptimizerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: overview } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/dashboard/overview`, fetcher);
  const { data: metrics } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/dashboard/metrics`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/dashboard/alerts`, fetcher);
  const { data: scoreBreakdown } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/scores/breakdown`, fetcher);
  const { data: improvements } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/improvements`, fetcher);
  const { data: feedback } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/feedback`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/analytics/trends`, fetcher);
  const { data: benchmarks } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/analytics/benchmarks`, fetcher);
  const { data: settings } = useSWR(`${API_BASE}/ebay/seller-score-optimizer/settings/general`, fetcher);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-violet-600">Seller Score Optimizer</h1>
          <p className="text-muted-foreground">セラースコア最適化・パフォーマンス向上</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="metrics">指標</TabsTrigger>
          <TabsTrigger value="improvements">改善提案</TabsTrigger>
          <TabsTrigger value="feedback">フィードバック</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        {/* ダッシュボード */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-2 border-violet-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">総合スコア</CardTitle>
                <Award className="h-4 w-4 text-violet-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-violet-600">{overview?.overallScore || 0}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {overview?.scoreTrend > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  {overview?.scoreTrend > 0 ? '+' : ''}{overview?.scoreTrend || 0} vs 前回
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">レベル</CardTitle>
                <Shield className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.scoreLevel || '-'}</div>
                <p className="text-xs text-muted-foreground">
                  ランキング: {overview?.ranking || '-'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">次のマイルストーン</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">{overview?.nextMilestone || '-'}</div>
                <Progress value={overview?.nextMilestoneProgress || 0} className="h-2 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">前回スコア</CardTitle>
                <BarChart3 className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.previousScore || 0}</div>
                <p className="text-xs text-muted-foreground">
                  更新: {overview?.lastUpdated?.split(' ')[0] || '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>主要指標</CardTitle>
                <CardDescription>パフォーマンス指標の状態</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.metrics?.map((metric: any) => (
                    <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Star className={`h-5 w-5 ${metric.status === 'excellent' ? 'text-yellow-500 fill-yellow-500' : metric.status === 'good' ? 'text-yellow-500' : 'text-gray-400'}`} />
                        <div>
                          <p className="font-medium">{metric.name}</p>
                          <p className="text-sm text-muted-foreground">目標: {metric.target}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{metric.score}</span>
                        <Badge className={getStatusColor(metric.status)}>
                          {metric.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>アラート</CardTitle>
                <CardDescription>注意が必要な項目</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts?.alerts?.map((alert: any) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {alert.priority === 'medium' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : alert.priority === 'info' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-sm text-muted-foreground">{alert.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>スコア内訳</CardTitle>
              <CardDescription>各カテゴリの詳細スコア</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {scoreBreakdown?.breakdown && Object.entries(scoreBreakdown.breakdown).map(([key, value]: [string, any]) => (
                  <div key={key} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <span className="font-bold">{value.score}/{value.weight}</span>
                    </div>
                    <Progress value={(value.score / value.weight) * 100} className="h-2 mb-2" />
                    <div className="space-y-1">
                      {value.details?.map((detail: any) => (
                        <div key={detail.metric} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{detail.metric}</span>
                          <span>{detail.score}/{detail.weight}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 指標 */}
        <TabsContent value="metrics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>パフォーマンス指標詳細</CardTitle>
              <CardDescription>各指標のスコアと目標</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>指標</TableHead>
                    <TableHead>現在のスコア</TableHead>
                    <TableHead>目標</TableHead>
                    <TableHead>進捗</TableHead>
                    <TableHead>ステータス</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics?.metrics?.map((metric: any) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium">{metric.name}</TableCell>
                      <TableCell className="text-xl font-bold">{metric.score}</TableCell>
                      <TableCell>{metric.target}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={(metric.score / 5) * 100} className="w-24 h-2" />
                          <span className="text-sm">{((metric.score / 5) * 100).toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(metric.status)}>
                          {metric.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 改善提案 */}
        <TabsContent value="improvements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>改善提案</CardTitle>
              <CardDescription>スコア向上のための推奨アクション</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {improvements?.improvements?.map((improvement: any) => (
                  <div key={improvement.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Zap className={`h-5 w-5 ${improvement.impact === 'high' ? 'text-red-500' : improvement.impact === 'medium' ? 'text-yellow-500' : 'text-green-500'}`} />
                        <div>
                          <p className="font-medium">{improvement.title}</p>
                          <p className="text-sm text-muted-foreground">{improvement.metric.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getImpactColor(improvement.impact)}>
                          {improvement.impact} impact
                        </Badge>
                        <Badge variant="outline">{improvement.effort} effort</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                        <span>予想改善: +{improvement.potentialGain}</span>
                      </div>
                      <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                        適用
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* フィードバック */}
        <TabsContent value="feedback" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">総フィードバック</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{feedback?.summary?.total || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ポジティブ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{feedback?.summary?.positive || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ニュートラル</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{feedback?.summary?.neutral || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ポジティブ率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-600">{feedback?.summary?.positiveRate || 0}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>最近のフィードバック</CardTitle>
              <CardDescription>バイヤーからの評価</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>注文ID</TableHead>
                    <TableHead>評価</TableHead>
                    <TableHead>コメント</TableHead>
                    <TableHead>日付</TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback?.feedback?.map((fb: any) => (
                    <TableRow key={fb.id}>
                      <TableCell className="font-medium">{fb.orderId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < fb.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{fb.comment || '-'}</TableCell>
                      <TableCell>{fb.date}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 分析 */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ベンチマーク</CardTitle>
              <CardDescription>レベル要件と現在の状況</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-6 w-6 text-yellow-500" />
                      <span className="text-lg font-bold">Top Rated</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">達成済み</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>必要スコア:</span>
                      <span>97</span>
                    </div>
                    <div className="flex justify-between">
                      <span>あなたのスコア:</span>
                      <span className="font-bold">{benchmarks?.benchmarks?.topRated?.yourScore || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="h-6 w-6 text-purple-500" />
                      <span className="text-lg font-bold">Top Rated Plus</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">あと少し</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>必要スコア:</span>
                      <span>99</span>
                    </div>
                    <div className="flex justify-between">
                      <span>あなたのスコア:</span>
                      <span className="font-bold">{benchmarks?.benchmarks?.topRatedPlus?.yourScore || 0}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>ギャップ:</span>
                      <span>-{benchmarks?.benchmarks?.topRatedPlus?.requirements?.find((r: any) => !r.met)?.gap || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>スコアトレンド</CardTitle>
              <CardDescription>過去6ヶ月の推移</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月</TableHead>
                    <TableHead>総合</TableHead>
                    <TableHead>商品説明</TableHead>
                    <TableHead>コミュニケーション</TableHead>
                    <TableHead>出荷スピード</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trends?.trend?.map((t: any) => (
                    <TableRow key={t.month}>
                      <TableCell className="font-medium">{t.month}</TableCell>
                      <TableCell className="font-bold">{t.overall}</TableCell>
                      <TableCell>{t.itemDesc}</TableCell>
                      <TableCell>{t.comm}</TableCell>
                      <TableCell>{t.shipTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 設定 */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>一般設定</CardTitle>
              <CardDescription>通知とレポートの設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">スコア変更通知</p>
                  <p className="text-sm text-muted-foreground">スコアが変更された場合に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnScoreChange || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">フィードバック通知</p>
                  <p className="text-sm text-muted-foreground">新しいフィードバックを通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnFeedback || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">マイルストーン通知</p>
                  <p className="text-sm text-muted-foreground">目標達成時に通知</p>
                </div>
                <Switch checked={settings?.settings?.notifyOnMilestone || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">週次レポート</p>
                  <p className="text-sm text-muted-foreground">毎週のスコアレポート</p>
                </div>
                <Switch checked={settings?.settings?.weeklyReport || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">月次レポート</p>
                  <p className="text-sm text-muted-foreground">毎月の詳細レポート</p>
                </div>
                <Switch checked={settings?.settings?.monthlyReport || false} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">アラートしきい値</p>
                  <p className="text-sm text-muted-foreground">この値以上の変動でアラート</p>
                </div>
                <Input
                  type="number"
                  step="0.1"
                  value={settings?.settings?.alertThreshold || 0.5}
                  className="w-24"
                />
              </div>
              <Button className="bg-violet-600 hover:bg-violet-700">
                設定を保存
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

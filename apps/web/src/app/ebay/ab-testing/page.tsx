
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Phase 277: eBay A/B Testing Platform（A/Bテストプラットフォーム）
// テーマカラー: teal-600

export default function EbayAbTestingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { data: dashboardData } = useSWR('/api/ebay-ab-testing/dashboard', fetcher);
  const { data: experimentsData } = useSWR('/api/ebay-ab-testing/experiments', fetcher);
  const { data: templatesData } = useSWR('/api/ebay-ab-testing/templates', fetcher);
  const { data: settingsData } = useSWR('/api/ebay-ab-testing/settings', fetcher);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'TITLE': return 'タイトル';
      case 'PRICE': return '価格';
      case 'IMAGE': return '画像';
      case 'DESCRIPTION': return '説明';
      case 'SHIPPING': return '配送';
      default: return type;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-teal-600">A/Bテストプラットフォーム</h1>
        <p className="text-gray-600">リスティングの最適化テストを実施</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="experiments">実験</TabsTrigger>
          <TabsTrigger value="results">結果</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
          <TabsTrigger value="settings">設定</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">実行中の実験</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-teal-600">{dashboardData?.activeExperiments || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">完了した実験</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.completedExperiments || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">平均リフト</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">+{dashboardData?.avgLiftPercent || 0}%</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-600">成功テスト</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{dashboardData?.recentWins || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>アクティブな実験</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'Title Optimization', type: 'TITLE', progress: 65, daysLeft: 5 },
                    { name: 'Price Testing', type: 'PRICE', progress: 40, daysLeft: 8 },
                    { name: 'Image A/B', type: 'IMAGE', progress: 80, daysLeft: 3 },
                  ].map((exp) => (
                    <div key={exp.name} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <div className="font-medium">{exp.name}</div>
                        <Badge variant="outline">{getTypeLabel(exp.type)}</Badge>
                      </div>
                      <Progress value={exp.progress} className="h-2 mb-1" />
                      <div className="text-sm text-gray-500">{exp.progress}% 完了 • 残り{exp.daysLeft}日</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>インサイト</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded"><p className="text-sm font-medium text-green-800">勝者決定</p><p className="text-sm text-green-700">Title Test Aで25%のコンバージョン改善</p></div>
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded"><p className="text-sm font-medium text-blue-800">推奨</p><p className="text-sm text-blue-700">価格テストの継続をお勧めします</p></div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded"><p className="text-sm font-medium text-yellow-800">有意差検出</p><p className="text-sm text-yellow-700">Image A/Bで統計的有意差を検出</p></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="experiments">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>実験一覧</CardTitle><Button className="bg-teal-600 hover:bg-teal-700">新規実験</Button></div></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input placeholder="検索..." className="max-w-sm" />
                <Select><SelectTrigger className="w-48"><SelectValue placeholder="タイプ" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">すべて</SelectItem>
                    <SelectItem value="TITLE">タイトル</SelectItem>
                    <SelectItem value="PRICE">価格</SelectItem>
                    <SelectItem value="IMAGE">画像</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                {experimentsData?.experiments?.map((exp: any) => (
                  <div key={exp.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center font-bold text-teal-600">{exp.variants}</div>
                      <div><div className="font-medium">{exp.name}</div><div className="flex gap-2 text-sm text-gray-500"><Badge variant="outline">{getTypeLabel(exp.type)}</Badge><span>{exp.startDate}</span></div></div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right"><div className="font-medium">{exp.traffic}</div><div className="text-sm text-gray-500">トラフィック</div></div>
                      <Badge className={exp.status === 'RUNNING' ? 'bg-green-100 text-green-700' : exp.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}>{exp.status}</Badge>
                      <Button variant="outline" size="sm">詳細</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Card>
            <CardHeader><CardTitle>実験結果</CardTitle><CardDescription>完了した実験の結果を確認</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Title Test A', type: 'TITLE', winner: 'Variant A', lift: 25.3, significance: 98.5 },
                  { name: 'Price Point Test', type: 'PRICE', winner: 'Variant B', lift: 15.2, significance: 95.0 },
                  { name: 'Main Image Test', type: 'IMAGE', winner: 'Control', lift: 0, significance: 45.0 },
                ].map((result) => (
                  <div key={result.name} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div><div className="font-medium">{result.name}</div><Badge variant="outline">{getTypeLabel(result.type)}</Badge></div>
                      <Badge className={result.lift > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100'}>{result.lift > 0 ? `+${result.lift}%` : 'なし'}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div><div className="text-sm text-gray-500">勝者</div><div className="font-medium">{result.winner}</div></div>
                      <div><div className="text-sm text-gray-500">リフト</div><div className="font-medium text-green-600">{result.lift > 0 ? `+${result.lift}%` : '-'}</div></div>
                      <div><div className="text-sm text-gray-500">有意性</div><div className="font-medium">{result.significance}%</div></div>
                    </div>
                    {result.lift > 0 && <div className="mt-3"><Button size="sm" className="bg-teal-600 hover:bg-teal-700">勝者を適用</Button></div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader><div className="flex justify-between"><CardTitle>実験テンプレート</CardTitle><Button className="bg-teal-600 hover:bg-teal-700">テンプレート作成</Button></div></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templatesData?.templates?.map((template: any) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader><CardTitle className="text-lg">{template.name}</CardTitle><Badge variant="outline">{getTypeLabel(template.type)}</Badge></CardHeader>
                    <CardContent><p className="text-sm text-gray-600 mb-3">{template.description}</p><div className="flex justify-between items-center"><span className="text-sm text-gray-500">{template.usageCount}回使用</span><Button variant="outline" size="sm">使用する</Button></div></CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>タイプ別パフォーマンス</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ type: 'TITLE', experiments: 12, avgLift: 15.2 },{ type: 'PRICE', experiments: 8, avgLift: 10.5 },{ type: 'IMAGE', experiments: 5, avgLift: 8.3 },{ type: 'DESCRIPTION', experiments: 3, avgLift: 5.1 }].map((item) => (
                    <div key={item.type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div><div className="font-medium">{getTypeLabel(item.type)}</div><div className="text-sm text-gray-500">{item.experiments}件の実験</div></div>
                      <div className="text-right"><div className="font-bold text-green-600">+{item.avgLift}%</div><div className="text-sm text-gray-500">平均リフト</div></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>ベストプラクティス</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[{ category: 'TITLE', finding: '具体的な数字を含むタイトルは平均18%高いCTR', confidence: 'high' },{ category: 'PRICE', finding: '99円価格帯は端数なしより5%高いコンバージョン', confidence: 'medium' },{ category: 'IMAGE', finding: '白背景の画像は他の背景より12%高いCTR', confidence: 'high' }].map((bp, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1"><Badge variant="outline">{getTypeLabel(bp.category)}</Badge><Badge className={bp.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>{bp.confidence === 'high' ? '高信頼' : '中信頼'}</Badge></div>
                      <p className="text-sm">{bp.finding}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>基本設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div><label className="text-sm font-medium">デフォルト実験期間（日）</label><Input type="number" defaultValue={settingsData?.defaultDuration} /></div>
                <div><label className="text-sm font-medium">最小サンプルサイズ</label><Input type="number" defaultValue={settingsData?.minSampleSize} /></div>
                <div><label className="text-sm font-medium">有意水準</label><Input type="number" step="0.01" defaultValue={settingsData?.significanceLevel} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>自動化設定</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><div className="font-medium">有意差で自動停止</div><div className="text-sm text-gray-500">統計的有意差が出たら自動停止</div></div><Badge variant={settingsData?.autoStopOnSignificance ? "default" : "secondary"}>{settingsData?.autoStopOnSignificance ? 'ON' : 'OFF'}</Badge></div>
                <div className="flex items-center justify-between"><div><div className="font-medium">完了通知</div><div className="text-sm text-gray-500">実験完了時に通知</div></div><Badge variant={settingsData?.notifyOnCompletion ? "default" : "secondary"}>{settingsData?.notifyOnCompletion ? 'ON' : 'OFF'}</Badge></div>
              </CardContent>
            </Card>
          </div>
          <div className="mt-6 flex justify-end"><Button className="bg-teal-600 hover:bg-teal-700">設定を保存</Button></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

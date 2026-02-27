// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle,
  LayoutDashboard,
  Settings2,
  FileText,
  Send,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Plus,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function FeedbackResponsePage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="h-8 w-8 text-violet-600" />
            Feedback Response Manager
          </h1>
          <p className="text-muted-foreground mt-1">フィードバック返信管理</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Send className="mr-2 h-4 w-4" />
          一括返信
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            フィードバック
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            テンプレート
          </TabsTrigger>
          <TabsTrigger value="auto-reply" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            自動返信
          </TabsTrigger>
          <TabsTrigger value="negative" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            ネガティブ
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="feedback">
          <FeedbackTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="auto-reply">
          <AutoReplyTab />
        </TabsContent>
        <TabsContent value="negative">
          <NegativeTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/feedback-response/dashboard/overview`, fetcher);
  const { data: recent } = useSWR(`${API_BASE}/ebay/feedback-response/dashboard/recent`, fetcher);
  const { data: trends } = useSWR(`${API_BASE}/ebay/feedback-response/dashboard/trends`, fetcher);

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'neutral':
        return <Minus className="h-4 w-4 text-yellow-600" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総フィードバック</CardTitle>
            <MessageCircle className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalFeedback?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ポジティブ率: {overview?.positiveRate}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ポジティブ</CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview?.positive?.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ニュートラル: {overview?.neutral} / ネガティブ: {overview?.negative}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">未返信</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.pendingResponse}</div>
            <p className="text-xs text-muted-foreground">今日返信: {overview?.respondedToday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均返信時間</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">目標: 4時間以内</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近のフィードバック</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent?.feedback?.map((fb: any) => (
                <div key={fb.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getRatingIcon(fb.rating)}
                    <div>
                      <p className="font-medium">{fb.buyer}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">{fb.comment}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {fb.responded ? (
                      <Badge className="bg-green-100 text-green-800">返信済み</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">未返信</Badge>
                    )}
                    {!fb.responded && (
                      <Button variant="ghost" size="sm" className="text-violet-600">
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>週間トレンド</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends?.weekly?.map((week: any) => (
                <div key={week.week} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{week.week}</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3 text-green-600" />
                      <span className="text-sm">{week.positive}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Minus className="h-3 w-3 text-yellow-600" />
                      <span className="text-sm">{week.neutral}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsDown className="h-3 w-3 text-red-600" />
                      <span className="text-sm">{week.negative}</span>
                    </div>
                    <Badge variant="outline">{week.rate}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const { data } = useSWR(`${API_BASE}/ebay/feedback-response/feedback`, fetcher);

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800">ポジティブ</Badge>;
      case 'neutral':
        return <Badge className="bg-yellow-100 text-yellow-800">ニュートラル</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800">ネガティブ</Badge>;
      default:
        return <Badge variant="outline">{rating}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>フィードバック一覧</CardTitle>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="評価" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="positive">ポジティブ</SelectItem>
                  <SelectItem value="neutral">ニュートラル</SelectItem>
                  <SelectItem value="negative">ネガティブ</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="返信状態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="responded">返信済み</SelectItem>
                  <SelectItem value="pending">未返信</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>購入者</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>評価</TableHead>
                <TableHead>コメント</TableHead>
                <TableHead>返信状態</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.feedback?.map((fb: any) => (
                <TableRow key={fb.id}>
                  <TableCell className="font-medium">{fb.buyer}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{fb.item}</TableCell>
                  <TableCell>{getRatingBadge(fb.rating)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{fb.comment}</TableCell>
                  <TableCell>
                    {fb.responded ? (
                      <Badge className="bg-green-100 text-green-800">返信済み</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">未返信</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="text-violet-600">
                      <Send className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/feedback-response/templates`, fetcher);

  const getRatingBadge = (rating: string) => {
    switch (rating) {
      case 'positive':
        return <Badge className="bg-green-100 text-green-800">ポジティブ</Badge>;
      case 'neutral':
        return <Badge className="bg-yellow-100 text-yellow-800">ニュートラル</Badge>;
      case 'negative':
        return <Badge className="bg-red-100 text-red-800">ネガティブ</Badge>;
      default:
        return <Badge variant="outline">{rating}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">返信テンプレート</h2>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Plus className="mr-2 h-4 w-4" />
          テンプレート作成
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.templates?.map((template: any) => (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {getRatingBadge(template.rating)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{template.text}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">使用回数: {template.useCount}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AutoReplyTab() {
  const { data } = useSWR(`${API_BASE}/ebay/feedback-response/auto-reply`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>自動返信設定</CardTitle>
          <CardDescription>評価タイプに応じた自動返信を設定</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">自動返信を有効化</p>
              <p className="text-sm text-muted-foreground">新しいフィードバックに自動で返信</p>
            </div>
            <Switch checked={data?.settings?.enabled} />
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">ポジティブ評価</p>
                  <p className="text-sm text-muted-foreground">自動返信: Thank You (Positive)</p>
                </div>
              </div>
              <Switch checked={data?.settings?.positiveEnabled} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Minus className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">ニュートラル評価</p>
                  <p className="text-sm text-muted-foreground">手動対応推奨</p>
                </div>
              </div>
              <Switch checked={data?.settings?.neutralEnabled} />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <ThumbsDown className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">ネガティブ評価</p>
                  <p className="text-sm text-muted-foreground">手動対応必須</p>
                </div>
              </div>
              <Switch checked={data?.settings?.negativeEnabled} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">返信遅延（分）</label>
            <Input type="number" defaultValue={data?.settings?.delay} />
            <p className="text-xs text-muted-foreground">フィードバック受信から返信までの待機時間</p>
          </div>

          <Button className="bg-violet-600 hover:bg-violet-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function NegativeTab() {
  const { data } = useSWR(`${API_BASE}/ebay/feedback-response/negative`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ネガティブフィードバック</CardTitle>
              <CardDescription>
                未解決: {data?.unresolved} / 合計: {data?.total}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data?.negative?.map((fb: any) => (
              <div key={fb.id} className="p-4 border rounded-lg border-red-200 bg-red-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ThumbsDown className="h-5 w-5 text-red-600" />
                    <span className="font-medium">{fb.buyer}</span>
                    <span className="text-sm text-muted-foreground">({fb.orderId})</span>
                  </div>
                  {fb.resolved ? (
                    <Badge className="bg-green-100 text-green-800">解決済み</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">未解決</Badge>
                  )}
                </div>
                <p className="text-sm mb-3">{fb.comment}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{fb.createdAt}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Send className="mr-1 h-4 w-4" />
                      返信
                    </Button>
                    {!fb.resolved && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        解決済み
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/feedback-response/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">フィードバック通知</p>
              <p className="text-sm text-muted-foreground">新しいフィードバック時にメール通知</p>
            </div>
            <Switch checked={data?.settings?.notifyOnFeedback} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">ネガティブ優先通知</p>
              <p className="text-sm text-muted-foreground">ネガティブフィードバックを即座に通知</p>
            </div>
            <Switch checked={data?.settings?.notifyOnNegative} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">ネガティブ優先表示</p>
              <p className="text-sm text-muted-foreground">一覧でネガティブを上位に表示</p>
            </div>
            <Switch checked={data?.settings?.prioritizeNegative} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">返信期限（時間）</label>
            <Input type="number" defaultValue={data?.settings?.responseDeadline} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルト言語</label>
            <Select defaultValue={data?.settings?.defaultLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-violet-600 hover:bg-violet-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

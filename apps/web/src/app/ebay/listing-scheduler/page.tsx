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
import {
  Calendar,
  LayoutDashboard,
  Clock,
  Settings2,
  Zap,
  Play,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Timer,
  RotateCcw,
  FileText,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function ListingSchedulerPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-amber-600" />
            Listing Scheduler
          </h1>
          <p className="text-muted-foreground mt-1">出品スケジューラー・自動公開</p>
        </div>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-2 h-4 w-4" />
          スケジュール作成
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            ダッシュボード
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            スケジュール
          </TabsTrigger>
          <TabsTrigger value="optimal" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            最適時間
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            テンプレート
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            履歴
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            設定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab />
        </TabsContent>
        <TabsContent value="schedules">
          <SchedulesTab />
        </TabsContent>
        <TabsContent value="optimal">
          <OptimalTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/listing-scheduler/dashboard/overview`, fetcher);
  const { data: upcoming } = useSWR(`${API_BASE}/ebay/listing-scheduler/dashboard/upcoming`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総スケジュール</CardTitle>
            <Calendar className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalScheduled}</div>
            <p className="text-xs text-muted-foreground">今週: {overview?.upcomingThisWeek}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日の公開</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview?.publishedToday}</div>
            <p className="text-xs text-muted-foreground">待機中: {overview?.pendingToday}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">失敗</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overview?.failedToday}</div>
            <p className="text-xs text-muted-foreground">成功率: {overview?.avgPublishSuccess}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">最適時間</CardTitle>
            <Zap className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.optimalTimeEnabled ? '有効' : '無効'}
            </div>
            <p className="text-xs text-muted-foreground">AI推奨時間</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>直近の予定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcoming?.upcoming?.map((schedule: any) => (
              <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium">{schedule.title}</p>
                    <p className="text-sm text-muted-foreground">{schedule.marketplace}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm">{schedule.scheduledAt}</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{schedule.status}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="text-green-600">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
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

function SchedulesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/listing-scheduler/schedules`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">待機中</Badge>;
      case 'published':
        return <Badge className="bg-green-100 text-green-800">公開済み</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>スケジュール一覧</CardTitle>
            <div className="flex gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="pending">待機中</SelectItem>
                  <SelectItem value="published">公開済み</SelectItem>
                  <SelectItem value="failed">失敗</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>予定日時</TableHead>
                <TableHead>マーケットプレイス</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.schedules?.map((schedule: any) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.title}</TableCell>
                  <TableCell className="font-mono text-sm">{schedule.sku}</TableCell>
                  <TableCell>{schedule.scheduledAt}</TableCell>
                  <TableCell>{schedule.marketplace}</TableCell>
                  <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="text-green-600">
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

function OptimalTab() {
  const { data: analysis } = useSWR(`${API_BASE}/ebay/listing-scheduler/optimal-time/analysis`, fetcher);
  const { data: suggestions } = useSWR(`${API_BASE}/ebay/listing-scheduler/optimal-time/suggestions`, fetcher);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最適時間分析</CardTitle>
            <CardDescription>過去のデータに基づく推奨時間</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">ベスト時間帯</p>
              <div className="flex gap-2 flex-wrap">
                {analysis?.analysis?.bestHours?.map((hour: number) => (
                  <Badge key={hour} className="bg-amber-100 text-amber-800">
                    {hour}:00
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">ベスト曜日</p>
              <div className="flex gap-2 flex-wrap">
                {analysis?.analysis?.bestDays?.map((day: string) => (
                  <Badge key={day} variant="outline">
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>推奨スケジュール</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions?.suggestions?.map((suggestion: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{suggestion.date} {suggestion.time}</p>
                    <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">
                      スコア: {suggestion.score}
                    </Badge>
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                      使用
                    </Button>
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

function TemplatesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/listing-scheduler/templates`, fetcher);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">スケジュールテンプレート</h2>
        <Button className="bg-amber-600 hover:bg-amber-700">
          <Plus className="mr-2 h-4 w-4" />
          テンプレート作成
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data?.templates?.map((template: any) => (
          <Card key={template.id} className={template.active ? 'border-amber-600' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.active && <Badge className="bg-amber-100 text-amber-800">有効</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">時間</span>
                  <span className="font-medium">{template.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">曜日</span>
                  <span className="font-medium">{template.days?.join(', ')}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  編集
                </Button>
                <Switch checked={template.active} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function HistoryTab() {
  const { data } = useSWR(`${API_BASE}/ebay/listing-scheduler/history`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">成功</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">失敗</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>公開履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品名</TableHead>
                <TableHead>公開日時</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>リスティングID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.history?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.publishedAt}</TableCell>
                  <TableCell>{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.listingId || item.error || '-'}
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

function SettingsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/listing-scheduler/settings/general`, fetcher);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>一般設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">デフォルト時間</label>
            <Input type="time" defaultValue={data?.settings?.defaultTime} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">タイムゾーン</label>
            <Select defaultValue={data?.settings?.timezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                <SelectItem value="America/New_York">America/New_York</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">最適時間を使用</p>
              <p className="text-sm text-muted-foreground">AIが推奨する最適時間に自動調整</p>
            </div>
            <Switch checked={data?.settings?.useOptimalTime} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">失敗時リトライ</p>
              <p className="text-sm text-muted-foreground">公開失敗時に自動リトライ</p>
            </div>
            <Switch checked={data?.settings?.retryOnFail} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">公開時に通知</p>
              <p className="text-sm text-muted-foreground">公開完了時にメール通知</p>
            </div>
            <Switch checked={data?.settings?.notifyOnPublish} />
          </div>

          <Button className="bg-amber-600 hover:bg-amber-700">
            設定を保存
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

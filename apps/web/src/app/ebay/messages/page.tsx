// @ts-nocheck
'use client';

/**
 * Phase 108: eBayメッセージ管理UI
 *
 * 顧客メッセージの送受信・管理
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  Send,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Mail,
  Search,
  ChevronLeft,
  Eye,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

interface Message {
  id: string;
  orderId?: string;
  orderExternalId?: string;
  buyerUsername: string;
  buyerEmail?: string;
  subject: string;
  body: string;
  status: string;
  templateId?: string;
  templateName?: string;
  attempts: number;
  errorMessage?: string;
  createdAt: string;
  sentAt?: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
}

interface DashboardData {
  summary: {
    totalMessages: number;
    pendingMessages: number;
    sentToday: number;
    failedMessages: number;
  };
  byStatus: Record<string, number>;
  recentMessages: Array<{
    id: string;
    buyerUsername: string;
    subject: string;
    status: string;
    templateName?: string;
    createdAt: string;
    sentAt?: string;
  }>;
}

interface StatsData {
  period: { days: number; since: string };
  summary: {
    totalSent: number;
    totalFailed: number;
    successRate: string;
  };
  byDay: Array<{ date: string; count: number }>;
  topTemplates: Array<{
    templateId: string;
    templateName: string;
    count: number;
  }>;
}

interface TemplatesData {
  templates: Template[];
  byCategory: Record<string, Template[]>;
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    PENDING: { variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
    SENT: { variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
    FAILED: { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  };
  const { variant, icon } = variants[status] || { variant: 'outline' as const, icon: null };
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {icon}
      {status}
    </Badge>
  );
}

export default function EbayMessagesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Compose form state
  const [composeData, setComposeData] = useState({
    buyerUsername: '',
    buyerEmail: '',
    subject: '',
    body: '',
    orderId: '',
    templateId: '',
  });

  // Fetch data
  const { data: dashboard, mutate: mutateDashboard } = useSWR<DashboardData>(
    `${API_BASE}/ebay-messages/dashboard`,
    fetcher
  );

  const { data: messagesData, mutate: mutateMessages } = useSWR<{
    messages: Message[];
    total: number;
  }>(
    `${API_BASE}/ebay-messages?status=${statusFilter === 'all' ? '' : statusFilter}&buyerUsername=${searchQuery}`,
    fetcher
  );

  const { data: templatesData } = useSWR<TemplatesData>(
    `${API_BASE}/ebay-messages/templates/list`,
    fetcher
  );

  const { data: stats } = useSWR<StatsData>(
    `${API_BASE}/ebay-messages/stats/summary?days=30`,
    fetcher
  );

  // Send message
  const handleSendMessage = async () => {
    try {
      const res = await fetch(`${API_BASE}/ebay-messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
        body: JSON.stringify({
          buyerUsername: composeData.buyerUsername,
          buyerEmail: composeData.buyerEmail || undefined,
          subject: composeData.subject,
          body: composeData.body,
          orderId: composeData.orderId || undefined,
          templateId: composeData.templateId || undefined,
        }),
      });

      if (res.ok) {
        setIsComposeOpen(false);
        setComposeData({
          buyerUsername: '',
          buyerEmail: '',
          subject: '',
          body: '',
          orderId: '',
          templateId: '',
        });
        mutateDashboard();
        mutateMessages();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  // Retry message
  const handleRetryMessage = async (id: string) => {
    setIsRetrying(true);
    try {
      const res = await fetch(`${API_BASE}/ebay-messages/${id}/retry`, {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
      });

      if (res.ok) {
        mutateDashboard();
        mutateMessages();
        setIsDetailOpen(false);
      }
    } catch (error) {
      console.error('Failed to retry message:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  // Apply template
  const handleApplyTemplate = async (templateId: string) => {
    const template = templatesData?.templates.find((t) => t.id === templateId);
    if (template) {
      setComposeData({
        ...composeData,
        templateId,
        subject: template.subject,
        body: template.body,
      });
    }
  };

  // View message detail
  const handleViewMessage = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/ebay-messages/${id}`, {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'dev-api-key',
        },
      });
      if (res.ok) {
        const message = await res.json();
        setSelectedMessage(message);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch message:', error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/ebay">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              メッセージ管理
            </h1>
            <p className="text-muted-foreground">
              eBay顧客メッセージの送受信・管理
            </p>
          </div>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              新規メッセージ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新規メッセージ作成</DialogTitle>
              <DialogDescription>
                バイヤーにメッセージを送信します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">バイヤーユーザー名 *</label>
                  <Input
                    value={composeData.buyerUsername}
                    onChange={(e) =>
                      setComposeData({ ...composeData, buyerUsername: e.target.value })
                    }
                    placeholder="buyer123"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">メールアドレス</label>
                  <Input
                    type="email"
                    value={composeData.buyerEmail}
                    onChange={(e) =>
                      setComposeData({ ...composeData, buyerEmail: e.target.value })
                    }
                    placeholder="buyer@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">注文ID（任意）</label>
                  <Input
                    value={composeData.orderId}
                    onChange={(e) =>
                      setComposeData({ ...composeData, orderId: e.target.value })
                    }
                    placeholder="ORD-123456"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">テンプレート</label>
                  <Select
                    value={composeData.templateId}
                    onValueChange={handleApplyTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="テンプレートを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {templatesData?.templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">件名 *</label>
                <Input
                  value={composeData.subject}
                  onChange={(e) =>
                    setComposeData({ ...composeData, subject: e.target.value })
                  }
                  placeholder="メッセージの件名"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">本文 *</label>
                <Textarea
                  value={composeData.body}
                  onChange={(e) =>
                    setComposeData({ ...composeData, body: e.target.value })
                  }
                  placeholder="メッセージ本文を入力..."
                  rows={8}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={
                  !composeData.buyerUsername ||
                  !composeData.subject ||
                  !composeData.body
                }
              >
                <Send className="h-4 w-4 mr-2" />
                送信
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
          <TabsTrigger value="messages">メッセージ一覧</TabsTrigger>
          <TabsTrigger value="templates">テンプレート</TabsTrigger>
          <TabsTrigger value="stats">統計</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  総メッセージ数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.summary.totalMessages.toLocaleString() || '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  未送信
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {dashboard?.summary.pendingMessages || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  今日の送信
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {dashboard?.summary.sentToday || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  失敗
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {dashboard?.summary.failedMessages || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>最近のメッセージ</CardTitle>
              <CardDescription>直近10件のメッセージ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.recentMessages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    メッセージがありません
                  </p>
                ) : (
                  dashboard?.recentMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleViewMessage(msg.id)}
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{msg.buyerUsername}</div>
                          <div className="text-sm text-muted-foreground">
                            {msg.subject}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {msg.templateName && (
                          <Badge variant="outline">
                            <FileText className="h-3 w-3 mr-1" />
                            {msg.templateName}
                          </Badge>
                        )}
                        {getStatusBadge(msg.status)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Messages List Tab */}
        <TabsContent value="messages" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="バイヤー名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="PENDING">未送信</SelectItem>
                <SelectItem value="SENT">送信済み</SelectItem>
                <SelectItem value="FAILED">失敗</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => mutateMessages()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Table */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {messagesData?.messages.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    メッセージがありません
                  </p>
                ) : (
                  messagesData?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {msg.buyerUsername}
                            </span>
                            {msg.buyerEmail && (
                              <span className="text-sm text-muted-foreground">
                                ({msg.buyerEmail})
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-medium mt-1">
                            {msg.subject}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {msg.body.substring(0, 100)}...
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {msg.orderExternalId && (
                          <Badge variant="outline">
                            #{msg.orderExternalId}
                          </Badge>
                        )}
                        {msg.templateName && (
                          <Badge variant="secondary">
                            <FileText className="h-3 w-3 mr-1" />
                            {msg.templateName}
                          </Badge>
                        )}
                        {getStatusBadge(msg.status)}
                        <div className="text-sm text-muted-foreground w-24 text-right">
                          {new Date(msg.createdAt).toLocaleDateString('ja-JP')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMessage(msg.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {msg.status === 'FAILED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetryMessage(msg.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <div className="text-sm text-muted-foreground text-right">
            {messagesData?.total || 0} 件
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(templatesData?.byCategory || {}).map(
              ([category, templates]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category}</CardTitle>
                    <CardDescription>
                      {templates.length}件のテンプレート
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {template.subject}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleApplyTemplate(template.id);
                              setIsComposeOpen(true);
                            }}
                          >
                            使用
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
          {Object.keys(templatesData?.byCategory || {}).length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                テンプレートがありません
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  期間内送信数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.summary.totalSent.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  失敗数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {stats?.summary.totalFailed || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  成功率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.summary.successRate || 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Templates */}
          <Card>
            <CardHeader>
              <CardTitle>よく使うテンプレート</CardTitle>
              <CardDescription>過去30日間の使用回数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.topTemplates.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    データがありません
                  </p>
                ) : (
                  stats?.topTemplates.map((t, index) => (
                    <div
                      key={t.templateId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <span>{t.templateName}</span>
                      </div>
                      <Badge variant="secondary">{t.count}回</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Daily Chart */}
          <Card>
            <CardHeader>
              <CardTitle>日別送信数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.byDay.slice(0, 14).map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <span className="w-24 text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString('ja-JP', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{
                          width: `${Math.min(
                            (day.count /
                              Math.max(...(stats?.byDay.map((d) => d.count) || [1]))) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 text-sm font-medium text-right">
                      {day.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>メッセージ詳細</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">
                    {selectedMessage.buyerUsername}
                  </span>
                  {selectedMessage.buyerEmail && (
                    <span className="text-muted-foreground">
                      ({selectedMessage.buyerEmail})
                    </span>
                  )}
                </div>
                {getStatusBadge(selectedMessage.status)}
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">件名</div>
                <div className="font-medium">{selectedMessage.subject}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">本文</div>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">作成日時: </span>
                  {new Date(selectedMessage.createdAt).toLocaleString('ja-JP')}
                </div>
                {selectedMessage.sentAt && (
                  <div>
                    <span className="text-muted-foreground">送信日時: </span>
                    {new Date(selectedMessage.sentAt).toLocaleString('ja-JP')}
                  </div>
                )}
                {selectedMessage.templateName && (
                  <div>
                    <span className="text-muted-foreground">テンプレート: </span>
                    {selectedMessage.templateName}
                  </div>
                )}
                {selectedMessage.attempts > 0 && (
                  <div>
                    <span className="text-muted-foreground">送信試行: </span>
                    {selectedMessage.attempts}回
                  </div>
                )}
              </div>

              {selectedMessage.errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">エラー</span>
                  </div>
                  <div className="text-sm text-red-700 mt-1">
                    {selectedMessage.errorMessage}
                  </div>
                </div>
              )}

              {selectedMessage.status === 'FAILED' && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleRetryMessage(selectedMessage.id)}
                    disabled={isRetrying}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    再送信
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

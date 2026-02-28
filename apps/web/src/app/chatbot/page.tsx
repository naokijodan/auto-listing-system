
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
import { fetcher } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import {
  MessageCircle,
  Bot,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Send,
  Settings,
  RefreshCw,
  User,
} from 'lucide-react';

interface ChatSession {
  id: string;
  sessionKey: string;
  marketplace: string;
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerLocale: string | null;
  status: string;
  lastMessageAt: string | null;
  messageCount: number;
  isEscalated: boolean;
  escalatedAt: string | null;
  escalationReason: string | null;
  createdAt: string;
  _count?: { messages: number };
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  intent: string | null;
  confidence: number | null;
  createdAt: string;
}

interface ChatbotStats {
  totalSessions: number;
  activeSessions: number;
  escalatedSessions: number;
  escalationRate: string;
  todayMessages: number;
  weekMessages: number;
  avgMessagesPerSession: string;
  intentStats: Array<{ intent: string; count: number }>;
  marketplaceStats: Array<{ marketplace: string; count: number }>;
}

interface ChatbotConfig {
  marketplace: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  autoEscalateOnNegativeSentiment: boolean;
  autoEscalateAfterMessages: number;
  escalationKeywords: string[];
  maxMessagesPerSession: number;
  sessionTimeoutMinutes: number;
  isActive: boolean;
}

export default function ChatbotPage() {
  const { t, locale } = useTranslation();
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [operatorMessage, setOperatorMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // データ取得
  const { data: statsData, mutate: mutateStats } = useSWR<{ success: boolean; data: ChatbotStats }>(
    '/api/chatbot/stats',
    fetcher
  );
  const stats = statsData?.data;

  const { data: sessionsData, mutate: mutateSessions } = useSWR<{ success: boolean; data: { sessions: ChatSession[]; total: number } }>(
    `/api/chatbot/sessions${statusFilter ? `?status=${statusFilter}` : ''}`,
    fetcher
  );
  const sessions = sessionsData?.data?.sessions || [];

  const { data: configData, mutate: mutateConfig } = useSWR<{ success: boolean; data: ChatbotConfig }>(
    '/api/chatbot/config?marketplace=default',
    fetcher
  );
  const config = configData?.data;

  const { data: messagesData, mutate: mutateMessages } = useSWR<{ success: boolean; data: ChatMessage[] }>(
    selectedSession ? `/api/chatbot/sessions/${selectedSession.id}/messages` : null,
    fetcher
  );
  const messages = messagesData?.data || [];

  // セッションをエスカレーション
  const handleEscalate = async (sessionId: string) => {
    try {
      await fetch(`/api/chatbot/sessions/${sessionId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual escalation by operator' }),
      });
      mutateSessions();
      mutateStats();
    } catch (error) {
      console.error('Error escalating session:', error);
    }
  };

  // セッションを解決
  const handleResolve = async (sessionId: string) => {
    try {
      await fetch(`/api/chatbot/sessions/${sessionId}/resolve`, { method: 'POST' });
      mutateSessions();
      mutateStats();
      setSelectedSession(null);
    } catch (error) {
      console.error('Error resolving session:', error);
    }
  };

  // オペレーターメッセージを送信
  const handleSendOperatorMessage = async () => {
    if (!selectedSession || !operatorMessage.trim()) return;
    try {
      await fetch(`/api/chatbot/sessions/${selectedSession.id}/operator-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: operatorMessage }),
      });
      setOperatorMessage('');
      mutateMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // 設定を更新
  const handleUpdateConfig = async (updates: Partial<ChatbotConfig>) => {
    try {
      await fetch('/api/chatbot/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace: 'default', ...updates }),
      });
      mutateConfig();
    } catch (error) {
      console.error('Error updating config:', error);
    }
  };

  // デフォルト設定をセットアップ
  const handleSetupDefaults = async () => {
    try {
      await fetch('/api/chatbot/setup-defaults', { method: 'POST' });
      mutateConfig();
    } catch (error) {
      console.error('Error setting up defaults:', error);
    }
  };

  // ステータスバッジを取得
  const getStatusBadge = (status: string, isEscalated: boolean) => {
    if (isEscalated) {
      return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="mr-1 h-3 w-3" />エスカレーション</Badge>;
    }
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800"><MessageCircle className="mr-1 h-3 w-3" />アクティブ</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="mr-1 h-3 w-3" />解決済み</Badge>;
      case 'WAITING':
        return <Badge className="bg-amber-100 text-amber-800"><Clock className="mr-1 h-3 w-3" />待機中</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="mr-1 h-3 w-3" />期限切れ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // メッセージロールのアイコンを取得
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'USER':
        return <User className="h-4 w-4" />;
      case 'ASSISTANT':
        return <Bot className="h-4 w-4" />;
      case 'OPERATOR':
        return <Users className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AIチャットボット</h1>
          <p className="text-sm text-zinc-500">顧客対応の自動化と管理</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleSetupDefaults}>
          <Settings className="mr-2 h-4 w-4" />
          デフォルト設定
        </Button>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総セッション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats?.totalSessions || 0}</span>
            </div>
            <p className="text-xs text-zinc-500">
              アクティブ: {stats?.activeSessions || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本日のメッセージ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">{stats?.todayMessages || 0}</span>
            </div>
            <p className="text-xs text-zinc-500">
              週間: {stats?.weekMessages || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">エスカレーション</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-2xl font-bold">{stats?.escalatedSessions || 0}</span>
            </div>
            <p className="text-xs text-zinc-500">
              率: {stats?.escalationRate || '0'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均メッセージ数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">{stats?.avgMessagesPerSession || '0'}</span>
            </div>
            <p className="text-xs text-zinc-500">セッションあたり</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">セッション管理</TabsTrigger>
          <TabsTrigger value="config">設定</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* セッション一覧 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>チャットセッション</CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="フィルター" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">すべて</SelectItem>
                      <SelectItem value="ACTIVE">アクティブ</SelectItem>
                      <SelectItem value="ESCALATED">エスカレーション</SelectItem>
                      <SelectItem value="RESOLVED">解決済み</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <MessageCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>セッションがありません</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSession?.id === session.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                        onClick={() => setSelectedSession(session)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {session.customerName || session.customerId || 'Anonymous'}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {session.marketplace}
                            </Badge>
                          </div>
                          {getStatusBadge(session.status, session.isEscalated)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>{session.messageCount} messages</span>
                          {session.lastMessageAt && (
                            <span>
                              {new Date(session.lastMessageAt).toLocaleString('ja-JP')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* チャット詳細 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {selectedSession
                      ? `${selectedSession.customerName || 'Anonymous'} との会話`
                      : 'セッションを選択'}
                  </CardTitle>
                  {selectedSession && (
                    <div className="flex items-center gap-2">
                      {!selectedSession.isEscalated && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEscalate(selectedSession.id)}
                        >
                          <ArrowUpRight className="mr-1 h-4 w-4" />
                          エスカレーション
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolve(selectedSession.id)}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        解決
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedSession ? (
                  <div className="space-y-4">
                    {/* メッセージ一覧 */}
                    <div className="space-y-3 max-h-64 overflow-y-auto p-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${
                            msg.role === 'USER' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.role !== 'USER' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                              {getRoleIcon(msg.role)}
                            </div>
                          )}
                          <div
                            className={`max-w-xs p-3 rounded-lg text-sm ${
                              msg.role === 'USER'
                                ? 'bg-blue-500 text-white'
                                : msg.role === 'OPERATOR'
                                ? 'bg-green-100 dark:bg-green-900/20'
                                : 'bg-zinc-100 dark:bg-zinc-800'
                            }`}
                          >
                            {msg.content}
                            {msg.intent && (
                              <div className="mt-1 text-xs opacity-70">
                                Intent: {msg.intent} ({((msg.confidence || 0) * 100).toFixed(0)}%)
                              </div>
                            )}
                          </div>
                          {msg.role === 'USER' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              {getRoleIcon(msg.role)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* オペレーター返信 */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="オペレーターとして返信..."
                        value={operatorMessage}
                        onChange={(e) => setOperatorMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendOperatorMessage();
                          }
                        }}
                      />
                      <Button onClick={handleSendOperatorMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>左側からセッションを選択してください</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>チャットボット設定</CardTitle>
              <CardDescription>AIチャットボットの動作を設定します</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {config ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">チャットボットを有効にする</span>
                      <p className="text-sm text-zinc-500">自動応答を有効/無効にします</p>
                    </div>
                    <Switch
                      checked={config.isActive}
                      onCheckedChange={(isActive) => handleUpdateConfig({ isActive })}
                    />
                  </div>

                  <div>
                    <label className="font-medium">AIモデル</label>
                    <Select
                      value={config.model}
                      onValueChange={(model) => handleUpdateConfig({ model })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-medium">Temperature</label>
                      <span className="text-sm text-zinc-500">{config.temperature}</span>
                    </div>
                    <Slider
                      value={[config.temperature * 100]}
                      onValueChange={([value]) => handleUpdateConfig({ temperature: value / 100 })}
                      max={100}
                      step={10}
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      低い値はより決定論的、高い値はより創造的な応答
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">ネガティブ感情で自動エスカレーション</span>
                      <p className="text-sm text-zinc-500">苦情や不満を検出した場合</p>
                    </div>
                    <Switch
                      checked={config.autoEscalateOnNegativeSentiment}
                      onCheckedChange={(autoEscalateOnNegativeSentiment) =>
                        handleUpdateConfig({ autoEscalateOnNegativeSentiment })
                      }
                    />
                  </div>

                  <div>
                    <label className="font-medium">エスカレーションまでのメッセージ数</label>
                    <Input
                      type="number"
                      value={config.autoEscalateAfterMessages}
                      onChange={(e) =>
                        handleUpdateConfig({ autoEscalateAfterMessages: parseInt(e.target.value) })
                      }
                      className="mt-1"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      この数のやり取り後に自動エスカレーション
                    </p>
                  </div>

                  <div>
                    <label className="font-medium">システムプロンプト</label>
                    <Textarea
                      value={config.systemPrompt}
                      onChange={(e) => handleUpdateConfig({ systemPrompt: e.target.value })}
                      className="mt-1 h-32"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>設定がありません。「デフォルト設定」をクリックして初期化してください。</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>インテント別統計</CardTitle>
                <CardDescription>過去7日間の問い合わせタイプ</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.intentStats && stats.intentStats.length > 0 ? (
                  <div className="space-y-3">
                    {stats.intentStats.map((item) => (
                      <div key={item.intent} className="flex items-center justify-between">
                        <span className="text-sm">{item.intent || 'Unknown'}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-zinc-500 py-4">データがありません</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>マーケットプレイス別</CardTitle>
                <CardDescription>過去7日間のセッション数</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.marketplaceStats && stats.marketplaceStats.length > 0 ? (
                  <div className="space-y-3">
                    {stats.marketplaceStats.map((item) => (
                      <div key={item.marketplace} className="flex items-center justify-between">
                        <span className="text-sm">{item.marketplace}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-zinc-500 py-4">データがありません</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

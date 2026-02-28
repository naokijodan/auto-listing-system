
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  MessageSquare,
  Inbox,
  Send,
  RefreshCw,
  Loader2,
  Search,
  User,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle,
  Flag,
  Star,
  Sparkles,
  Settings,
  FileText,
  Zap,
  ChevronRight,
  MoreHorizontal,
  Reply,
  Archive,
  Trash2,
  UserPlus,
  Filter,
  Mail,
  MailOpen,
  AlertTriangle,
  Smile,
  Frown,
  Meh,
} from 'lucide-react';

interface Thread {
  id: string;
  subject: string;
  buyerId: string;
  buyerName: string;
  buyerCountry: string;
  type: string;
  status: string;
  priority: string;
  sentiment: string;
  orderId: string | null;
  itemTitle: string | null;
  messageCount: number;
  lastMessageAt: string;
  tags: string[];
  assignedTo: string | null;
}

interface Message {
  id: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: string;
  attachments: any[];
}

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  usageCount: number;
}

const typeLabels: Record<string, string> = {
  INQUIRY: '問い合わせ',
  ORDER: '注文関連',
  SHIPPING: '配送',
  RETURN: '返品',
  FEEDBACK: 'フィードバック',
  OFFER: 'オファー',
  DISPUTE: '紛争',
  GENERAL: '一般',
};

const statusColors: Record<string, string> = {
  UNREAD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  READ: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
  REPLIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  FLAGGED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-zinc-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-500',
};

const sentimentIcons: Record<string, any> = {
  POSITIVE: Smile,
  NEUTRAL: Meh,
  NEGATIVE: Frown,
  ANGRY: AlertTriangle,
};

const sentimentColors: Record<string, string> = {
  POSITIVE: 'text-emerald-500',
  NEUTRAL: 'text-zinc-500',
  NEGATIVE: 'text-amber-500',
  ANGRY: 'text-red-500',
};

export default function EbayCustomerCommunicationPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'templates' | 'auto-rules' | 'settings'>('inbox');
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard data
  const { data: dashboardData, mutate: mutateDashboard } = useSWR<any>('/api/ebay-customer-communication/dashboard', fetcher);

  // Threads
  const { data: threadsData, mutate: mutateThreads } = useSWR<any>(
    `/api/ebay-customer-communication/threads${statusFilter ? `?status=${statusFilter}` : ''}${typeFilter ? `${statusFilter ? '&' : '?'}type=${typeFilter}` : ''}`,
    fetcher
  );

  // Selected thread details
  const { data: threadDetails, mutate: mutateThread } = useSWR<any>(
    selectedThread ? `/api/ebay-customer-communication/threads/${selectedThread.id}` : null,
    fetcher
  );

  // Templates
  const { data: templatesData, mutate: mutateTemplates } = useSWR<any>(
    activeTab === 'templates' ? '/api/ebay-customer-communication/templates' : null,
    fetcher
  );

  // Auto rules
  const { data: autoRulesData, mutate: mutateAutoRules } = useSWR<any>(
    activeTab === 'auto-rules' ? '/api/ebay-customer-communication/auto-rules' : null,
    fetcher
  );

  // Settings
  const { data: settingsData } = useSWR<any>(
    activeTab === 'settings' ? '/api/ebay-customer-communication/settings' : null,
    fetcher
  );

  const stats = dashboardData?.stats;

  // 返信送信
  const handleSendReply = async () => {
    if (!selectedThread || !replyContent.trim()) return;

    setIsSending(true);
    try {
      await postApi('/api/ebay-customer-communication/messages', {
        threadId: selectedThread.id,
        content: replyContent,
      });
      setReplyContent('');
      mutateThread();
      mutateThreads();
      addToast({ type: 'success', message: 'メッセージを送信しました' });
    } catch (error) {
      addToast({ type: 'error', message: '送信に失敗しました' });
    } finally {
      setIsSending(false);
    }
  };

  // AI返信提案取得
  const handleGetSuggestion = async () => {
    if (!selectedThread) return;

    try {
      const response = await postApi(`/api/ebay-customer-communication/threads/${selectedThread.id}/suggest-reply`, {});
      setReplyContent((response as any).suggestion);
      addToast({ type: 'success', message: 'AI提案を取得しました' });
    } catch (error) {
      addToast({ type: 'error', message: '提案の取得に失敗しました' });
    }
  };

  // ステータス更新
  const handleUpdateStatus = async (threadId: string, status: string) => {
    try {
      await putApi(`/api/ebay-customer-communication/threads/${threadId}`, { status });
      mutateThreads();
      mutateThread();
      addToast({ type: 'success', message: 'ステータスを更新しました' });
    } catch (error) {
      addToast({ type: 'error', message: '更新に失敗しました' });
    }
  };

  const tabs = [
    { id: 'inbox', label: '受信トレイ', icon: Inbox, count: stats?.inbox.unread },
    { id: 'templates', label: 'テンプレート', icon: FileText },
    { id: 'auto-rules', label: '自動応答', icon: Zap },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">顧客コミュニケーション</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              統合メッセージング・AI自動応答
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { mutateThreads(); mutateDashboard(); }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div className="flex h-full gap-4">
            {/* Thread List */}
            <div className="w-1/3 flex flex-col">
              {/* Filters */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="検索..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2 py-1.5 text-sm border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                >
                  <option value="">すべて</option>
                  <option value="UNREAD">未読</option>
                  <option value="PENDING">対応中</option>
                  <option value="FLAGGED">フラグ</option>
                </select>
              </div>

              {/* Summary Cards */}
              {stats && (
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg dark:bg-blue-900/20 text-center">
                    <p className="text-lg font-bold text-blue-600">{stats.inbox.unread}</p>
                    <p className="text-xs text-zinc-500">未読</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded-lg dark:bg-amber-900/20 text-center">
                    <p className="text-lg font-bold text-amber-600">{stats.inbox.pending}</p>
                    <p className="text-xs text-zinc-500">対応中</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg dark:bg-emerald-900/20 text-center">
                    <p className="text-lg font-bold text-emerald-600">{stats.inbox.resolved}</p>
                    <p className="text-xs text-zinc-500">解決</p>
                  </div>
                  <div className="p-2 bg-zinc-50 rounded-lg dark:bg-zinc-800 text-center">
                    <p className="text-lg font-bold text-zinc-600">{stats.inbox.total}</p>
                    <p className="text-xs text-zinc-500">合計</p>
                  </div>
                </div>
              )}

              {/* Thread List */}
              <div className="flex-1 overflow-auto space-y-2">
                {threadsData?.threads.map((thread: Thread) => {
                  const SentimentIcon = sentimentIcons[thread.sentiment] || Meh;
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThread(thread)}
                      className={cn(
                        'p-3 rounded-lg cursor-pointer transition-colors',
                        selectedThread?.id === thread.id
                          ? 'bg-cyan-50 border border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-700'
                          : 'bg-white border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700/50',
                        thread.status === 'UNREAD' && 'border-l-4 border-l-blue-500'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-zinc-400" />
                          <span className="font-medium text-sm text-zinc-900 dark:text-white">
                            {thread.buyerName}
                          </span>
                          <span className="text-xs text-zinc-400">{thread.buyerCountry}</span>
                        </div>
                        <SentimentIcon className={cn('h-4 w-4', sentimentColors[thread.sentiment])} />
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-1 mb-1">
                        {thread.subject}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs px-1.5 py-0.5 rounded', statusColors[thread.status])}>
                            {thread.status}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {typeLabels[thread.type]}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {new Date(thread.lastMessageAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thread Detail */}
            <div className="flex-1 flex flex-col">
              {selectedThread && threadDetails ? (
                <>
                  {/* Thread Header */}
                  <Card className="p-4 mb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                          {threadDetails.subject}
                        </h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {threadDetails.buyerName}
                          </span>
                          {threadDetails.orderId && (
                            <span>注文: {threadDetails.orderId}</span>
                          )}
                          {threadDetails.itemTitle && (
                            <span className="truncate max-w-xs">{threadDetails.itemTitle}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs px-2 py-1 rounded', statusColors[threadDetails.status])}>
                          {threadDetails.status}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateStatus(threadDetails.id, 'RESOLVED')}
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUpdateStatus(threadDetails.id, 'FLAGGED')}
                        >
                          <Flag className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Messages */}
                  <div className="flex-1 overflow-auto space-y-3 mb-3">
                    {threadDetails.messages?.map((message: Message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'max-w-[80%] p-3 rounded-lg',
                          message.sender === 'seller'
                            ? 'ml-auto bg-cyan-500 text-white'
                            : 'bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            'text-xs font-medium',
                            message.sender === 'seller' ? 'text-cyan-100' : 'text-zinc-500'
                          )}>
                            {message.senderName}
                          </span>
                          <span className={cn(
                            'text-xs',
                            message.sender === 'seller' ? 'text-cyan-100' : 'text-zinc-400'
                          )}>
                            {new Date(message.timestamp).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        <p className={cn(
                          'text-sm whitespace-pre-wrap',
                          message.sender === 'seller' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                        )}>
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Box */}
                  <Card className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Button variant="outline" size="sm" onClick={handleGetSuggestion}>
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI提案
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="返信を入力..."
                        rows={3}
                        className="flex-1 px-3 py-2 border rounded-lg resize-none dark:bg-zinc-800 dark:border-zinc-700"
                      />
                      <Button
                        variant="primary"
                        onClick={handleSendReply}
                        disabled={isSending || !replyContent.trim()}
                        className="self-end"
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </Card>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-400">
                  <div className="text-center">
                    <Mail className="h-12 w-12 mx-auto mb-4" />
                    <p>スレッドを選択してください</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">返信テンプレート</h3>
              <Button variant="primary" size="sm">
                テンプレート追加
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {templatesData?.templates.map((template: Template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">{template.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                        {typeLabels[template.category]}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">{template.usageCount}回使用</span>
                  </div>
                  <p className="text-sm text-zinc-500 line-clamp-3">{template.content}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Auto Rules Tab */}
        {activeTab === 'auto-rules' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-white">自動応答ルール</h3>
              <Button variant="primary" size="sm">
                ルール追加
              </Button>
            </div>
            <div className="space-y-3">
              {autoRulesData?.rules.map((rule: any) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-3 h-3 rounded-full',
                        rule.isActive ? 'bg-emerald-500' : 'bg-zinc-300'
                      )} />
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">{rule.name}</h4>
                        <p className="text-sm text-zinc-500">
                          トリガー: {rule.trigger.type} • アクション: {rule.action.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-zinc-400">
                        {rule.stats.triggered}回実行
                      </span>
                      <Button variant="outline" size="sm">編集</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settingsData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">営業時間設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">営業時間外自動応答</p>
                    <p className="text-xs text-zinc-500">営業時間外に自動応答メッセージを送信</p>
                  </div>
                  <button className={cn(
                    'w-11 h-6 rounded-full transition-colors',
                    settingsData.businessHours?.enabled ? 'bg-cyan-500' : 'bg-zinc-300'
                  )}>
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.businessHours?.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">開始時刻</label>
                    <input
                      type="time"
                      value={settingsData.businessHours?.start || '09:00'}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-600 mb-1">終了時刻</label>
                    <input
                      type="time"
                      value={settingsData.businessHours?.end || '18:00'}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">AIアシスタント</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">AI返信提案</p>
                    <p className="text-xs text-zinc-500">AIが返信内容を自動提案</p>
                  </div>
                  <button className={cn(
                    'w-11 h-6 rounded-full transition-colors',
                    settingsData.aiAssistant?.autoSuggest ? 'bg-cyan-500' : 'bg-zinc-300'
                  )}>
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.aiAssistant?.autoSuggest ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">感情分析</p>
                    <p className="text-xs text-zinc-500">メッセージの感情を自動分析</p>
                  </div>
                  <button className={cn(
                    'w-11 h-6 rounded-full transition-colors',
                    settingsData.aiAssistant?.sentimentAnalysis ? 'bg-cyan-500' : 'bg-zinc-300'
                  )}>
                    <div className={cn(
                      'w-5 h-5 rounded-full bg-white transition-transform',
                      settingsData.aiAssistant?.sentimentAnalysis ? 'translate-x-5' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">署名</h3>
              <textarea
                value={settingsData.signature}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
                placeholder="返信末尾に追加する署名..."
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Bot,
  Send,
  Plus,
  MessageSquare,
  Zap,
  TrendingUp,
  Package,
  DollarSign,
  FileText,
  Search,
  Settings,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Award,
  Clock,
  ChevronRight,
  Archive,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  actions?: Array<{ type: string; label: string; action: string }>;
  thinking?: boolean;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  action: string | null;
}

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
}

export default function AiAssistantPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'actions' | 'insights' | 'settings'>('chat');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const { data: conversationsData } = useSWR<{ conversations: Conversation[] }>(
    '/api/ebay-ai-assistant/conversations',
    fetcher
  );

  const { data: conversationData } = useSWR<{ messages: Message[] }>(
    selectedConversation ? `/api/ebay-ai-assistant/conversations/${selectedConversation}` : null,
    fetcher
  );

  const { data: insightsData } = useSWR<{ insights: Insight[] }>(
    '/api/ebay-ai-assistant/insights/today',
    fetcher
  );

  const { data: quickActionsData } = useSWR<{ quickActions: QuickAction[] }>(
    '/api/ebay-ai-assistant/quick-actions',
    fetcher
  );

  const { data: preferencesData } = useSWR(
    '/api/ebay-ai-assistant/preferences',
    fetcher
  );

  const { data: usageData } = useSWR(
    '/api/ebay-ai-assistant/usage',
    fetcher
  );

  const conversations = conversationsData?.conversations ?? [];
  const messages = conversationData?.messages ?? [];
  const insights = insightsData?.insights ?? [];
  const quickActions = quickActionsData?.quickActions ?? [];

  const tabs = [
    { id: 'chat', label: 'チャット', icon: MessageSquare },
    { id: 'actions', label: 'クイックアクション', icon: Zap },
    { id: 'insights', label: 'インサイト', icon: Lightbulb },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'tip': return <Lightbulb className="h-5 w-5 text-blue-500" />;
      case 'achievement': return <Award className="h-5 w-5 text-purple-500" />;
      default: return <Sparkles className="h-5 w-5 text-zinc-500" />;
    }
  };

  const getActionIcon = (icon: string) => {
    switch (icon) {
      case 'dollar': return <DollarSign className="h-5 w-5" />;
      case 'text': return <FileText className="h-5 w-5" />;
      case 'package': return <Package className="h-5 w-5" />;
      case 'chart': return <TrendingUp className="h-5 w-5" />;
      case 'search': return <Search className="h-5 w-5" />;
      case 'users': return <MessageSquare className="h-5 w-5" />;
      case 'file': return <FileText className="h-5 w-5" />;
      case 'bot': return <Bot className="h-5 w-5" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    setIsTyping(true);
    // API呼び出しをシミュレート
    setTimeout(() => {
      setIsTyping(false);
      setMessageInput('');
    }, 1500);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">AIアシスタント</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              あなたのeBayビジネスをサポート
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {usageData && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              今月 {usageData.actionsExecuted} アクション実行
            </span>
          )}
          <Button variant="outline" size="sm">
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
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'chat' && (
          <div className="grid grid-cols-4 gap-4 h-full">
            {/* 会話リスト */}
            <Card className="p-4 col-span-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-zinc-900 dark:text-white">会話</h3>
                <Button variant="ghost" size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-auto space-y-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedConversation === conv.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800'
                        : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <p className="font-medium text-sm text-zinc-900 dark:text-white truncate">{conv.title}</p>
                    <p className="text-xs text-zinc-500 truncate mt-1">{conv.lastMessage}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                      <span>{conv.messageCount} メッセージ</span>
                      {conv.status === 'archived' && (
                        <Archive className="h-3 w-3" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* チャットエリア */}
            <Card className="col-span-3 p-4 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* メッセージ */}
                  <div className="flex-1 overflow-auto mb-4 space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === 'assistant'
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}>
                          {msg.role === 'assistant' ? (
                            <Bot className="h-4 w-4 text-white" />
                          ) : (
                            <span className="text-xs font-medium">あ</span>
                          )}
                        </div>
                        <div className={`flex-1 max-w-[70%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                          <div className={`inline-block p-3 rounded-lg ${
                            msg.role === 'assistant'
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-left'
                              : 'bg-indigo-500 text-white'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {msg.actions.map((action, idx) => (
                                <Button key={idx} variant="outline" size="sm">
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          )}
                          <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            <span className="text-xs text-zinc-400">
                              {new Date(msg.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.role === 'assistant' && (
                              <div className="flex gap-1">
                                <button className="text-zinc-400 hover:text-emerald-500">
                                  <ThumbsUp className="h-3 w-3" />
                                </button>
                                <button className="text-zinc-400 hover:text-red-500">
                                  <ThumbsDown className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 入力 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="メッセージを入力... 例: 売れ行きの悪い商品を分析して"
                      className="flex-1 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    />
                    <Button variant="primary" onClick={handleSendMessage} disabled={isTyping}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                  <Bot className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">AIアシスタントにようこそ</p>
                  <p className="text-sm mb-4">会話を選択するか、新しい会話を始めてください</p>
                  <Button variant="primary">
                    <Plus className="h-4 w-4 mr-1" />
                    新しい会話を始める
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Card key={action.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {getActionIcon(action.icon)}
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">{action.name}</h4>
                    <p className="text-xs text-zinc-500">{action.category}</p>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{action.description}</p>
                <Button variant="outline" size="sm" className="w-full">
                  <Zap className="h-3 w-3 mr-1" />
                  実行
                </Button>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            {/* 今日のインサイト */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight) => (
                <Card key={insight.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-zinc-900 dark:text-white">{insight.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          insight.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          insight.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}>
                          {insight.priority === 'high' ? '重要' : insight.priority === 'medium' ? '中' : '低'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{insight.description}</p>
                      {insight.action && (
                        <Button variant="outline" size="sm">
                          詳細を見る
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* 使用統計 */}
            {usageData && (
              <Card className="p-4">
                <h3 className="font-medium text-zinc-900 dark:text-white mb-4">今月の利用状況</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-indigo-600">{usageData.conversations}</p>
                    <p className="text-xs text-zinc-500">会話数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{usageData.actionsExecuted}</p>
                    <p className="text-xs text-zinc-500">アクション実行</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{usageData.suggestionsAccepted}</p>
                    <p className="text-xs text-zinc-500">提案採用</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{usageData.timeSaved}</p>
                    <p className="text-xs text-zinc-500">時間節約</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'settings' && preferencesData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">応答設定</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">応答スタイル</p>
                  <select
                    defaultValue={preferencesData.responseStyle}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="concise">簡潔</option>
                    <option value="detailed">詳細</option>
                    <option value="technical">技術的</option>
                  </select>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">専門レベル</p>
                  <select
                    defaultValue={preferencesData.expertiseLevel}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  >
                    <option value="beginner">初心者</option>
                    <option value="intermediate">中級者</option>
                    <option value="expert">上級者</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">機能設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">自動提案</p>
                    <p className="text-xs text-zinc-500">AIが自動的に改善提案を行う</p>
                  </div>
                  <input type="checkbox" defaultChecked={preferencesData.autoSuggestions} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">プロアクティブアラート</p>
                    <p className="text-xs text-zinc-500">重要な変化を自動検知して通知</p>
                  </div>
                  <input type="checkbox" defaultChecked={preferencesData.proactiveAlerts} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">学習機能</p>
                    <p className="text-xs text-zinc-500">あなたの好みを学習して改善</p>
                  </div>
                  <input type="checkbox" defaultChecked={preferencesData.learningEnabled} className="toggle" />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">通知設定</h3>
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white mb-2">通知頻度</p>
                <select
                  defaultValue={preferencesData.notificationFrequency}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                >
                  <option value="realtime">リアルタイム</option>
                  <option value="hourly">1時間ごと</option>
                  <option value="daily">1日1回</option>
                  <option value="weekly">週1回</option>
                </select>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

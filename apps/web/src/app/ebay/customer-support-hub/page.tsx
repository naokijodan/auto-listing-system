
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  HeadphonesIcon,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  MessageSquare,
  Send,
  Tag,
  BarChart3,
  FileText,
  BookOpen,
  Zap,
  MoreVertical,
  ChevronRight,
  Star,
  Users,
  RefreshCw,
  Mail,
  Phone,
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  customer: { id: string; name: string; email: string };
  orderId: string | null;
  assignee: { id: string; name: string } | null;
  messages: number;
  createdAt: string;
  updatedAt: string;
  dueAt: string;
  resolution?: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  status: string;
  activeTickets: number;
  resolvedToday: number;
  avgResponseTime: number;
}

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  usageCount: number;
}

interface Article {
  id: string;
  title: string;
  category: string;
  views: number;
  helpful: number;
  notHelpful: number;
  updatedAt: string;
}

export default function CustomerSupportHubPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'agents' | 'templates' | 'knowledge' | 'stats'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [messageInput, setMessageInput] = useState('');

  const { data: ticketsData } = useSWR<{ tickets: Ticket[] }>(
    '/api/ebay-customer-support-hub/tickets',
    fetcher
  );

  const { data: agentsData } = useSWR<{ agents: Agent[] }>(
    '/api/ebay-customer-support-hub/agents',
    fetcher
  );

  const { data: templatesData } = useSWR<{ templates: Template[] }>(
    '/api/ebay-customer-support-hub/templates',
    fetcher
  );

  const { data: knowledgeData } = useSWR<{ articles: Article[] }>(
    '/api/ebay-customer-support-hub/knowledge',
    fetcher
  );

  const { data: statsData } = useSWR<any>(
    '/api/ebay-customer-support-hub/stats',
    fetcher
  );

  const tickets = ticketsData?.tickets ?? [];
  const agents = agentsData?.agents ?? [];
  const templates = templatesData?.templates ?? [];
  const articles = knowledgeData?.articles ?? [];

  const tabs = [
    { id: 'tickets', label: 'チケット', icon: MessageSquare },
    { id: 'agents', label: 'エージェント', icon: Users },
    { id: 'templates', label: 'テンプレート', icon: FileText },
    { id: 'knowledge', label: 'ナレッジ', icon: BookOpen },
    { id: 'stats', label: '統計', icon: BarChart3 },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'in_progress': return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'waiting': return <Clock className="h-4 w-4 text-purple-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'closed': return <XCircle className="h-4 w-4 text-zinc-500" />;
      default: return <Clock className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'オープン';
      case 'in_progress': return '対応中';
      case 'waiting': return '返信待ち';
      case 'resolved': return '解決済み';
      case 'closed': return 'クローズ';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'shipping': return '配送';
      case 'returns': return '返品';
      case 'product_inquiry': return '商品問い合わせ';
      case 'damage': return '破損';
      case 'payment': return '支払い';
      default: return category;
    }
  };

  const filteredTickets = statusFilter === 'all'
    ? tickets
    : tickets.filter(t => t.status === statusFilter);

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-amber-500">
            <HeadphonesIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">カスタマーサポート</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              チケット管理とカスタマーサポート
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Search className="h-4 w-4 mr-1" />
            検索
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            チケット作成
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {statsData && (
        <div className="mb-4 grid grid-cols-5 gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-zinc-500">オープン</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.tickets?.open}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-zinc-500">対応中</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.tickets?.inProgress}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-zinc-500">平均応答時間</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.tickets?.avgResponseTime}分</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500">解決済み（今月）</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.tickets?.resolved}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-zinc-500">満足度</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.satisfaction?.score}/5</p>
              </div>
            </div>
          </Card>
        </div>
      )}

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
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
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
        {activeTab === 'tickets' && (
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* チケットリスト */}
            <div className="col-span-1 flex flex-col">
              {/* フィルター */}
              <div className="mb-3 flex gap-2 flex-wrap">
                {['all', 'open', 'in_progress', 'waiting', 'resolved'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      statusFilter === status
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {status === 'all' ? 'すべて' : getStatusLabel(status)}
                  </button>
                ))}
              </div>

              {/* リスト */}
              <div className="flex-1 overflow-auto space-y-2">
                {filteredTickets.map((ticket) => (
                  <Card
                    key={ticket.id}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedTicket === ticket.id ? 'ring-2 ring-orange-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => setSelectedTicket(ticket.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(ticket.status)}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">#{ticket.id.split('_')[1]}</span>
                    </div>
                    <h4 className="font-medium text-sm text-zinc-900 dark:text-white mb-1 line-clamp-1">
                      {ticket.subject}
                    </h4>
                    <p className="text-xs text-zinc-500 mb-2">{ticket.customer.name}</p>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>{getCategoryLabel(ticket.category)}</span>
                      <span>{ticket.messages} メッセージ</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* チケット詳細 */}
            <div className="col-span-2">
              {selectedTicket ? (
                <Card className="h-full p-4 flex flex-col">
                  {/* ヘッダー */}
                  <div className="mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-lg text-zinc-900 dark:text-white">
                        {tickets.find(t => t.id === selectedTicket)?.subject}
                      </h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">解決</Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {tickets.find(t => t.id === selectedTicket)?.customer.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {tickets.find(t => t.id === selectedTicket)?.customer.email}
                      </span>
                    </div>
                  </div>

                  {/* メッセージエリア（プレースホルダー） */}
                  <div className="flex-1 overflow-auto mb-4 space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg">
                          <p className="text-sm">
                            {tickets.find(t => t.id === selectedTicket)?.description}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-400 mt-1">
                          {new Date(tickets.find(t => t.id === selectedTicket)?.createdAt || '').toLocaleString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 返信入力 */}
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
                    <div className="flex gap-2 mb-2">
                      {templates.slice(0, 3).map((tmpl) => (
                        <button
                          key={tmpl.id}
                          onClick={() => setMessageInput(tmpl.content)}
                          className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                          {tmpl.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="返信を入力..."
                        rows={3}
                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 resize-none"
                      />
                      <Button variant="primary" className="self-end">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <div className="text-center text-zinc-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>チケットを選択してください</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-medium">
                      {agent.name.charAt(0)}
                    </div>
                    <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      agent.status === 'online' ? 'bg-emerald-500' :
                      agent.status === 'away' ? 'bg-amber-500' : 'bg-zinc-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">{agent.name}</h4>
                    <p className="text-xs text-zinc-500">{agent.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{agent.activeTickets}</p>
                    <p className="text-xs text-zinc-500">対応中</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-emerald-600">{agent.resolvedToday}</p>
                    <p className="text-xs text-zinc-500">今日解決</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{agent.avgResponseTime}分</p>
                    <p className="text-xs text-zinc-500">平均応答</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                テンプレート作成
              </Button>
            </div>
            {templates.map((template) => (
              <Card key={template.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">{template.name}</h4>
                    <span className="text-xs text-zinc-500">{getCategoryLabel(template.category)}</span>
                  </div>
                  <span className="text-xs text-zinc-400">{template.usageCount}回使用</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line line-clamp-3">
                  {template.content}
                </p>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                記事作成
              </Button>
            </div>
            {articles.map((article) => (
              <Card key={article.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white mb-1">{article.title}</h4>
                    <span className="text-xs text-zinc-500">{article.category}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-zinc-500">{article.views} views</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600">👍 {article.helpful}</span>
                      <span className="text-red-600">👎 {article.notHelpful}</span>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'stats' && statsData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-medium text-zinc-900 dark:text-white mb-4">カテゴリ別チケット</h3>
                <div className="space-y-3">
                  {statsData.categories?.map((cat: any) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="w-24 text-sm text-zinc-500">{getCategoryLabel(cat.category)}</span>
                      <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-zinc-900 dark:text-white">{cat.count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium text-zinc-900 dark:text-white mb-4">エージェントパフォーマンス</h3>
                <div className="space-y-3">
                  {statsData.agentPerformance?.map((agent: any) => (
                    <div key={agent.agentId} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">{agent.name}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{agent.resolved}件解決</span>
                        <span className="text-yellow-600">{agent.satisfaction}★</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">日別チケット推移</h3>
              <div className="h-48 flex items-end gap-2">
                {statsData.byDay?.map((day: any) => (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col gap-0.5" style={{ height: `${(day.created / 20) * 100}%` }}>
                      <div
                        className="w-full bg-emerald-500 rounded-t"
                        style={{ height: `${(day.resolved / day.created) * 100}%` }}
                      />
                      <div
                        className="w-full bg-amber-500 rounded-b"
                        style={{ height: `${((day.created - day.resolved) / day.created) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500">
                      {new Date(day.date).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

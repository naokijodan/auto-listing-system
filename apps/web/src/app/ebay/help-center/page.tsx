
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  HelpCircle,
  RefreshCw,
  Search,
  Book,
  MessageCircle,
  FileText,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Tag,
  ExternalLink,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  views: number;
  helpful: number;
  tags: string[];
  updatedAt: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  views: number;
  helpful: number;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: number;
  steps: number;
  completedSteps: number;
  category: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

type TabType = 'home' | 'articles' | 'faqs' | 'tutorials' | 'tickets';

const statusColors: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CLOSED: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-zinc-500',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-amber-500',
  URGENT: 'text-red-500',
};

export default function EbayHelpCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  // データ取得
  const { data: overviewData, isLoading: isLoadingOverview } = useSWR<any>(
    activeTab === 'home' ? '/api/ebay-help-center/overview' : null,
    fetcher
  );

  const { data: articlesData, isLoading: isLoadingArticles } = useSWR<any>(
    activeTab === 'articles' ? '/api/ebay-help-center/articles' : null,
    fetcher
  );

  const { data: faqsData, isLoading: isLoadingFaqs } = useSWR<any>(
    activeTab === 'faqs' ? '/api/ebay-help-center/faqs' : null,
    fetcher
  );

  const { data: tutorialsData, isLoading: isLoadingTutorials } = useSWR<any>(
    activeTab === 'tutorials' ? '/api/ebay-help-center/tutorials' : null,
    fetcher
  );

  const { data: ticketsData, mutate: mutateTickets, isLoading: isLoadingTickets } = useSWR<any>(
    activeTab === 'tickets' ? '/api/ebay-help-center/tickets' : null,
    fetcher
  );

  const { data: searchResults, isLoading: isSearching } = useSWR<any>(
    searchQuery.length >= 2 ? `/api/ebay-help-center/search?q=${encodeURIComponent(searchQuery)}` : null,
    fetcher
  );

  const { data: categoriesData } = useSWR<any>('/api/ebay-help-center/categories', fetcher);

  // アクション
  const handleFeedback = async (type: 'article' | 'faq', id: string, helpful: boolean) => {
    try {
      await postApi(`/api/ebay-help-center/${type}s/${id}/feedback`, { helpful });
      addToast({ type: 'success', message: 'フィードバックありがとうございます' });
    } catch {
      addToast({ type: 'error', message: '送信に失敗しました' });
    }
  };

  const handleCreateTicket = async (subject: string, description: string, category: string) => {
    try {
      await postApi('/api/ebay-help-center/tickets', { subject, description, category });
      addToast({ type: 'success', message: 'チケットを作成しました' });
      mutateTickets();
      setShowNewTicketModal(false);
    } catch {
      addToast({ type: 'error', message: 'チケットの作成に失敗しました' });
    }
  };

  const tabs: { id: TabType; label: string; icon: typeof HelpCircle }[] = [
    { id: 'home', label: 'ホーム', icon: HelpCircle },
    { id: 'articles', label: 'ガイド', icon: Book },
    { id: 'faqs', label: 'FAQ', icon: MessageCircle },
    { id: 'tutorials', label: 'チュートリアル', icon: PlayCircle },
    { id: 'tickets', label: 'サポート', icon: FileText },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ebay" className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
            <HelpCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ヘルプセンター</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              ガイド・FAQ・サポート
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowNewTicketModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            サポートに問い合わせ
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
        <input
          type="text"
          placeholder="ヘルプを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-lg"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-blue-500" />
        )}

        {/* Search Results Dropdown */}
        {searchQuery.length >= 2 && searchResults?.data?.results?.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-50 max-h-80 overflow-y-auto">
            {searchResults.data.results.map((result: { id: string; title: string; excerpt?: string; category: string }) => (
              <button
                key={result.id}
                className="w-full px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 border-b border-zinc-100 dark:border-zinc-700 last:border-b-0"
                onClick={() => {
                  setSearchQuery('');
                }}
              >
                <p className="font-medium text-zinc-900 dark:text-white">{result.title}</p>
                {result.excerpt && (
                  <p className="text-sm text-zinc-500 truncate">{result.excerpt}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {isLoadingOverview ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : overviewData?.data && (
              <>
                {/* Categories */}
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    カテゴリから探す
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {categoriesData?.data?.map((category: { id: string; name: string; icon: string; articleCount: number }) => (
                      <Card
                        key={category.id}
                        className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setActiveTab('articles')}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Book className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">{category.name}</p>
                            <p className="text-xs text-zinc-500">{category.articleCount}件の記事</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Popular Articles */}
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    人気の記事
                  </h3>
                  <div className="space-y-2">
                    {overviewData.data.popularArticles?.map((article: Article) => (
                      <Card key={article.id} className="p-4 cursor-pointer hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">{article.title}</p>
                            <p className="text-sm text-zinc-500">{article.excerpt}</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-zinc-400" />
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="p-6 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('faqs')}>
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="font-medium">よくある質問</p>
                    <p className="text-sm text-zinc-500">{overviewData.data.faqs}件のFAQ</p>
                  </Card>
                  <Card className="p-6 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('tutorials')}>
                    <PlayCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-medium">チュートリアル</p>
                    <p className="text-sm text-zinc-500">{overviewData.data.tutorials}件のガイド</p>
                  </Card>
                  <Card className="p-6 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowNewTicketModal(true)}>
                    <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <p className="font-medium">サポートに問い合わせ</p>
                    <p className="text-sm text-zinc-500">{overviewData.data.openTickets}件のオープンチケット</p>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div className="space-y-4">
            {isLoadingArticles ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              articlesData?.data?.articles?.map((article: Article) => (
                <Card key={article.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-zinc-900 dark:text-white mb-1">
                        {article.title}
                      </h3>
                      <p className="text-sm text-zinc-500 mb-2">{article.excerpt}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <span>{article.views} views</span>
                        <span>{article.helpful} helpful</span>
                        <span>更新: {new Date(article.updatedAt).toLocaleDateString('ja-JP')}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        {article.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback('article', article.id, true)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback('article', article.id, false)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* FAQs Tab */}
        {activeTab === 'faqs' && (
          <div className="space-y-2">
            {isLoadingFaqs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              faqsData?.data?.map((faq: FAQ) => (
                <Card key={faq.id} className="overflow-hidden">
                  <button
                    className="w-full p-4 text-left flex items-center justify-between"
                    onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  >
                    <span className="font-medium text-zinc-900 dark:text-white">{faq.question}</span>
                    <ChevronRight
                      className={cn(
                        'h-5 w-5 text-zinc-400 transition-transform',
                        expandedFaq === faq.id && 'rotate-90'
                      )}
                    />
                  </button>
                  {expandedFaq === faq.id && (
                    <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 pt-4">
                        {faq.answer}
                      </p>
                      <div className="flex items-center gap-4 mt-4">
                        <span className="text-xs text-zinc-400">この回答は役に立ちましたか？</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback('faq', faq.id, true)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          はい
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback('faq', faq.id, false)}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          いいえ
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tutorials Tab */}
        {activeTab === 'tutorials' && (
          <div className="grid grid-cols-2 gap-4">
            {isLoadingTutorials ? (
              <div className="col-span-2 flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              tutorialsData?.data?.map((tutorial: Tutorial) => (
                <Card key={tutorial.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <PlayCircle className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-zinc-900 dark:text-white mb-1">
                        {tutorial.title}
                      </h3>
                      <p className="text-sm text-zinc-500 mb-2">{tutorial.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tutorial.duration}分
                        </span>
                        <span>{tutorial.steps}ステップ</span>
                      </div>
                      {tutorial.completedSteps > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{ width: `${(tutorial.completedSteps / tutorial.steps) * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">
                            {tutorial.completedSteps}/{tutorial.steps} 完了
                          </p>
                        </div>
                      )}
                    </div>
                    <Button variant="outline" size="sm">
                      開始
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {isLoadingTickets ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : ticketsData?.data?.tickets?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-zinc-300 mb-4" />
                <p className="text-zinc-500">サポートチケットはありません</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => setShowNewTicketModal(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  新しいチケットを作成
                </Button>
              </div>
            ) : (
              ticketsData?.data?.tickets?.map((ticket: Ticket) => (
                <Card key={ticket.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-xs px-2 py-0.5 rounded', statusColors[ticket.status])}>
                          {ticket.status}
                        </span>
                        <span className={cn('text-xs font-medium', priorityColors[ticket.priority])}>
                          {ticket.priority}
                        </span>
                      </div>
                      <h3 className="font-medium text-zinc-900 dark:text-white">
                        {ticket.subject}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1">
                        作成: {new Date(ticket.createdAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      詳細
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
              サポートに問い合わせ
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCreateTicket(
                  formData.get('subject') as string,
                  formData.get('description') as string,
                  formData.get('category') as string
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  カテゴリ
                </label>
                <select
                  name="category"
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                  required
                >
                  <option value="technical">技術的な問題</option>
                  <option value="billing">料金について</option>
                  <option value="feature">機能リクエスト</option>
                  <option value="general">その他</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  件名
                </label>
                <input
                  name="subject"
                  type="text"
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                  placeholder="お問い合わせの件名"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  詳細
                </label>
                <textarea
                  name="description"
                  rows={5}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2"
                  placeholder="お問い合わせの詳細をご記入ください"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewTicketModal(false)}>
                  キャンセル
                </Button>
                <Button variant="primary" type="submit">
                  <Send className="h-4 w-4 mr-1" />
                  送信
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

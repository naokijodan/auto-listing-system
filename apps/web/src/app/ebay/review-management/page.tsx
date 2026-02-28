
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, putApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Minus,
  MessageSquare,
  Send,
  Sparkles,
  FileText,
  Bot,
  Settings,
  BarChart3,
  RefreshCw,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  User,
  Package,
  Reply,
  SkipForward,
  Flag,
  Edit3,
  Trash2,
  Plus,
  ToggleLeft,
  ToggleRight,
  Copy,
  Wand2,
} from 'lucide-react';

const fetcher2 = (url: string) => fetcher(url);

// 型定義
type ReviewType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
type ResponseStatus = 'PENDING' | 'RESPONDED' | 'SKIPPED' | 'ESCALATED';

interface Review {
  id: string;
  orderId: string;
  listingId: string;
  itemTitle: string;
  buyerId: string;
  buyerName: string;
  type: ReviewType;
  rating: number;
  comment: string;
  responseStatus: ResponseStatus;
  response?: string;
  respondedAt?: string;
  tags: string[];
  sentiment: {
    score: number;
    keywords: string[];
    topics: string[];
  };
  orderDetails?: {
    orderDate: string;
    itemPrice: number;
    quantity: number;
    shippingDays: number;
  };
  createdAt: string;
}

interface ReplyTemplate {
  id: string;
  name: string;
  type: ReviewType | 'ALL';
  content: string;
  variables: string[];
  useCount: number;
  isActive: boolean;
}

interface AutoReplyRule {
  id: string;
  name: string;
  trigger: string;
  conditions: Record<string, unknown>;
  templateId: string;
  delay: number;
  isActive: boolean;
  stats: {
    triggered: number;
    sent: number;
    lastTriggered?: string;
  };
}

const reviewTypeConfig: Record<ReviewType, { label: string; color: string; icon: typeof ThumbsUp }> = {
  POSITIVE: { label: 'ポジティブ', color: 'text-emerald-600 bg-emerald-50', icon: ThumbsUp },
  NEUTRAL: { label: '中立', color: 'text-amber-600 bg-amber-50', icon: Minus },
  NEGATIVE: { label: 'ネガティブ', color: 'text-red-600 bg-red-50', icon: ThumbsDown },
};

const statusConfig: Record<ResponseStatus, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: '未返信', color: 'text-amber-600 bg-amber-50', icon: Clock },
  RESPONDED: { label: '返信済', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  SKIPPED: { label: 'スキップ', color: 'text-zinc-600 bg-zinc-100', icon: SkipForward },
  ESCALATED: { label: 'エスカレート', color: 'text-red-600 bg-red-50', icon: AlertTriangle },
};

export default function ReviewManagementPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reviews' | 'templates' | 'auto-reply' | 'analysis' | 'settings'>('overview');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // データ取得
  const { data: dashboardData, mutate: mutateDashboard } = useSWR<any>(
    '/api/ebay-review-management/dashboard',
    fetcher2
  );

  const { data: reviewsData, mutate: mutateReviews } = useSWR<any>(
    `/api/ebay-review-management/reviews?${new URLSearchParams({
      ...(typeFilter && { type: typeFilter }),
      ...(statusFilter && { responseStatus: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
    }).toString()}`,
    fetcher2
  );

  const { data: templatesData, mutate: mutateTemplates } = useSWR<any>(
    '/api/ebay-review-management/templates',
    fetcher2
  );

  const { data: rulesData, mutate: mutateRules } = useSWR<any>(
    '/api/ebay-review-management/auto-reply-rules',
    fetcher2
  );

  const { data: analysisData } = useSWR<any>(
    '/api/ebay-review-management/analysis',
    fetcher2
  );

  const reviews: Review[] = reviewsData?.reviews || [];
  const templates: ReplyTemplate[] = templatesData?.templates || [];
  const rules: AutoReplyRule[] = rulesData?.rules || [];

  // 返信送信
  const handleSendReply = async () => {
    if (!selectedReview || !replyText.trim()) return;

    try {
      await postApi(`/api/ebay-review-management/reviews/${selectedReview.id}/respond`, {
        response: replyText,
      });
      addToast({ type: 'success', message: '返信を送信しました' });
      setReplyText('');
      setSelectedReview(null);
      mutateReviews();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '返信の送信に失敗しました' });
    }
  };

  // AI返信生成
  const handleGenerateReply = async (tone: string = 'PROFESSIONAL') => {
    if (!selectedReview) return;

    setIsGeneratingReply(true);
    try {
      const result = await postApi(`/api/ebay-review-management/reviews/${selectedReview.id}/generate-reply`, {
        reviewId: selectedReview.id,
        tone,
      }) as { generatedReply: string };
      setReplyText(result.generatedReply);
      addToast({ type: 'success', message: 'AI返信を生成しました' });
    } catch {
      addToast({ type: 'error', message: 'AI返信の生成に失敗しました' });
    } finally {
      setIsGeneratingReply(false);
    }
  };

  // スキップ
  const handleSkip = async (reviewId: string) => {
    try {
      await postApi(`/api/ebay-review-management/reviews/${reviewId}/skip`, {
        reason: 'Manual skip',
      });
      addToast({ type: 'success', message: 'レビューをスキップしました' });
      setSelectedReview(null);
      mutateReviews();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: 'スキップに失敗しました' });
    }
  };

  // エスカレート
  const handleEscalate = async (reviewId: string) => {
    try {
      await postApi(`/api/ebay-review-management/reviews/${reviewId}/escalate`, {
        priority: 'HIGH',
        notes: 'Manual escalation',
      });
      addToast({ type: 'success', message: 'レビューをエスカレートしました' });
      setSelectedReview(null);
      mutateReviews();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: 'エスカレートに失敗しました' });
    }
  };

  // ルール有効/無効切替
  const handleToggleRule = async (ruleId: string) => {
    try {
      await postApi(`/api/ebay-review-management/auto-reply-rules/${ruleId}/toggle`, {});
      addToast({ type: 'success', message: 'ルールの状態を変更しました' });
      mutateRules();
    } catch {
      addToast({ type: 'error', message: 'ルールの変更に失敗しました' });
    }
  };

  // テンプレート削除
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return;

    try {
      await deleteApi(`/api/ebay-review-management/templates/${templateId}`);
      addToast({ type: 'success', message: 'テンプレートを削除しました' });
      mutateTemplates();
    } catch {
      addToast({ type: 'error', message: 'テンプレートの削除に失敗しました' });
    }
  };

  // 星評価表示
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'h-4 w-4',
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-300'
            )}
          />
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'reviews', label: 'レビュー', icon: MessageSquare },
    { id: 'templates', label: 'テンプレート', icon: FileText },
    { id: 'auto-reply', label: '自動返信', icon: Bot },
    { id: 'analysis', label: '分析', icon: TrendingUp },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500">
            <Star className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">レビュー管理</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {dashboardData?.overview?.totalReviews || 0} 件のレビュー
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            mutateDashboard();
            mutateReviews();
            mutateTemplates();
            mutateRules();
          }}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* 概要タブ */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-4">
            {/* サマリーカード */}
            <div className="grid grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">総レビュー</p>
                    <p className="text-xl font-bold">{dashboardData.overview.totalReviews}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">平均評価</p>
                    <p className="text-xl font-bold">{dashboardData.overview.averageRating.toFixed(1)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <ThumbsUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">高評価率</p>
                    <p className="text-xl font-bold">{dashboardData.overview.positivePercentage}%</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">未返信</p>
                    <p className="text-xl font-bold">{dashboardData.overview.pendingResponses}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <Bot className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">自動返信</p>
                    <p className="text-xl font-bold">{dashboardData.autoReplyStats.repliesSent24h}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* タイプ別分布 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-medium mb-4">レビュータイプ分布</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm">ポジティブ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(dashboardData.byType.positive / dashboardData.overview.totalReviews) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{dashboardData.byType.positive}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Minus className="h-4 w-4 text-amber-600" />
                      <span className="text-sm">中立</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(dashboardData.byType.neutral / dashboardData.overview.totalReviews) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{dashboardData.byType.neutral}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm">ネガティブ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${(dashboardData.byType.negative / dashboardData.overview.totalReviews) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-8">{dashboardData.byType.negative}</span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-4">返信ステータス</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.byStatus).map(([status, count]) => {
                    const config = statusConfig[status as ResponseStatus];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-4 w-4', config.color.split(' ')[0])} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <span className="text-sm font-medium">{count as number}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* 最近のアクティビティ */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">最近のレビュー</h3>
              <div className="space-y-3">
                {dashboardData.recentActivity?.map((review: { id: string; itemTitle: string; type: ReviewType; rating: number; buyerName: string; responseStatus: ResponseStatus; createdAt: string }) => {
                  const typeConfig = reviewTypeConfig[review.type];
                  const TypeIcon = typeConfig.icon;
                  return (
                    <div key={review.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', typeConfig.color)}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium truncate max-w-xs">{review.itemTitle}</p>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>{review.buyerName}</span>
                            <span>•</span>
                            {renderStars(review.rating)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('px-2 py-1 rounded-full text-xs', statusConfig[review.responseStatus].color)}>
                          {statusConfig[review.responseStatus].label}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {new Date(review.createdAt).toLocaleDateString('ja-JP')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* レビュータブ */}
        {activeTab === 'reviews' && (
          <div className="flex gap-4 h-full">
            {/* レビュー一覧 */}
            <div className="flex-1 flex flex-col">
              {/* フィルター */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="レビューを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 text-sm"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべてのタイプ</option>
                  <option value="POSITIVE">ポジティブ</option>
                  <option value="NEUTRAL">中立</option>
                  <option value="NEGATIVE">ネガティブ</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべてのステータス</option>
                  <option value="PENDING">未返信</option>
                  <option value="RESPONDED">返信済</option>
                  <option value="SKIPPED">スキップ</option>
                  <option value="ESCALATED">エスカレート</option>
                </select>
              </div>

              {/* レビューリスト */}
              <div className="flex-1 overflow-auto space-y-2">
                {reviews.map((review) => {
                  const typeConfig = reviewTypeConfig[review.type];
                  const TypeIcon = typeConfig.icon;
                  const sConfig = statusConfig[review.responseStatus];
                  return (
                    <Card
                      key={review.id}
                      className={cn(
                        'p-4 cursor-pointer transition-colors',
                        selectedReview?.id === review.id ? 'ring-2 ring-yellow-500' : 'hover:bg-zinc-50'
                      )}
                      onClick={() => setSelectedReview(review)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn('p-2 rounded-lg', typeConfig.color)}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {renderStars(review.rating)}
                              <span className={cn('px-2 py-0.5 rounded-full text-xs', sConfig.color)}>
                                {sConfig.label}
                              </span>
                            </div>
                            <p className="text-sm font-medium mb-1 truncate max-w-md">{review.itemTitle}</p>
                            <p className="text-sm text-zinc-600 line-clamp-2">{review.comment}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-zinc-400">
                              <User className="h-3 w-3" />
                              <span>{review.buyerName}</span>
                              <span>•</span>
                              <span>{new Date(review.createdAt).toLocaleDateString('ja-JP')}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-400" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* レビュー詳細 & 返信 */}
            {selectedReview && (
              <Card className="w-96 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">レビュー詳細</h3>
                  <button onClick={() => setSelectedReview(null)} className="text-zinc-400 hover:text-zinc-600">
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-auto space-y-4">
                  {/* レビュー内容 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(selectedReview.rating)}
                      <span className={cn('px-2 py-0.5 rounded-full text-xs', reviewTypeConfig[selectedReview.type].color)}>
                        {reviewTypeConfig[selectedReview.type].label}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-700">{selectedReview.comment}</p>
                  </div>

                  {/* 購入者情報 */}
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-zinc-400" />
                      <span className="font-medium text-sm">{selectedReview.buyerName}</span>
                    </div>
                    {selectedReview.orderDetails && (
                      <div className="text-xs text-zinc-500 space-y-1">
                        <p>注文日: {new Date(selectedReview.orderDetails.orderDate).toLocaleDateString('ja-JP')}</p>
                        <p>価格: ${selectedReview.orderDetails.itemPrice.toFixed(2)}</p>
                        <p>配送日数: {selectedReview.orderDetails.shippingDays}日</p>
                      </div>
                    )}
                  </div>

                  {/* センチメント分析 */}
                  <div className="p-3 bg-zinc-50 rounded-lg">
                    <p className="text-xs font-medium mb-2">センチメント分析</p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full',
                            selectedReview.sentiment.score > 0.3 ? 'bg-emerald-500' :
                            selectedReview.sentiment.score < -0.3 ? 'bg-red-500' : 'bg-amber-500'
                          )}
                          style={{ width: `${(selectedReview.sentiment.score + 1) * 50}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium">
                        {(selectedReview.sentiment.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedReview.sentiment.keywords.map((keyword) => (
                        <span key={keyword} className="px-2 py-0.5 bg-white rounded text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 返信済みの場合 */}
                  {selectedReview.responseStatus === 'RESPONDED' && selectedReview.response && (
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <p className="text-xs font-medium text-emerald-700 mb-1">返信済み</p>
                      <p className="text-sm text-emerald-800">{selectedReview.response}</p>
                      <p className="text-xs text-emerald-600 mt-2">
                        {selectedReview.respondedAt && new Date(selectedReview.respondedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  )}

                  {/* 返信フォーム */}
                  {selectedReview.responseStatus === 'PENDING' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReply('PROFESSIONAL')}
                          disabled={isGeneratingReply}
                        >
                          {isGeneratingReply ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Wand2 className="h-4 w-4 mr-1" />
                          )}
                          AI生成
                        </Button>
                        <select
                          onChange={(e) => handleGenerateReply(e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-zinc-200"
                          disabled={isGeneratingReply}
                        >
                          <option value="">トーン選択</option>
                          <option value="PROFESSIONAL">プロフェッショナル</option>
                          <option value="FRIENDLY">フレンドリー</option>
                          <option value="APOLOGETIC">謝罪</option>
                          <option value="GRATEFUL">感謝</option>
                        </select>
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="返信を入力..."
                        className="w-full h-32 p-3 rounded-lg border border-zinc-200 text-sm resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSendReply}
                          disabled={!replyText.trim()}
                          className="flex-1"
                        >
                          <Send className="h-4 w-4 mr-1" />
                          送信
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSkip(selectedReview.id)}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEscalate(selectedReview.id)}
                          className="text-red-600"
                        >
                          <Flag className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* テンプレートタブ */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">返信テンプレート</h3>
              <Button variant="primary" size="sm" onClick={() => setShowTemplateModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                テンプレート作成
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <span className={cn(
                        'inline-block px-2 py-0.5 rounded-full text-xs mt-1',
                        template.type === 'POSITIVE' ? 'bg-emerald-50 text-emerald-600' :
                        template.type === 'NEGATIVE' ? 'bg-red-50 text-red-600' :
                        template.type === 'NEUTRAL' ? 'bg-amber-50 text-amber-600' :
                        'bg-zinc-100 text-zinc-600'
                      )}>
                        {template.type === 'ALL' ? 'すべて' : reviewTypeConfig[template.type as ReviewType]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-3">{template.content}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                    <div className="flex items-center gap-1 text-xs text-zinc-400">
                      <Copy className="h-3 w-3" />
                      <span>使用回数: {template.useCount}</span>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-xs',
                      template.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
                    )}>
                      {template.isActive ? '有効' : '無効'}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 自動返信タブ */}
        {activeTab === 'auto-reply' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">自動返信ルール</h3>
              <Button variant="primary" size="sm" onClick={() => setShowRuleModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                ルール作成
              </Button>
            </div>

            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={cn(
                          'p-2 rounded-lg transition-colors',
                          rule.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-400'
                        )}
                      >
                        {rule.isActive ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <h4 className="font-medium">{rule.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                          <span>トリガー: {rule.trigger}</span>
                          <span>•</span>
                          <span>遅延: {rule.delay}分</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{rule.stats.sent}</p>
                        <p className="text-xs text-zinc-400">送信済み</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {rule.stats.triggered > 0 ? ((rule.stats.sent / rule.stats.triggered) * 100).toFixed(0) : 0}%
                        </p>
                        <p className="text-xs text-zinc-400">成功率</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 分析タブ */}
        {activeTab === 'analysis' && analysisData && (
          <div className="space-y-4">
            {/* 概要 */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{analysisData.totalReviews}</p>
                <p className="text-sm text-zinc-500">総レビュー</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{analysisData.averageRating?.toFixed(1) || 'N/A'}</p>
                <p className="text-sm text-zinc-500">平均評価</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">
                  {analysisData.totalReviews > 0 ? ((analysisData.positiveCount / analysisData.totalReviews) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-sm text-zinc-500">高評価率</p>
              </Card>
              <Card className="p-4 text-center">
                <p className={cn(
                  'text-3xl font-bold',
                  analysisData.sentimentScore > 0.3 ? 'text-emerald-600' :
                  analysisData.sentimentScore < -0.3 ? 'text-red-600' : 'text-amber-600'
                )}>
                  {(analysisData.sentimentScore * 100).toFixed(0)}
                </p>
                <p className="text-sm text-zinc-500">センチメント</p>
              </Card>
            </div>

            {/* トップキーワード */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">トップキーワード</h3>
              <div className="flex flex-wrap gap-2">
                {analysisData.topKeywords?.map((kw: { keyword: string; count: number; sentiment: string }) => (
                  <span
                    key={kw.keyword}
                    className={cn(
                      'px-3 py-1 rounded-full text-sm',
                      kw.sentiment === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' :
                      kw.sentiment === 'NEGATIVE' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    )}
                  >
                    {kw.keyword} ({kw.count})
                  </span>
                ))}
              </div>
            </Card>

            {/* 問題点 */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">主要な問題点</h3>
              <div className="space-y-3">
                {analysisData.topIssues?.map((issue: { issue: string; count: number; trend: string }) => (
                  <div key={issue.issue} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">{issue.issue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{issue.count}件</span>
                      {issue.trend === 'UP' ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : issue.trend === 'DOWN' ? (
                        <TrendingDown className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Minus className="h-4 w-4 text-zinc-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div className="space-y-4 max-w-2xl">
            <Card className="p-4">
              <h3 className="font-medium mb-4">自動返信設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">自動返信を有効化</p>
                    <p className="text-xs text-zinc-500">ルールに基づいて自動的に返信を送信</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">デフォルト遅延</p>
                    <p className="text-xs text-zinc-500">自動返信の送信遅延時間</p>
                  </div>
                  <select className="px-3 py-2 rounded-lg border border-zinc-200 text-sm">
                    <option value="0">即時</option>
                    <option value="15">15分</option>
                    <option value="30">30分</option>
                    <option value="60">1時間</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">通知設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">ネガティブレビューアラート</p>
                    <p className="text-xs text-zinc-500">低評価レビューを受信時に通知</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">日次ダイジェスト</p>
                    <p className="text-xs text-zinc-500">毎日のレビューサマリーを送信</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">週次レポート</p>
                    <p className="text-xs text-zinc-500">週次のレビュー分析レポートを送信</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">分析設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">センチメント分析</p>
                    <p className="text-xs text-zinc-500">レビューの感情を自動分析</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">キーワード抽出</p>
                    <p className="text-xs text-zinc-500">レビューから重要なキーワードを抽出</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">自動タグ付け</p>
                    <p className="text-xs text-zinc-500">レビューに自動でタグを付与</p>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                    <ToggleRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </Card>

            <Button variant="primary">
              設定を保存
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

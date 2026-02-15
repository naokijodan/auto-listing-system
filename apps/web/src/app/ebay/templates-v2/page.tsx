'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetcher, postApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Eye,
  Settings,
  BarChart3,
  RefreshCw,
  Loader2,
  Search,
  ChevronRight,
  CheckCircle,
  Clock,
  Archive,
  Layers,
  Gift,
  Beaker,
  TrendingUp,
  Tag,
  Star,
  FolderOpen,
  Layout,
  Zap,
  Package,
} from 'lucide-react';

const fetcher2 = (url: string) => fetcher(url);

// 型定義
type TemplateType = 'LISTING' | 'VARIATION' | 'BUNDLE' | 'DESCRIPTION' | 'POLICY';
type TemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  status: TemplateStatus;
  sections: unknown[];
  variationConfig?: {
    enabled: boolean;
    attributes: string[];
    pricingType: string;
  };
  bundleConfig?: {
    enabled: boolean;
    minItems: number;
    maxItems: number;
    discountType: string;
    discountValue: number;
  };
  abTestConfig?: {
    enabled: boolean;
    testId?: string;
    variants: { id: string; name: string; weight: number }[];
  };
  useCount: number;
  successRate: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  popularity: number;
}

const typeConfig: Record<TemplateType, { label: string; color: string; icon: typeof FileText }> = {
  LISTING: { label: '出品', color: 'text-blue-600 bg-blue-50', icon: FileText },
  VARIATION: { label: 'バリエーション', color: 'text-purple-600 bg-purple-50', icon: Layers },
  BUNDLE: { label: 'バンドル', color: 'text-orange-600 bg-orange-50', icon: Gift },
  DESCRIPTION: { label: '説明文', color: 'text-emerald-600 bg-emerald-50', icon: Layout },
  POLICY: { label: 'ポリシー', color: 'text-zinc-600 bg-zinc-100', icon: Settings },
};

const statusConfig: Record<TemplateStatus, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: '下書き', color: 'text-zinc-600 bg-zinc-100', icon: Clock },
  ACTIVE: { label: '有効', color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle },
  ARCHIVED: { label: 'アーカイブ', color: 'text-amber-600 bg-amber-50', icon: Archive },
};

export default function TemplatesV2Page() {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'presets' | 'stats'>('overview');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  // データ取得
  const { data: dashboardData, mutate: mutateDashboard } = useSWR(
    '/api/ebay-templates-v2/dashboard',
    fetcher2
  );

  const { data: templatesData, mutate: mutateTemplates } = useSWR(
    `/api/ebay-templates-v2/templates?${new URLSearchParams({
      ...(typeFilter && { type: typeFilter }),
      ...(statusFilter && { status: statusFilter }),
      ...(searchQuery && { search: searchQuery }),
    }).toString()}`,
    fetcher2
  );

  const { data: presetsData } = useSWR(
    '/api/ebay-templates-v2/presets',
    fetcher2
  );

  const { data: statsData } = useSWR(
    '/api/ebay-templates-v2/stats',
    fetcher2
  );

  const templates: Template[] = templatesData?.templates || [];
  const presets: TemplatePreset[] = presetsData?.presets || [];

  // テンプレート複製
  const handleDuplicate = async (templateId: string) => {
    setIsDuplicating(true);
    try {
      await postApi(`/api/ebay-templates-v2/templates/${templateId}/duplicate`, {});
      addToast({ type: 'success', message: 'テンプレートを複製しました' });
      mutateTemplates();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '複製に失敗しました' });
    } finally {
      setIsDuplicating(false);
    }
  };

  // テンプレート削除
  const handleDelete = async (templateId: string) => {
    if (!confirm('このテンプレートを削除しますか？')) return;

    try {
      await deleteApi(`/api/ebay-templates-v2/templates/${templateId}`);
      addToast({ type: 'success', message: 'テンプレートを削除しました' });
      setSelectedTemplate(null);
      mutateTemplates();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  // ステータス変更
  const handleStatusChange = async (templateId: string, status: TemplateStatus) => {
    try {
      await postApi(`/api/ebay-templates-v2/templates/${templateId}/status`, { status });
      addToast({ type: 'success', message: 'ステータスを更新しました' });
      mutateTemplates();
      mutateDashboard();
    } catch {
      addToast({ type: 'error', message: 'ステータス更新に失敗しました' });
    }
  };

  // プリセットから作成
  const handleUsePreset = async (presetId: string) => {
    try {
      await postApi(`/api/ebay-templates-v2/presets/${presetId}/use`, {});
      addToast({ type: 'success', message: 'プリセットからテンプレートを作成しました' });
      mutateTemplates();
      mutateDashboard();
      setActiveTab('templates');
    } catch {
      addToast({ type: 'error', message: 'テンプレート作成に失敗しました' });
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: BarChart3 },
    { id: 'templates', label: 'テンプレート', icon: FileText },
    { id: 'presets', label: 'プリセット', icon: FolderOpen },
    { id: 'stats', label: '統計', icon: TrendingUp },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">テンプレート v2</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {dashboardData?.summary?.total || 0} 件のテンプレート
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新規作成
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              mutateDashboard();
              mutateTemplates();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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
                  ? 'border-violet-500 text-violet-600'
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
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">総テンプレート</p>
                    <p className="text-xl font-bold">{dashboardData.summary.total}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">有効</p>
                    <p className="text-xl font-bold text-emerald-600">{dashboardData.summary.active}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">総使用回数</p>
                    <p className="text-xl font-bold">{dashboardData.performance.totalUses}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-50">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">平均成功率</p>
                    <p className="text-xl font-bold">{dashboardData.performance.averageSuccessRate.toFixed(1)}%</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* タイプ別 */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="font-medium mb-4">タイプ別テンプレート</h3>
                <div className="space-y-3">
                  {Object.entries(dashboardData.byType).map(([type, count]) => {
                    const config = typeConfig[type.toUpperCase() as TemplateType];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1.5 rounded', config.color.split(' ')[1])}>
                            <Icon className={cn('h-4 w-4', config.color.split(' ')[0])} />
                          </div>
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <span className="font-bold">{count as number}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-medium mb-4">トップテンプレート</h3>
                <div className="space-y-3">
                  {dashboardData.topTemplates?.map((template: { id: string; name: string; type: TemplateType; useCount: number; successRate: number }) => {
                    const config = typeConfig[template.type];
                    const Icon = config.icon;
                    return (
                      <div key={template.id} className="flex items-center justify-between p-2 bg-zinc-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('h-4 w-4', config.color.split(' ')[0])} />
                          <span className="text-sm font-medium truncate max-w-[180px]">{template.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-zinc-500">{template.useCount}回</span>
                          <span className="text-emerald-600">{template.successRate}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* プリセット */}
            <Card className="p-4">
              <h3 className="font-medium mb-4">おすすめプリセット</h3>
              <div className="grid grid-cols-3 gap-4">
                {dashboardData.presets?.map((preset: TemplatePreset) => {
                  const config = typeConfig[preset.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={preset.id}
                      className="p-4 border border-zinc-200 rounded-lg hover:border-violet-300 hover:bg-violet-50/50 cursor-pointer transition-colors"
                      onClick={() => handleUsePreset(preset.id)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={cn('h-5 w-5', config.color.split(' ')[0])} />
                        <span className="font-medium">{preset.name}</span>
                      </div>
                      <p className="text-sm text-zinc-500 mb-3">{preset.description}</p>
                      <div className="flex items-center justify-between">
                        <span className={cn('px-2 py-0.5 rounded text-xs', config.color)}>
                          {config.label}
                        </span>
                        <span className="text-xs text-zinc-400">人気度: {preset.popularity}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* テンプレートタブ */}
        {activeTab === 'templates' && (
          <div className="flex gap-4 h-full">
            {/* テンプレート一覧 */}
            <div className="flex-1 flex flex-col">
              {/* フィルター */}
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="テンプレートを検索..."
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
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                >
                  <option value="">すべてのステータス</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>

              {/* テンプレートリスト */}
              <div className="flex-1 overflow-auto space-y-2">
                {templates.map((template) => {
                  const tConfig = typeConfig[template.type];
                  const sConfig = statusConfig[template.status];
                  const TypeIcon = tConfig.icon;

                  return (
                    <Card
                      key={template.id}
                      className={cn(
                        'p-4 cursor-pointer transition-colors',
                        selectedTemplate?.id === template.id ? 'ring-2 ring-violet-500' : 'hover:bg-zinc-50'
                      )}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={cn('p-2 rounded-lg', tConfig.color.split(' ')[1])}>
                            <TypeIcon className={cn('h-5 w-5', tConfig.color.split(' ')[0])} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{template.name}</h4>
                              <span className={cn('px-2 py-0.5 rounded-full text-xs', sConfig.color)}>
                                {sConfig.label}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-500 line-clamp-1">{template.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                              <span>{template.useCount}回使用</span>
                              <span>•</span>
                              <span>成功率 {template.successRate}%</span>
                              {template.variationConfig?.enabled && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Layers className="h-3 w-3" />
                                    バリエーション
                                  </span>
                                </>
                              )}
                              {template.bundleConfig?.enabled && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Gift className="h-3 w-3" />
                                    バンドル
                                  </span>
                                </>
                              )}
                              {template.abTestConfig?.enabled && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Beaker className="h-3 w-3" />
                                    A/Bテスト
                                  </span>
                                </>
                              )}
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

            {/* テンプレート詳細 */}
            {selectedTemplate && (
              <Card className="w-96 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">テンプレート詳細</h3>
                  <button onClick={() => setSelectedTemplate(null)} className="text-zinc-400 hover:text-zinc-600">
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-auto space-y-4">
                  {/* タイプとステータス */}
                  <div className="flex items-center gap-2">
                    <span className={cn('px-3 py-1 rounded text-sm', typeConfig[selectedTemplate.type].color)}>
                      {typeConfig[selectedTemplate.type].label}
                    </span>
                    <span className={cn('px-3 py-1 rounded-full text-sm', statusConfig[selectedTemplate.status].color)}>
                      {statusConfig[selectedTemplate.status].label}
                    </span>
                  </div>

                  {/* 名前と説明 */}
                  <div>
                    <h4 className="font-medium mb-2">{selectedTemplate.name}</h4>
                    <p className="text-sm text-zinc-600">{selectedTemplate.description}</p>
                  </div>

                  {/* パフォーマンス */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{selectedTemplate.useCount}</p>
                      <p className="text-xs text-zinc-500">使用回数</p>
                    </div>
                    <div className="p-3 bg-zinc-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-emerald-600">{selectedTemplate.successRate}%</p>
                      <p className="text-xs text-zinc-500">成功率</p>
                    </div>
                  </div>

                  {/* 機能 */}
                  <div>
                    <h5 className="text-sm font-medium mb-2">有効な機能</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variationConfig?.enabled && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                          <Layers className="h-3 w-3" />
                          バリエーション ({selectedTemplate.variationConfig.attributes.length}属性)
                        </span>
                      )}
                      {selectedTemplate.bundleConfig?.enabled && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                          <Gift className="h-3 w-3" />
                          バンドル ({selectedTemplate.bundleConfig.discountValue}%OFF)
                        </span>
                      )}
                      {selectedTemplate.abTestConfig?.enabled && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-cyan-50 text-cyan-700 rounded text-xs">
                          <Beaker className="h-3 w-3" />
                          A/Bテスト ({selectedTemplate.abTestConfig.variants.length}バリアント)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* タグ */}
                  {selectedTemplate.tags.length > 0 && (
                    <div>
                      <h5 className="text-sm font-medium mb-2">タグ</h5>
                      <div className="flex flex-wrap gap-1">
                        {selectedTemplate.tags.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-zinc-100 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 日時 */}
                  <div className="p-3 bg-zinc-50 rounded-lg text-sm space-y-1">
                    <p>作成: {new Date(selectedTemplate.createdAt).toLocaleDateString('ja-JP')}</p>
                    <p>更新: {new Date(selectedTemplate.updatedAt).toLocaleDateString('ja-JP')}</p>
                  </div>

                  {/* アクション */}
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm" className="flex-1">
                        <Edit3 className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        プレビュー
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDuplicate(selectedTemplate.id)}
                        disabled={isDuplicating}
                      >
                        {isDuplicating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Copy className="h-4 w-4 mr-1" />
                        )}
                        複製
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600"
                        onClick={() => handleDelete(selectedTemplate.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </div>
                    {selectedTemplate.status === 'DRAFT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(selectedTemplate.id, 'ACTIVE')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        有効化
                      </Button>
                    )}
                    {selectedTemplate.status === 'ACTIVE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(selectedTemplate.id, 'ARCHIVED')}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        アーカイブ
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* プリセットタブ */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">テンプレートプリセット</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {presets.map((preset) => {
                const config = typeConfig[preset.type];
                const Icon = config.icon;
                return (
                  <Card key={preset.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn('p-2 rounded-lg', config.color.split(' ')[1])}>
                        <Icon className={cn('h-5 w-5', config.color.split(' ')[0])} />
                      </div>
                      <div>
                        <h4 className="font-medium">{preset.name}</h4>
                        <span className="text-xs text-zinc-500">{preset.category}</span>
                      </div>
                    </div>
                    <p className="text-sm text-zinc-600 mb-4">{preset.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-zinc-400">
                        <Star className="h-3 w-3" />
                        <span>人気度: {preset.popularity}</span>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleUsePreset(preset.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        使用
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* 統計タブ */}
        {activeTab === 'stats' && statsData && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{statsData.templates.total}</p>
                <p className="text-sm text-zinc-500">総テンプレート</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{statsData.usage.total}</p>
                <p className="text-sm text-zinc-500">総使用回数</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold">{statsData.usage.averagePerTemplate.toFixed(1)}</p>
                <p className="text-sm text-zinc-500">平均使用回数</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{statsData.performance.averageSuccessRate.toFixed(1)}%</p>
                <p className="text-sm text-zinc-500">平均成功率</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-medium mb-4">タイプ別パフォーマンス</h3>
              <div className="space-y-3">
                {Object.entries(statsData.byType).map(([type, data]: [string, { count: number; avgSuccess: number }]) => {
                  const config = typeConfig[type.toUpperCase() as TemplateType];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div key={type} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={cn('h-5 w-5', config.color.split(' ')[0])} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{data.count}件</span>
                        <span className="text-emerald-600">成功率 {data.avgSuccess}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-4">トップパフォーマンス</h3>
              <div className="space-y-2">
                {statsData.performance.topPerforming?.map((template: { id: string; name: string; successRate: number }, index: number) => (
                  <div key={template.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{template.name}</span>
                    </div>
                    <span className="text-emerald-600 font-bold">{template.successRate}%</span>
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

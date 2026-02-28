
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, deleteApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  BarChart3,
  RefreshCw,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Download,
  Star,
  Share2,
  Layout,
  PieChart,
  LineChart,
  TrendingUp,
  Table,
  Gauge,
  Settings,
  Grid3X3,
} from 'lucide-react';

type Tab = 'dashboards' | 'widgets' | 'templates' | 'sources';

export default function DataVisualizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboards');
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);

  // データ取得
  const { data: dashboardsData, mutate: mutateDashboards } = useSWR<any>('/api/ebay-data-visualization/dashboards', fetcher);
  const { data: widgetsData, mutate: mutateWidgets } = useSWR<any>(
    selectedDashboard ? `/api/ebay-data-visualization/widgets?dashboardId=${selectedDashboard}` : '/api/ebay-data-visualization/widgets',
    fetcher
  );
  const { data: templatesData } = useSWR<any>('/api/ebay-data-visualization/chart-templates', fetcher);
  const { data: sourcesData } = useSWR<any>('/api/ebay-data-visualization/data-sources', fetcher);
  const { data: summaryData } = useSWR<any>('/api/ebay-data-visualization/summary', fetcher);

  const dashboards = dashboardsData?.dashboards ?? [];
  const widgets = widgetsData?.widgets ?? [];
  const templates = templatesData?.templates ?? [];
  const sources = sourcesData?.dataSources ?? [];
  const summary = summaryData ?? { dashboardCount: 0, widgetCount: 0 };

  const handleDuplicateDashboard = async (dashboardId: string) => {
    try {
      await postApi(`/api/ebay-data-visualization/dashboards/${dashboardId}/duplicate`, {});
      addToast({ type: 'success', message: 'ダッシュボードを複製しました' });
      mutateDashboards();
    } catch {
      addToast({ type: 'error', message: '複製に失敗しました' });
    }
  };

  const handleSetDefault = async (dashboardId: string) => {
    try {
      await postApi(`/api/ebay-data-visualization/dashboards/${dashboardId}/set-default`, {});
      addToast({ type: 'success', message: 'デフォルトに設定しました' });
      mutateDashboards();
    } catch {
      addToast({ type: 'error', message: '設定に失敗しました' });
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!confirm('このダッシュボードを削除しますか？')) return;
    try {
      await deleteApi(`/api/ebay-data-visualization/dashboards/${dashboardId}`);
      addToast({ type: 'success', message: 'ダッシュボードを削除しました' });
      mutateDashboards();
    } catch {
      addToast({ type: 'error', message: '削除に失敗しました' });
    }
  };

  const handleExportDashboard = async (dashboardId: string, format: string) => {
    try {
      const result = await postApi(`/api/ebay-data-visualization/dashboards/${dashboardId}/export`, { format }) as any;
      addToast({ type: 'success', message: `${format}形式でエクスポートしました` });
      window.open(result.downloadUrl, '_blank');
    } catch {
      addToast({ type: 'error', message: 'エクスポートに失敗しました' });
    }
  };

  const tabs = [
    { id: 'dashboards', label: 'ダッシュボード', icon: Layout },
    { id: 'widgets', label: 'ウィジェット', icon: Grid3X3 },
    { id: 'templates', label: 'テンプレート', icon: PieChart },
    { id: 'sources', label: 'データソース', icon: Settings },
  ];

  const getChartIcon = (chartType: string | null) => {
    switch (chartType) {
      case 'LINE': return <LineChart className="h-5 w-5 text-blue-600" />;
      case 'BAR': return <BarChart3 className="h-5 w-5 text-emerald-600" />;
      case 'PIE': return <PieChart className="h-5 w-5 text-purple-600" />;
      case 'AREA': return <TrendingUp className="h-5 w-5 text-cyan-600" />;
      default: return <Table className="h-5 w-5 text-zinc-600" />;
    }
  };

  const getWidgetTypeIcon = (type: string) => {
    switch (type) {
      case 'KPI': return <Gauge className="h-5 w-5 text-orange-600" />;
      case 'CHART': return <BarChart3 className="h-5 w-5 text-blue-600" />;
      case 'TABLE': return <Table className="h-5 w-5 text-zinc-600" />;
      default: return <Grid3X3 className="h-5 w-5 text-zinc-600" />;
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-purple-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">データ可視化</h1>
            <p className="text-sm text-zinc-500">{summary.dashboardCount}ダッシュボード • {summary.widgetCount}ウィジェット</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            新規ダッシュボード
          </Button>
          <Button variant="ghost" size="sm" onClick={() => mutateDashboards()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">ダッシュボード</p>
              <p className="text-2xl font-bold text-violet-600">{summary.dashboardCount}</p>
            </div>
            <Layout className="h-8 w-8 text-violet-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">ウィジェット</p>
              <p className="text-2xl font-bold text-blue-600">{summary.widgetCount}</p>
            </div>
            <Grid3X3 className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">アクティブユーザー</p>
              <p className="text-2xl font-bold text-emerald-600">{summary.activeUsers ?? 0}</p>
            </div>
            <Eye className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">データソース</p>
              <p className="text-2xl font-bold text-purple-600">{sources.length}</p>
            </div>
            <Settings className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* タブ */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-violet-500 text-violet-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboards' && (
          <div className="grid grid-cols-2 gap-4">
            {dashboards.map((dashboard: any) => (
              <Card key={dashboard.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
                      <Layout className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{dashboard.name}</h3>
                        {dashboard.isDefault && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                        {dashboard.shared && (
                          <Share2 className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">{dashboard.description}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    dashboard.type === 'MAIN' ? 'bg-violet-100 text-violet-700' :
                    dashboard.type === 'SALES' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {dashboard.type}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                  <span>ウィジェット: {dashboard.widgets?.length ?? 0}</span>
                  <span>•</span>
                  <span>レイアウト: {dashboard.layout}</span>
                  <span>•</span>
                  <span>更新: {new Date(dashboard.updatedAt).toLocaleDateString('ja-JP')}</span>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDashboard(dashboard.id)}>
                    <Eye className="h-4 w-4 mr-1" />
                    表示
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicateDashboard(dashboard.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleSetDefault(dashboard.id)}>
                    <Star className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleExportDashboard(dashboard.id, 'PDF')}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteDashboard(dashboard.id)} className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'widgets' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <select
                value={selectedDashboard ?? ''}
                onChange={(e) => setSelectedDashboard(e.target.value || null)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">すべてのウィジェット</option>
                {dashboards.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                新規ウィジェット
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {widgets.map((widget: any) => (
                <Card key={widget.id} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                      {widget.type === 'CHART' ? getChartIcon(widget.chartType) : getWidgetTypeIcon(widget.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-white">{widget.name}</h3>
                      <p className="text-xs text-zinc-500">
                        {widget.type}{widget.chartType ? ` • ${widget.chartType}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-zinc-400 mb-3">
                    データソース: {widget.dataSource} • 更新間隔: {widget.refreshInterval}秒
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-4 gap-4">
            {templates.map((template: any) => (
              <Card key={template.id} className="p-4 text-center cursor-pointer hover:shadow-md transition-shadow">
                <div className="h-16 w-16 mx-auto mb-3 rounded-lg bg-zinc-100 flex items-center justify-center">
                  {getChartIcon(template.type)}
                </div>
                <h3 className="font-medium text-zinc-900 dark:text-white">{template.name}</h3>
                <p className="text-xs text-zinc-500 mt-1">{template.description}</p>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-2">
            {sources.map((source: any) => (
              <Card key={source.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      source.type === 'INTERNAL' ? 'bg-emerald-100' :
                      source.type === 'ML' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      <Settings className={`h-5 w-5 ${
                        source.type === 'INTERNAL' ? 'text-emerald-600' :
                        source.type === 'ML' ? 'text-purple-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-zinc-900 dark:text-white">{source.name}</h3>
                      <p className="text-xs text-zinc-500">
                        タイプ: {source.type} • 更新間隔: {source.refreshRate}秒
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">接続中</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

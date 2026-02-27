// @ts-nocheck
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
  Play,
  Calendar,
  Download,
  Eye,
  Trash2,
  Clock,
  FileText,
  Settings,
  Layers,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Edit2,
  Copy,
} from 'lucide-react';

type Tab = 'templates' | 'reports' | 'schedules' | 'builder';

export default function AdvancedReportingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // データ取得
  const { data: templatesData, mutate: mutateTemplates } = useSWR(
    `/api/ebay-advanced-reporting/templates${selectedCategory ? `?category=${selectedCategory}` : ''}`,
    fetcher
  );
  const { data: reportsData, mutate: mutateReports } = useSWR('/api/ebay-advanced-reporting/reports', fetcher);
  const { data: schedulesData, mutate: mutateSchedules } = useSWR('/api/ebay-advanced-reporting/schedules', fetcher);
  const { data: dashboardData } = useSWR('/api/ebay-advanced-reporting/dashboard', fetcher);
  const { data: metricsData } = useSWR('/api/ebay-advanced-reporting/metrics', fetcher);
  const { data: dimensionsData } = useSWR('/api/ebay-advanced-reporting/dimensions', fetcher);

  const templates = templatesData?.templates ?? [];
  const reports = reportsData?.reports ?? [];
  const schedules = schedulesData?.schedules ?? [];
  const dashboard = dashboardData ?? { summary: {}, popularTemplates: [], recentReports: [] };
  const metrics = metricsData?.metrics ?? [];
  const dimensions = dimensionsData?.dimensions ?? [];

  const handleGenerateReport = async () => {
    if (!selectedTemplateId || !dateRange.start || !dateRange.end) {
      addToast({ type: 'error', message: 'テンプレートと期間を選択してください' });
      return;
    }

    try {
      await postApi('/api/ebay-advanced-reporting/reports/generate', {
        templateId: selectedTemplateId,
        period: dateRange,
      });
      addToast({ type: 'success', message: 'レポート生成を開始しました' });
      mutateReports();
      setShowGenerateModal(false);
    } catch {
      addToast({ type: 'error', message: 'レポート生成に失敗しました' });
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('このレポートを削除しますか？')) return;
    try {
      await deleteApi(`/api/ebay-advanced-reporting/reports/${reportId}`);
      addToast({ type: 'success', message: 'レポートを削除しました' });
      mutateReports();
    } catch {
      addToast({ type: 'error', message: 'レポート削除に失敗しました' });
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    try {
      await postApi(`/api/ebay-advanced-reporting/schedules/${scheduleId}/toggle`, {});
      addToast({ type: 'success', message: 'スケジュールのステータスを変更しました' });
      mutateSchedules();
    } catch {
      addToast({ type: 'error', message: 'ステータス変更に失敗しました' });
    }
  };

  const handleRunSchedule = async (scheduleId: string) => {
    try {
      await postApi(`/api/ebay-advanced-reporting/schedules/${scheduleId}/run`, {});
      addToast({ type: 'success', message: 'スケジュールを即時実行しました' });
      mutateReports();
    } catch {
      addToast({ type: 'error', message: '即時実行に失敗しました' });
    }
  };

  const tabs = [
    { id: 'templates', label: 'テンプレート', icon: Layers },
    { id: 'reports', label: 'レポート', icon: FileText },
    { id: 'schedules', label: 'スケジュール', icon: Calendar },
    { id: 'builder', label: 'ビルダー', icon: Settings },
  ];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SALES':
        return <DollarSign className="h-5 w-5 text-emerald-600" />;
      case 'INVENTORY':
        return <Package className="h-5 w-5 text-blue-600" />;
      case 'CUSTOMER':
        return <Users className="h-5 w-5 text-purple-600" />;
      case 'FINANCE':
        return <TrendingUp className="h-5 w-5 text-amber-600" />;
      default:
        return <FileText className="h-5 w-5 text-zinc-600" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'SALES':
        return <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-700">売上</span>;
      case 'INVENTORY':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">在庫</span>;
      case 'CUSTOMER':
        return <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">顧客</span>;
      case 'FINANCE':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">財務</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-700">カスタム</span>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">高度なレポート</h1>
            <p className="text-sm text-zinc-500">今月のレポート: {dashboard.summary.reportsThisMonth ?? 0}件</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setShowGenerateModal(true)}>
            <Plus className="h-4 w-4 mr-1" />
            レポート生成
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { mutateTemplates(); mutateReports(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">テンプレート</p>
              <p className="text-2xl font-bold text-orange-600">{dashboard.summary.totalTemplates ?? 0}</p>
            </div>
            <Layers className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">生成レポート</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard.summary.totalReports ?? 0}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">スケジュール</p>
              <p className="text-2xl font-bold text-emerald-600">{dashboard.summary.activeSchedules ?? 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">ストレージ</p>
              <p className="text-2xl font-bold text-purple-600">{dashboard.storageUsage?.percent ?? 0}%</p>
            </div>
            <div className="h-8 w-8 rounded-full border-4 border-purple-500" style={{
              background: `conic-gradient(#a855f7 ${dashboard.storageUsage?.percent ?? 0}%, #e5e7eb 0)`
            }} />
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
                ? 'border-orange-500 text-orange-600'
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
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">すべてのカテゴリ</option>
                <option value="SALES">売上</option>
                <option value="INVENTORY">在庫</option>
                <option value="CUSTOMER">顧客</option>
                <option value="FINANCE">財務</option>
                <option value="CUSTOM">カスタム</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {templates.map((template: any) => (
                <Card key={template.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                      {getCategoryIcon(template.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{template.name}</h3>
                        {getCategoryBadge(template.category)}
                        {template.isSystem && <span className="px-2 py-0.5 rounded text-xs bg-zinc-100 text-zinc-500">システム</span>}
                      </div>
                      <p className="text-sm text-zinc-500 mb-2">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-zinc-400">
                        <span>タイプ: {template.type}</span>
                        <span>使用回数: {template.usageCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-zinc-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setShowGenerateModal(true);
                      }}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      生成
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      複製
                    </Button>
                    {!template.isSystem && (
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-2">
            {reports.map((report: any) => (
              <Card key={report.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{report.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          report.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          report.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {report.status === 'COMPLETED' ? '完了' : report.status === 'PROCESSING' ? '処理中' : 'エラー'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">
                        期間: {report.period.start} 〜 {report.period.end}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        作成: {new Date(report.createdAt).toLocaleString('ja-JP')}
                        {report.rowCount && ` • ${report.rowCount.toLocaleString()}行`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.status === 'COMPLETED' && (
                      <>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          表示
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          DL
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteReport(report.id)} className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                スケジュール作成
              </Button>
            </div>

            <div className="space-y-2">
              {schedules.map((schedule: any) => (
                <Card key={schedule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        schedule.enabled ? 'bg-emerald-100' : 'bg-zinc-100'
                      }`}>
                        <Clock className={`h-5 w-5 ${schedule.enabled ? 'text-emerald-600' : 'text-zinc-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-zinc-900 dark:text-white">{schedule.name}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            schedule.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {schedule.enabled ? '有効' : '無効'}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-500">{schedule.scheduleDescription}</p>
                        <p className="text-xs text-zinc-400 mt-1">
                          次回: {schedule.nextRun ? new Date(schedule.nextRun).toLocaleString('ja-JP') : '-'}
                          {schedule.recipients?.length > 0 && ` • 送信先: ${schedule.recipients.length}名`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRunSchedule(schedule.id)}>
                        <Play className="h-4 w-4 mr-1" />
                        即時実行
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleSchedule(schedule.id)}
                        className={schedule.enabled ? 'text-emerald-600' : 'text-zinc-400'}
                      >
                        {schedule.enabled ? '無効化' : '有効化'}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'builder' && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">メトリクス</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {metrics.map((metric: any) => (
                  <div
                    key={metric.id}
                    className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-700">{metric.name}</span>
                      <span className="text-xs text-zinc-400">{metric.dataType}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{metric.description}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">ディメンション</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {dimensions.map((dimension: any) => (
                  <div
                    key={dimension.id}
                    className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-700">{dimension.name}</span>
                      <span className="text-xs text-zinc-400">{dimension.dataType}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{dimension.description}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* レポート生成モーダル */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-zinc-800">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">レポート生成</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  テンプレート
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                >
                  <option value="">選択してください</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                キャンセル
              </Button>
              <Button variant="primary" onClick={handleGenerateReport}>
                生成開始
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Upload,
  Download,
  FileSpreadsheet,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Eye,
  RefreshCw,
  Calendar,
  Filter,
  Plus,
  File,
  Settings,
  ArrowRight,
  MoreVertical,
  FileText,
} from 'lucide-react';

interface ImportJob {
  id: string;
  name: string;
  type: string;
  status: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  errorRows: number;
  error?: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string;
}

interface ExportJob {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  totalRecords: number;
  fileSize: number | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
  createdBy: string;
}

interface Schedule {
  id: string;
  name: string;
  type: string;
  exportType: string;
  format: string;
  cron: string;
  cronDescription: string;
  enabled: boolean;
  lastRun: string;
  nextRun: string;
  delivery: { method: string; recipients?: string[]; path?: string };
}

interface Template {
  id: string;
  name: string;
  type: string;
  description: string;
  fields: string[];
  sampleUrl?: string;
}

export default function BulkImportExportPage() {
  const [activeTab, setActiveTab] = useState<'imports' | 'exports' | 'schedules' | 'templates'>('imports');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  const { data: importsData } = useSWR<{ imports: ImportJob[] }>(
    '/api/ebay-bulk-import-export/imports',
    fetcher
  );

  const { data: exportsData } = useSWR<{ exports: ExportJob[] }>(
    '/api/ebay-bulk-import-export/exports',
    fetcher
  );

  const { data: schedulesData } = useSWR<{ schedules: Schedule[] }>(
    '/api/ebay-bulk-import-export/schedules',
    fetcher
  );

  const { data: importTemplatesData } = useSWR<{ templates: Template[] }>(
    '/api/ebay-bulk-import-export/templates/import',
    fetcher
  );

  const { data: exportTemplatesData } = useSWR<{ templates: Template[] }>(
    '/api/ebay-bulk-import-export/templates/export',
    fetcher
  );

  const { data: statsData } = useSWR(
    '/api/ebay-bulk-import-export/stats',
    fetcher
  );

  const imports = importsData?.imports ?? [];
  const exports = exportsData?.exports ?? [];
  const schedules = schedulesData?.schedules ?? [];
  const importTemplates = importTemplatesData?.templates ?? [];
  const exportTemplates = exportTemplatesData?.templates ?? [];

  const tabs = [
    { id: 'imports', label: 'インポート', icon: Upload },
    { id: 'exports', label: 'エクスポート', icon: Download },
    { id: 'schedules', label: 'スケジュール', icon: Calendar },
    { id: 'templates', label: 'テンプレート', icon: FileSpreadsheet },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled': return <Pause className="h-4 w-4 text-zinc-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-zinc-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '完了';
      case 'processing': return '処理中';
      case 'pending': return '待機中';
      case 'failed': return '失敗';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'products': return '商品';
      case 'inventory': return '在庫';
      case 'pricing': return '価格';
      case 'categories': return 'カテゴリ';
      case 'orders': return '注文';
      case 'listings': return '出品';
      case 'sales': return '売上';
      case 'customers': return '顧客';
      default: return type;
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500">
            <FileSpreadsheet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">一括インポート/エクスポート</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              データの一括処理と管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            インポート
          </Button>
          <Button variant="primary" size="sm">
            <Download className="h-4 w-4 mr-1" />
            エクスポート
          </Button>
        </div>
      </div>

      {/* Stats */}
      {statsData && (
        <div className="mb-4 grid grid-cols-5 gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-teal-500" />
              <div>
                <p className="text-xs text-zinc-500">インポート</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.imports.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="text-xs text-zinc-500">エクスポート</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.exports.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500">成功率</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {((statsData.imports.successful / statsData.imports.total) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-zinc-500">スケジュール</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{statsData.schedules.active}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-zinc-500">総レコード</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {(statsData.imports.totalRecords / 1000).toFixed(0)}K
                </p>
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
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
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
        {activeTab === 'imports' && (
          <div className="space-y-3">
            {imports.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">{job.name}</h4>
                      <p className="text-xs text-zinc-500">
                        {job.fileName} • {formatFileSize(job.fileSize)} • {getTypeLabel(job.type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* 進捗バー */}
                    {job.status === 'processing' && (
                      <div className="w-32">
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-500 transition-all"
                            style={{ width: `${(job.processedRows / job.totalRows) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-zinc-500 mt-1 text-center">
                          {job.processedRows} / {job.totalRows}
                        </p>
                      </div>
                    )}

                    {/* 結果サマリー */}
                    {job.status === 'completed' && (
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-emerald-600">{job.successRows} 成功</span>
                        {job.errorRows > 0 && (
                          <span className="text-red-600">{job.errorRows} エラー</span>
                        )}
                      </div>
                    )}

                    {/* ステータスバッジ */}
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      job.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      job.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      job.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {getStatusLabel(job.status)}
                    </span>

                    {/* アクション */}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {job.status === 'pending' && (
                        <Button variant="ghost" size="sm">
                          <Play className="h-4 w-4 text-emerald-500" />
                        </Button>
                      )}
                      {job.status === 'processing' && (
                        <Button variant="ghost" size="sm">
                          <Pause className="h-4 w-4 text-amber-500" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
                {job.error && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{job.error}</p>
                )}
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'exports' && (
          <div className="space-y-3">
            {exports.map((job) => (
              <Card key={job.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(job.status)}
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">{job.name}</h4>
                      <p className="text-xs text-zinc-500">
                        {getTypeLabel(job.type)} • {job.format.toUpperCase()} • {job.totalRecords} レコード
                        {job.fileSize && ` • ${formatFileSize(job.fileSize)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {job.expiresAt && (
                      <span className="text-xs text-zinc-500">
                        有効期限: {new Date(job.expiresAt).toLocaleDateString('ja-JP')}
                      </span>
                    )}

                    <span className={`px-2 py-1 text-xs rounded-full ${
                      job.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      job.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {getStatusLabel(job.status)}
                    </span>

                    <div className="flex gap-1">
                      {job.downloadUrl && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          ダウンロード
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-3">
            <div className="flex justify-end mb-4">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                スケジュール作成
              </Button>
            </div>
            {schedules.map((schedule) => (
              <Card key={schedule.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${schedule.enabled ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    <div>
                      <h4 className="font-medium text-zinc-900 dark:text-white">{schedule.name}</h4>
                      <p className="text-xs text-zinc-500">
                        {getTypeLabel(schedule.exportType)} • {schedule.format.toUpperCase()} • {schedule.cronDescription}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-zinc-500">
                      <p>前回: {new Date(schedule.lastRun).toLocaleString('ja-JP')}</p>
                      <p>次回: {new Date(schedule.nextRun).toLocaleString('ja-JP')}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Play className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-2 gap-6">
            {/* インポートテンプレート */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4" />
                インポートテンプレート
              </h3>
              <div className="space-y-3">
                {importTemplates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">{template.name}</h4>
                        <p className="text-xs text-zinc-500">{getTypeLabel(template.type)}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        サンプル
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.fields.slice(0, 5).map((field) => (
                        <span key={field} className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                          {field}
                        </span>
                      ))}
                      {template.fields.length > 5 && (
                        <span className="text-xs text-zinc-500">+{template.fields.length - 5}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* エクスポートテンプレート */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Download className="h-4 w-4" />
                エクスポートテンプレート
              </h3>
              <div className="space-y-3">
                {exportTemplates.map((template) => (
                  <Card key={template.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-zinc-900 dark:text-white">{template.name}</h4>
                        <p className="text-xs text-zinc-500">{getTypeLabel(template.type)}</p>
                      </div>
                      <Button variant="primary" size="sm">
                        <Download className="h-3 w-3 mr-1" />
                        使用
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.fields.slice(0, 5).map((field) => (
                        <span key={field} className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                          {field}
                        </span>
                      ))}
                      {template.fields.length > 5 && (
                        <span className="text-xs text-zinc-500">+{template.fields.length - 5}</span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

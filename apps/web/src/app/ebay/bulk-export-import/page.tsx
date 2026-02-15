'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Download,
  Upload,
  FileText,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Plus,
  ChevronRight,
  Database,
  HardDrive,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const fetcher = (url: string) => fetch(url).then(res => res.json());

type TabType = 'dashboard' | 'exports' | 'imports' | 'export-templates' | 'import-templates' | 'schedules' | 'storage';

export default function BulkExportImportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportForm, setExportForm] = useState({
    type: 'listings',
    format: 'csv',
    columns: [] as string[]
  });

  const { data: stats } = useSWR(`${API_BASE}/ebay-bulk-export-import/stats`, fetcher);
  const { data: exportsData } = useSWR(`${API_BASE}/ebay-bulk-export-import/exports?limit=20`, fetcher);
  const { data: importsData } = useSWR(`${API_BASE}/ebay-bulk-export-import/imports?limit=20`, fetcher);
  const { data: exportTemplates } = useSWR(`${API_BASE}/ebay-bulk-export-import/templates/export`, fetcher);
  const { data: importTemplates } = useSWR(`${API_BASE}/ebay-bulk-export-import/templates/import`, fetcher);
  const { data: schedules } = useSWR(`${API_BASE}/ebay-bulk-export-import/schedules`, fetcher);
  const { data: storage } = useSWR(`${API_BASE}/ebay-bulk-export-import/storage`, fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: Database },
    { id: 'exports' as TabType, label: 'エクスポート', icon: Download },
    { id: 'imports' as TabType, label: 'インポート', icon: Upload },
    { id: 'export-templates' as TabType, label: 'エクスポートテンプレート', icon: FileText },
    { id: 'import-templates' as TabType, label: 'インポートテンプレート', icon: FileSpreadsheet },
    { id: 'schedules' as TabType, label: 'スケジュール', icon: Calendar },
    { id: 'storage' as TabType, label: 'ストレージ', icon: HardDrive },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'processing': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-gray-400" />;
      default: return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今月のエクスポート</p>
              <p className="text-2xl font-bold">{stats?.exports?.thisMonth || 0}</p>
            </div>
            <Download className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">全{stats?.exports?.total || 0}件</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">今月のインポート</p>
              <p className="text-2xl font-bold">{stats?.imports?.thisMonth || 0}</p>
            </div>
            <Upload className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">成功率 {stats?.imports?.successRate || 0}%</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">スケジュール</p>
              <p className="text-2xl font-bold">{stats?.scheduledExports || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-400 mt-2">自動実行設定</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ストレージ使用量</p>
              <p className="text-2xl font-bold">{stats?.storage?.used || 0} GB</p>
            </div>
            <HardDrive className="h-8 w-8 text-orange-500" />
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-orange-500 h-2 rounded-full"
              style={{ width: `${((stats?.storage?.used || 0) / (stats?.storage?.limit || 10)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">クイックエクスポート</h3>
          <div className="grid grid-cols-2 gap-3">
            {['listings', 'orders', 'inventory', 'customers'].map(type => (
              <button
                key={type}
                onClick={() => {
                  setExportForm({ ...exportForm, type });
                  setShowExportModal(true);
                }}
                className="p-3 border rounded hover:bg-gray-50 text-left"
              >
                <Download className="h-5 w-5 text-blue-500 mb-1" />
                <p className="font-medium capitalize">{type}</p>
                <p className="text-xs text-gray-500">CSV/Excel形式</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">クイックインポート</h3>
          <div className="grid grid-cols-2 gap-3">
            {['listings', 'inventory', 'prices', 'templates'].map(type => (
              <button
                key={type}
                onClick={() => setShowImportModal(true)}
                className="p-3 border rounded hover:bg-gray-50 text-left"
              >
                <Upload className="h-5 w-5 text-green-500 mb-1" />
                <p className="font-medium capitalize">{type}</p>
                <p className="text-xs text-gray-500">CSV/Excel形式</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 最近のジョブ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">最近のエクスポート</h3>
          <div className="space-y-3">
            {exportsData?.jobs?.slice(0, 5).map((job: any) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <p className="font-medium capitalize">{job.type}</p>
                    <p className="text-xs text-gray-500">{job.format.toUpperCase()} • {job.totalRecords}件</p>
                  </div>
                </div>
                {job.status === 'completed' && (
                  <button className="text-blue-600 hover:text-blue-800 text-sm">
                    ダウンロード
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">最近のインポート</h3>
          <div className="space-y-3">
            {importsData?.jobs?.slice(0, 5).map((job: any) => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  {getStatusIcon(job.status)}
                  <div>
                    <p className="font-medium">{job.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {job.successCount}件成功 / {job.errorCount}件エラー
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                  {job.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderExports = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">エクスポート履歴</h3>
        <button
          onClick={() => setShowExportModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新規エクスポート
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">フォーマット</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">レコード数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">サイズ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {exportsData?.jobs?.map((job: any) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 capitalize">{job.type}</td>
                <td className="px-6 py-4 uppercase">{job.format}</td>
                <td className="px-6 py-4">
                  {job.status === 'processing' ? (
                    <span>{job.processedRecords} / {job.totalRecords}</span>
                  ) : (
                    <span>{job.totalRecords}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {job.fileSize ? formatFileSize(job.fileSize) : '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(job.createdAt).toLocaleString('ja-JP')}
                </td>
                <td className="px-6 py-4">
                  {job.status === 'completed' ? (
                    <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                      <Download className="h-4 w-4" />
                      ダウンロード
                    </button>
                  ) : job.status === 'processing' || job.status === 'pending' ? (
                    <button className="text-red-600 hover:text-red-800 text-sm">
                      キャンセル
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderImports = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">インポート履歴</h3>
        <button
          onClick={() => setShowImportModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新規インポート
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ファイル</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">成功/エラー</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">進捗</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">作成日時</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {importsData?.jobs?.map((job: any) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(job.status)}
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">{job.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(job.fileSize)}</p>
                  </div>
                </td>
                <td className="px-6 py-4 capitalize">{job.type}</td>
                <td className="px-6 py-4">
                  <span className="text-green-600">{job.successCount}</span>
                  {' / '}
                  <span className="text-red-600">{job.errorCount}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(job.processedRecords / job.totalRecords) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs">{Math.round((job.processedRecords / job.totalRecords) * 100)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(job.createdAt).toLocaleString('ja-JP')}
                </td>
                <td className="px-6 py-4">
                  {job.errorCount > 0 && (
                    <button className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      エラー詳細
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderExportTemplates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">エクスポートテンプレート</h3>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規テンプレート
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {exportTemplates?.templates?.map((template: any) => (
          <div key={template.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{template.name}</h4>
                <div className="flex gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                    {template.type}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs uppercase">
                    {template.format}
                  </span>
                </div>
              </div>
              {template.schedule?.enabled && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  スケジュール済み
                </span>
              )}
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">カラム:</p>
              <div className="flex flex-wrap gap-1">
                {template.columns?.slice(0, 5).map((col: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                    {col}
                  </span>
                ))}
                {template.columns?.length > 5 && (
                  <span className="text-xs text-gray-500">+{template.columns.length - 5}件</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-gray-500">
                最終使用: {template.lastUsedAt ? new Date(template.lastUsedAt).toLocaleDateString('ja-JP') : '未使用'}
              </span>
              <div className="flex gap-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  実行
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderImportTemplates = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">インポートテンプレート</h3>
        <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          新規テンプレート
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {importTemplates?.templates?.map((template: any) => (
          <div key={template.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-medium">{template.name}</h4>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs capitalize mt-1 inline-block">
                  {template.type}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xs text-gray-500 mb-1">マッピング:</p>
              <div className="space-y-1">
                {template.mapping?.slice(0, 3).map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 bg-gray-100 rounded">{m.sourceField}</span>
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{m.targetField}</span>
                    {m.required && <span className="text-red-500">*</span>}
                  </div>
                ))}
                {template.mapping?.length > 3 && (
                  <span className="text-xs text-gray-500">+{template.mapping.length - 3}件</span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-xs text-gray-500">
                最終使用: {template.lastUsedAt ? new Date(template.lastUsedAt).toLocaleDateString('ja-JP') : '未使用'}
              </span>
              <div className="flex gap-2">
                <button className="text-blue-600 hover:text-blue-800 text-sm">編集</button>
                <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                  使用
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSchedules = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">スケジュールエクスポート</h3>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名前</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">スケジュール</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">次回実行</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">送信先</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">アクション</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {schedules?.schedules?.map((schedule: any) => (
              <tr key={schedule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{schedule.name}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                    {schedule.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">{schedule.cron}</code>
                </td>
                <td className="px-6 py-4 text-sm">
                  {new Date(schedule.nextRun).toLocaleString('ja-JP')}
                </td>
                <td className="px-6 py-4 text-sm">
                  {schedule.recipients?.join(', ')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Play className="h-4 w-4" />
                    </button>
                    <button className="text-yellow-600 hover:text-yellow-800">
                      <Pause className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderStorage = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">ストレージ管理</h3>

      {/* 使用量 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">使用量</h4>
          <span className="text-2xl font-bold">
            {storage?.used} / {storage?.limit} GB
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div
            className={`h-4 rounded-full ${
              storage?.percentage > 80 ? 'bg-red-500' :
              storage?.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${storage?.percentage || 0}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-2 mb-1">
              <Download className="h-4 w-4 text-blue-500" />
              <span className="font-medium">エクスポートファイル</span>
            </div>
            <p className="text-lg font-bold">{storage?.files?.exports?.size} GB</p>
            <p className="text-xs text-gray-500">{storage?.files?.exports?.count}ファイル</p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <div className="flex items-center gap-2 mb-1">
              <Upload className="h-4 w-4 text-green-500" />
              <span className="font-medium">インポートファイル</span>
            </div>
            <p className="text-lg font-bold">{storage?.files?.imports?.size} GB</p>
            <p className="text-xs text-gray-500">{storage?.files?.imports?.count}ファイル</p>
          </div>
        </div>
      </div>

      {/* 保持期間 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4">ファイル保持期間</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border rounded">
            <p className="text-sm text-gray-500">エクスポートファイル</p>
            <p className="text-lg font-bold">{storage?.retention?.exportFiles}日間</p>
          </div>
          <div className="p-3 border rounded">
            <p className="text-sm text-gray-500">インポートファイル</p>
            <p className="text-lg font-bold">{storage?.retention?.importFiles}日間</p>
          </div>
        </div>
      </div>

      {/* クリーンアップ */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h4 className="font-medium mb-4">ストレージクリーンアップ</h4>
        <p className="text-sm text-gray-500 mb-4">
          古いファイルを削除してストレージを解放します。
        </p>
        <div className="flex gap-2">
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            7日以上前のファイルを削除
          </button>
          <button className="px-4 py-2 border rounded hover:bg-gray-50">
            30日以上前のファイルを削除
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
            すべてのファイルを削除
          </button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'exports': return renderExports();
      case 'imports': return renderImports();
      case 'export-templates': return renderExportTemplates();
      case 'import-templates': return renderImportTemplates();
      case 'schedules': return renderSchedules();
      case 'storage': return renderStorage();
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bulk Export/Import</h1>
              <p className="text-sm text-gray-500">一括エクスポート・インポート管理</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                エクスポート
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                インポート
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* タブ */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}

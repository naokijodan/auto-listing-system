'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Database,
  BarChart3,
  Settings,
  Table,
  Download,
  Upload,
  Archive,
  RefreshCw,
  Search,
  Play,
  Plus,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Server,
  Activity,
  FileJson,
  FileSpreadsheet,
  Save,
  History,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'tables' | 'backups' | 'exports' | 'query' | 'settings';

export default function DataCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'tables', label: 'テーブル', icon: <Table className="w-4 h-4" /> },
    { id: 'backups', label: 'バックアップ', icon: <Archive className="w-4 h-4" /> },
    { id: 'exports', label: 'インポート/エクスポート', icon: <Download className="w-4 h-4" /> },
    { id: 'query', label: 'クエリ', icon: <Search className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-pink-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">データセンター</h1>
              <p className="text-sm text-gray-500">Data Center</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'tables' && <TablesTab />}
          {activeTab === 'backups' && <BackupsTab />}
          {activeTab === 'exports' && <ExportsTab />}
          {activeTab === 'query' && <QueryTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/data-center/dashboard/overview`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/data-center/dashboard/stats`, fetcher);
  const { data: health } = useSWR(`${API_BASE}/ebay/data-center/dashboard/health`, fetcher);

  return (
    <div className="space-y-6">
      {/* メトリクス */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">データサイズ</p>
              <p className="text-2xl font-bold">{overview?.totalDataSize}</p>
            </div>
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総レコード数</p>
              <p className="text-2xl font-bold">{(overview?.totalRecords / 1000000)?.toFixed(2)}M</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">テーブル数</p>
              <p className="text-2xl font-bold">{overview?.tablesCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Table className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ステータス</p>
              <p className="text-lg font-bold text-green-600">{overview?.healthStatus === 'healthy' ? '正常' : '異常'}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* テーブル別 & ヘルス */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">テーブル別サイズ</h3>
          <div className="space-y-4">
            {stats?.byTable?.map((table: {
              table: string;
              records: number;
              size: string;
              growth: number;
            }) => (
              <div key={table.table}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{table.table}</span>
                  <span className="text-sm text-gray-500">{table.size}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-pink-500 rounded-full" style={{ width: `${Math.min(table.records / 5000, 100)}%` }}></div>
                  </div>
                  <span className="text-xs text-green-600">+{table.growth}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">システムヘルス</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">データベース</p>
                  <p className="text-xs text-gray-500">レイテンシ: {health?.health?.database?.latency}ms</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                health?.health?.database?.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {health?.health?.database?.status === 'healthy' ? '正常' : '異常'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">ストレージ</p>
                  <p className="text-xs text-gray-500">{health?.health?.storage?.used}GB / {health?.health?.storage?.total}GB</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                health?.health?.storage?.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {health?.health?.storage?.percentage}% 使用
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium">バックアップ</p>
                  <p className="text-xs text-gray-500">次回: {health?.health?.backup?.nextBackup}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                health?.health?.backup?.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {health?.health?.backup?.status === 'healthy' ? '正常' : '異常'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* クエリ統計 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">クエリ統計</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">総クエリ数</p>
            <p className="text-xl font-bold">{stats?.queryStats?.totalQueries?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">平均応答時間</p>
            <p className="text-xl font-bold">{stats?.queryStats?.avgResponseTime}ms</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">スロークエリ</p>
            <p className="text-xl font-bold text-amber-600">{stats?.queryStats?.slowQueries}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">失敗クエリ</p>
            <p className="text-xl font-bold text-red-600">{stats?.queryStats?.failedQueries}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TablesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/data-center/tables`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">テーブル一覧</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">テーブル名</th>
                <th className="px-4 py-3 text-left text-sm">説明</th>
                <th className="px-4 py-3 text-right text-sm">レコード数</th>
                <th className="px-4 py-3 text-right text-sm">サイズ</th>
                <th className="px-4 py-3 text-left text-sm">最終更新</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.tables?.map((table: {
                name: string;
                description: string;
                records: number;
                size: string;
                lastModified: string;
                schema: string;
              }) => (
                <tr key={table.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-gray-400" />
                      <span className="font-mono font-medium">{table.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{table.description}</td>
                  <td className="px-4 py-3 text-sm text-right">{table.records.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">{table.size}</td>
                  <td className="px-4 py-3 text-sm">{table.lastModified}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 rounded" title="詳細"><Eye className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-gray-100 rounded" title="エクスポート"><Download className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BackupsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/data-center/backups`, fetcher);

  return (
    <div className="space-y-6">
      {/* スケジュール */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">バックアップスケジュール</h3>
            <p className="text-sm text-gray-500 mt-1">
              頻度: {data?.schedule?.frequency === 'daily' ? '毎日' : data?.schedule?.frequency} {data?.schedule?.time}
              | 保持期間: {data?.schedule?.retention}日
            </p>
          </div>
          <div className="flex gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-500">次回バックアップ</p>
              <p className="font-medium">{data?.schedule?.nextBackup}</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
              <Plus className="w-4 h-4" />
              今すぐバックアップ
            </button>
          </div>
        </div>
      </div>

      {/* バックアップ一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">バックアップ履歴</h3>
        </div>
        <div className="divide-y">
          {data?.backups?.map((backup: {
            id: string;
            name: string;
            type: string;
            status: string;
            size: string;
            createdAt: string;
            expiresAt: string;
          }) => (
            <div key={backup.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Archive className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="font-medium">{backup.name}</p>
                  <p className="text-sm text-gray-500">
                    {backup.type === 'full' ? 'フルバックアップ' : '差分'} • {backup.size} • {backup.createdAt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                  backup.status === 'running' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {backup.status === 'completed' ? '完了' : backup.status === 'running' ? '実行中' : backup.status}
                </span>
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 rounded" title="復元"><RefreshCw className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded" title="ダウンロード"><Download className="w-4 h-4" /></button>
                  <button className="p-2 hover:bg-gray-100 rounded text-red-600" title="削除"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExportsTab() {
  const { data: exports } = useSWR(`${API_BASE}/ebay/data-center/exports`, fetcher);
  const { data: imports } = useSWR(`${API_BASE}/ebay/data-center/imports`, fetcher);

  return (
    <div className="space-y-6">
      {/* エクスポート */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">エクスポート</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
            <Download className="w-4 h-4" />
            新規エクスポート
          </button>
        </div>
        <div className="divide-y">
          {exports?.exports?.map((exp: {
            id: string;
            name: string;
            table: string;
            format: string;
            status: string;
            size: string;
            createdAt: string;
          }) => (
            <div key={exp.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  {exp.format === 'csv' ? (
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  ) : (
                    <FileJson className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{exp.name}</p>
                  <p className="text-sm text-gray-500">
                    テーブル: {exp.table} • {exp.format.toUpperCase()} • {exp.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  exp.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {exp.status === 'completed' ? '完了' : '処理中'}
                </span>
                <button className="p-2 hover:bg-gray-100 rounded"><Download className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* インポート */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">インポート</h3>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Upload className="w-4 h-4" />
            新規インポート
          </button>
        </div>
        <div className="divide-y">
          {imports?.imports?.map((imp: {
            id: string;
            name: string;
            table: string;
            format: string;
            status: string;
            records: number;
            createdAt: string;
            errors: number;
          }) => (
            <div key={imp.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{imp.name}</p>
                  <p className="text-sm text-gray-500">
                    テーブル: {imp.table} • {imp.records.toLocaleString()}件
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  imp.status === 'completed' && imp.errors === 0 ? 'bg-green-100 text-green-800' :
                  imp.status === 'completed' && imp.errors > 0 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {imp.status === 'completed' ? (imp.errors > 0 ? `${imp.errors}件エラー` : '完了') : '処理中'}
                </span>
                <button className="p-2 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function QueryTab() {
  const { data: saved } = useSWR(`${API_BASE}/ebay/data-center/query/saved`, fetcher);
  const { data: history } = useSWR(`${API_BASE}/ebay/data-center/query/history`, fetcher);
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* クエリエディタ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">SQLクエリ</h3>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SELECT * FROM listings WHERE price > 10000 LIMIT 10"
          className="w-full h-32 border rounded-lg px-3 py-2 font-mono text-sm"
        />
        <div className="flex justify-between mt-4">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
              <Play className="w-4 h-4" />
              実行
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm">
            <option value="">保存済みクエリを選択...</option>
            {saved?.queries?.map((q: { id: string; name: string }) => (
              <option key={q.id} value={q.id}>{q.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 保存済みクエリ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">保存済みクエリ</h3>
        <div className="space-y-3">
          {saved?.queries?.map((q: {
            id: string;
            name: string;
            query: string;
            description: string;
          }) => (
            <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{q.name}</p>
                <p className="text-xs text-gray-500 mt-1">{q.description}</p>
                <code className="text-xs text-gray-400 block mt-1">{q.query.substring(0, 60)}...</code>
              </div>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-gray-100 rounded"><Play className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* クエリ履歴 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">クエリ履歴</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">クエリ</th>
                <th className="px-4 py-3 text-right text-sm">実行時間</th>
                <th className="px-4 py-3 text-right text-sm">結果</th>
                <th className="px-4 py-3 text-left text-sm">実行日時</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history?.queries?.map((q: {
                id: string;
                query: string;
                executionTime: number;
                rowsAffected: number;
                executedAt: string;
                status: string;
              }) => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="text-xs">{q.query.substring(0, 50)}...</code>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">{q.executionTime}ms</td>
                  <td className="px-4 py-3 text-sm text-right">{q.rowsAffected}行</td>
                  <td className="px-4 py-3 text-sm">{q.executedAt}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      q.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {q.status === 'success' ? '成功' : '失敗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/data-center/settings/general`, fetcher);
  const { data: backup } = useSWR(`${API_BASE}/ebay/data-center/settings/backup`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">データ保持期間</p>
              <p className="text-sm text-gray-500">古いデータを自動削除</p>
            </div>
            <select defaultValue={general?.settings?.retentionDays} className="border rounded-lg px-3 py-2">
              <option value={90}>90日</option>
              <option value={180}>180日</option>
              <option value={365}>1年</option>
              <option value={730}>2年</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">自動アーカイブ</p>
              <p className="text-sm text-gray-500">古いデータを自動的にアーカイブ</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoArchive} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">圧縮</p>
              <p className="text-sm text-gray-500">データを圧縮して保存</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.compressionEnabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">暗号化</p>
              <p className="text-sm text-gray-500">データを暗号化して保存</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.encryptionEnabled} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      {/* バックアップ設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">バックアップ設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">自動バックアップ</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={backup?.settings?.autoBackup} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">バックアップ頻度</p>
            </div>
            <select defaultValue={backup?.settings?.backupFrequency} className="border rounded-lg px-3 py-2">
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">バックアップ保持期間</p>
            </div>
            <select defaultValue={backup?.settings?.retentionDays} className="border rounded-lg px-3 py-2">
              <option value={7}>7日</option>
              <option value={14}>14日</option>
              <option value={30}>30日</option>
              <option value={90}>90日</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">完了時通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={backup?.settings?.notifyOnComplete} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-pink-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

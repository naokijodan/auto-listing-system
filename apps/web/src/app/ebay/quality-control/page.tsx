'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Image,
  FileText,
  Settings,
  BarChart3,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  Download,
  Filter,
  Zap,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'issues' | 'listings' | 'images' | 'automation' | 'settings';

export default function QualityControlPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'issues', label: '問題管理', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'listings', label: 'リスティング品質', icon: <FileText className="w-4 h-4" /> },
    { id: 'images', label: '画像品質', icon: <Image className="w-4 h-4" /> },
    { id: 'automation', label: '自動化', icon: <Zap className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-teal-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">品質管理</h1>
              <p className="text-sm text-gray-500">Quality Control</p>
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
                  ? 'border-teal-600 text-teal-600'
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
          {activeTab === 'issues' && <IssuesTab />}
          {activeTab === 'listings' && <ListingsTab />}
          {activeTab === 'images' && <ImagesTab />}
          {activeTab === 'automation' && <AutomationTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/quality-control/dashboard/overview`, fetcher);
  const { data: metrics } = useSWR(`${API_BASE}/ebay/quality-control/dashboard/metrics`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/quality-control/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">総合スコア</p>
              <p className="text-3xl font-bold">{overview?.overallScore}</p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-teal-500 flex items-center justify-center">
              <span className="text-lg font-bold text-teal-600">{overview?.overallScore}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">リスティング品質</p>
          <p className="text-2xl font-bold">{overview?.listingQuality}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${overview?.listingQuality}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">画像品質</p>
          <p className="text-2xl font-bold">{overview?.imageQuality}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${overview?.imageQuality}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">未解決の問題</p>
          <p className="text-2xl font-bold text-red-600">{overview?.issuesFound - overview?.issuesResolved}</p>
          <p className="text-sm text-gray-500 mt-1">{overview?.issuesResolved}件解決済み</p>
        </div>
      </div>

      {/* アラート */}
      {alerts?.alerts && alerts.alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.alerts.map((alert: { id: string; type: string; message: string; count: number }) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                alert.type === 'critical' ? 'bg-red-50 border border-red-200' :
                alert.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.type === 'critical' ? (
                  <XCircle className="w-5 h-5 text-red-600" />
                ) : alert.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
                <span className={alert.type === 'critical' ? 'text-red-800' : alert.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'}>
                  {alert.message}
                </span>
              </div>
              {alert.count > 0 && (
                <span className="px-2 py-1 bg-white rounded text-sm font-medium">{alert.count}件</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* カテゴリ別スコア */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">カテゴリ別品質スコア</h3>
        <div className="space-y-4">
          {metrics?.byCategory?.map((cat: { category: string; score: number; issues: number }) => (
            <div key={cat.category}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">{cat.category}</span>
                <span className="text-sm">
                  {cat.score}% <span className="text-gray-400">| {cat.issues}件の問題</span>
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    cat.score >= 90 ? 'bg-green-500' :
                    cat.score >= 70 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${cat.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IssuesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/quality-control/issues`, fetcher);
  const [filter, setFilter] = useState('all');

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-gray-100 text-gray-800',
    };
    return styles[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      open: 'bg-red-100 text-red-800',
      in_progress: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          {['all', 'open', 'in_progress', 'resolved'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm ${
                filter === status
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'すべて' : status === 'open' ? '未対応' : status === 'in_progress' ? '対応中' : '解決済み'}
            </button>
          ))}
        </div>
      </div>

      {/* 問題一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">SKU</th>
                <th className="px-4 py-3 text-left text-sm">商品名</th>
                <th className="px-4 py-3 text-left text-sm">問題タイプ</th>
                <th className="px-4 py-3 text-center text-sm">重要度</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.issues?.filter((issue: { status: string }) => filter === 'all' || issue.status === filter).map((issue: {
                id: string;
                sku: string;
                title: string;
                type: string;
                severity: string;
                status: string;
              }) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{issue.sku}</td>
                  <td className="px-4 py-3 text-sm">{issue.title}</td>
                  <td className="px-4 py-3 text-sm">{issue.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getSeverityBadge(issue.severity)}`}>
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(issue.status)}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-gray-100 rounded text-green-600"><CheckCircle className="w-4 h-4" /></button>
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

function ListingsTab() {
  const { data: scan } = useSWR(`${API_BASE}/ebay/quality-control/listings/scan`, fetcher);
  const { data: descriptions } = useSWR(`${API_BASE}/ebay/quality-control/descriptions/analysis`, fetcher);

  return (
    <div className="space-y-6">
      {/* スキャン結果 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">スキャン結果</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            <RefreshCw className="w-4 h-4" />
            スキャン実行
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">スキャン済み</p>
            <p className="text-2xl font-bold">{scan?.totalScanned?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">合格</p>
            <p className="text-2xl font-bold text-green-800">{scan?.passed?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">不合格</p>
            <p className="text-2xl font-bold text-red-800">{scan?.failed?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-teal-50 rounded-lg">
            <p className="text-sm text-teal-700">合格率</p>
            <p className="text-2xl font-bold text-teal-800">{scan?.passRate}%</p>
          </div>
        </div>

        <h4 className="font-medium mb-3">問題タイプ別</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {scan?.byIssueType?.map((type: { type: string; count: number }) => (
            <div key={type.type} className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">{type.type.replace(/_/g, ' ')}</span>
              <span className="font-medium">{type.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 説明文分析 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">説明文分析</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">平均文字数</p>
            <p className="text-2xl font-bold">{descriptions?.avgLength}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-700">短すぎる説明</p>
            <p className="text-2xl font-bold text-yellow-800">{descriptions?.shortDescriptions}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700">キーワード不足</p>
            <p className="text-2xl font-bold text-orange-800">{descriptions?.missingKeywords}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">重複説明</p>
            <p className="text-2xl font-bold text-red-800">{descriptions?.duplicateDescriptions}</p>
          </div>
        </div>

        <h4 className="font-medium mb-3">文字数分布</h4>
        <div className="flex items-end gap-2 h-32">
          {descriptions?.lengthDistribution?.map((dist: { range: string; count: number }, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-teal-500 rounded-t"
                style={{ height: `${(dist.count / 500) * 100}%` }}
              />
              <span className="text-xs text-gray-500 mt-1">{dist.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImagesTab() {
  const { data: analysis } = useSWR(`${API_BASE}/ebay/quality-control/images/analysis`, fetcher);
  const { data: missing } = useSWR(`${API_BASE}/ebay/quality-control/images/missing`, fetcher);

  return (
    <div className="space-y-6">
      {/* 画像分析 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">画像品質分析</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">総画像数</p>
            <p className="text-2xl font-bold">{analysis?.totalImages?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">高品質</p>
            <p className="text-2xl font-bold text-green-800">{analysis?.highQuality?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-700">中品質</p>
            <p className="text-2xl font-bold text-yellow-800">{analysis?.mediumQuality?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">低品質</p>
            <p className="text-2xl font-bold text-red-800">{analysis?.lowQuality?.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">欠落</p>
            <p className="text-2xl font-bold text-gray-800">{analysis?.missing}</p>
          </div>
        </div>

        <h4 className="font-medium mb-3">問題タイプ別</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {analysis?.issues?.map((issue: { type: string; count: number }) => (
            <div key={issue.type} className="flex items-center justify-between p-3 border rounded-lg">
              <span className="text-sm">{issue.type.replace(/_/g, ' ')}</span>
              <span className="font-medium">{issue.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 欠落画像 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">欠落画像一覧</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">SKU</th>
                <th className="px-4 py-3 text-left text-sm">商品名</th>
                <th className="px-4 py-3 text-left text-sm">スロット</th>
                <th className="px-4 py-3 text-center text-sm">優先度</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {missing?.missing?.map((item: {
                sku: string;
                title: string;
                imageSlot: string;
                priority: string;
              }) => (
                <tr key={item.sku} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{item.sku}</td>
                  <td className="px-4 py-3 text-sm">{item.title}</td>
                  <td className="px-4 py-3 text-sm">{item.imageSlot}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="px-3 py-1 bg-teal-600 text-white rounded text-sm hover:bg-teal-700">
                      画像追加
                    </button>
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

function AutomationTab() {
  const { data: rules } = useSWR(`${API_BASE}/ebay/quality-control/automation/rules`, fetcher);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">自動化ルール</h3>
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
            ルール追加
          </button>
        </div>

        <div className="space-y-4">
          {rules?.rules?.map((rule: {
            id: string;
            name: string;
            type: string;
            enabled: boolean;
            triggerCount: number;
          }) => (
            <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={rule.enabled} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
                <div>
                  <p className="font-medium">{rule.name}</p>
                  <p className="text-sm text-gray-500">タイプ: {rule.type} | 実行回数: {rule.triggerCount}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded"><Edit className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-gray-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: settings } = useSWR(`${API_BASE}/ebay/quality-control/settings/general`, fetcher);
  const { data: thresholds } = useSWR(`${API_BASE}/ebay/quality-control/settings/thresholds`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">自動スキャン</p>
              <p className="text-sm text-gray-500">定期的に品質スキャンを実行</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.autoScan} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">スキャン頻度</p>
              <p className="text-sm text-gray-500">自動スキャンの実行間隔</p>
            </div>
            <select defaultValue={settings?.scanFrequency} className="border rounded-lg px-3 py-2">
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">自動修正</p>
              <p className="text-sm text-gray-500">問題を自動的に修正</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.autoFix} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">問題発見時に通知</p>
              <p className="text-sm text-gray-500">新しい問題が見つかった時に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={settings?.notifyOnIssue} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-teal-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
        <div className="mt-6">
          <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            設定を保存
          </button>
        </div>
      </div>

      {/* しきい値設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">品質しきい値</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">最小説明文字数</label>
            <input
              type="number"
              defaultValue={thresholds?.descriptionLength?.min}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">最小画像数</label>
            <input
              type="number"
              defaultValue={thresholds?.imageCount?.min}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">最小画像解像度</label>
            <input
              type="number"
              defaultValue={thresholds?.imageResolution?.min}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">価格変動許容範囲 (%)</label>
            <input
              type="number"
              defaultValue={thresholds?.priceVariance?.max}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

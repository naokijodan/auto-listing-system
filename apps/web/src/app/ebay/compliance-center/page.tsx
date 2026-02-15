'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Shield,
  BarChart3,
  Settings,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  Plus,
  ChevronRight,
  AlertCircle,
  Scale,
  ClipboardCheck,
  TrendingUp,
  Calendar,
  Bell,
  RefreshCw,
  ExternalLink,
  Check,
  FileWarning,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const fetcher = (url: string) => fetch(url).then((res) => res.json());

type TabType = 'dashboard' | 'policies' | 'violations' | 'audits' | 'reports' | 'settings';

export default function ComplianceCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ダッシュボード', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'policies', label: 'ポリシー', icon: <FileText className="w-4 h-4" /> },
    { id: 'violations', label: '違反', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'audits', label: '監査', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'reports', label: 'レポート', icon: <FileWarning className="w-4 h-4" /> },
    { id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-rose-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">コンプライアンスセンター</h1>
              <p className="text-sm text-gray-500">Compliance Center</p>
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
                  ? 'border-rose-600 text-rose-600'
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
          {activeTab === 'policies' && <PoliciesTab />}
          {activeTab === 'violations' && <ViolationsTab />}
          {activeTab === 'audits' && <AuditsTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: overview } = useSWR(`${API_BASE}/ebay/compliance-center/dashboard/overview`, fetcher);
  const { data: stats } = useSWR(`${API_BASE}/ebay/compliance-center/dashboard/stats`, fetcher);
  const { data: alerts } = useSWR(`${API_BASE}/ebay/compliance-center/dashboard/alerts`, fetcher);

  return (
    <div className="space-y-6">
      {/* コンプライアンススコア */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">コンプライアンススコア</h3>
            <p className="text-sm text-gray-500 mt-1">全体的なコンプライアンス状況</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={overview?.complianceScore >= 90 ? '#22c55e' : overview?.complianceScore >= 70 ? '#eab308' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={`${(overview?.complianceScore / 100) * 352} 352`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{overview?.complianceScore}%</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  overview?.complianceStatus === 'compliant' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className="font-medium">
                  {overview?.complianceStatus === 'compliant' ? '準拠' : '要確認'}
                </span>
              </div>
              <p className="text-sm text-gray-500">リスクレベル: {overview?.riskLevel === 'low' ? '低' : overview?.riskLevel === 'medium' ? '中' : '高'}</p>
              <p className="text-sm text-gray-500">次回監査: {overview?.nextAuditDate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* メトリクス */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ポリシー準拠</p>
              <p className="text-2xl font-bold">{overview?.compliantPolicies}/{overview?.totalPolicies}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">レビュー保留</p>
              <p className="text-2xl font-bold text-amber-600">{overview?.pendingReviews}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">最近の違反</p>
              <p className="text-2xl font-bold text-red-600">{overview?.recentViolations}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">最終監査</p>
              <p className="text-xl font-bold">{overview?.lastAuditDate}</p>
            </div>
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* カテゴリ別 & アラート */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">カテゴリ別コンプライアンス</h3>
          <div className="space-y-4">
            {stats?.byCategory?.map((cat: {
              category: string;
              compliant: number;
              nonCompliant: number;
              total: number;
            }) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{cat.category}</span>
                  <span className="text-sm text-gray-500">{cat.compliant}/{cat.total}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div
                    className={`h-2 rounded-full ${cat.nonCompliant > 0 ? 'bg-amber-500' : 'bg-green-500'}`}
                    style={{ width: `${(cat.compliant / cat.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">アラート</h3>
          <div className="space-y-3">
            {alerts?.alerts?.map((alert: {
              id: string;
              type: string;
              title: string;
              message: string;
              dueDate: string;
              priority: string;
            }) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg ${
                alert.type === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
              }`}>
                {alert.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                ) : (
                  <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{alert.title}</p>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {alert.priority === 'high' ? '高' : alert.priority === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{alert.message}</p>
                  <p className="text-xs text-gray-400 mt-2">期限: {alert.dueDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* トレンド */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">コンプライアンススコア推移</h3>
        <div className="flex items-end gap-2 h-40">
          {stats?.trend?.map((point: { month: string; score: number }) => (
            <div key={point.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-rose-500 rounded-t"
                style={{ height: `${point.score}%` }}
              ></div>
              <span className="text-xs text-gray-500 mt-2">{point.month.slice(-2)}月</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PoliciesTab() {
  const { data } = useSWR(`${API_BASE}/ebay/compliance-center/policies`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'pending_review': return 'bg-yellow-100 text-yellow-800';
      case 'non_compliant': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'compliant': return '準拠';
      case 'pending_review': return '要確認';
      case 'non_compliant': return '非準拠';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">ポリシー一覧</h3>
          <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" />
            すべてを確認
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">ポリシー名</th>
                <th className="px-4 py-3 text-left text-sm">カテゴリ</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-left text-sm">最終確認</th>
                <th className="px-4 py-3 text-left text-sm">次回確認</th>
                <th className="px-4 py-3 text-center text-sm">バージョン</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.policies?.map((policy: {
                id: string;
                name: string;
                category: string;
                status: string;
                lastReviewed: string;
                nextReview: string;
                version: string;
              }) => (
                <tr key={policy.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{policy.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{policy.category}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(policy.status)}`}>
                      {getStatusLabel(policy.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{policy.lastReviewed}</td>
                  <td className="px-4 py-3 text-sm">{policy.nextReview}</td>
                  <td className="px-4 py-3 text-center text-sm">{policy.version}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4" /></button>
                      <button className="p-1 hover:bg-gray-100 rounded"><Check className="w-4 h-4" /></button>
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

function ViolationsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/compliance-center/violations`, fetcher);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* 統計 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">解決済み</p>
              <p className="text-2xl font-bold text-green-600">{data?.stats?.resolved}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">レビュー中</p>
              <p className="text-2xl font-bold text-blue-600">{data?.stats?.underReview}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">保留中</p>
              <p className="text-2xl font-bold text-amber-600">{data?.stats?.pending}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </div>

      {/* 違反一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">違反履歴</h3>
        </div>
        <div className="divide-y">
          {data?.violations?.map((violation: {
            id: string;
            type: string;
            description: string;
            listingId: string;
            status: string;
            severity: string;
            createdAt: string;
            resolvedAt: string | null;
          }) => (
            <div key={violation.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    violation.status === 'resolved' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {violation.status === 'resolved' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{violation.description}</p>
                      <span className={`px-2 py-0.5 rounded text-xs ${getSeverityBadge(violation.severity)}`}>
                        {violation.severity === 'high' ? '高' : violation.severity === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      タイプ: {violation.type} • リスティングID: {violation.listingId}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      発生日: {violation.createdAt}
                      {violation.resolvedAt && ` • 解決日: ${violation.resolvedAt}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(violation.status)}`}>
                    {violation.status === 'resolved' ? '解決済み' :
                     violation.status === 'under_review' ? 'レビュー中' : '保留中'}
                  </span>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/compliance-center/audits`, fetcher);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">監査履歴</h3>
          <p className="text-sm text-gray-500">次回予定: {data?.nextScheduled}</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
          <Plus className="w-4 h-4" />
          監査をリクエスト
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">監査ID</th>
                <th className="px-4 py-3 text-left text-sm">タイプ</th>
                <th className="px-4 py-3 text-center text-sm">ステータス</th>
                <th className="px-4 py-3 text-left text-sm">期間</th>
                <th className="px-4 py-3 text-center text-sm">スコア</th>
                <th className="px-4 py-3 text-center text-sm">発見事項</th>
                <th className="px-4 py-3 text-center text-sm">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.audits?.map((audit: {
                id: string;
                type: string;
                status: string;
                startDate: string;
                endDate: string | null;
                score: number | null;
                findings: number | null;
              }) => (
                <tr key={audit.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{audit.id}</td>
                  <td className="px-4 py-3 text-sm capitalize">{audit.type}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(audit.status)}`}>
                      {audit.status === 'completed' ? '完了' :
                       audit.status === 'in_progress' ? '進行中' : '予定'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {audit.startDate} {audit.endDate ? `~ ${audit.endDate}` : ''}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {audit.score !== null ? (
                      <span className={`font-bold ${
                        audit.score >= 90 ? 'text-green-600' :
                        audit.score >= 70 ? 'text-amber-600' : 'text-red-600'
                      }`}>{audit.score}%</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {audit.findings !== null ? audit.findings : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Eye className="w-4 h-4" />
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

function ReportsTab() {
  const { data } = useSWR(`${API_BASE}/ebay/compliance-center/reports`, fetcher);
  const { data: regulations } = useSWR(`${API_BASE}/ebay/compliance-center/regulations`, fetcher);

  return (
    <div className="space-y-6">
      {/* レポート一覧 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">レポート</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
            <Plus className="w-4 h-4" />
            レポート生成
          </button>
        </div>
        <div className="divide-y">
          {data?.reports?.map((report: {
            id: string;
            name: string;
            type: string;
            period: string;
            generatedAt: string;
            downloadUrl: string;
          }) => (
            <div key={report.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-rose-100 rounded flex items-center justify-center">
                  <FileText className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-medium">{report.name}</p>
                  <p className="text-sm text-gray-500">期間: {report.period} • 生成日: {report.generatedAt}</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                ダウンロード
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 規制一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">適用規制</h3>
        <div className="space-y-3">
          {regulations?.regulations?.map((reg: {
            id: string;
            name: string;
            region: string;
            status: string;
            lastUpdated: string;
          }) => (
            <div key={reg.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium">{reg.name}</p>
                  <p className="text-sm text-gray-500">地域: {reg.region} • 最終更新: {reg.lastUpdated}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  reg.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {reg.status === 'active' ? '有効' : '無効'}
                </span>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 更新通知 */}
        {regulations?.updates?.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 rounded-lg">
            <h4 className="font-medium text-amber-800 mb-2">規制更新のお知らせ</h4>
            {regulations?.updates?.map((update: {
              regulationId: string;
              title: string;
              effectiveDate: string;
              summary: string;
            }) => (
              <div key={update.regulationId} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium">{update.title}</p>
                  <p className="text-gray-600">{update.summary}</p>
                  <p className="text-gray-400 text-xs mt-1">施行日: {update.effectiveDate}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const { data: general } = useSWR(`${API_BASE}/ebay/compliance-center/settings/general`, fetcher);
  const { data: notifications } = useSWR(`${API_BASE}/ebay/compliance-center/settings/notifications`, fetcher);

  return (
    <div className="space-y-6">
      {/* 一般設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">一般設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">自動コンプライアンスチェック</p>
              <p className="text-sm text-gray-500">定期的に自動でチェックを実行</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoComplianceCheck} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-rose-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">チェック頻度</p>
              <p className="text-sm text-gray-500">自動チェックの実行間隔</p>
            </div>
            <select defaultValue={general?.settings?.checkFrequency} className="border rounded-lg px-3 py-2">
              <option value="hourly">毎時</option>
              <option value="daily">毎日</option>
              <option value="weekly">毎週</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">アラートしきい値</p>
              <p className="text-sm text-gray-500">このスコア以下でアラートを発生</p>
            </div>
            <input
              type="number"
              defaultValue={general?.settings?.alertThreshold}
              className="w-20 border rounded-lg px-3 py-2 text-center"
              min={0}
              max={100}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">自動修正</p>
              <p className="text-sm text-gray-500">軽微な違反を自動で修正</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={general?.settings?.autoCorrection} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-rose-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 通知設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">通知設定</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">違反通知</p>
              <p className="text-sm text-gray-500">違反検出時に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.violationAlerts} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-rose-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">ポリシー更新通知</p>
              <p className="text-sm text-gray-500">ポリシー変更時に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.policyUpdates} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-rose-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b">
            <div>
              <p className="font-medium">監査リマインダー</p>
              <p className="text-sm text-gray-500">監査予定を事前に通知</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.auditReminders} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-rose-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">週次ダイジェスト</p>
              <p className="text-sm text-gray-500">週次サマリーをメール送信</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked={notifications?.settings?.weeklyDigest} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-rose-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">
          設定を保存
        </button>
      </div>
    </div>
  );
}

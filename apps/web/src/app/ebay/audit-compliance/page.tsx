
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, putApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Shield,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Play,
  ChevronRight,
  User,
  Eye,
  Loader2,
} from 'lucide-react';

type Tab = 'rules' | 'violations' | 'reports' | 'frameworks' | 'evidence';

export default function AuditCompliancePage() {
  const [activeTab, setActiveTab] = useState<Tab>('rules');
  const [selectedRuleCategory, setSelectedRuleCategory] = useState('');
  const [selectedViolationStatus, setSelectedViolationStatus] = useState('');

  // データ取得
  const { data: rulesData, mutate: mutateRules } = useSWR<any>(
    `/api/ebay-audit-compliance/rules${selectedRuleCategory ? `?category=${selectedRuleCategory}` : ''}`,
    fetcher
  );
  const { data: violationsData, mutate: mutateViolations } = useSWR<any>(
    `/api/ebay-audit-compliance/violations${selectedViolationStatus ? `?status=${selectedViolationStatus}` : ''}`,
    fetcher
  );
  const { data: reportsData, mutate: mutateReports } = useSWR<any>('/api/ebay-audit-compliance/reports', fetcher);
  const { data: frameworksData } = useSWR<any>('/api/ebay-audit-compliance/frameworks', fetcher);
  const { data: dashboardData } = useSWR<any>('/api/ebay-audit-compliance/dashboard', fetcher);
  const { data: evidenceData } = useSWR<any>('/api/ebay-audit-compliance/evidence', fetcher);

  const rules = rulesData?.rules ?? [];
  const violations = violationsData?.violations ?? [];
  const reports = reportsData?.reports ?? [];
  const frameworks = frameworksData?.frameworks ?? [];
  const evidence = evidenceData?.evidence ?? [];
  const dashboard = dashboardData ?? { overallScore: 0, complianceSummary: {}, violationsSummary: {} };

  const handleRunCheck = async (ruleId: string) => {
    try {
      await postApi(`/api/ebay-audit-compliance/rules/${ruleId}/check`, {});
      addToast({ type: 'success', message: 'コンプライアンスチェックを開始しました' });
      mutateRules();
    } catch {
      addToast({ type: 'error', message: 'チェック開始に失敗しました' });
    }
  };

  const handleToggleRule = async (ruleId: string) => {
    try {
      await postApi(`/api/ebay-audit-compliance/rules/${ruleId}/toggle`, {});
      addToast({ type: 'success', message: 'ルールのステータスを変更しました' });
      mutateRules();
    } catch {
      addToast({ type: 'error', message: 'ステータス変更に失敗しました' });
    }
  };

  const handleUpdateViolationStatus = async (violationId: string, status: string) => {
    try {
      await putApi(`/api/ebay-audit-compliance/violations/${violationId}/status`, { status });
      addToast({ type: 'success', message: '違反ステータスを更新しました' });
      mutateViolations();
    } catch {
      addToast({ type: 'error', message: 'ステータス更新に失敗しました' });
    }
  };

  const handleGenerateReport = async () => {
    try {
      await postApi('/api/ebay-audit-compliance/reports/generate', {
        name: `コンプライアンスレポート ${new Date().toISOString().split('T')[0]}`,
        type: 'MONTHLY',
        period: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
      });
      addToast({ type: 'success', message: 'レポート生成を開始しました' });
      mutateReports();
    } catch {
      addToast({ type: 'error', message: 'レポート生成に失敗しました' });
    }
  };

  const tabs = [
    { id: 'rules', label: 'ルール', icon: Shield },
    { id: 'violations', label: '違反', icon: AlertTriangle },
    { id: 'reports', label: 'レポート', icon: FileText },
    { id: 'frameworks', label: 'フレームワーク', icon: CheckCircle },
    { id: 'evidence', label: '証跡', icon: Eye },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLIANT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" />準拠</span>;
      case 'NON_COMPLIANT':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700"><XCircle className="h-3 w-3" />非準拠</span>;
      case 'WARNING':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" />警告</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-zinc-100 text-zinc-700"><Clock className="h-3 w-3" />保留</span>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-500 text-white">重大</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-xs bg-orange-500 text-white">高</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-xs bg-amber-500 text-white">中</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-zinc-500 text-white">低</span>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">監査コンプライアンス</h1>
            <p className="text-sm text-zinc-500">コンプライアンススコア: {dashboard.overallScore}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerateReport}>
            <FileText className="h-4 w-4 mr-1" />
            レポート生成
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { mutateRules(); mutateViolations(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">スコア</p>
              <p className="text-2xl font-bold text-indigo-600">{dashboard.overallScore}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">準拠</p>
              <p className="text-2xl font-bold text-emerald-600">{dashboard.complianceSummary.compliant ?? 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">非準拠</p>
              <p className="text-2xl font-bold text-red-600">{dashboard.complianceSummary.nonCompliant ?? 0}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">未対応違反</p>
              <p className="text-2xl font-bold text-amber-600">{dashboard.violationsSummary.open ?? 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
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
                ? 'border-indigo-500 text-indigo-600'
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
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedRuleCategory}
                onChange={(e) => setSelectedRuleCategory(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">すべてのカテゴリ</option>
                <option value="DATA_RETENTION">データ保持</option>
                <option value="ACCESS_CONTROL">アクセス制御</option>
                <option value="ENCRYPTION">暗号化</option>
                <option value="AUDIT_LOG">監査ログ</option>
                <option value="AUTHENTICATION">認証</option>
              </select>
            </div>

            <div className="space-y-2">
              {rules.map((rule: any) => (
                <Card key={rule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        rule.status === 'COMPLIANT' ? 'bg-emerald-100' :
                        rule.status === 'NON_COMPLIANT' ? 'bg-red-100' : 'bg-amber-100'
                      }`}>
                        <Shield className={`h-5 w-5 ${
                          rule.status === 'COMPLIANT' ? 'text-emerald-600' :
                          rule.status === 'NON_COMPLIANT' ? 'text-red-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-zinc-900 dark:text-white">{rule.name}</h3>
                          {getSeverityBadge(rule.severity)}
                          {getStatusBadge(rule.status)}
                        </div>
                        <p className="text-sm text-zinc-500">{rule.description}</p>
                        <p className="text-xs text-zinc-400 mt-1">
                          最終チェック: {rule.lastCheck ? new Date(rule.lastCheck).toLocaleString('ja-JP') : '未実行'}
                          {rule.violations > 0 && <span className="text-red-500 ml-2">違反: {rule.violations}件</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleRunCheck(rule.id)}>
                        <Play className="h-4 w-4 mr-1" />
                        チェック
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleRule(rule.id)}
                        className={rule.enabled ? 'text-emerald-600' : 'text-zinc-400'}
                      >
                        {rule.enabled ? '有効' : '無効'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={selectedViolationStatus}
                onChange={(e) => setSelectedViolationStatus(e.target.value)}
                className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              >
                <option value="">すべてのステータス</option>
                <option value="OPEN">未対応</option>
                <option value="IN_PROGRESS">対応中</option>
                <option value="RESOLVED">解決済</option>
              </select>
            </div>

            <div className="space-y-2">
              {violations.map((violation: any) => (
                <Card key={violation.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{violation.ruleName}</h3>
                        {getSeverityBadge(violation.severity)}
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          violation.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                          violation.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {violation.status === 'OPEN' ? '未対応' : violation.status === 'IN_PROGRESS' ? '対応中' : '解決済'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{violation.description}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        リソース: {violation.resource} • 検出: {new Date(violation.detectedAt).toLocaleString('ja-JP')}
                      </p>
                      {violation.assignee && (
                        <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
                          <User className="h-3 w-3" />担当: {violation.assignee}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={violation.status}
                        onChange={(e) => handleUpdateViolationStatus(violation.id, e.target.value)}
                        className="h-8 rounded border border-zinc-200 bg-white px-2 text-sm"
                      >
                        <option value="OPEN">未対応</option>
                        <option value="IN_PROGRESS">対応中</option>
                        <option value="RESOLVED">解決済</option>
                        <option value="ACCEPTED_RISK">リスク許容</option>
                        <option value="FALSE_POSITIVE">誤検知</option>
                      </select>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={handleGenerateReport}>
                <Plus className="h-4 w-4 mr-1" />
                新規レポート
              </Button>
            </div>

            <div className="space-y-2">
              {reports.map((report: any) => (
                <Card key={report.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-white">{report.name}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          report.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                          report.status === 'DRAFT' ? 'bg-zinc-100 text-zinc-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {report.status === 'PUBLISHED' ? '公開済' : report.status === 'DRAFT' ? '下書き' : '生成中'}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500">
                        期間: {report.period.start} 〜 {report.period.end}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        作成: {new Date(report.createdAt).toLocaleString('ja-JP')} by {report.generatedBy}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        表示
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        エクスポート
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'frameworks' && (
          <div className="grid grid-cols-2 gap-4">
            {frameworks.map((framework: any) => (
              <Card key={framework.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-zinc-900 dark:text-white">{framework.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    framework.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {framework.enabled ? '有効' : '無効'}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 mb-2">{framework.description}</p>
                <p className="text-xs text-zinc-400">関連ルール: {framework.mappedRules}件</p>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                証跡アップロード
              </Button>
            </div>

            <div className="space-y-2">
              {evidence.map((ev: any) => (
                <Card key={ev.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-zinc-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-zinc-900 dark:text-white">{ev.description}</h3>
                        <p className="text-xs text-zinc-500">
                          タイプ: {ev.type} • アップロード: {new Date(ev.uploadedAt).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      ダウンロード
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

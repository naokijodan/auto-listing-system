// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Shield,
  Key,
  Lock,
  Unlock,
  Smartphone,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Monitor,
  RefreshCw,
  Eye,
  EyeOff,
  Settings,
  FileText,
  Scan,
  LogOut,
  Plus,
  Trash2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Activity,
} from 'lucide-react';

interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  current: boolean;
  lastActive: string;
  createdAt: string;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string;
  createdAt: string;
  expiresAt: string | null;
  status: string;
  riskLevel: string;
}

export default function SecurityCenterPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | '2fa' | 'api-keys' | 'audit' | 'settings'>('overview');

  const { data: dashboardData } = useSWR(
    '/api/ebay-security-center/dashboard',
    fetcher
  );

  const { data: sessionsData } = useSWR<{ sessions: Session[] }>(
    '/api/ebay-security-center/sessions',
    fetcher
  );

  const { data: alertsData } = useSWR<{ alerts: Alert[] }>(
    '/api/ebay-security-center/alerts',
    fetcher
  );

  const { data: twoFaData } = useSWR(
    '/api/ebay-security-center/2fa',
    fetcher
  );

  const { data: apiKeysData } = useSWR(
    '/api/ebay-security-center/api-keys',
    fetcher
  );

  const { data: auditLogsData } = useSWR(
    '/api/ebay-security-center/audit-logs',
    fetcher
  );

  const { data: settingsData } = useSWR(
    '/api/ebay-security-center/settings',
    fetcher
  );

  const sessions = sessionsData?.sessions ?? [];
  const alerts = alertsData?.alerts ?? [];
  const apiKeys = apiKeysData?.apiKeys ?? [];
  const auditLogs = auditLogsData?.logs ?? [];

  const tabs = [
    { id: 'overview', label: '概要', icon: Shield },
    { id: 'sessions', label: 'セッション', icon: Monitor },
    { id: '2fa', label: '2要素認証', icon: Smartphone },
    { id: 'api-keys', label: 'APIキー', icon: Key },
    { id: 'audit', label: '監査ログ', icon: FileText },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
      default: return 'bg-zinc-100 text-zinc-600';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-amber-600';
      case 'low': return 'text-emerald-600';
      default: return 'text-zinc-600';
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">セキュリティセンター</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              アカウントセキュリティの管理
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Scan className="h-4 w-4 mr-1" />
            スキャン実行
          </Button>
        </div>
      </div>

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
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
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
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-4">
            {/* スコアカード */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="p-4 col-span-1">
                <div className="text-center">
                  <div className={`text-5xl font-bold mb-2 ${getScoreColor(dashboardData.overallScore)}`}>
                    {dashboardData.overallScore}
                  </div>
                  <p className="text-sm text-zinc-500">セキュリティスコア</p>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    {dashboardData.status === 'good' ? (
                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <ShieldAlert className="h-5 w-5 text-amber-500" />
                    )}
                    <span className="text-sm">{dashboardData.status === 'good' ? '良好' : '要注意'}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 col-span-3">
                <h3 className="font-medium text-zinc-900 dark:text-white mb-3">検出された問題</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{dashboardData.issues.critical}</p>
                    <p className="text-xs text-zinc-500">重大</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{dashboardData.issues.high}</p>
                    <p className="text-xs text-zinc-500">高</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{dashboardData.issues.medium}</p>
                    <p className="text-xs text-zinc-500">中</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-zinc-600">{dashboardData.issues.low}</p>
                    <p className="text-xs text-zinc-500">低</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* 推奨事項 */}
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">推奨事項</h3>
              <div className="space-y-3">
                {dashboardData.recommendations?.map((rec: any) => (
                  <div key={rec.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getSeverityColor(rec.priority)}`}>
                        {rec.priority}
                      </span>
                      <span className="text-sm text-zinc-900 dark:text-white">{rec.title}</span>
                    </div>
                    <Button variant="outline" size="sm">
                      対応する
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* 最近のアラート */}
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">最近のアラート</h3>
              <div className="space-y-2">
                {alerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      {alert.status === 'resolved' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{alert.title}</p>
                        <p className="text-xs text-zinc-500">{alert.description}</p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-400">
                      {new Date(alert.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="text-red-600">
                <LogOut className="h-4 w-4 mr-1" />
                他のセッションを終了
              </Button>
            </div>
            {sessions.map((session) => (
              <Card key={session.id} className={`p-4 ${session.current ? 'ring-2 ring-emerald-500' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Monitor className="h-8 w-8 text-zinc-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-zinc-900 dark:text-white">{session.device}</h4>
                        {session.current && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">
                            現在のセッション
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-500">
                        <Globe className="h-3 w-3 inline mr-1" />
                        {session.location} • {session.ip}
                      </p>
                      <p className="text-xs text-zinc-400">
                        最終アクティブ: {new Date(session.lastActive).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  {!session.current && (
                    <Button variant="outline" size="sm" className="text-red-600">
                      <LogOut className="h-4 w-4 mr-1" />
                      終了
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === '2fa' && twoFaData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">2要素認証</h3>
                  <p className="text-sm text-zinc-500">追加のセキュリティレイヤーでアカウントを保護</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${twoFaData.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                  {twoFaData.enabled ? '有効' : '無効'}
                </span>
              </div>

              <div className="space-y-4">
                {/* Authenticator App */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-6 w-6 text-zinc-500" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">認証アプリ</p>
                      <p className="text-xs text-zinc-500">Google Authenticator, Authy など</p>
                    </div>
                  </div>
                  <Button variant={twoFaData.methods?.authenticator?.enabled ? 'outline' : 'primary'} size="sm">
                    {twoFaData.methods?.authenticator?.enabled ? '設定済み' : 'セットアップ'}
                  </Button>
                </div>

                {/* SMS */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-6 w-6 text-zinc-500" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">SMS</p>
                      <p className="text-xs text-zinc-500">{twoFaData.methods?.sms?.phone || '未設定'}</p>
                    </div>
                  </div>
                  <Button variant={twoFaData.methods?.sms?.enabled ? 'outline' : 'primary'} size="sm">
                    {twoFaData.methods?.sms?.enabled ? '設定済み' : 'セットアップ'}
                  </Button>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-6 w-6 text-zinc-500" />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">メール</p>
                      <p className="text-xs text-zinc-500">{twoFaData.methods?.email?.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${twoFaData.methods?.email?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-200 text-zinc-600'}`}>
                    {twoFaData.methods?.email?.enabled ? '有効' : '無効'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">バックアップコード</h3>
              <p className="text-sm text-zinc-500 mb-4">
                2要素認証のデバイスにアクセスできない場合に使用できる緊急コード
              </p>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-1" />
                バックアップコードを生成
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'api-keys' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                APIキー作成
              </Button>
            </div>
            {apiKeys.map((key: ApiKey) => (
              <Card key={key.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Key className="h-6 w-6 text-zinc-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-zinc-900 dark:text-white">{key.name}</h4>
                        <span className={`text-xs ${getRiskColor(key.riskLevel)}`}>
                          リスク: {key.riskLevel}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-500 font-mono">{key.prefix}</p>
                      <p className="text-xs text-zinc-400">
                        最終使用: {new Date(key.lastUsed).toLocaleDateString('ja-JP')}
                        {key.expiresAt && ` • 期限: ${new Date(key.expiresAt).toLocaleDateString('ja-JP')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      ローテーション
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}

            {apiKeysData?.recommendations && apiKeysData.recommendations.length > 0 && (
              <Card className="p-4 border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-700 dark:text-amber-400 mb-2">推奨事項</h4>
                <ul className="space-y-1">
                  {apiKeysData.recommendations.map((rec: any) => (
                    <li key={rec.keyId} className="text-sm text-zinc-600 dark:text-zinc-400">
                      • {rec.message}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                エクスポート
              </Button>
            </div>
            <Card className="p-4">
              <div className="space-y-3">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    <div className="flex items-center gap-3">
                      {log.status === 'success' || log.action !== 'login_failed' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{log.action}</p>
                        <p className="text-xs text-zinc-500">{log.details}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-zinc-500">{log.user}</p>
                      <p className="text-xs text-zinc-400">{new Date(log.timestamp).toLocaleString('ja-JP')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && settingsData && (
          <div className="max-w-2xl space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">セッション設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">セッションタイムアウト</p>
                    <p className="text-xs text-zinc-500">非アクティブ時の自動ログアウト時間（分）</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={settingsData.sessionTimeout}
                    className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">最大デバイス数</p>
                    <p className="text-xs text-zinc-500">同時ログイン可能なデバイス数</p>
                  </div>
                  <input
                    type="number"
                    defaultValue={settingsData.maxDevices}
                    className="w-20 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">通知設定</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">新しいデバイスでのログイン通知</p>
                    <p className="text-xs text-zinc-500">未知のデバイスからログインがあった場合に通知</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.notifyOnNewDevice} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">不審なアクティビティ通知</p>
                    <p className="text-xs text-zinc-500">異常なログイン試行を検出した場合に通知</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.notifyOnSuspiciousActivity} className="toggle" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">ログイン失敗時の自動ロック</p>
                    <p className="text-xs text-zinc-500">複数回のログイン失敗でアカウントをロック</p>
                  </div>
                  <input type="checkbox" defaultChecked={settingsData.autoLockOnFailedAttempts} className="toggle" />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

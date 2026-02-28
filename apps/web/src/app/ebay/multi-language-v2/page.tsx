
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/lib/api';
import {
  Languages,
  Globe,
  BookOpen,
  Settings,
  BarChart3,
  Play,
  Check,
  X,
  Edit2,
  Trash2,
  Plus,
  RefreshCw,
  FileText,
  Upload,
  Download,
  Star,
  AlertTriangle,
} from 'lucide-react';

type TabType = 'dashboard' | 'languages' | 'translations' | 'glossary' | 'quality' | 'settings';

export default function MultiLanguageV2Page() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const { data: dashboard } = useSWR<any>('/api/ebay-multi-language-v2/dashboard', fetcher);
  const { data: languages } = useSWR<any>('/api/ebay-multi-language-v2/languages', fetcher);
  const { data: glossary } = useSWR<any>('/api/ebay-multi-language-v2/glossary', fetcher);
  const { data: quality } = useSWR<any>('/api/ebay-multi-language-v2/quality/report', fetcher);
  const { data: settings } = useSWR<any>('/api/ebay-multi-language-v2/settings', fetcher);
  const { data: stats } = useSWR<any>('/api/ebay-multi-language-v2/stats', fetcher);

  const tabs = [
    { id: 'dashboard' as TabType, label: 'ダッシュボード', icon: BarChart3 },
    { id: 'languages' as TabType, label: '言語', icon: Globe },
    { id: 'translations' as TabType, label: '翻訳', icon: Languages },
    { id: 'glossary' as TabType, label: '用語集', icon: BookOpen },
    { id: 'quality' as TabType, label: '品質', icon: Star },
    { id: 'settings' as TabType, label: '設定', icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-teal-500">
            <Languages className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">多言語対応 v2</h1>
            <p className="text-sm text-zinc-500">翻訳管理・用語集・品質管理</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            インポート
          </Button>
          <Button variant="primary" size="sm">
            <Play className="h-4 w-4 mr-1" />
            一括翻訳
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-zinc-500">対応言語</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.supportedLanguages}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">翻訳済み</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {dashboard.activeTranslations?.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">保留中</p>
              <p className="text-2xl font-bold text-amber-600">
                {dashboard.pendingTranslations}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-zinc-500">品質スコア</p>
              <p className="text-2xl font-bold text-emerald-600">
                {dashboard.qualityScore}%
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">月間使用量</h3>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-zinc-500">文字数</span>
                <span className="text-zinc-700 dark:text-zinc-300">
                  {(dashboard.monthlyUsage?.characters / 1000000).toFixed(1)}M / {(dashboard.monthlyUsage?.limit / 1000000)}M
                </span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${dashboard.monthlyUsage?.percentUsed}%` }}
                />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">最近のアクティビティ</h3>
            <div className="space-y-3">
              {dashboard.recentActivity?.map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'batch_translation' ? 'bg-blue-500' :
                      activity.type === 'auto_translation' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        {activity.type === 'batch_translation' ? `一括翻訳: ${activity.count}件 → ${activity.targetLang}` :
                         activity.type === 'auto_translation' ? `自動翻訳: ${activity.count}件 → ${activity.targetLang}` :
                         `手動編集: ${activity.lang}`}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {new Date(activity.timestamp).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Languages Tab */}
      {activeTab === 'languages' && languages && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {languages.languages?.map((lang: any) => (
              <Card key={lang.code} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                      lang.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                    }`}>
                      {lang.code.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{lang.name}</p>
                      <p className="text-sm text-zinc-500">{lang.nativeName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lang.isDefault && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                        デフォルト
                      </span>
                    )}
                    <span className="text-sm text-zinc-500">{lang.listings}件</span>
                    <Button variant="ghost" size="sm">
                      {lang.enabled ? <Check className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-zinc-400" />}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Translations Tab */}
      {activeTab === 'translations' && stats && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">翻訳統計</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats.totalTranslations?.toLocaleString()}</p>
                <p className="text-sm text-zinc-500">総翻訳数</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{(stats.charactersTranslated / 1000000).toFixed(1)}M</p>
                <p className="text-sm text-zinc-500">翻訳文字数</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-emerald-600">{stats.avgQualityScore}%</p>
                <p className="text-sm text-zinc-500">平均品質</p>
              </div>
              <div className="text-center p-3 bg-zinc-50 rounded-lg dark:bg-zinc-800/50">
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">${stats.costEstimate?.amount}</p>
                <p className="text-sm text-zinc-500">推定コスト</p>
              </div>
            </div>

            <h4 className="font-medium text-zinc-700 dark:text-zinc-300 mb-2">言語別</h4>
            <div className="space-y-2">
              {stats.byLanguage?.map((item: any) => (
                <div key={item.lang} className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{item.lang.toUpperCase()}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-zinc-500">{item.translations?.toLocaleString()}件</span>
                    <span className="text-sm text-zinc-500">{(item.characters / 1000).toFixed(0)}K文字</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Glossary Tab */}
      {activeTab === 'glossary' && glossary && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              エクスポート
            </Button>
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              用語追加
            </Button>
          </div>

          <Card className="p-4">
            <div className="space-y-3">
              {glossary.terms?.map((term: any) => (
                <div key={term.id} className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{term.source}</p>
                    <div className="flex gap-2 mt-1">
                      {Object.entries(term.translations || {}).map(([lang, trans]: [string, any]) => (
                        <span key={lang} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs rounded dark:bg-zinc-800 dark:text-zinc-400">
                          {lang}: {trans}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-xs rounded dark:bg-zinc-800 dark:text-zinc-400">
                      {term.category}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Quality Tab */}
      {activeTab === 'quality' && quality && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">全体スコア</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-zinc-200 dark:text-zinc-700" />
                    <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="none" className="text-emerald-500"
                      strokeDasharray={`${quality.overallScore * 3.52} 352`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">{quality.overallScore}%</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">よくある問題</h3>
              <div className="space-y-3">
                {quality.commonIssues?.map((issue: any) => (
                  <div key={issue.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">{issue.type}</span>
                      <span className="text-sm text-zinc-500">{issue.count}件</span>
                    </div>
                    <div className="h-2 bg-zinc-100 rounded-full dark:bg-zinc-700">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${issue.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">言語別品質</h3>
            <div className="space-y-3">
              {quality.byLanguage?.map((lang: any) => (
                <div key={lang.lang} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-sm font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {lang.lang.toUpperCase()}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{lang.translations}件</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {lang.issues > 0 && (
                      <span className="flex items-center gap-1 text-sm text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        {lang.issues}件の問題
                      </span>
                    )}
                    <span className={`text-lg font-bold ${
                      lang.score >= 95 ? 'text-emerald-600' :
                      lang.score >= 90 ? 'text-blue-600' : 'text-amber-600'
                    }`}>
                      {lang.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && settings && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">自動翻訳</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">自動翻訳を有効化</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  settings.autoTranslate?.enabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {settings.autoTranslate?.enabled ? '有効' : '無効'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">新規出品を自動翻訳</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {settings.autoTranslate?.newListings ? 'はい' : 'いいえ'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">デフォルト翻訳先</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {settings.autoTranslate?.defaultTargetLangs?.join(', ')}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">品質設定</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">最低品質スコア</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{settings.quality?.minScore}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">レビュー必須</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {settings.quality?.requireReview ? 'はい' : 'いいえ'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">自動公開</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                  {settings.quality?.autoPublish ? 'はい' : 'いいえ'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">API設定</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">翻訳プロバイダー</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">{settings.api?.provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">モデル</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{settings.api?.model}</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

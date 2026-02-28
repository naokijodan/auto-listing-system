
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, putApi, postApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import {
  Settings,
  RefreshCw,
  Monitor,
  Bell,
  Keyboard,
  Layout,
  Download,
  Link as LinkIcon,
  Shield,
  Palette,
  Globe,
  Clock,
  ChevronLeft,
  Loader2,
  Save,
  RotateCcw,
  Sun,
  Moon,
  Laptop,
  Check,
} from 'lucide-react';
import Link from 'next/link';

interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  showTooltips: boolean;
}

interface NotificationPreferences {
  email: { enabled: boolean; digest: string; types: string[] };
  push: { enabled: boolean; types: string[] };
  inApp: { enabled: boolean; sound: boolean; desktop: boolean };
  quietHours: { enabled: boolean; start: string; end: string };
}

type TabType = 'ui' | 'notifications' | 'defaults' | 'shortcuts' | 'display' | 'privacy';

const themeOptions = [
  { value: 'light', label: 'ライト', icon: Sun },
  { value: 'dark', label: 'ダーク', icon: Moon },
  { value: 'system', label: 'システム', icon: Laptop },
];

export default function EbayUserPreferencesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ui');
  const [isSaving, setIsSaving] = useState(false);

  // データ取得
  const { data: uiData, mutate: mutateUI, isLoading: isLoadingUI } = useSWR<any>(
    activeTab === 'ui' ? '/api/ebay-user-preferences/ui' : null,
    fetcher
  );

  const { data: notificationsData, mutate: mutateNotifications, isLoading: isLoadingNotifications } = useSWR<any>(
    activeTab === 'notifications' ? '/api/ebay-user-preferences/notifications' : null,
    fetcher
  );

  const { data: defaultsData, isLoading: isLoadingDefaults } = useSWR<any>(
    activeTab === 'defaults' ? '/api/ebay-user-preferences/defaults' : null,
    fetcher
  );

  const { data: shortcutsData, isLoading: isLoadingShortcuts } = useSWR<any>(
    activeTab === 'shortcuts' ? '/api/ebay-user-preferences/shortcuts' : null,
    fetcher
  );

  const { data: displayData, isLoading: isLoadingDisplay } = useSWR<any>(
    activeTab === 'display' ? '/api/ebay-user-preferences/display' : null,
    fetcher
  );

  const { data: privacyData, isLoading: isLoadingPrivacy } = useSWR<any>(
    activeTab === 'privacy' ? '/api/ebay-user-preferences/privacy' : null,
    fetcher
  );

  const { data: timezonesData } = useSWR<any>('/api/ebay-user-preferences/timezones', fetcher);
  const { data: languagesData } = useSWR<any>('/api/ebay-user-preferences/languages', fetcher);
  const { data: currenciesData } = useSWR<any>('/api/ebay-user-preferences/currencies', fetcher);

  // UI設定保存
  const handleSaveUI = async (updates: Partial<UIPreferences>) => {
    setIsSaving(true);
    try {
      await putApi('/api/ebay-user-preferences/ui', updates);
      addToast({ type: 'success', message: '設定を保存しました' });
      mutateUI();
    } catch {
      addToast({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // 通知設定保存
  const handleSaveNotifications = async (updates: Partial<NotificationPreferences>) => {
    setIsSaving(true);
    try {
      await putApi('/api/ebay-user-preferences/notifications', updates);
      addToast({ type: 'success', message: '通知設定を保存しました' });
      mutateNotifications();
    } catch {
      addToast({ type: 'error', message: '保存に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  // 設定リセット
  const handleReset = async (category: string) => {
    if (!confirm(`${category}設定をリセットしますか？`)) return;
    try {
      await postApi('/api/ebay-user-preferences/reset', { category });
      addToast({ type: 'success', message: '設定をリセットしました' });
    } catch {
      addToast({ type: 'error', message: 'リセットに失敗しました' });
    }
  };

  const tabs: { id: TabType; label: string; icon: typeof Settings }[] = [
    { id: 'ui', label: 'UI設定', icon: Palette },
    { id: 'notifications', label: '通知', icon: Bell },
    { id: 'defaults', label: 'デフォルト値', icon: Settings },
    { id: 'shortcuts', label: 'ショートカット', icon: Keyboard },
    { id: 'display', label: '表示', icon: Layout },
    { id: 'privacy', label: 'プライバシー', icon: Shield },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/ebay" className="text-zinc-400 hover:text-zinc-600">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">ユーザー設定</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              UIとデフォルト値のカスタマイズ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleReset(activeTab)}>
            <RotateCcw className="h-4 w-4 mr-1" />
            リセット
          </Button>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-700">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* UI Settings Tab */}
        {activeTab === 'ui' && (
          <div className="space-y-6">
            {isLoadingUI ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : uiData?.data && (
              <>
                {/* Theme */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    テーマ
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleSaveUI({ theme: option.value as 'light' | 'dark' | 'system' })}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                            uiData.data.theme === option.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                          )}
                        >
                          <Icon className={cn(
                            'h-8 w-8',
                            uiData.data.theme === option.value ? 'text-blue-600' : 'text-zinc-400'
                          )} />
                          <span className="font-medium">{option.label}</span>
                          {uiData.data.theme === option.value && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Language & Region */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    言語・地域
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        言語
                      </label>
                      <select
                        value={uiData.data.language}
                        onChange={(e) => handleSaveUI({ language: e.target.value })}
                        className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                      >
                        {languagesData?.data?.map((lang: { code: string; name: string }) => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        タイムゾーン
                      </label>
                      <select
                        value={uiData.data.timezone}
                        onChange={(e) => handleSaveUI({ timezone: e.target.value })}
                        className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                      >
                        {timezonesData?.data?.map((tz: { id: string; label: string }) => (
                          <option key={tz.id} value={tz.id}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        通貨
                      </label>
                      <select
                        value={uiData.data.currency}
                        onChange={(e) => handleSaveUI({ currency: e.target.value })}
                        className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                      >
                        {currenciesData?.data?.map((curr: { code: string; name: string; symbol: string }) => (
                          <option key={curr.code} value={curr.code}>{curr.symbol} {curr.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        時刻形式
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveUI({ timeFormat: '24h' })}
                          className={cn(
                            'flex-1 h-10 rounded-lg border transition-colors',
                            uiData.data.timeFormat === '24h'
                              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                              : 'border-zinc-200 dark:border-zinc-700'
                          )}
                        >
                          24時間
                        </button>
                        <button
                          onClick={() => handleSaveUI({ timeFormat: '12h' })}
                          className={cn(
                            'flex-1 h-10 rounded-lg border transition-colors',
                            uiData.data.timeFormat === '12h'
                              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                              : 'border-zinc-200 dark:border-zinc-700'
                          )}
                        >
                          12時間
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* UI Options */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    表示オプション
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: 'compactMode', label: 'コンパクトモード', description: 'より多くの情報を表示' },
                      { key: 'animationsEnabled', label: 'アニメーション', description: 'UI アニメーションを有効にする' },
                      { key: 'showTooltips', label: 'ツールチップ', description: 'ホバー時にヒントを表示' },
                      { key: 'sidebarCollapsed', label: 'サイドバー折りたたみ', description: 'デフォルトで折りたたむ' },
                    ].map((option) => (
                      <div key={option.key} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">{option.label}</p>
                          <p className="text-sm text-zinc-500">{option.description}</p>
                        </div>
                        <button
                          onClick={() => handleSaveUI({ [option.key]: !uiData.data[option.key] })}
                          className={cn(
                            'relative w-12 h-6 rounded-full transition-colors',
                            uiData.data[option.key as keyof UIPreferences]
                              ? 'bg-blue-500'
                              : 'bg-zinc-300 dark:bg-zinc-600'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                              uiData.data[option.key as keyof UIPreferences] ? 'translate-x-7' : 'translate-x-1'
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : notificationsData?.data && (
              <>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    メール通知
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">メール通知を有効にする</p>
                        <p className="text-sm text-zinc-500">重要なアップデートをメールで受け取る</p>
                      </div>
                      <button
                        onClick={() => handleSaveNotifications({
                          email: { ...notificationsData.data.email, enabled: !notificationsData.data.email.enabled }
                        })}
                        className={cn(
                          'relative w-12 h-6 rounded-full transition-colors',
                          notificationsData.data.email.enabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                            notificationsData.data.email.enabled ? 'translate-x-7' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                    {notificationsData.data.email.enabled && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                          配信頻度
                        </label>
                        <select
                          value={notificationsData.data.email.digest}
                          onChange={(e) => handleSaveNotifications({
                            email: { ...notificationsData.data.email, digest: e.target.value }
                          })}
                          className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                        >
                          <option value="instant">即時</option>
                          <option value="hourly">毎時</option>
                          <option value="daily">毎日</option>
                          <option value="weekly">毎週</option>
                        </select>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    プッシュ通知
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">プッシュ通知を有効にする</p>
                        <p className="text-sm text-zinc-500">ブラウザでプッシュ通知を受け取る</p>
                      </div>
                      <button
                        onClick={() => handleSaveNotifications({
                          push: { ...notificationsData.data.push, enabled: !notificationsData.data.push.enabled }
                        })}
                        className={cn(
                          'relative w-12 h-6 rounded-full transition-colors',
                          notificationsData.data.push.enabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                            notificationsData.data.push.enabled ? 'translate-x-7' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                    おやすみモード
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">おやすみモードを有効にする</p>
                        <p className="text-sm text-zinc-500">指定した時間帯は通知を停止</p>
                      </div>
                      <button
                        onClick={() => handleSaveNotifications({
                          quietHours: { ...notificationsData.data.quietHours, enabled: !notificationsData.data.quietHours.enabled }
                        })}
                        className={cn(
                          'relative w-12 h-6 rounded-full transition-colors',
                          notificationsData.data.quietHours.enabled ? 'bg-blue-500' : 'bg-zinc-300 dark:bg-zinc-600'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                            notificationsData.data.quietHours.enabled ? 'translate-x-7' : 'translate-x-1'
                          )}
                        />
                      </button>
                    </div>
                    {notificationsData.data.quietHours.enabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            開始時刻
                          </label>
                          <input
                            type="time"
                            value={notificationsData.data.quietHours.start}
                            onChange={(e) => handleSaveNotifications({
                              quietHours: { ...notificationsData.data.quietHours, start: e.target.value }
                            })}
                            className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            終了時刻
                          </label>
                          <input
                            type="time"
                            value={notificationsData.data.quietHours.end}
                            onChange={(e) => handleSaveNotifications({
                              quietHours: { ...notificationsData.data.quietHours, end: e.target.value }
                            })}
                            className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* Other tabs - simplified display */}
        {activeTab === 'defaults' && (
          <Card className="p-6">
            {isLoadingDefaults ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">出品デフォルト設定</h3>
                <pre className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(defaultsData?.data, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'shortcuts' && (
          <Card className="p-6">
            {isLoadingShortcuts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : shortcutsData?.data && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                  キーボードショートカット
                </h3>
                {Object.entries(shortcutsData.data.customBindings || {}).map(([key, action]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <code className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-sm font-mono">
                      {key}
                    </code>
                    <span className="text-zinc-600 dark:text-zinc-400">{String(action)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'display' && (
          <Card className="p-6">
            {isLoadingDisplay ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">表示設定</h3>
                <pre className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(displayData?.data, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'privacy' && (
          <Card className="p-6">
            {isLoadingPrivacy ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">プライバシー設定</h3>
                <pre className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(privacyData?.data, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

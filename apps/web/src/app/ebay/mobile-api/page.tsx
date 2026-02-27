// @ts-nocheck
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher, postApi, putApi } from '@/lib/api';
import { addToast } from '@/components/ui/toast';
import {
  Smartphone,
  RefreshCw,
  Bell,
  Settings,
  Zap,
  Package,
  ShoppingCart,
  MessageSquare,
  DollarSign,
  Barcode,
  Wifi,
  WifiOff,
  CheckCircle,
  Moon,
  Sun,
  Fingerprint,
  Volume2,
} from 'lucide-react';

type Tab = 'overview' | 'notifications' | 'quick-actions' | 'settings';

export default function MobileApiPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // データ取得
  const { data: dashboardData } = useSWR('/api/ebay-mobile-api/dashboard', fetcher);
  const { data: pushSettingsData, mutate: mutatePushSettings } = useSWR('/api/ebay-mobile-api/push-settings', fetcher);
  const { data: quickActionsData } = useSWR('/api/ebay-mobile-api/quick-actions', fetcher);
  const { data: appSettingsData, mutate: mutateSettings } = useSWR('/api/ebay-mobile-api/settings', fetcher);
  const { data: healthData } = useSWR('/api/ebay-mobile-api/health', fetcher);

  const dashboard = dashboardData ?? { summary: {}, alerts: [], quickStats: [] };
  const pushSettings = pushSettingsData ?? { enabled: false, settings: {} };
  const quickActions = quickActionsData?.actions ?? [];
  const appSettings = appSettingsData ?? { features: {}, user: {}, sync: {} };
  const health = healthData ?? { status: 'UNKNOWN', services: {} };

  const handleUpdatePushSettings = async (key: string, value: boolean) => {
    try {
      await putApi('/api/ebay-mobile-api/push-settings', {
        settings: { ...pushSettings.settings, [key]: value },
      });
      addToast({ type: 'success', message: '通知設定を更新しました' });
      mutatePushSettings();
    } catch {
      addToast({ type: 'error', message: '設定の更新に失敗しました' });
    }
  };

  const handleUpdateAppSettings = async (key: string, value: any) => {
    try {
      await putApi('/api/ebay-mobile-api/settings', {
        user: { ...appSettings.user, [key]: value },
      });
      addToast({ type: 'success', message: '設定を更新しました' });
      mutateSettings();
    } catch {
      addToast({ type: 'error', message: '設定の更新に失敗しました' });
    }
  };

  const handleTestBarcode = async () => {
    try {
      const result = await postApi('/api/ebay-mobile-api/scan', {
        barcode: '4901234567890',
        type: 'EAN',
      }) as any;
      addToast({ type: 'success', message: `商品検出: ${result.product?.title ?? 'Unknown'}` });
    } catch {
      addToast({ type: 'error', message: 'スキャンに失敗しました' });
    }
  };

  const handleSync = async () => {
    try {
      const result = await postApi('/api/ebay-mobile-api/sync', {}) as any;
      addToast({ type: 'success', message: result.message });
    } catch {
      addToast({ type: 'error', message: '同期に失敗しました' });
    }
  };

  const tabs = [
    { id: 'overview', label: '概要', icon: Smartphone },
    { id: 'notifications', label: '通知設定', icon: Bell },
    { id: 'quick-actions', label: 'クイックアクション', icon: Zap },
    { id: 'settings', label: 'アプリ設定', icon: Settings },
  ];

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">モバイルAPI</h1>
            <p className="text-sm text-zinc-500">
              ステータス: <span className={health.status === 'OK' ? 'text-emerald-600' : 'text-red-600'}>{health.status}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSync}>
            <RefreshCw className="h-4 w-4 mr-1" />
            同期
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="mb-4 grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">本日の売上</p>
              <p className="text-2xl font-bold text-green-600">${dashboard.summary.todaySales ?? 0}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">本日の注文</p>
              <p className="text-2xl font-bold text-blue-600">{dashboard.summary.todayOrders ?? 0}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">出品中</p>
              <p className="text-2xl font-bold text-purple-600">{dashboard.summary.activeListings ?? 0}</p>
            </div>
            <Package className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">要対応</p>
              <p className="text-2xl font-bold text-amber-600">{dashboard.summary.pendingActions ?? 0}</p>
            </div>
            <Bell className="h-8 w-8 text-amber-500" />
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
                ? 'border-green-500 text-green-600'
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* アラート */}
            {dashboard.alerts?.length > 0 && (
              <div>
                <h3 className="font-medium text-zinc-900 dark:text-white mb-3">アラート</h3>
                <div className="space-y-2">
                  {dashboard.alerts.map((alert: any) => (
                    <Card key={alert.id} className={`p-3 border-l-4 ${
                      alert.priority === 'HIGH' ? 'border-l-red-500 bg-red-50' :
                      alert.priority === 'MEDIUM' ? 'border-l-amber-500 bg-amber-50' :
                      'border-l-blue-500 bg-blue-50'
                    }`}>
                      <p className="text-sm font-medium text-zinc-900">{alert.message}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* サービスステータス */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">サービスステータス</h3>
              <div className="grid grid-cols-4 gap-4">
                {Object.entries(health.services || {}).map(([service, status]) => (
                  <Card key={service} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600 capitalize">{service}</span>
                      <span className={`flex items-center gap-1 text-sm ${
                        status === 'OK' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                        {status as string}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* モバイルプレビュー */}
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">モバイルアプリプレビュー</h3>
              <div className="flex justify-center">
                <div className="w-72 h-[500px] bg-zinc-900 rounded-3xl p-2 shadow-xl">
                  <div className="w-full h-full bg-white rounded-2xl overflow-hidden">
                    {/* ステータスバー */}
                    <div className="h-6 bg-zinc-100 flex items-center justify-between px-4">
                      <span className="text-xs">9:41</span>
                      <div className="flex gap-1">
                        <Wifi className="h-3 w-3" />
                        <span className="text-xs">100%</span>
                      </div>
                    </div>
                    {/* ヘッダー */}
                    <div className="h-14 bg-green-500 flex items-center justify-between px-4">
                      <span className="text-white font-bold">RAKUDA</span>
                      <Bell className="h-5 w-5 text-white" />
                    </div>
                    {/* クイックスタッツ */}
                    <div className="p-3 grid grid-cols-2 gap-2">
                      {dashboard.quickStats?.slice(0, 4).map((stat: any, idx: number) => (
                        <div key={idx} className="bg-zinc-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-zinc-500">{stat.label}</p>
                          <p className="text-lg font-bold text-zinc-900">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                    {/* クイックアクション */}
                    <div className="px-3 py-2">
                      <p className="text-xs text-zinc-500 mb-2">クイックアクション</p>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-green-100 rounded-lg p-2 text-center">
                          <Barcode className="h-5 w-5 mx-auto text-green-600" />
                          <p className="text-xs mt-1">スキャン</p>
                        </div>
                        <div className="flex-1 bg-blue-100 rounded-lg p-2 text-center">
                          <Package className="h-5 w-5 mx-auto text-blue-600" />
                          <p className="text-xs mt-1">出品</p>
                        </div>
                        <div className="flex-1 bg-purple-100 rounded-lg p-2 text-center">
                          <MessageSquare className="h-5 w-5 mx-auto text-purple-600" />
                          <p className="text-xs mt-1">メッセージ</p>
                        </div>
                      </div>
                    </div>
                    {/* ナビゲーションバー */}
                    <div className="absolute bottom-2 left-2 right-2 h-14 bg-white border-t flex items-center justify-around">
                      <Package className="h-5 w-5 text-green-600" />
                      <ShoppingCart className="h-5 w-5 text-zinc-400" />
                      <MessageSquare className="h-5 w-5 text-zinc-400" />
                      <Settings className="h-5 w-5 text-zinc-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">プッシュ通知</h3>
                  <p className="text-sm text-zinc-500">モバイルアプリへの通知を管理</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushSettings.enabled}
                    onChange={() => {/* toggle */}}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              <div className="space-y-3">
                {[
                  { key: 'newOrders', label: '新規注文', icon: ShoppingCart },
                  { key: 'orderUpdates', label: '注文更新', icon: Package },
                  { key: 'messages', label: 'メッセージ', icon: MessageSquare },
                  { key: 'lowStock', label: '在庫不足', icon: Package },
                  { key: 'priceAlerts', label: '価格アラート', icon: DollarSign },
                  { key: 'dailySummary', label: '日次サマリー', icon: Bell },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-zinc-400" />
                      <span className="text-sm text-zinc-700">{label}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pushSettings.settings[key] ?? false}
                        onChange={() => handleUpdatePushSettings(key, !pushSettings.settings[key])}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">おやすみモード</h3>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-zinc-400" />
                  <span className="text-sm text-zinc-700">おやすみモード</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushSettings.quietHours?.enabled ?? false}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              {pushSettings.quietHours?.enabled && (
                <div className="text-sm text-zinc-500">
                  {pushSettings.quietHours.start} - {pushSettings.quietHours.end}（{pushSettings.quietHours.timezone}）
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'quick-actions' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">利用可能なアクション</h3>
              <div className="grid grid-cols-3 gap-4">
                {quickActions.map((action: any) => (
                  <div
                    key={action.id}
                    className={`p-4 rounded-lg text-center cursor-pointer transition-colors ${
                      action.enabled
                        ? 'bg-green-50 hover:bg-green-100'
                        : 'bg-zinc-50 opacity-50'
                    }`}
                    onClick={() => action.id === 'scan_barcode' && handleTestBarcode()}
                  >
                    <div className="h-12 w-12 mx-auto rounded-full bg-white shadow flex items-center justify-center mb-2">
                      {action.icon === 'barcode' && <Barcode className="h-6 w-6 text-green-600" />}
                      {action.icon === 'plus' && <Package className="h-6 w-6 text-blue-600" />}
                      {action.icon === 'search' && <DollarSign className="h-6 w-6 text-purple-600" />}
                      {action.icon === 'truck' && <Package className="h-6 w-6 text-amber-600" />}
                      {action.icon === 'message' && <MessageSquare className="h-6 w-6 text-cyan-600" />}
                      {action.icon === 'refresh' && <RefreshCw className="h-6 w-6 text-zinc-600" />}
                    </div>
                    <p className="text-sm font-medium text-zinc-900">{action.label}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-3">バーコードスキャンテスト</h3>
              <p className="text-sm text-zinc-500 mb-3">
                バーコードスキャン機能をテストします。サンプルバーコードを送信して結果を確認できます。
              </p>
              <Button variant="primary" onClick={handleTestBarcode}>
                <Barcode className="h-4 w-4 mr-2" />
                テストスキャン実行
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">アプリ情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">バージョン</span>
                  <span className="text-zinc-900">{appSettings.app?.version ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">ビルド番号</span>
                  <span className="text-zinc-900">{appSettings.app?.buildNumber ?? '-'}</span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">機能設定</h3>
              <div className="space-y-3">
                {[
                  { key: 'barcodeScanner', label: 'バーコードスキャナー', icon: Barcode },
                  { key: 'darkMode', label: 'ダークモード', icon: Moon },
                  { key: 'biometricAuth', label: '生体認証', icon: Fingerprint },
                  { key: 'offlineMode', label: 'オフラインモード', icon: WifiOff },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-zinc-400" />
                      <span className="text-sm text-zinc-700">{label}</span>
                    </div>
                    <span className={`text-sm ${appSettings.features?.[key] ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {appSettings.features?.[key] ? '有効' : '無効'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium text-zinc-900 dark:text-white mb-4">同期設定</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-700">自動同期</span>
                  <span className={`text-sm ${appSettings.sync?.autoSync ? 'text-emerald-600' : 'text-zinc-400'}`}>
                    {appSettings.sync?.autoSync ? '有効' : '無効'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-700">同期間隔</span>
                  <span className="text-sm text-zinc-900">{appSettings.sync?.syncInterval ?? 300}秒</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-700">Wi-Fiのみで同期</span>
                  <span className={`text-sm ${appSettings.sync?.syncOnWifiOnly ? 'text-emerald-600' : 'text-zinc-400'}`}>
                    {appSettings.sync?.syncOnWifiOnly ? '有効' : '無効'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useNotificationSettings,
  useEnhancedRealtime,
  EnhancedEventType,
} from '@/lib/realtime-enhanced';
import { useTranslation } from '@/lib/i18n';
import {
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Monitor,
  Smartphone,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  Settings,
  TestTube,
} from 'lucide-react';

// イベントタイプの表示名と説明
const EVENT_TYPE_INFO: Record<EnhancedEventType, { name: string; nameEn: string; description: string }> = {
  ORDER_RECEIVED: { name: '新規注文', nameEn: 'New Order', description: '新しい注文を受けたとき' },
  ORDER_PAID: { name: '支払い完了', nameEn: 'Payment Received', description: '注文の支払いが完了したとき' },
  ORDER_SHIPPED: { name: '発送完了', nameEn: 'Order Shipped', description: '注文が発送されたとき' },
  ORDER_DELIVERED: { name: '配達完了', nameEn: 'Order Delivered', description: '注文が配達されたとき' },
  ORDER_CANCELLED: { name: '注文キャンセル', nameEn: 'Order Cancelled', description: '注文がキャンセルされたとき' },
  INVENTORY_CHANGE: { name: '在庫変動', nameEn: 'Inventory Change', description: '在庫が変動したとき' },
  INVENTORY_LOW: { name: '在庫僅少', nameEn: 'Low Inventory', description: '在庫が少なくなったとき' },
  OUT_OF_STOCK: { name: '在庫切れ', nameEn: 'Out of Stock', description: '在庫がなくなったとき' },
  PRICE_CHANGE: { name: '価格変動', nameEn: 'Price Change', description: '価格が変動したとき' },
  LISTING_UPDATE: { name: '出品更新', nameEn: 'Listing Update', description: '出品情報が更新されたとき' },
  LISTING_PUBLISHED: { name: '出品公開', nameEn: 'Listing Published', description: '出品が公開されたとき' },
  LISTING_ERROR: { name: '出品エラー', nameEn: 'Listing Error', description: '出品でエラーが発生したとき' },
  JOB_COMPLETED: { name: 'ジョブ完了', nameEn: 'Job Completed', description: 'ジョブが完了したとき' },
  JOB_FAILED: { name: 'ジョブ失敗', nameEn: 'Job Failed', description: 'ジョブが失敗したとき' },
  CUSTOMER_MESSAGE: { name: '顧客メッセージ', nameEn: 'Customer Message', description: '顧客からメッセージを受けたとき' },
  SHIPMENT_DEADLINE: { name: '発送期限', nameEn: 'Shipment Deadline', description: '発送期限が近づいたとき' },
  SYSTEM_ALERT: { name: 'システムアラート', nameEn: 'System Alert', description: 'システムアラートが発生したとき' },
};

export default function NotificationSettingsPage() {
  const { t, locale } = useTranslation();
  const {
    settings,
    permission,
    updateSettings,
    requestPermission,
    isSupported,
  } = useNotificationSettings();

  const { status, connectionType, eventCount, isConnected } = useEnhancedRealtime({
    enabled: true,
    preferWebSocket: false,
  });

  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // テスト通知を送信
  const sendTestNotification = () => {
    if (permission !== 'granted') {
      setTestResult('error');
      return;
    }

    try {
      new Notification('RAKUDA テスト通知', {
        body: '通知設定が正しく動作しています',
        icon: '/favicon.ico',
      });
      setTestResult('success');
    } catch {
      setTestResult('error');
    }

    setTimeout(() => setTestResult(null), 3000);
  };

  // イベントタイプの有効/無効を切り替え
  const toggleEventType = (eventType: EnhancedEventType) => {
    const current = settings.eventTypes;
    const updated = current.includes(eventType)
      ? current.filter(t => t !== eventType)
      : [...current, eventType];
    updateSettings({ eventTypes: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('notifications.title')} {t('common.settings')}</h1>
          <p className="text-sm text-zinc-500">リアルタイム通知の設定を管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
            {connectionType.toUpperCase()}
          </Badge>
          <Badge variant="outline">
            {eventCount} events
          </Badge>
        </div>
      </div>

      {/* 接続状態カード */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">接続状態</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status === 'connected' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : status === 'connecting' ? (
                <Wifi className="h-5 w-5 text-amber-500 animate-pulse" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium capitalize">{status}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ブラウザ通知</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {permission === 'granted' ? (
                  <Bell className="h-5 w-5 text-green-500" />
                ) : permission === 'denied' ? (
                  <BellOff className="h-5 w-5 text-red-500" />
                ) : (
                  <Bell className="h-5 w-5 text-amber-500" />
                )}
                <span className="font-medium capitalize">{permission}</span>
              </div>
              {permission !== 'granted' && (
                <Button size="sm" onClick={requestPermission}>
                  許可
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">テスト通知</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                onClick={sendTestNotification}
                disabled={permission !== 'granted'}
              >
                <TestTube className="mr-2 h-4 w-4" />
                送信
              </Button>
              {testResult && (
                <Badge variant={testResult === 'success' ? 'default' : 'destructive'}>
                  {testResult === 'success' ? '成功' : '失敗'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">一般設定</TabsTrigger>
          <TabsTrigger value="events">イベント設定</TabsTrigger>
          <TabsTrigger value="sound">サウンド設定</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>
                リアルタイム通知の基本設定を行います
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 通知有効/無効 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <span className="font-medium">通知を有効にする</span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    すべての通知を有効または無効にします
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => updateSettings({ enabled })}
                />
              </div>

              {/* ブラウザ通知 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    <span className="font-medium">ブラウザ通知</span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    デスクトップ通知を表示します
                  </p>
                </div>
                <Switch
                  checked={settings.browserNotifications}
                  onCheckedChange={(browserNotifications) =>
                    updateSettings({ browserNotifications })
                  }
                  disabled={!settings.enabled || permission !== 'granted'}
                />
              </div>

              {/* サウンド通知 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span className="font-medium">サウンド通知</span>
                  </div>
                  <p className="text-sm text-zinc-500">
                    通知時にサウンドを再生します
                  </p>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(soundEnabled) => updateSettings({ soundEnabled })}
                  disabled={!settings.enabled}
                />
              </div>

              {!isSupported && (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  お使いのブラウザはデスクトップ通知をサポートしていません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>イベント通知設定</CardTitle>
              <CardDescription>
                通知を受け取るイベントを選択します
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(Object.entries(EVENT_TYPE_INFO) as [EnhancedEventType, typeof EVENT_TYPE_INFO[EnhancedEventType]][]).map(
                  ([eventType, info]) => (
                    <div
                      key={eventType}
                      className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium">
                          {locale === 'ja' ? info.name : info.nameEn}
                        </span>
                        <p className="text-sm text-zinc-500">{info.description}</p>
                      </div>
                      <Switch
                        checked={settings.eventTypes.includes(eventType)}
                        onCheckedChange={() => toggleEventType(eventType)}
                        disabled={!settings.enabled}
                      />
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sound" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>サウンド設定</CardTitle>
              <CardDescription>
                通知サウンドの設定を行います
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* サウンド有効/無効 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                  <span className="font-medium">サウンドを有効にする</span>
                </div>
                <Switch
                  checked={settings.soundEnabled}
                  onCheckedChange={(soundEnabled) => updateSettings({ soundEnabled })}
                  disabled={!settings.enabled}
                />
              </div>

              {/* 音量スライダー */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">音量</span>
                  <span className="text-sm text-zinc-500">
                    {Math.round(settings.soundVolume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.soundVolume * 100]}
                  onValueChange={([value]) =>
                    updateSettings({ soundVolume: value / 100 })
                  }
                  max={100}
                  step={10}
                  disabled={!settings.enabled || !settings.soundEnabled}
                />
              </div>

              {/* テストサウンド */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!settings.soundEnabled}
                  onClick={() => {
                    // テストサウンド再生
                    try {
                      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
                      const ctx = new AudioContext();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.frequency.value = 660;
                      gain.gain.value = settings.soundVolume * 0.3;
                      osc.start();
                      osc.stop(ctx.currentTime + 0.2);
                    } catch {
                      // エラー無視
                    }
                  }}
                >
                  <Volume2 className="mr-2 h-4 w-4" />
                  テスト再生
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

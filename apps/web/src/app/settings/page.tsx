'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  Bell,
  Globe,
  Palette,
  Shield,
  Database,
  Save,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'price', label: '価格設定', icon: DollarSign },
  { id: 'notifications', label: '通知設定', icon: Bell },
  { id: 'marketplace', label: 'マーケットプレイス', icon: Globe },
  { id: 'appearance', label: '外観', icon: Palette },
  { id: 'system', label: 'システム', icon: Database },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('price');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">設定</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          RAKUDAの各種設定を管理
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'price' && <PriceSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'marketplace' && <MarketplaceSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'system' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}

function PriceSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>eBay 価格設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                基本利益率 (%)
              </label>
              <input
                type="number"
                defaultValue={30}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                最低利益 ($)
              </label>
              <input
                type="number"
                defaultValue={10}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                送料 ($)
              </label>
              <input
                type="number"
                defaultValue={15}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                手数料率 (%)
              </label>
              <input
                type="number"
                defaultValue={13}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Joom 価格設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                基本利益率 (%)
              </label>
              <input
                type="number"
                defaultValue={25}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                最低利益 ($)
              </label>
              <input
                type="number"
                defaultValue={8}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>通知チャンネル</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Slack Webhook URL', placeholder: 'https://hooks.slack.com/services/...' },
            { label: 'Discord Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' },
            { label: 'LINE Notify Token', placeholder: 'xxx' },
          ].map((item) => (
            <div key={item.label}>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {item.label}
              </label>
              <input
                type="text"
                placeholder={item.placeholder}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>通知イベント</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: '在庫切れ検知', description: '仕入元で在庫切れを検知した時' },
            { label: '価格変動', description: '仕入価格が変動した時' },
            { label: '出品成功', description: '出品が完了した時' },
            { label: '出品エラー', description: '出品に失敗した時' },
            { label: '日次レポート', description: '毎日21時にレポートを送信' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.description}</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" defaultChecked />
                <div className="h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-500 peer-checked:after:translate-x-full dark:bg-zinc-700"></div>
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">
          テスト送信
        </Button>
        <Button>
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}

function MarketplaceSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>eBay API 設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Client ID
            </label>
            <input
              type="text"
              placeholder="Enter eBay Client ID"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Client Secret
            </label>
            <input
              type="password"
              placeholder="Enter eBay Client Secret"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-emerald-600 dark:text-emerald-400">接続済み</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Joom API 設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              API Key
            </label>
            <input
              type="password"
              placeholder="Enter Joom API Key"
              className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-sm text-amber-600 dark:text-amber-400">未設定</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>
          <Save className="h-4 w-4" />
          保存
        </Button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>外観設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            テーマ
          </label>
          <select className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="system">システム設定に従う</option>
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            言語
          </label>
          <select className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900">
            <option value="ja">日本語</option>
            <option value="en">English</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>スケジューラー設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: '在庫チェック', value: '3回/日 (9:00, 17:00, 01:00)' },
            { label: '為替レート更新', value: '毎日 00:00' },
            { label: '価格同期', value: '6時間ごと' },
            { label: '日次レポート', value: '毎日 21:00' },
            { label: 'ヘルスチェック', value: '3時間ごと' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <span className="text-sm font-medium text-zinc-900 dark:text-white">{item.label}</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>データベース</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">PostgreSQL</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">rakuda-postgres:5432</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              接続中
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">Redis</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">rakuda-redis:6379</p>
            </div>
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              接続中
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline">
          <RefreshCw className="h-4 w-4" />
          接続テスト
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Layers,
  FolderTree,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'price', label: '価格設定', icon: DollarSign },
  { id: 'listing', label: '出品設定', icon: Layers },
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
          {activeTab === 'listing' && <ListingSettings />}
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

function ListingSettings() {
  const settingsLinks = [
    {
      href: '/settings/templates',
      icon: Layers,
      title: '出品テンプレート',
      description: '商品タイプごとの出品設定プリセットを管理',
    },
    {
      href: '/settings/categories',
      icon: FolderTree,
      title: 'カテゴリマッピング',
      description: '日本語カテゴリとeBayカテゴリの紐付けを管理',
    },
    {
      href: '/settings/prompts',
      icon: Sparkles,
      title: '翻訳プロンプト',
      description: '商品ジャンルごとの翻訳品質を最適化',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>出品設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                  <link.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">{link.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{link.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationSettings() {
  const settingsLinks = [
    {
      href: '/settings/notifications',
      icon: Bell,
      title: '通知チャンネル管理',
      description: 'Slack、Discord、LINE 通知チャンネルを設定',
    },
    {
      href: '/settings/rate-limits',
      icon: Shield,
      title: 'レート制限',
      description: 'スクレイピング・API呼び出しの制限を管理',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>通知設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {settingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-900/20">
                  <link.icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-white">{link.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{link.description}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-zinc-400" />
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>在庫・価格監視アラート</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              価格変動通知閾値 (%)
            </label>
            <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
              この割合以上の価格変動があった場合に通知します
            </p>
            <input
              type="number"
              defaultValue={10}
              min={1}
              max={100}
              className="h-10 w-32 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              通知チャンネルを設定すると、在庫切れや価格変動を自動的に通知します。
            </p>
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
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');

  // 初期化時にLocalStorageから読み込み
  useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as 'system' | 'light' | 'dark' | null;
      if (stored) {
        setTheme(stored);
      }
    }
  });

  const handleThemeChange = (newTheme: 'system' | 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    // テーマを適用
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    } else {
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    }
  };

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
          <select
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value as 'system' | 'light' | 'dark')}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="system">システム設定に従う</option>
            <option value="light">ライト</option>
            <option value="dark">ダーク</option>
          </select>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            ヘッダーの太陽/月アイコンでも切り替えできます
          </p>
        </div>

        {/* Theme Preview */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'ライト', bg: 'bg-white border-zinc-200', text: 'text-zinc-900' },
            { id: 'dark', label: 'ダーク', bg: 'bg-zinc-900 border-zinc-700', text: 'text-white' },
            { id: 'system', label: 'システム', bg: 'bg-gradient-to-r from-white to-zinc-900 border-zinc-300', text: 'text-zinc-500' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id as 'system' | 'light' | 'dark')}
              className={cn(
                'flex flex-col items-center rounded-lg border-2 p-3 transition-colors',
                t.bg,
                theme === t.id ? 'ring-2 ring-amber-500' : ''
              )}
            >
              <div className={cn('h-8 w-full rounded', t.id === 'light' ? 'bg-zinc-100' : t.id === 'dark' ? 'bg-zinc-800' : 'bg-gradient-to-r from-zinc-100 to-zinc-800')} />
              <span className={cn('mt-2 text-xs font-medium', t.text)}>{t.label}</span>
            </button>
          ))}
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

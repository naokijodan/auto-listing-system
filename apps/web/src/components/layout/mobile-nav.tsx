'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Bell,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePWA } from '@/lib/pwa';
import { Badge } from '@/components/ui/badge';

// ボトムナビゲーション項目
const bottomNavItems = [
  { name: 'ホーム', href: '/', icon: LayoutDashboard },
  { name: '商品', href: '/products', icon: Package },
  { name: '注文', href: '/orders', icon: ShoppingCart },
  { name: '発送', href: '/shipments', icon: Truck },
  { name: '通知', href: '/notifications', icon: Bell },
];

// サイドメニュー項目
const menuItems = [
  { category: 'メイン', items: [
    { name: 'ダッシュボード', href: '/' },
    { name: '商品管理', href: '/products' },
    { name: '出品管理', href: '/listings' },
    { name: '注文管理', href: '/orders' },
  ]},
  { category: '運営', items: [
    { name: '発送管理', href: '/shipments' },
    { name: '仕入れ管理', href: '/sourcing' },
    { name: 'サプライヤー', href: '/suppliers' },
    { name: '在庫予測', href: '/inventory-forecast' },
    { name: 'ジョブ監視', href: '/jobs' },
  ]},
  { category: 'マーケットプレイス', items: [
    { name: 'Joom管理', href: '/joom' },
    { name: 'eBay管理', href: '/ebay' },
  ]},
  { category: '分析・レポート', items: [
    { name: 'レポート', href: '/reports' },
    { name: 'カスタムレポート', href: '/custom-reports' },
    { name: '売上予測', href: '/sales-forecast' },
    { name: '分析', href: '/analytics' },
    { name: 'カスタマーサクセス', href: '/customer-success' },
  ]},
  { category: '自動化', items: [
    { name: 'ワークフロー', href: '/workflow-rules' },
    { name: 'チャットボット', href: '/chatbot' },
    { name: 'A/Bテスト', href: '/ab-tests' },
    { name: '外部連携', href: '/integrations' },
  ]},
  { category: '設定', items: [
    { name: '組織管理', href: '/organizations' },
    { name: 'セキュリティ', href: '/security' },
    { name: 'SSO設定', href: '/sso' },
    { name: 'システム性能', href: '/system-performance' },
    { name: '多通貨管理', href: '/multi-currency' },
    { name: 'コンプライアンス', href: '/compliance' },
    { name: '高度な検索', href: '/advanced-search' },
    { name: 'データ転送', href: '/data-transfer' },
    { name: '通知', href: '/notifications' },
    { name: '通知設定', href: '/notification-settings' },
    { name: '設定', href: '/settings' },
  ]},
];

/**
 * ボトムナビゲーション（モバイル用）
 */
export function BottomNav() {
  const pathname = usePathname();
  const { isOnline } = usePWA();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95 md:hidden">
      {/* オフライン表示 */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs text-center py-1">
          オフラインモード
        </div>
      )}

      <div className="flex items-center justify-around py-2">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  isActive && 'fill-amber-100 dark:fill-amber-900/30'
                )}
              />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * モバイルヘッダー
 */
export function MobileHeader() {
  const pathname = usePathname();
  const { isOnline, isInstallable, promptInstall } = usePWA();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 現在のページタイトルを取得
  const getCurrentPageTitle = () => {
    for (const category of menuItems) {
      const item = category.items.find((i) => i.href === pathname);
      if (item) return item.name;
    }
    return 'RAKUDA';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
      {/* オフライン表示 */}
      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs text-center py-1">
          オフラインモード
        </div>
      )}

      <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
        {/* メニューボタン */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="p-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex flex-col h-full">
              {/* ヘッダー */}
              <div className="flex items-center gap-3 p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl">
                  🐫
                </div>
                <div>
                  <h1 className="text-lg font-bold">RAKUDA</h1>
                  <p className="text-xs text-zinc-500">越境EC自動出品</p>
                </div>
              </div>

              {/* メニュー */}
              <nav className="flex-1 overflow-y-auto p-4">
                {menuItems.map((category) => (
                  <div key={category.category} className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      {category.category}
                    </p>
                    {category.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            'flex items-center justify-between py-2.5 px-3 rounded-lg text-sm transition-colors',
                            isActive
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          )}
                        >
                          {item.name}
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>

              {/* インストールプロンプト */}
              {isInstallable && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
                  <Button
                    onClick={promptInstall}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    アプリをインストール
                  </Button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* タイトル */}
        <h1 className="text-lg font-semibold">{getCurrentPageTitle()}</h1>

        {/* 通知ボタン */}
        <Link href="/notifications">
          <Button variant="ghost" size="sm" className="p-2 relative">
            <Bell className="h-5 w-5" />
          </Button>
        </Link>
      </div>
    </header>
  );
}

/**
 * PWAインストールバナー
 */
export function InstallBanner() {
  const { isInstallable, isInstalled, promptInstall } = usePWA();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isInstalled || isDismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐫</span>
            <div>
              <p className="font-semibold text-white">RAKUDAをインストール</p>
              <p className="text-xs text-white/80">ホーム画面に追加してすばやくアクセス</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setIsDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          onClick={promptInstall}
          className="w-full mt-3 bg-white text-amber-600 hover:bg-white/90"
        >
          インストール
        </Button>
      </div>
    </div>
  );
}

/**
 * アップデートバナー
 */
export function UpdateBanner() {
  const { isUpdateAvailable, applyUpdate } = usePWA();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 md:hidden">
      <div className="bg-blue-500 text-white text-sm text-center py-2 px-4">
        新しいバージョンが利用可能です
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 text-white underline hover:bg-white/20"
          onClick={applyUpdate}
        >
          更新する
        </Button>
      </div>
    </div>
  );
}

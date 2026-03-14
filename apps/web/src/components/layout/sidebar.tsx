'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Activity,
  Settings,
  Bell,
  Truck,
  Store,
  ClipboardCheck,
  Sparkles,
  Layers,
  Link2,
  Users,
} from 'lucide-react';

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: '商品管理', href: '/products', icon: Package },
  { name: '商品レビュー', href: '/products/review', icon: ClipboardCheck },
  { name: 'エンリッチメント', href: '/enrichment', icon: Sparkles },
  { name: 'バッチ処理', href: '/batch', icon: Layers },
  { name: 'セラー管理', href: '/sellers', icon: Users },
  { name: 'Joom管理', href: '/joom', icon: Store },
  { name: '出品管理', href: '/listings', icon: ShoppingCart },
  { name: '注文管理', href: '/orders', icon: Truck },
  { name: 'ジョブ監視', href: '/jobs', icon: Activity },
  { name: '監視', href: '/monitoring', icon: Activity },
  { name: '通知', href: '/notifications', icon: Bell },
  { name: '設定', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: '外部連携', href: '/integrations', icon: Link2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl">
          🐫
        </div>
        <div>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">RAKUDA</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">越境EC自動出品</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Admin Section */}
        <div className="pt-4">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            管理者
          </p>
          <div className="mt-2 space-y-1">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex items-center gap-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 p-3 dark:from-amber-900/20 dark:to-orange-900/20">
          <Truck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              商品を世界へ
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">楽に運ぶ</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

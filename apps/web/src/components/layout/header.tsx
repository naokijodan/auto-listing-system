'use client';

import { Bell, Search, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button } from '../ui/button';
import { fetcher } from '@/lib/api';
import { RealtimeStatusIndicator } from '../realtime/realtime-status-indicator';

interface UnreadCountResponse {
  success: boolean;
  data: { count: number };
}

export function Header() {
  const [isDark, setIsDark] = useState(false);

  // 未読通知数を取得
  const { data: unreadData } = useSWR<UnreadCountResponse>(
    '/api/notifications/unread-count',
    fetcher,
    { refreshInterval: 30000 } // 30秒ごとに更新
  );
  const unreadCount = unreadData?.data?.count ?? 0;

  useEffect(() => {
    // Check stored preference or system preference
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let isDarkMode: boolean;
    if (stored === 'system' || !stored) {
      isDarkMode = prefersDark;
    } else {
      isDarkMode = stored === 'dark';
    }

    setIsDark(isDarkMode);
    document.documentElement.classList.toggle('dark', isDarkMode);

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'system' || !storedTheme) {
        setIsDark(e.matches);
        document.documentElement.classList.toggle('dark', e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle('dark', newIsDark);
    localStorage.setItem('theme', newIsDark ? 'dark' : 'light');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="商品を検索..."
            className="h-10 w-80 rounded-lg border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-amber-500 dark:focus:bg-zinc-800"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Realtime Status (Phase 27) */}
        <RealtimeStatusIndicator className="mr-2" />

        <Button variant="ghost" size="sm" onClick={toggleTheme}>
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Link href="/notifications">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>
        <div className="ml-2 flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Admin</span>
        </div>
      </div>
    </header>
  );
}

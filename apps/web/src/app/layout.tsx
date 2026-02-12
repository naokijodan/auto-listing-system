import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { ToastProvider } from '@/components/providers/toast-provider';
import { AppProviders } from '@/components/providers/app-providers';
import { BottomNav, MobileHeader, InstallBanner, UpdateBanner } from '@/components/layout/mobile-nav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RAKUDA - 越境EC自動出品システム',
  description: '商品を世界へ楽に運ぶ、越境ECの架け橋',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RAKUDA',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192x192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f59e0b',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 font-sans antialiased dark:bg-zinc-950`}
      >
        <AppProviders>
          {/* デスクトップレイアウト */}
          <div className="hidden md:block">
            <Sidebar />
            <div className="pl-64">
              <Header />
              <main className="p-6">{children}</main>
            </div>
          </div>

          {/* モバイルレイアウト */}
          <div className="md:hidden">
            <MobileHeader />
            <UpdateBanner />
            <main className="pt-14 pb-20 px-4">{children}</main>
            <InstallBanner />
            <BottomNav />
          </div>

          <ToastProvider />
        </AppProviders>
      </body>
    </html>
  );
}

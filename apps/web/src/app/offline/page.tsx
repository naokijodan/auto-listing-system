'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  if (isOnline) {
    // オンラインに復帰した場合
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <RefreshCw className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
            オンラインに復帰しました
          </h1>
          <p className="text-green-600 dark:text-green-400 mb-6">
            インターネット接続が回復しました
          </p>
          <Button onClick={handleGoHome} className="bg-green-600 hover:bg-green-700">
            <Home className="mr-2 h-4 w-4" />
            ホームに戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 p-4">
      <div className="text-center max-w-md">
        {/* アイコン */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-amber-600 dark:text-amber-400" />
        </div>

        {/* タイトル */}
        <h1 className="text-3xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">
          オフラインです
        </h1>

        {/* 説明 */}
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          インターネットに接続されていません。<br />
          接続を確認してから再試行してください。
        </p>

        {/* キャッシュされたデータの案内 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6 text-left">
          <h2 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
            オフラインでもできること
          </h2>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>• キャッシュされたデータの閲覧</li>
            <li>• 保存済みレポートの確認</li>
            <li>• 設定の変更（オンライン時に同期）</li>
          </ul>
        </div>

        {/* ボタン */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            再試行
          </Button>
          <Button onClick={handleGoHome} className="bg-amber-600 hover:bg-amber-700">
            <Home className="mr-2 h-4 w-4" />
            ホームに戻る
          </Button>
        </div>

        {/* RAKUDAロゴ */}
        <div className="mt-12 flex items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500">
          <span className="text-2xl">🐫</span>
          <span className="font-bold">RAKUDA</span>
        </div>
      </div>
    </div>
  );
}

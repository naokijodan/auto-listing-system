'use client';

import { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'notifications' | 'channels' | 'rules' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'notifications', label: '通知' },
  { key: 'channels', label: 'チャネル' },
  { key: 'rules', label: 'ルール' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-seller-notification-center-pro/';

export default function Page() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    const actionMap: Record<TabKey, string> = {
      dashboard: 'overview',
      notifications: 'list',
      channels: 'email',
      rules: 'list',
      analytics: 'summary',
      settings: 'get',
    };
    const url = `${API_BASE}${active}/${actionMap[active]}`;
    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as unknown;
      })
      .then((json) => setData(json))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Unknown error');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [active]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-rose-600">セラー通知センターPro</h1>
      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-2 text-sm ' +
              (active === t.key
                ? 'border-b-2 border-rose-600 text-rose-600 font-medium'
                : 'text-gray-600 hover:text-rose-600')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-700">
        {loading && <div>読み込み中…</div>}
        {error && <div className="text-rose-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="bg-gray-50 p-3 rounded border overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}


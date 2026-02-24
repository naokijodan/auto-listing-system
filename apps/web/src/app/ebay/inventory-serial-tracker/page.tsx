'use client';

import { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'inventory' | 'serials' | 'history' | 'analytics' | 'settings';
type ApiResponse = { section: string; action: string };

const API_BASE = '/api/ebay-inventory-serial-tracker';

const tabEndpoints: Record<TabKey, string> = {
  dashboard: 'dashboard/overview',
  inventory: 'inventory/all',
  serials: 'serials/lookup',
  history: 'history/trace',
  analytics: 'analytics/summary',
  settings: 'settings/get',
};

export default function Page() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(`${API_BASE}/${tabEndpoints[active]}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        setData(json);
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return;
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [active]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'dashboard', label: 'ダッシュボード' },
    { key: 'inventory', label: '在庫' },
    { key: 'serials', label: 'シリアル' },
    { key: 'history', label: '履歴' },
    { key: 'analytics', label: '分析' },
    { key: 'settings', label: '設定' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-fuchsia-600 mb-4">在庫シリアルトラッカー</h1>
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1 rounded border ${
              active === t.key ? 'bg-fuchsia-600 text-white' : 'text-fuchsia-600 border-fuchsia-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="text-sm">
        <div className="mb-2 text-fuchsia-600">API: {API_BASE}/{tabEndpoints[active]}</div>
        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {data && (
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


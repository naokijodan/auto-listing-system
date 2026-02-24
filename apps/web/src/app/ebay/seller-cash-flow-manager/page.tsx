'use client';

import { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'transactions' | 'forecasts' | 'reports' | 'analytics' | 'settings';
type ApiResponse = { section: string; action: string };

const API_BASE = '/api/ebay-seller-cash-flow-manager';

const tabEndpoints: Record<TabKey, string> = {
  dashboard: 'dashboard/overview',
  transactions: 'transactions/all',
  forecasts: 'forecasts/short-term',
  reports: 'reports/summary',
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
    { key: 'transactions', label: '取引' },
    { key: 'forecasts', label: '予測' },
    { key: 'reports', label: 'レポート' },
    { key: 'analytics', label: '分析' },
    { key: 'settings', label: '設定' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-green-600 mb-4">セラーキャッシュフロー管理</h1>
      <div className="flex gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1 rounded border ${
              active === t.key ? 'bg-green-600 text-white' : 'text-green-600 border-green-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="text-sm">
        <div className="mb-2 text-green-600">API: {API_BASE}/{tabEndpoints[active]}</div>
        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {data && (
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


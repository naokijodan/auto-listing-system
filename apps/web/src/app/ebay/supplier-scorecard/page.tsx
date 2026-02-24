'use client';

import React, { useEffect, useState } from 'react';

type ApiData = { section: string; action: string } | Record<string, unknown>;

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'suppliers', label: 'サプライヤー' },
  { key: 'metrics', label: '指標' },
  { key: 'reports', label: 'レポート' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
] as const;

const endpointFor = (key: typeof TABS[number]['key']): string => {
  switch (key) {
    case 'dashboard':
      return 'dashboard';
    case 'suppliers':
      return 'suppliers';
    case 'metrics':
      return 'metrics';
    case 'reports':
      return 'reports';
    case 'analytics':
      return 'analytics';
    case 'settings':
      return 'settings';
    default:
      return 'dashboard';
  }
};

const BASE_API = '/api/ebay-supplier-scorecard/';

export default function SupplierScorecardPage() {
  const [active, setActive] = useState<typeof TABS[number]['key']>('dashboard');
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${BASE_API}${endpointFor(active)}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ApiData;
        if (!ignore) setData(json);
      } catch (e) {
        if (!ignore) setError((e as Error).message);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchData();
    return () => {
      ignore = true;
    };
  }, [active]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-indigo-600">サプライヤースコアカード</h1>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`whitespace-nowrap py-2 border-b-2 text-sm font-medium transition-colors ${
                active === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <section className="rounded-lg border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}


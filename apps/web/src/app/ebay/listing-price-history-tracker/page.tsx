'use client';

import React, { useEffect, useState } from 'react';

type Tab = 'dashboard' | 'history' | 'products' | 'markets' | 'analytics' | 'settings';

const API_BASE = '/api/ebay-listing-price-history-tracker/';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'history', label: '履歴' },
  { key: 'products', label: '商品' },
  { key: 'markets', label: 'マーケット' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

function pathForTab(tab: Tab): string {
  const map: Record<Tab, string> = {
    dashboard: 'dashboard',
    history: 'history',
    products: 'products',
    markets: 'markets',
    analytics: 'analytics',
    settings: 'settings',
  };
  return map[tab];
}

export default function ListingPriceHistoryTrackerPage() {
  const [active, setActive] = useState<Tab>('dashboard');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}${pathForTab(active)}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Fetch error');
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-cyan-600">出品価格履歴トラッカー</h1>
        <p className="text-sm text-gray-500 mt-1">eBay Listing Price History Tracker</p>
      </div>

      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              active === t.key ? 'border-cyan-600 text-cyan-600' : 'border-transparent text-gray-600 hover:text-cyan-600'
            }`}
            aria-selected={active === t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-md border p-4 bg-white">
        <div className="mb-3 text-xs text-gray-500">
          API: <code className="bg-gray-50 px-1 py-0.5 rounded">{API_BASE}{pathForTab(active)}</code>
        </div>
        {loading && <div className="text-gray-600">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


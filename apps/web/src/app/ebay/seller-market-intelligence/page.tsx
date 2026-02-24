'use client';

import React, { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string } | Record<string, unknown>;

const tabs = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard' },
  { key: 'markets', label: '市場', endpoint: 'markets/list' },
  { key: 'trends', label: 'トレンド', endpoint: 'trends/list' },
  { key: 'competitors', label: '競合', endpoint: 'competitors/list' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
] as const;

const apiBase = '/api/ebay-seller-market-intelligence/';

export default function SellerMarketIntelligencePage(): JSX.Element {
  const [active, setActive] = useState<typeof tabs[number]['key']>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = tabs.find((x) => x.key === active);
    if (!t) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(apiBase + t.endpoint, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ApiResponse;
      })
      .then((json) => setData(json))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-red-600">セラーマーケットインテリジェンス</h1>
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-1 rounded-t text-sm ' +
              (active === t.key ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-gray-200')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[160px] rounded border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラーが発生しました: {error}</div>}
        {!loading && !error && (
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


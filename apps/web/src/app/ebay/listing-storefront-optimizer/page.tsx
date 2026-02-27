// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';

type ApiData = { section: string; action: string };

const TABS: Array<{ key: string; label: string; defaultAction: string }> = [
  { key: 'dashboard', label: 'ダッシュボード', defaultAction: 'overview' },
  { key: 'listings', label: '出品', defaultAction: 'list' },
  { key: 'layouts', label: 'レイアウト', defaultAction: 'current' },
  { key: 'themes', label: 'テーマ', defaultAction: 'current' },
  { key: 'analytics', label: '分析', defaultAction: 'traffic' },
  { key: 'settings', label: '設定', defaultAction: 'get' },
];

const API_BASE = '/api/ebay-listing-storefront-optimizer';

export default function ListingStorefrontOptimizerPage(): JSX.Element {
  const [active, setActive] = useState<string>(TABS[0]!.key);
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tab = TABS.find(t => t.key === active);
    if (!tab) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/${tab.key}/${tab.defaultAction}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ApiData;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'エラー'))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-purple-600 mb-4">出品ストアフロント最適化</h1>
      <div className="flex gap-3 border-b mb-4">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`pb-2 -mb-px border-b-2 ${
              active === tab.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="text-sm text-gray-700">
        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && data && (
          <pre className="bg-gray-50 p-3 rounded border text-xs">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


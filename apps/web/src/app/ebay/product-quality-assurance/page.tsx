'use client';

import React, { useEffect, useState } from 'react';

type Tab = { key: string; label: string; endpoint: string };

const TABS: Tab[] = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard' },
  { key: 'products', label: '商品', endpoint: 'products/list' },
  { key: 'standards', label: '基準', endpoint: 'standards/list' },
  { key: 'inspections', label: '検査', endpoint: 'inspections/list' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
];

const API_BASE = '/api/ebay-product-quality-assurance/';

export function ProductQualityAssurancePage() {
  const [active, setActive] = useState<Tab>(TABS[0]);
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}${active.endpoint}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [active.key]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-orange-600">商品品質保証</h1>
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t)}
            className={
              'px-3 py-1.5 rounded border text-sm ' +
              (active.key === t.key
                ? 'bg-orange-50 text-orange-700 border-orange-300'
                : 'bg-white hover:bg-gray-50 border-gray-300')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border bg-white p-4">
        <div className="text-sm text-gray-500 mb-2">エンドポイント: {API_BASE}{active.endpoint}</div>
        {loading && <div className="text-gray-600">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return <ProductQualityAssurancePage />;
}


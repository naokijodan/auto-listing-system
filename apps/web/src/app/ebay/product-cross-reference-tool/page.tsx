'use client';

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'references' | 'products' | 'sources' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string; endpoint: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: '/dashboard' },
  { key: 'references', label: '参照', endpoint: '/references' },
  { key: 'products', label: '商品', endpoint: '/products' },
  { key: 'sources', label: 'ソース', endpoint: '/sources' },
  { key: 'analytics', label: '分析', endpoint: '/analytics' },
  { key: 'settings', label: '設定', endpoint: '/settings' },
];

const API_BASE = '/api/ebay-product-cross-reference-tool';

export default function ProductCrossReferenceToolPage() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tab = TABS.find((t) => t.key === active)!;
    const url = `${API_BASE}${tab.endpoint}`;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        setData(json);
      })
      .catch((e) => setError(e?.message ?? '通信エラー'))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-600">商品クロスリファレンスツール</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-1.5 rounded border text-sm ' +
              (active === t.key
                ? 'bg-slate-600 text-white border-slate-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border border-slate-100 bg-white p-4">
        {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


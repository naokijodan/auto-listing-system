'use client';

import { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string };

const API_BASE = '/api/ebay-listing-smart-repricer/';

const TABS: { label: string; section: string; action: string }[] = [
  { label: 'ダッシュボード', section: 'dashboard', action: 'summary' },
  { label: 'ルール', section: 'rules', action: 'list' },
  { label: '競合', section: 'competitors', action: 'list' },
  { label: '履歴', section: 'history', action: 'price' },
  { label: '分析', section: 'analytics', action: 'overview' },
  { label: '設定', section: 'settings', action: 'get' },
];

export default function Page() {
  const [active, setActive] = useState(0);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const { section, action } = TABS[active];
    setError(null);
    setData(null);
    fetch(`${API_BASE}${section}/${action}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ApiResponse;
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(String(e));
      });
    return () => ctrl.abort();
  }, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-teal-600">出品スマートリプライサー</h1>
      <div className="mt-4 flex gap-2 border-b">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            onClick={() => setActive(i)}
            className={`px-3 py-2 text-sm ${
              i === active
                ? 'border-b-2 border-teal-600 text-teal-600'
                : 'text-gray-600 hover:text-teal-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {error && <p className="text-red-600">エラー: {error}</p>}
        {!error && !data && <p className="text-gray-500">読み込み中...</p>}
        {data && (
          <pre className="text-sm bg-gray-50 p-3 rounded border">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}


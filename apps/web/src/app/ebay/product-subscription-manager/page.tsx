
'use client';

import { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string } | Record<string, unknown>;

const API_BASE = '/api/ebay-product-subscription-manager/';

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard/summary' },
  { key: 'subscriptions', label: 'サブスク', endpoint: 'subscriptions' },
  { key: 'plans', label: 'プラン', endpoint: 'plans' },
  { key: 'billing', label: '課金', endpoint: 'billing' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
] as const;

export default function Page(): React.ReactElement {
  const [active, setActive] = useState<typeof TABS[number]['key']>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tab = TABS.find((t) => t.key === active)!;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(API_BASE + tab.endpoint, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as ApiResponse;
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-violet-600">商品サブスクリプション管理</h1>
      <div className="mt-4 flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm ${
              active === t.key
                ? 'border-b-2 border-violet-600 text-violet-600'
                : 'text-gray-600 hover:text-violet-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {loading && <p className="text-gray-500">読み込み中...</p>}
        {error && <p className="text-red-600">エラー: {error}</p>}
        {!loading && !error && (
          <pre className="text-sm bg-gray-50 p-3 rounded border">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


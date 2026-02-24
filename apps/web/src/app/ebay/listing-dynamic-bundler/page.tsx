'use client';

import { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string };

const TABS = ['ダッシュボード', 'バンドル', '商品', '価格設定', '分析', '設定'] as const;
type Tab = typeof TABS[number];

const ENDPOINT_MAP: Record<Tab, string> = {
  'ダッシュボード': '/api/ebay-listing-dynamic-bundler/dashboard/overview',
  'バンドル': '/api/ebay-listing-dynamic-bundler/bundles/list',
  '商品': '/api/ebay-listing-dynamic-bundler/products/list',
  '価格設定': '/api/ebay-listing-dynamic-bundler/pricing/rules',
  '分析': '/api/ebay-listing-dynamic-bundler/analytics/trends',
  '設定': '/api/ebay-listing-dynamic-bundler/settings/get',
};

export default function Page() {
  const [active, setActive] = useState<Tab>('ダッシュボード');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(ENDPOINT_MAP[active], { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('API エラー');
        return (await r.json()) as ApiResponse;
      })
      .then(setData)
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : '不明なエラー';
        if (!(e as any)?.name || (e as any)?.name !== 'AbortError') setError(message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-blue-600">eBay リスティング・ダイナミックバンドラー</h1>
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-3 py-1 rounded border transition-colors ${
              active === tab ? 'bg-blue-50 border-blue-600 text-blue-600' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="text-sm text-gray-600 mb-2">API: {ENDPOINT_MAP[active]}</div>
      {loading ? (
        <div>読み込み中...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : data ? (
        <pre className="bg-gray-100 p-3 rounded text-xs">{JSON.stringify(data, null, 2)}</pre>
      ) : null}
    </div>
  );
}


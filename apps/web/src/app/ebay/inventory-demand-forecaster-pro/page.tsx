'use client';

import { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string };

const TABS = ['ダッシュボード', '予測', 'モデル', 'アラート', '分析', '設定'] as const;
type Tab = typeof TABS[number];

const ENDPOINT_MAP: Record<Tab, string> = {
  'ダッシュボード': '/api/ebay-inventory-demand-forecaster-pro/dashboard/overview',
  '予測': '/api/ebay-inventory-demand-forecaster-pro/forecasts/list',
  'モデル': '/api/ebay-inventory-demand-forecaster-pro/models/list',
  'アラート': '/api/ebay-inventory-demand-forecaster-pro/alerts/list',
  '分析': '/api/ebay-inventory-demand-forecaster-pro/analytics/trends',
  '設定': '/api/ebay-inventory-demand-forecaster-pro/settings/get',
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
      <h1 className="text-2xl font-semibold mb-4 text-purple-600">eBay 在庫需要フォーキャスター Pro</h1>
      <div className="flex gap-2 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-3 py-1 rounded border transition-colors ${
              active === tab ? 'bg-purple-50 border-purple-600 text-purple-600' : 'border-gray-300 hover:bg-gray-50'
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


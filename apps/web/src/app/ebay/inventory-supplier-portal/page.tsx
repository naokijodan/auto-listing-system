'use client';

import React, { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string } | Record<string, unknown>;

const tabs = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard' },
  { key: 'inventory', label: '在庫', endpoint: 'inventory/list' },
  { key: 'suppliers', label: 'サプライヤー', endpoint: 'suppliers/list' },
  { key: 'orders', label: '発注', endpoint: 'orders/list' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
] as const;

const apiBase = '/api/ebay-inventory-supplier-portal/';

export default function InventorySupplierPortalPage(): JSX.Element {
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
      <h1 className="text-2xl font-bold text-slate-600">在庫サプライヤーポータル</h1>
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-1 rounded-t text-sm ' +
              (active === t.key ? 'bg-slate-600 text-white' : 'bg-gray-100 hover:bg-gray-200')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[160px] rounded border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-slate-600">エラーが発生しました: {error}</div>}
        {!loading && !error && (
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


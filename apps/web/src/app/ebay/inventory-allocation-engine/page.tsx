'use client';

import { useEffect, useState } from 'react';

type Tab = {
  key: 'dashboard' | 'allocations' | 'channels' | 'rules' | 'analytics' | 'settings';
  label: string;
  endpoint: string;
};

const TABS: Tab[] = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard' },
  { key: 'allocations', label: '配分', endpoint: 'allocations' },
  { key: 'channels', label: 'チャネル', endpoint: 'channels' },
  { key: 'rules', label: 'ルール', endpoint: 'rules' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
];

const API_BASE = '/api/ebay-inventory-allocation-engine/';

export default function InventoryAllocationEnginePage() {
  const [active, setActive] = useState<Tab['key']>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const tab = TABS.find((t) => t.key === active)!;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}${tab.endpoint}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(String(e));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [active]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-rose-600">在庫配分エンジン</h1>
      <nav className="flex gap-4 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'py-2 -mb-px border-b-2 transition-colors ' +
              (active === t.key
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700')
            }
          >
            {t.label}
          </button>
        ))}
      </nav>
      <section className="rounded border p-4 bg-white">
        {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
        {error && <div className="text-sm text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-xs text-gray-800 whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}


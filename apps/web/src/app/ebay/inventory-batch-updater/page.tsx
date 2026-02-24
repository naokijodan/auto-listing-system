'use client';

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'updates' | 'templates' | 'validations' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'updates', label: '更新' },
  { key: 'templates', label: 'テンプレート' },
  { key: 'validations', label: 'バリデーション' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-inventory-batch-updater';

function endpointForTab(tab: TabKey): string {
  switch (tab) {
    case 'dashboard':
      return `${API_BASE}/dashboard`;
    case 'updates':
      return `${API_BASE}/updates`;
    case 'templates':
      return `${API_BASE}/templates`;
    case 'validations':
      return `${API_BASE}/validations`;
    case 'analytics':
      return `${API_BASE}/analytics`;
    case 'settings':
      return `${API_BASE}/settings`;
    default:
      return `${API_BASE}/health`;
  }
}

export default function InventoryBatchUpdaterPage() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpointForTab(active));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-pink-600">在庫一括更新ツール</h1>

      <nav className="flex gap-4 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-2 py-1 -mb-[2px] border-b-2 transition-colors ${
              active === t.key
                ? 'border-pink-600 text-pink-600'
                : 'border-transparent text-gray-600 hover:text-pink-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">API: {endpointForTab(active)}</span>
          <button
            onClick={fetchData}
            className="px-3 py-1 text-sm bg-pink-600 text-white rounded"
          >
            再読み込み
          </button>
        </div>
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="bg-gray-50 p-4 rounded border text-sm overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}


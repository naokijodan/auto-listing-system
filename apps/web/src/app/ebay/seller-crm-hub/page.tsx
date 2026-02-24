'use client';

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'sellers' | 'customers' | 'interactions' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'sellers', label: 'セラー' },
  { key: 'customers', label: '顧客' },
  { key: 'interactions', label: 'インタラクション' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-seller-crm-hub';

function endpointForTab(tab: TabKey): string {
  switch (tab) {
    case 'dashboard':
      return `${API_BASE}/dashboard`;
    case 'sellers':
      return `${API_BASE}/sellers`;
    case 'customers':
      return `${API_BASE}/customers`;
    case 'interactions':
      return `${API_BASE}/interactions`;
    case 'analytics':
      return `${API_BASE}/analytics`;
    case 'settings':
      return `${API_BASE}/settings`;
    default:
      return `${API_BASE}/health`;
  }
}

export default function SellerCrmHubPage() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpointForTab(active), { cache: 'no-store' });
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
      <h1 className="text-2xl font-bold text-lime-600">セラーCRMハブ</h1>

      <nav className="flex gap-4 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-2 py-1 -mb-[2px] border-b-2 transition-colors ${
              active === t.key
                ? 'border-lime-600 text-lime-600'
                : 'border-transparent text-gray-600 hover:text-lime-600'
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
            className="px-3 py-1 text-sm bg-lime-600 text-white rounded"
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


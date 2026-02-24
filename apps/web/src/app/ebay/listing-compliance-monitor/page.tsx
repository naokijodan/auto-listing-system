'use client';

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'listings' | 'policies' | 'violations' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string; endpoint: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard/summary' },
  { key: 'listings', label: '出品', endpoint: 'listings/list' },
  { key: 'policies', label: 'ポリシー', endpoint: 'policies/list' },
  { key: 'violations', label: '違反', endpoint: 'violations/list' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
];

const API_BASE = '/api/ebay-listing-compliance-monitor/';

export default function ListingComplianceMonitorPage(): JSX.Element {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tab = TABS.find((t) => t.key === active);
    if (!tab) return;
    setLoading(true);
    setError(null);
    fetch(API_BASE + tab.endpoint)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-yellow-600">出品コンプライアンスモニター</h1>
      <div className="flex gap-2 mb-4 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={
              'px-3 py-2 text-sm border-b-2 -mb-px ' +
              (active === tab.key
                ? 'border-yellow-600 text-yellow-600'
                : 'border-transparent text-gray-600 hover:text-gray-900')
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


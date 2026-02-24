'use client';

import React, { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string };

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'competitors', label: '競合' },
  { key: 'listings', label: '出品' },
  { key: 'alerts', label: 'アラート' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-listing-competitor-spy/';

function pathForTab(tab: string): string {
  switch (tab) {
    case 'dashboard':
      return 'dashboard';
    case 'competitors':
      return 'competitors/list';
    case 'listings':
      return 'listings/list';
    case 'alerts':
      return 'alerts/list';
    case 'analytics':
      return 'analytics';
    case 'settings':
      return 'settings';
    default:
      return 'dashboard';
  }
}

export default function ListingCompetitorSpyPage() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`${API_BASE}${pathForTab(currentTab)}`);
        const json: ApiResponse = await resp.json();
        if (isMounted) setData(json);
      } catch (e: unknown) {
        if (isMounted)
          setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [currentTab]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-pink-600">出品競合スパイ</h1>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4" aria-label="Tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setCurrentTab(t.key)}
              className={
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ' +
                (currentTab === t.key
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')
              }
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="rounded-md border p-4">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


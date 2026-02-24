'use client';

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'listings' | 'urgency' | 'campaigns' | 'analytics' | 'settings';

type ApiResponse = {
  section: string;
  action: string;
};

const API_BASE = '/api/ebay-listing-urgency-booster/';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'listings', label: '出品' },
  { key: 'urgency', label: 'アージェンシー' },
  { key: 'campaigns', label: 'キャンペーン' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const ENDPOINT: Record<TabKey, string> = {
  dashboard: 'dashboard/overview',
  listings: 'listings/list',
  urgency: 'urgency/list',
  campaigns: 'campaigns/list',
  analytics: 'analytics/overview',
  settings: 'settings/get',
};

export default function Page(): JSX.Element {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}${ENDPOINT[active]}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        setData(json);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        setError(msg);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    void run();
    return () => controller.abort();
  }, [active]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-indigo-600">eBay 出品アージェンシーブースター</h1>
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-1 rounded border text-sm ${
              active === t.key ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'bg-white border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border p-4">
        <div className="text-sm text-gray-600 mb-2">選択中タブ: {TABS.find((t) => t.key === active)?.label}</div>
        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && data && (
          <pre className="text-xs text-gray-800">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


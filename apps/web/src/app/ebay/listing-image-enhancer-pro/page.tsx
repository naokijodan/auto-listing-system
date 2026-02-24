'use client';

import { useEffect, useState } from 'react';

type Data = Record<string, unknown>;

const TABS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'images', label: '画像' },
  { key: 'presets', label: 'プリセット' },
  { key: 'watermarks', label: '透かし' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-listing-image-enhancer-pro/';

function endpointFor(tab: string): string {
  switch (tab) {
    case 'dashboard':
      return 'dashboard';
    case 'images':
      return 'images/list';
    case 'presets':
      return 'presets/list';
    case 'watermarks':
      return 'watermarks/list';
    case 'analytics':
      return 'analytics';
    case 'settings':
      return 'settings';
    default:
      return 'dashboard';
  }
}

export default function ListingImageEnhancerProPage() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(API_BASE + endpointFor(activeTab), {
          method: 'GET',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as Data;
        setData(json);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [activeTab]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-fuchsia-600">出品画像強化Pro</h1>
      <div className="flex gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-3 py-1 rounded-t-md text-sm border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-fuchsia-600 text-fuchsia-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-md border p-4 bg-white">
        <div className="text-xs text-gray-500 mb-2">
          API: {API_BASE}
          {endpointFor(activeTab)}
        </div>
        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}


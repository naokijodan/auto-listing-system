// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string } | { [key: string]: unknown };

const API_BASE = '/api/ebay-listing-localization-engine/';

const tabs = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'translations', label: '翻訳' },
  { key: 'languages', label: '言語' },
  { key: 'glossary', label: '用語集' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

function endpointForTab(key: string): string {
  switch (key) {
    case 'dashboard':
      return 'dashboard';
    case 'translations':
      return 'translations';
    case 'languages':
      return 'languages';
    case 'glossary':
      return 'glossary';
    case 'analytics':
      return 'analytics';
    case 'settings':
      return 'settings';
    default:
      return 'health';
  }
}

export default function ListingLocalizationEnginePage(): JSX.Element {
  const [active, setActive] = useState<string>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const ep = endpointForTab(active);
        const res = await fetch(`${API_BASE}${ep}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = (await res.json()) as ApiResponse;
        setData(json);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setError((e as Error).message);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-lime-600">出品ローカライゼーションエンジン</h1>
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={
              'px-3 py-2 text-sm rounded-t border-b-2 -mb-px ' +
              (active === t.key
                ? 'border-lime-600 text-lime-600'
                : 'border-transparent text-gray-600 hover:text-lime-600 hover:border-lime-600')
            }
            onClick={() => setActive(t.key)}
            aria-current={active === t.key ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border p-4 bg-white">
        {loading && <p className="text-gray-500">読み込み中...</p>}
        {error && <p className="text-red-600">エラー: {error}</p>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


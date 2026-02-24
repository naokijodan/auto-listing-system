'use client';

import { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string };

const TABS = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'sellers', label: 'セラー' },
  { key: 'health', label: 'ヘルス' },
  { key: 'metrics', label: 'メトリクス' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
] as const;

const API_BASE = '/api/ebay-seller-account-health';

function endpointForTab(tab: (typeof TABS)[number]['key']): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard';
    case 'sellers':
      return '/sellers';
    case 'health':
      return '/health-status';
    case 'metrics':
      return '/metrics';
    case 'analytics':
      return '/analytics';
    case 'settings':
      return '/settings';
  }
}

export default function SellerAccountHealthPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const res = await fetch(`${API_BASE}${endpointForTab(tab)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-amber-600">セラーアカウントヘルス</h1>
      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm rounded-t-md border-b-2 ${
              tab === t.key ? 'border-amber-600 text-amber-600' : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-md border p-4">
        <div className="mb-2 text-sm text-gray-500">選択中のタブ: {TABS.find((t) => t.key === tab)?.label}</div>
        {loading && <div className="text-gray-600">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && data && (
          <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

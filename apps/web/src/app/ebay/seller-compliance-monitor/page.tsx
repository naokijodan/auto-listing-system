'use client';

import { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string };

const API_BASE = '/api/ebay-seller-compliance-monitor/';

const TABS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'sellers', label: 'セラー' },
  { key: 'compliance', label: 'コンプライアンス' },
  { key: 'violations', label: '違反' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

export default function Page() {
  const [activeTab, setActiveTab] = useState<string>(TABS[0]!.key);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}${activeTab}/overview`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-red-600">セラーコンプライアンスモニター</h1>

      <div className="flex gap-4 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-2 -mb-px border-b-2 text-sm ${
              activeTab === t.key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-sm">
        {loading && <div>読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && data && (
          <pre className="bg-gray-50 p-4 rounded border text-xs">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


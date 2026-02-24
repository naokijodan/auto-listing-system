'use client';

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'cancellations' | 'reasons' | 'refunds' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string; endpoint: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: '/dashboard' },
  { key: 'cancellations', label: 'キャンセル', endpoint: '/cancellations' },
  { key: 'reasons', label: '理由', endpoint: '/reasons' },
  { key: 'refunds', label: '返金', endpoint: '/refunds' },
  { key: 'analytics', label: '分析', endpoint: '/analytics' },
  { key: 'settings', label: '設定', endpoint: '/settings' },
];

const API_BASE = '/api/ebay-order-cancellation-manager';

export default function OrderCancellationManagerPage() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tab = TABS.find((t) => t.key === active)!;
    const url = `${API_BASE}${tab.endpoint}`;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        setData(json);
      })
      .catch((e) => setError(e?.message ?? '通信エラー'))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-indigo-600">注文キャンセル管理</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-1.5 rounded border text-sm ' +
              (active === t.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded border border-indigo-100 bg-white p-4">
        {loading && <div className="text-sm text-gray-500">読み込み中...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && (
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


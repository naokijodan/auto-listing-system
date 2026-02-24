'use client';

import { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'courses' | 'lessons' | 'progress' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'courses', label: 'コース' },
  { key: 'lessons', label: 'レッスン' },
  { key: 'progress', label: '進捗' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-seller-training-hub/';

export default function Page() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    const action = active === 'settings' ? 'get' : 'overview';
    const url = `${API_BASE}${active}/${action}`;
    setLoading(true);
    setError(null);
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as unknown;
      })
      .then((json) => setData(json))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Unknown error');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [active]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold text-orange-600">セラートレーニングハブ</h1>
      <div className="flex gap-2 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-2 text-sm ' +
              (active === t.key
                ? 'border-b-2 border-orange-600 text-orange-600 font-medium'
                : 'text-gray-600 hover:text-orange-600')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="text-sm text-gray-700">
        {loading && <div>読み込み中…</div>}
        {error && <div className="text-orange-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="bg-gray-50 p-3 rounded border overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}


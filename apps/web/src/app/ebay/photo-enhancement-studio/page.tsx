
'use client';

import React, { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string } | Record<string, unknown>;

const tabs = [
  { key: 'dashboard', label: 'ダッシュボード', endpoint: 'dashboard' },
  { key: 'images', label: '画像', endpoint: 'images/list' },
  { key: 'presets', label: 'プリセット', endpoint: 'presets/list' },
  { key: 'templates', label: 'テンプレート', endpoint: 'templates/list' },
  { key: 'analytics', label: '分析', endpoint: 'analytics' },
  { key: 'settings', label: '設定', endpoint: 'settings' },
] as const;

const apiBase = '/api/ebay-photo-enhancement-studio/';

export default function PhotoEnhancementStudioPage(): React.ReactElement {
  const [active, setActive] = useState<typeof tabs[number]['key']>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = tabs.find((x) => x.key === active);
    if (!t) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(apiBase + t.endpoint, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as ApiResponse;
      })
      .then((json) => setData(json))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-fuchsia-600">写真補正スタジオ</h1>
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              'px-3 py-1 rounded-t text-sm ' +
              (active === t.key
                ? 'bg-fuchsia-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200')
            }
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-[160px] rounded border p-4 bg-white">
        {loading && <div className="text-gray-500">読み込み中...</div>}
        {error && (
          <div className="text-fuchsia-600">エラーが発生しました: {error}</div>
        )}
        {!loading && !error && (
          <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


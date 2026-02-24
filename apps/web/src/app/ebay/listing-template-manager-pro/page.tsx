'use client';

import React, { useEffect, useState } from 'react';

type ApiResponse = { section: string; action: string };

const TABS: { key: string; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'templates', label: 'テンプレート' },
  { key: 'categories', label: 'カテゴリ' },
  { key: 'variables', label: '変数' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-listing-template-manager-pro';

export default function ListingTemplateManagerProPage() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/${activeTab}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: ApiResponse = await res.json();
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-sky-600">出品テンプレート管理Pro</h1>

      <div className="flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded border p-4 bg-white">
        <div className="mb-2 text-sm text-gray-600">API: {API_BASE}/{activeTab}</div>
        {loading && <div className="text-gray-700">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-sm text-gray-800 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}


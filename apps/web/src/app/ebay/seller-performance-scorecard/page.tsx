"use client";

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'scores' | 'metrics' | 'goals' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'scores', label: 'スコア' },
  { key: 'metrics', label: '指標' },
  { key: 'goals', label: '目標' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-seller-performance-scorecard/';

export default function SellerPerformanceScorecardPage() {
  const [active, setActive] = useState<TabKey>('dashboard');
  const [status, setStatus] = useState<string>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}health`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { section: string; action: string } = await res.json();
        if (mounted) setStatus(`${data.section}:${data.action}`);
      } catch (e: unknown) {
        if (mounted) setError(e instanceof Error ? e.message : 'unknown error');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-green-600">セラーパフォーマンススコアカード</h1>
        <p className="text-sm text-gray-500">API: {API_BASE}</p>
      </header>

      <nav className="flex gap-4 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={
              `pb-2 -mb-px transition-colors ` +
              (active === t.key
                ? 'border-b-2 border-green-600 text-green-600'
                : 'text-gray-600 hover:text-green-600')
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <section className="space-y-2">
        <div className="text-sm text-gray-700">選択中のタブ: {TABS.find((t) => t.key === active)?.label}</div>
        <div className="text-sm">
          <span className="font-medium">APIステータス:</span>{' '}
          {error ? (
            <span className="text-red-600">エラー: {error}</span>
          ) : (
            <span className="text-green-700">{status}</span>
          )}
        </div>
        <div className="rounded border p-4 text-sm text-gray-700 bg-white">
          {active === 'dashboard' && 'スコア、バッジ、履歴のサマリーを確認します。'}
          {active === 'scores' && 'スコアの計算、比較、ベンチマークを行います。'}
          {active === 'metrics' && '指標の内訳やトレンドを確認します。'}
          {active === 'goals' && '目標の作成や更新を行います。'}
          {active === 'analytics' && 'スコアトレンドや同業比較を分析します。'}
          {active === 'settings' && '設定を確認・更新します。'}
        </div>
      </section>
    </div>
  );
}


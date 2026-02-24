"use client";

import React, { useEffect, useState } from 'react';

type TabKey = 'dashboard' | 'products' | 'costs' | 'reports' | 'analytics' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード' },
  { key: 'products', label: '商品' },
  { key: 'costs', label: 'コスト' },
  { key: 'reports', label: 'レポート' },
  { key: 'analytics', label: '分析' },
  { key: 'settings', label: '設定' },
];

const API_BASE = '/api/ebay-inventory-cost-analyzer/';

export default function InventoryCostAnalyzerPage() {
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
        <h1 className="text-2xl font-semibold text-fuchsia-600">在庫コスト分析</h1>
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
                ? 'border-b-2 border-fuchsia-600 text-fuchsia-600'
                : 'text-gray-600 hover:text-fuchsia-600')
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
          {active === 'dashboard' && 'コスト、マージン、トレンドのサマリーを確認します。'}
          {active === 'products' && '商品のコストを分析・比較・履歴を確認します。'}
          {active === 'costs' && 'コストの内訳や更新を行います。'}
          {active === 'reports' && 'レポートの生成やスケジュール設定を行います。'}
          {active === 'analytics' && 'コストトレンドやマージン分析を行います。'}
          {active === 'settings' && '設定を確認・更新します。'}
        </div>
      </section>
    </div>
  );
}


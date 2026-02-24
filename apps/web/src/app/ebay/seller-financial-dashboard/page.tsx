"use client";

import { useEffect, useState } from "react";

type ApiData = unknown;

const API_BASE = "/api/ebay-seller-financial-dashboard/";

const tabs = [
  { key: "dashboard", label: "ダッシュボード", path: "dashboard" },
  { key: "transactions", label: "取引", path: "transactions" },
  { key: "reports", label: "レポート", path: "reports" },
  { key: "budgets", label: "予算", path: "budgets" },
  { key: "analytics", label: "分析", path: "analytics" },
  { key: "settings", label: "設定", path: "settings" },
];

export default function SellerFinancialDashboardPage() {
  const [active, setActive] = useState<string>(tabs[0].key);
  const [data, setData] = useState<ApiData>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const current = tabs.find((t) => t.key === active)!;

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}${current.path}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!aborted) setData(json);
      } catch (e: unknown) {
        if (!aborted) setError((e as Error).message);
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-teal-600">セラー財務ダッシュボード</h1>
      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3 py-2 text-sm border-b-2 -mb-px ${
              active === t.key ? "border-teal-600 text-teal-600" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section className="rounded border p-4 bg-white">
        <div className="text-sm text-gray-500 mb-2">API: {API_BASE}{current.path}</div>
        {loading && <div className="text-gray-600">読み込み中...</div>}
        {error && <div className="text-red-600">エラー: {error}</div>}
        {!loading && !error && (
          <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";

type TabKey = "dashboard" | "experiments" | "variants" | "metrics" | "analytics" | "settings";

const LABELS: Record<TabKey, string> = {
  dashboard: "ダッシュボード",
  experiments: "実験",
  variants: "バリアント",
  metrics: "指標",
  analytics: "分析",
  settings: "設定",
};

const BASE = "/api/ebay-listing-ab-test-engine";
const ENDPOINTS: Record<TabKey, string> = {
  dashboard: `${BASE}/dashboard`,
  experiments: `${BASE}/experiments`,
  variants: `${BASE}/variants`,
  metrics: `${BASE}/metrics`,
  analytics: `${BASE}/analytics`,
  settings: `${BASE}/settings`,
};

export default function ListingAbTestEnginePage() {
  const [active, setActive] = useState<TabKey>("dashboard");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(ENDPOINTS[active], { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: unknown) {
        if ((e as any)?.name !== 'AbortError') {
          setError(e instanceof Error ? e.message : "unknown error");
        }
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [active]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-emerald-600">出品ABテストエンジン</h1>
        <p className="text-sm text-gray-500">A/Bテストの自動最適化と分析</p>
      </header>

      <nav className="border-b">
        <ul className="flex flex-wrap gap-2">
          {(Object.keys(LABELS) as TabKey[]).map((k) => (
            <li key={k}>
              <button
                className={`px-3 py-2 text-sm rounded-t border transition-colors ${
                  active === k
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-white text-gray-600 hover:bg-gray-50 border-transparent"
                }`}
                onClick={() => setActive(k)}
              >
                {LABELS[k]}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <section className="rounded border bg-white p-4">
        <div className="text-xs text-gray-500">API: {ENDPOINTS[active]}</div>
        {loading && <p className="text-gray-600">読み込み中...</p>}
        {error && <p className="text-red-600">エラー: {error}</p>}
        {!loading && !error && (
          <pre className="text-sm overflow-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}


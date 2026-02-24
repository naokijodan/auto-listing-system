"use client";

import { useEffect, useState } from "react";

type TabKey = "dashboard" | "loyalty" | "rewards" | "sellers" | "analytics" | "settings";

const LABELS: Record<TabKey, string> = {
  dashboard: "ダッシュボード",
  loyalty: "ロイヤルティ",
  rewards: "リワード",
  sellers: "セラー",
  analytics: "分析",
  settings: "設定",
};

const BASE = "/api/ebay-seller-loyalty-program/";
const ENDPOINTS: Record<TabKey, string> = {
  dashboard: `${BASE}dashboard`,
  loyalty: `${BASE}loyalty`,
  rewards: `${BASE}rewards`,
  sellers: `${BASE}sellers`,
  analytics: `${BASE}analytics`,
  settings: `${BASE}settings`,
};

export default function Page() {
  const [active, setActive] = useState<TabKey>("dashboard");
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(ENDPOINTS[active], { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!aborted) setData(json);
      } catch (e: unknown) {
        if (!aborted) setError(e instanceof Error ? e.message : "unknown error");
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    run();
    return () => { aborted = true; };
  }, [active]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-pink-600">セラーロイヤルティプログラム</h1>
        <p className="text-sm text-gray-500">Seller Loyalty Program</p>
      </header>
      <nav className="border-b">
        <ul className="flex flex-wrap gap-2">
          {(Object.keys(LABELS) as TabKey[]).map((k) => (
            <li key={k}>
              <button
                className={`px-3 py-2 text-sm rounded-t border transition-colors ${
                  active === k
                    ? "bg-pink-50 text-pink-700 border-pink-200"
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
        {loading && <p className="text-gray-600">読み込み中...</p>}
        {error && <p className="text-red-600">エラー: {error}</p>}
        {!loading && !error && (
          <pre className="text-sm overflow-auto whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
        )}
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

type ApiResponse = { section: string; action: string };

const TABS = [
  {"key":"dashboard","label":"ダッシュボード","path":"dashboard/summary"},
  {"key":"inventory","label":"在庫","path":"resources"},
  {"key":"operations","label":"オペレーション","path":"variants"},
  {"key":"forecasting","label":"予測","path":"listings"},
  {"key":"analytics","label":"分析","path":"analytics/overview"},
  {"key":"settings","label":"設定","path":"settings"}
] as const;

const API_BASE = "/api/ebay-inventory-saga-based-planning-vortex/";

export default function Page() {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("dashboard");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tab = TABS.find((t) => t.key === active);
    if (!tab) return;
    setError(null);
    fetch(API_BASE + tab.path)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-purple-600 mb-4">
        {API_BASE.replace("/api/", "").replace("/", "")}
      </h1>
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 rounded ${
              active === t.key
                ? "bg-purple-100 text-purple-600 font-bold"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {data && (
        <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

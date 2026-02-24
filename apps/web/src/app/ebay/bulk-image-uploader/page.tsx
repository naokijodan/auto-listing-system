"use client";

import { useEffect, useState } from "react";

type TabKey = "dashboard" | "uploads" | "gallery" | "presets" | "analytics" | "settings";

const LABELS: Record<TabKey, string> = {
  dashboard: "ダッシュボード",
  uploads: "アップロード",
  gallery: "ギャラリー",
  presets: "プリセット",
  analytics: "分析",
  settings: "設定",
};

const BASE = "/api/ebay-bulk-image-uploader";
const ENDPOINTS: Record<TabKey, string> = {
  dashboard: `${BASE}/dashboard`,
  uploads: `${BASE}/uploads`,
  gallery: `${BASE}/gallery`,
  presets: `${BASE}/presets`,
  analytics: `${BASE}/analytics`,
  settings: `${BASE}/settings`,
};

export default function BulkImageUploaderPage() {
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
        const res = await fetch(ENDPOINTS[active]);
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
    return () => {
      aborted = true;
    };
  }, [active]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-amber-600">一括画像アップローダー</h1>
        <p className="text-sm text-gray-500">eBay向けの大規模画像アップロードを管理</p>
      </header>

      <nav className="border-b">
        <ul className="flex flex-wrap gap-2">
          {(Object.keys(LABELS) as TabKey[]).map((k) => (
            <li key={k}>
              <button
                className={`px-3 py-2 text-sm rounded-t border transition-colors ${
                  active === k
                    ? "bg-amber-50 text-amber-700 border-amber-200"
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


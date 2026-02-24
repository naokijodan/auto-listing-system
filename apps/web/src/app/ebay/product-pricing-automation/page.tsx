"use client";
import { useEffect, useState } from "react";
type ApiResponse = { section: string; action: string };
const TABS = [
  { key: "dashboard", label: "ダッシュボード", path: "dashboard/summary" },
  { key: "products", label: "商品", path: "views/summary" },
  { key: "materials", label: "素材", path: "media/summary" },
  { key: "sourcing", label: "調達", path: "renders/summary" },
  { key: "analytics", label: "分析", path: "analytics/overview" },
  { key: "settings", label: "設定", path: "settings" },
] as const;
const API_BASE = "/api/ebay-product-pricing-automation/";
export default function Page() {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("dashboard");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = TABS.find((t) => t.key === active)!;
  useEffect(() => {
    let cancelled = false; setError(null); setData(null);
    const run = async () => { try { const res = await fetch(API_BASE + current.path, { cache: "no-store" }); if (!res.ok) throw new Error(\`HTTP \${res.status}\`); const json: ApiResponse = await res.json(); if (!cancelled) setData(json); } catch (e) { if (!cancelled) setError((e as Error).message); } };
    run(); return () => { cancelled = true; };
  }, [active, current.path]);
  return (<div className="p-6 space-y-6"><h1 className="text-2xl font-semibold text-indigo-600">商品プライシングオートメーション</h1><div className="flex gap-2 flex-wrap">{TABS.map((tab) => (<button key={tab.key} onClick={() => setActive(tab.key)} className={\`px-3 py-1 rounded border text-sm \${active === tab.key ? "bg-indigo-50 border-indigo-600 text-indigo-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}\`}>{tab.label}</button>))}</div><div className="rounded border p-4"><div className="text-sm text-gray-500 mb-2">API: {API_BASE + current.path}</div>{error && <div className="text-red-600">Error: {error}</div>}{!error && !data && <div className="text-gray-500">読み込み中...</div>}{data && (<div className="space-y-1"><div><span className="font-medium">section:</span> {data.section}</div><div><span className="font-medium">action:</span> {data.action}</div></div>)}</div></div>);
}

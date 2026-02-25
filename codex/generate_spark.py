#!/usr/bin/env python3
"""Generate eBay Phase 2961-3030 (Spark series) route + UI files."""

import os

ROUTES_DIR = "/Users/naokijodan/Desktop/rakuda/apps/api/src/routes"
UI_DIR = "/Users/naokijodan/Desktop/rakuda/apps/web/src/app/ebay"
OUTPUT_DIR = "/Users/naokijodan/Desktop/rakuda/codex/output"

SERIES = "spark"

API_TEMPLATE = '''import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Dashboard (5)
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));

// Resources (6)
router.get('/resources', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'list' }));
router.get('/resources/:id', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'detail' }));
router.post('/resources', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'create' }));
router.put('/resources/:id', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'update' }));
router.delete('/resources/:id', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'delete' }));
router.post('/resources/:id/process', (_req: Request, res: Response) => res.json({ section: 'resources', action: 'process' }));

// Variants (4)
router.get('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'list' }));
router.get('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'detail' }));
router.post('/variants', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'create' }));
router.put('/variants/:id', (_req: Request, res: Response) => res.json({ section: 'variants', action: 'update' }));

// Listings (4)
router.get('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'list' }));
router.get('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'detail' }));
router.post('/listings', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'create' }));
router.put('/listings/:id', (_req: Request, res: Response) => res.json({ section: 'listings', action: 'update' }));

// Analytics (3)
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'analytics' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/trends', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'trends' }));

// Settings (2)
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'put' }));

// Utilities (4)
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));

export default router;
'''

COLORS = [
    "indigo-600", "orange-600", "pink-600", "slate-600", "red-600",
    "fuchsia-600", "green-600", "blue-600", "yellow-600", "purple-600",
    "cyan-600", "lime-600", "emerald-600", "sky-600", "amber-600",
    "violet-600", "rose-600", "teal-600",
]

CATEGORIES = ["listing", "order", "inventory", "seller", "product"]
CAT_NOUNS = {
    "listing": "engine",
    "order": "routing",
    "inventory": "planning",
    "seller": "dashboard",
    "product": "analysis",
}
CAT_UI_TABS = {
    "listing": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("listings", "出品", "resources"),
        ("templates", "テンプレート", "variants"),
        ("optimization", "最適化", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "order": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("orders", "注文", "resources"),
        ("processing", "処理", "variants"),
        ("tracking", "追跡", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "inventory": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("inventory", "在庫", "resources"),
        ("operations", "オペレーション", "variants"),
        ("forecasting", "予測", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "seller": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("sellers", "セラー", "resources"),
        ("performance", "パフォーマンス", "variants"),
        ("management", "管理", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
    "product": [
        ("dashboard", "ダッシュボード", "dashboard/summary"),
        ("products", "商品", "resources"),
        ("operations", "オペレーション", "variants"),
        ("quality", "クオリティ", "listings"),
        ("analytics", "分析", "analytics/overview"),
        ("settings", "設定", "settings"),
    ],
}

ADJECTIVES = [
    "innovative", "strategic", "automated", "intelligent", "predictive",
    "proactive", "reactive", "interactive", "integrated", "distributed",
    "centralized", "optimized", "accelerated", "streamlined",
]

def to_camel(kebab: str) -> str:
    parts = kebab.split("-")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])

def make_ui_page(route_name: str, color: str, category: str) -> str:
    tabs = CAT_UI_TABS[category]
    tabs_json = ",\n  ".join(
        f'{{"key":"{t[0]}","label":"{t[1]}","path":"{t[2]}"}}'
        for t in tabs
    )
    color_name = color.replace("-600", "")
    return f'''"use client";
import {{ useEffect, useState }} from "react";

type ApiResponse = {{ section: string; action: string }};

const TABS = [
  {tabs_json}
] as const;

const API_BASE = "/api/{route_name}/";

export default function Page() {{
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("dashboard");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {{
    const tab = TABS.find((t) => t.key === active);
    if (!tab) return;
    setError(null);
    fetch(API_BASE + tab.path)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }}, [active]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-{color} mb-4">
        {{API_BASE.replace("/api/", "").replace("/", "")}}
      </h1>
      <div className="flex gap-2 mb-6">
        {{TABS.map((t) => (
          <button
            key={{t.key}}
            onClick={{() => setActive(t.key)}}
            className={{`px-4 py-2 rounded ${{
              active === t.key
                ? "bg-{color_name}-100 text-{color} font-bold"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }}`}}
          >
            {{t.label}}
          </button>
        ))}}
      </div>
      {{error && <p className="text-red-500 mb-4">{{error}}</p>}}
      {{data && (
        <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
          {{JSON.stringify(data, null, 2)}}
        </pre>
      )}}
    </div>
  );
}}
'''

def main():
    os.makedirs(ROUTES_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    imports = []
    registrations = []
    all_routes = []

    phase = 2961
    for adj_idx, adj in enumerate(ADJECTIVES):
        for cat_idx, cat in enumerate(CATEGORIES):
            noun = CAT_NOUNS[cat]
            route_name = f"ebay-{cat}-{adj}-{noun}-{SERIES}"
            color = COLORS[(phase - 2961) % len(COLORS)]
            var_name = to_camel(route_name) + "Router"

            # API route file
            api_path = os.path.join(ROUTES_DIR, f"{route_name}.ts")
            with open(api_path, "w") as f:
                f.write(API_TEMPLATE)

            # UI page
            ui_folder_name = f"{cat}-{adj}-{noun}-{SERIES}"
            ui_dir = os.path.join(UI_DIR, ui_folder_name)
            os.makedirs(ui_dir, exist_ok=True)
            ui_path = os.path.join(ui_dir, "page.tsx")
            with open(ui_path, "w") as f:
                f.write(make_ui_page(route_name, color, cat))

            imports.append(f"import {var_name} from './{route_name}';")
            registrations.append(f"  app.use('/api/{route_name}', {var_name});")
            all_routes.append((phase, route_name, cat, color))

            phase += 1

    # Write imports/registrations
    with open(os.path.join(OUTPUT_DIR, f"{SERIES}-imports.txt"), "w") as f:
        f.write("\n".join(imports) + "\n")
    with open(os.path.join(OUTPUT_DIR, f"{SERIES}-registrations.txt"), "w") as f:
        f.write("\n".join(registrations) + "\n")

    print(f"Generated {len(all_routes)} API route files in {ROUTES_DIR}")
    print(f"Generated {len(all_routes)} UI pages in {UI_DIR}")
    print(f"Phase range: {all_routes[0][0]}-{all_routes[-1][0]}")
    print(f"Imports/registrations written to {OUTPUT_DIR}/{SERIES}-*.txt")

if __name__ == "__main__":
    main()

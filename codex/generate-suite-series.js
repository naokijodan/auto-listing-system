#!/usr/bin/env node
// Generate Phase 1631-1700 (Suite series) - API routes + UI pages
const fs = require('fs');
const path = require('path');

const COLORS = [
  'indigo-600','orange-600','pink-600','slate-600','red-600','fuchsia-600',
  'green-600','blue-600','yellow-600','purple-600','cyan-600','lime-600',
  'emerald-600','sky-600','amber-600','violet-600','rose-600','teal-600'
];

function getColor(phase) {
  return COLORS[(phase - 1001) % 18];
}

// Convert kebab-case to camelCase
function toCamel(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// Convert kebab to PascalCase
function toPascal(str) {
  const camel = toCamel(str);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

// Category prefixes and their Japanese labels + tab configs
const CATEGORIES = {
  listing: {
    jp: '出品',
    tabs: [
      { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard/summary' },
      { key: 'listings', label: '出品', path: 'views/summary' },
      { key: 'media', label: 'メディア', path: 'media/summary' },
      { key: 'layouts', label: 'レイアウト', path: 'renders/summary' },
      { key: 'analytics', label: '分析', path: 'analytics/overview' },
      { key: 'settings', label: '設定', path: 'settings' },
    ]
  },
  order: {
    jp: '注文',
    tabs: [
      { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard/summary' },
      { key: 'orders', label: '注文', path: 'views/summary' },
      { key: 'processing', label: '処理', path: 'media/summary' },
      { key: 'tracking', label: 'トラッキング', path: 'renders/summary' },
      { key: 'analytics', label: '分析', path: 'analytics/overview' },
      { key: 'settings', label: '設定', path: 'settings' },
    ]
  },
  inventory: {
    jp: '在庫',
    tabs: [
      { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard/summary' },
      { key: 'inventory', label: '在庫', path: 'views/summary' },
      { key: 'operations', label: 'オペレーション', path: 'media/summary' },
      { key: 'planning', label: 'プランニング', path: 'renders/summary' },
      { key: 'analytics', label: '分析', path: 'analytics/overview' },
      { key: 'settings', label: '設定', path: 'settings' },
    ]
  },
  seller: {
    jp: 'セラー',
    tabs: [
      { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard/summary' },
      { key: 'sellers', label: 'セラー', path: 'views/summary' },
      { key: 'management', label: 'マネジメント', path: 'media/summary' },
      { key: 'insights', label: 'インサイト', path: 'renders/summary' },
      { key: 'analytics', label: '分析', path: 'analytics/overview' },
      { key: 'settings', label: '設定', path: 'settings' },
    ]
  },
  product: {
    jp: '商品',
    tabs: [
      { key: 'dashboard', label: 'ダッシュボード', path: 'dashboard/summary' },
      { key: 'products', label: '商品', path: 'views/summary' },
      { key: 'operations', label: 'オペレーション', path: 'media/summary' },
      { key: 'quality', label: 'クオリティ', path: 'renders/summary' },
      { key: 'analytics', label: '分析', path: 'analytics/overview' },
      { key: 'settings', label: '設定', path: 'settings' },
    ]
  }
};

// Define all 70 phases
const PHASES = [
  // 1631-1635
  { phase: 1631, name: 'listing-dynamic-pricing-suite', feature: 'ダイナミックプライシング', cat: 'listing' },
  { phase: 1632, name: 'order-tracking-automation-suite', feature: 'トラッキングオートメーション', cat: 'order' },
  { phase: 1633, name: 'inventory-demand-forecasting-suite', feature: 'デマンドフォーキャスティング', cat: 'inventory' },
  { phase: 1634, name: 'seller-performance-analytics-suite', feature: 'パフォーマンスアナリティクス', cat: 'seller' },
  { phase: 1635, name: 'product-catalog-management-suite', feature: 'カタログマネジメント', cat: 'product' },
  // 1636-1640
  { phase: 1636, name: 'listing-seo-optimization-suite', feature: 'SEOオプティマイゼーション', cat: 'listing' },
  { phase: 1637, name: 'order-fulfillment-management-suite', feature: 'フルフィルメントマネジメント', cat: 'order' },
  { phase: 1638, name: 'inventory-warehouse-management-suite', feature: 'ウェアハウスマネジメント', cat: 'inventory' },
  { phase: 1639, name: 'seller-customer-engagement-suite', feature: 'カスタマーエンゲージメント', cat: 'seller' },
  { phase: 1640, name: 'product-pricing-intelligence-suite', feature: 'プライシングインテリジェンス', cat: 'product' },
  // 1641-1645
  { phase: 1641, name: 'listing-template-management-suite', feature: 'テンプレートマネジメント', cat: 'listing' },
  { phase: 1642, name: 'order-returns-processing-suite', feature: 'リターンズプロセッシング', cat: 'order' },
  { phase: 1643, name: 'inventory-stock-control-suite', feature: 'ストックコントロール', cat: 'inventory' },
  { phase: 1644, name: 'seller-reputation-management-suite', feature: 'レピュテーションマネジメント', cat: 'seller' },
  { phase: 1645, name: 'product-image-optimization-suite', feature: 'イメージオプティマイゼーション', cat: 'product' },
  // 1646-1650
  { phase: 1646, name: 'listing-bulk-management-suite', feature: 'バルクマネジメント', cat: 'listing' },
  { phase: 1647, name: 'order-payment-processing-suite', feature: 'ペイメントプロセッシング', cat: 'order' },
  { phase: 1648, name: 'inventory-supplier-management-suite', feature: 'サプライヤーマネジメント', cat: 'inventory' },
  { phase: 1649, name: 'seller-compliance-monitoring-suite', feature: 'コンプライアンスモニタリング', cat: 'seller' },
  { phase: 1650, name: 'product-description-generator-suite', feature: 'ディスクリプションジェネレーター', cat: 'product' },
  // 1651-1655
  { phase: 1651, name: 'listing-competitive-analysis-suite', feature: 'コンペティティブアナリシス', cat: 'listing' },
  { phase: 1652, name: 'order-logistics-management-suite', feature: 'ロジスティクスマネジメント', cat: 'order' },
  { phase: 1653, name: 'inventory-cycle-counting-suite', feature: 'サイクルカウンティング', cat: 'inventory' },
  { phase: 1654, name: 'seller-financial-reporting-suite', feature: 'ファイナンシャルレポーティング', cat: 'seller' },
  { phase: 1655, name: 'product-variant-management-suite', feature: 'バリアントマネジメント', cat: 'product' },
  // 1656-1660
  { phase: 1656, name: 'listing-conversion-optimization-suite', feature: 'コンバージョンオプティマイゼーション', cat: 'listing' },
  { phase: 1657, name: 'order-dispute-resolution-suite', feature: 'ディスピュートリゾリューション', cat: 'order' },
  { phase: 1658, name: 'inventory-quality-inspection-suite', feature: 'クオリティインスペクション', cat: 'inventory' },
  { phase: 1659, name: 'seller-account-management-suite', feature: 'アカウントマネジメント', cat: 'seller' },
  { phase: 1660, name: 'product-category-optimization-suite', feature: 'カテゴリーオプティマイゼーション', cat: 'product' },
  // 1661-1665
  { phase: 1661, name: 'listing-market-research-suite', feature: 'マーケットリサーチ', cat: 'listing' },
  { phase: 1662, name: 'order-batch-processing-suite', feature: 'バッチプロセッシング', cat: 'order' },
  { phase: 1663, name: 'inventory-transfer-management-suite', feature: 'トランスファーマネジメント', cat: 'inventory' },
  { phase: 1664, name: 'seller-growth-strategy-suite', feature: 'グロースストラテジー', cat: 'seller' },
  { phase: 1665, name: 'product-review-management-suite', feature: 'レビューマネジメント', cat: 'product' },
  // 1666-1670
  { phase: 1666, name: 'listing-international-expansion-suite', feature: 'インターナショナルエクスパンション', cat: 'listing' },
  { phase: 1667, name: 'order-customer-service-suite', feature: 'カスタマーサービス', cat: 'order' },
  { phase: 1668, name: 'inventory-allocation-planning-suite', feature: 'アロケーションプランニング', cat: 'inventory' },
  { phase: 1669, name: 'seller-marketing-automation-suite', feature: 'マーケティングオートメーション', cat: 'seller' },
  { phase: 1670, name: 'product-sourcing-intelligence-suite', feature: 'ソーシングインテリジェンス', cat: 'product' },
  // 1671-1675
  { phase: 1671, name: 'listing-analytics-dashboard-suite', feature: 'アナリティクスダッシュボード', cat: 'listing' },
  { phase: 1672, name: 'order-invoice-management-suite', feature: 'インボイスマネジメント', cat: 'order' },
  { phase: 1673, name: 'inventory-expiration-tracking-suite', feature: 'エクスピレーショントラッキング', cat: 'inventory' },
  { phase: 1674, name: 'seller-training-resource-suite', feature: 'トレーニングリソース', cat: 'seller' },
  { phase: 1675, name: 'product-authentication-service-suite', feature: 'オーセンティケーションサービス', cat: 'product' },
  // 1676-1680
  { phase: 1676, name: 'listing-promotion-management-suite', feature: 'プロモーションマネジメント', cat: 'listing' },
  { phase: 1677, name: 'order-consolidation-management-suite', feature: 'コンソリデーションマネジメント', cat: 'order' },
  { phase: 1678, name: 'inventory-safety-stock-suite', feature: 'セーフティストック', cat: 'inventory' },
  { phase: 1679, name: 'seller-feedback-analysis-suite', feature: 'フィードバックアナリシス', cat: 'seller' },
  { phase: 1680, name: 'product-cross-listing-suite', feature: 'クロスリスティング', cat: 'product' },
  // 1681-1685
  { phase: 1681, name: 'listing-scheduling-optimization-suite', feature: 'スケジューリングオプティマイゼーション', cat: 'listing' },
  { phase: 1682, name: 'order-workflow-automation-suite', feature: 'ワークフローオートメーション', cat: 'order' },
  { phase: 1683, name: 'inventory-optimization-engine-suite', feature: 'オプティマイゼーションエンジン', cat: 'inventory' },
  { phase: 1684, name: 'seller-data-analytics-suite', feature: 'データアナリティクス', cat: 'seller' },
  { phase: 1685, name: 'product-trend-analysis-suite', feature: 'トレンドアナリシス', cat: 'product' },
  // 1686-1690
  { phase: 1686, name: 'listing-quality-assurance-suite', feature: 'クオリティアシュアランス', cat: 'listing' },
  { phase: 1687, name: 'order-priority-management-suite', feature: 'プライオリティマネジメント', cat: 'order' },
  { phase: 1688, name: 'inventory-audit-management-suite', feature: 'オーディットマネジメント', cat: 'inventory' },
  { phase: 1689, name: 'seller-partnership-management-suite', feature: 'パートナーシップマネジメント', cat: 'seller' },
  { phase: 1690, name: 'product-lifecycle-management-suite', feature: 'ライフサイクルマネジメント', cat: 'product' },
  // 1691-1695
  { phase: 1691, name: 'listing-personalization-engine-suite', feature: 'パーソナライゼーションエンジン', cat: 'listing' },
  { phase: 1692, name: 'order-notification-management-suite', feature: 'ノーティフィケーションマネジメント', cat: 'order' },
  { phase: 1693, name: 'inventory-replenishment-planning-suite', feature: 'リプレニッシュメントプランニング', cat: 'inventory' },
  { phase: 1694, name: 'seller-certification-management-suite', feature: 'サーティフィケーションマネジメント', cat: 'seller' },
  { phase: 1695, name: 'product-compliance-checking-suite', feature: 'コンプライアンスチェッキング', cat: 'product' },
  // 1696-1700
  { phase: 1696, name: 'listing-visibility-booster-suite', feature: 'ビジビリティブースター', cat: 'listing' },
  { phase: 1697, name: 'order-escalation-handling-suite', feature: 'エスカレーションハンドリング', cat: 'order' },
  { phase: 1698, name: 'inventory-distribution-planning-suite', feature: 'ディストリビューションプランニング', cat: 'inventory' },
  { phase: 1699, name: 'seller-revenue-optimization-suite', feature: 'レベニューオプティマイゼーション', cat: 'seller' },
  { phase: 1700, name: 'product-enrichment-pipeline-suite', feature: 'エンリッチメントパイプライン', cat: 'product' },
];

const API_DIR = path.join(__dirname, '..', 'apps', 'api', 'src', 'routes');
const WEB_DIR = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', 'ebay');

function generateApiRoute(name) {
  return `import { Router } from 'express';
import type { Request, Response } from 'express';
const router = Router();
router.get('/dashboard', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'dashboard' }));
router.get('/dashboard/summary', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'summary' }));
router.get('/dashboard/metrics', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'metrics' }));
router.get('/dashboard/recent', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'recent' }));
router.get('/dashboard/alerts', (_req: Request, res: Response) => res.json({ section: 'dashboard', action: 'alerts' }));
router.get('/views', (_req: Request, res: Response) => res.json({ section: 'views', action: 'list' }));
router.get('/views/:id', (_req: Request, res: Response) => res.json({ section: 'views', action: 'detail' }));
router.post('/views', (_req: Request, res: Response) => res.json({ section: 'views', action: 'create' }));
router.put('/views/:id', (_req: Request, res: Response) => res.json({ section: 'views', action: 'update' }));
router.delete('/views/:id', (_req: Request, res: Response) => res.json({ section: 'views', action: 'delete' }));
router.post('/views/:id/process', (_req: Request, res: Response) => res.json({ section: 'views', action: 'process' }));
router.get('/media', (_req: Request, res: Response) => res.json({ section: 'media', action: 'list' }));
router.post('/media/upload', (_req: Request, res: Response) => res.json({ section: 'media', action: 'upload' }));
router.get('/media/summary', (_req: Request, res: Response) => res.json({ section: 'media', action: 'summary' }));
router.delete('/media/:id', (_req: Request, res: Response) => res.json({ section: 'media', action: 'delete' }));
router.get('/renders', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'list' }));
router.post('/renders/generate', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'generate' }));
router.get('/renders/summary', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'summary' }));
router.get('/renders/:id', (_req: Request, res: Response) => res.json({ section: 'renders', action: 'detail' }));
router.get('/analytics', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/overview', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'overview' }));
router.get('/analytics/export', (_req: Request, res: Response) => res.json({ section: 'analytics', action: 'export' }));
router.get('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'get' }));
router.put('/settings', (_req: Request, res: Response) => res.json({ section: 'settings', action: 'update' }));
router.post('/import', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'import' }));
router.get('/export', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'export' }));
router.post('/sync', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'sync' }));
router.get('/health', (_req: Request, res: Response) => res.json({ section: 'utilities', action: 'health' }));
export default router;
`;
}

function generateUiPage(p) {
  const cat = CATEGORIES[p.cat];
  const color = getColor(p.phase);
  const colorBase = color.replace('-600', '');
  const title = `${cat.jp}${p.feature}スイート`;
  const apiBase = `/api/ebay-${p.name}/`;
  const tabsJson = JSON.stringify(cat.tabs).replace(/"/g, '"');

  return `"use client";
import { useEffect, useState } from "react";
type ApiResponse = { section: string; action: string };
const TABS = ${JSON.stringify(cat.tabs, null, 0)} as const;
const API_BASE = "${apiBase}";
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
  return (<div className="p-6 space-y-6"><h1 className="text-2xl font-semibold text-${color}">${title}</h1><div className="flex gap-2 flex-wrap">{TABS.map((tab) => (<button key={tab.key} onClick={() => setActive(tab.key)} className={\`px-3 py-1 rounded border text-sm \${active === tab.key ? "bg-${colorBase}-50 border-${color} text-${color}" : "border-gray-300 text-gray-700 hover:bg-gray-50"}\`}>{tab.label}</button>))}</div><div className="rounded border p-4"><div className="text-sm text-gray-500 mb-2">API: {API_BASE + current.path}</div>{error && <div className="text-red-600">Error: {error}</div>}{!error && !data && <div className="text-gray-500">読み込み中...</div>}{data && (<div className="space-y-1"><div><span className="font-medium">section:</span> {data.section}</div><div><span className="font-medium">action:</span> {data.action}</div></div>)}</div></div>);
}
`;
}

// Generate imports and routes for ebay-routes.ts
function generateImportsAndRoutes() {
  let imports = '\n// Phase 1631-1700 (Suite series)\n';
  let routes = '';

  for (let i = 0; i < PHASES.length; i++) {
    const p = PHASES[i];
    const varName = 'ebay' + toPascal(p.name.replace(/^(listing|order|inventory|seller|product)-/, '$1-')).replace(/-/g, '') + 'Router';
    // Actually need proper camelCase conversion
    const camelName = toCamel('ebay-' + p.name);
    const routerVar = camelName + 'Router';

    imports += `import ${routerVar} from './ebay-${p.name}';\n`;

    if (i % 5 === 0) {
      routes += `  // Phase ${p.phase}-${p.phase + 4}\n`;
    }
    routes += `  app.use('/api/ebay-${p.name}', ${routerVar});\n`;
  }

  return { imports, routes };
}

// Main
let created = 0;

for (const p of PHASES) {
  // API route
  const apiPath = path.join(API_DIR, `ebay-${p.name}.ts`);
  fs.writeFileSync(apiPath, generateApiRoute(p.name));

  // UI page
  const uiDir = path.join(WEB_DIR, p.name);
  fs.mkdirSync(uiDir, { recursive: true });
  const uiPath = path.join(uiDir, 'page.tsx');
  fs.writeFileSync(uiPath, generateUiPage(p));

  created++;
}

// Output imports and routes
const { imports, routes } = generateImportsAndRoutes();
const outputPath = path.join(__dirname, 'suite-imports-routes.txt');
fs.writeFileSync(outputPath, `=== IMPORTS ===\n${imports}\n=== ROUTES ===\n${routes}`);

console.log(`Generated ${created} phases (${created * 2} files)`);
console.log(`Imports/routes saved to: ${outputPath}`);

import { v4 as uuid } from "uuid";

export type Buyer = {
  id: string;
  name: string;
  totalPurchases: number;
  lastPurchase: string;
  lifetimeValue: number;
};

export type Segment = {
  id: string;
  name: "VIP" | "Regular" | "New" | string;
  criteria: string;
  size: number;
};

export type BehaviorOverview = {
  viewToPurchaseRate: number;
  avgSessionMinutes: number;
  cartAbandonmentRate: number;
};

export type Report = {
  id: string;
  title: string;
  createdAt: string;
  status: "queued" | "running" | "completed" | "failed";
  url?: string;
};

export type BuyerSettings = {
  themeColor: string;
  notificationsEnabled: boolean;
  alertThreshold: number;
};

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const buyers: Buyer[] = [
  { id: "b1", name: "Alice", totalPurchases: 12, lastPurchase: "2026-02-10", lifetimeValue: 1250 },
  { id: "b2", name: "Bob", totalPurchases: 5, lastPurchase: "2026-02-13", lifetimeValue: 480 },
  { id: "b3", name: "Carol", totalPurchases: 19, lastPurchase: "2026-02-14", lifetimeValue: 2200 },
  { id: "b4", name: "David", totalPurchases: 2, lastPurchase: "2026-01-30", lifetimeValue: 120 },
];

const segments: Segment[] = [
  { id: "s1", name: "VIP", criteria: "LTV > 1500", size: 120 },
  { id: "s2", name: "Regular", criteria: "2 <= purchases <= 10", size: 980 },
  { id: "s3", name: "New", criteria: "First purchase in 30 days", size: 410 },
];

let reports: Report[] = [
  { id: "r1", title: "Monthly Buyer Summary", createdAt: "2026-02-01", status: "completed", url: "/reports/r1.pdf" },
  { id: "r2", title: "VIP Behavior Deep Dive", createdAt: "2026-02-12", status: "running" },
];

let buyerSettings: BuyerSettings = {
  themeColor: "pink-600",
  notificationsEnabled: true,
  alertThreshold: 75,
};

const themeColor = "pink-600";

/**
 * Dashboard (5)
 */
async function getDashboard() {
  await delay();
  return {
    totalBuyers: 1510,
    repeatRate: 0.62,
    avgOrderValue: 78.4,
  };
}

async function getDashboardStats() {
  await delay();
  return {
    dailyActive: [120, 140, 132, 160, 175, 180, 190],
    weeklyPurchases: [320, 410, 390, 450],
    ltvByCohort: [
      { cohort: "2025-Q4", ltv: 420 },
      { cohort: "2026-Q1", ltv: 380 },
    ],
  };
}

async function getDashboardRecent() {
  await delay();
  return buyers.slice(0, 3);
}

async function getDashboardPerformance() {
  await delay();
  return {
    conversionRate: 0.043,
    trend: [3.9, 4.1, 4.0, 4.2, 4.3],
    retention30: 0.48,
  };
}

async function getDashboardAlerts() {
  await delay();
  return [
    { id: "a1", type: "warning", message: "Cart abandonment rising this week." },
    { id: "a2", type: "info", message: "VIP segment growing +5% MoM." },
  ];
}

/**
 * Main Feature: Buyers (6) - CRUD + duplicate
 */
async function listBuyers() {
  await delay();
  return buyers;
}

async function getBuyer(id: string) {
  await delay();
  const b = buyers.find((x) => x.id === id);
  if (!b) throw new Error("Buyer not found");
  return b;
}

async function createBuyer(input: Omit<Buyer, "id">) {
  await delay();
  const newBuyer: Buyer = { id: uuid(), ...input };
  buyers.unshift(newBuyer);
  return newBuyer;
}

async function updateBuyer(id: string, patch: Partial<Omit<Buyer, "id">>) {
  await delay();
  const idx = buyers.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Buyer not found");
  buyers[idx] = { ...buyers[idx], ...patch };
  return buyers[idx];
}

async function deleteBuyer(id: string) {
  await delay();
  const idx = buyers.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Buyer not found");
  const [removed] = buyers.splice(idx, 1);
  return removed;
}

async function duplicateBuyer(id: string) {
  await delay();
  const b = buyers.find((x) => x.id === id);
  if (!b) throw new Error("Buyer not found");
  const dup: Buyer = { ...b, id: uuid(), name: `${b.name} Copy` };
  buyers.unshift(dup);
  return dup;
}

/**
 * Subfeature 1: Segments (4)
 */
async function listSegments() {
  await delay();
  return segments;
}

async function getSegment(id: string) {
  await delay();
  const s = segments.find((x) => x.id === id);
  if (!s) throw new Error("Segment not found");
  return s;
}

async function createSegment(input: Omit<Segment, "id">) {
  await delay();
  const seg: Segment = { id: uuid(), ...input };
  segments.unshift(seg);
  return seg;
}

async function updateSegment(id: string, patch: Partial<Omit<Segment, "id">>) {
  await delay();
  const idx = segments.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Segment not found");
  segments[idx] = { ...segments[idx], ...patch };
  return segments[idx];
}

/**
 * Subfeature 2: Behavior (4)
 */
async function getBehaviorOverview(): Promise<BehaviorOverview> {
  await delay();
  return {
    viewToPurchaseRate: 0.086,
    avgSessionMinutes: 5.4,
    cartAbandonmentRate: 0.71,
  };
}

async function getBehaviorFunnel() {
  await delay();
  return {
    stages: ["View", "Add to Cart", "Checkout", "Purchase"],
    rates: [1.0, 0.38, 0.22, 0.086],
  };
}

async function getBehaviorCohorts() {
  await delay();
  return [
    { cohort: "Jan-2026", retention: [1.0, 0.62, 0.48, 0.41] },
    { cohort: "Dec-2025", retention: [1.0, 0.58, 0.44, 0.36] },
  ];
}

async function exportBehaviorReport() {
  await delay();
  return { jobId: uuid(), status: "queued" as const };
}

/**
 * Subfeature 3: Reports (4)
 */
async function listReports() {
  await delay();
  return reports;
}

async function getReport(id: string) {
  await delay();
  const r = reports.find((x) => x.id === id);
  if (!r) throw new Error("Report not found");
  return r;
}

async function createReport(input: Pick<Report, "title">) {
  await delay();
  const r: Report = { id: uuid(), title: input.title, createdAt: new Date().toISOString().slice(0, 10), status: "queued" };
  reports.unshift(r);
  return r;
}

async function runReport(id: string) {
  await delay();
  const r = reports.find((x) => x.id === id);
  if (!r) throw new Error("Report not found");
  r.status = "running";
  return r;
}

/**
 * Analysis (3)
 */
async function analyzeCohorts() {
  await delay();
  return { topCohort: "2025-Q4", delta: +0.07 };
}

async function analyzeFunnel() {
  await delay();
  return { bottleneck: "Checkout", dropOffRate: 0.14 };
}

async function analyzeLTV() {
  await delay();
  return { medianLTV: 520, percentile90: 2100 };
}

/**
 * Settings (2)
 */
async function getSettings() {
  await delay();
  return buyerSettings;
}

async function updateSettings(patch: Partial<BuyerSettings>) {
  await delay();
  buyerSettings = { ...buyerSettings, ...patch };
  return buyerSettings;
}

const api = {
  themeColor,

  // Dashboard (5)
  getDashboard,
  getDashboardStats,
  getDashboardRecent,
  getDashboardPerformance,
  getDashboardAlerts,

  // Buyers main (6)
  listBuyers,
  getBuyer,
  createBuyer,
  updateBuyer,
  deleteBuyer,
  duplicateBuyer,

  // Segments (4)
  listSegments,
  getSegment,
  createSegment,
  updateSegment,

  // Behavior (4)
  getBehaviorOverview,
  getBehaviorFunnel,
  getBehaviorCohorts,
  exportBehaviorReport,

  // Reports (4)
  listReports,
  getReport,
  createReport,
  runReport,

  // Analysis (3)
  analyzeCohorts,
  analyzeFunnel,
  analyzeLTV,

  // Settings (2)
  getSettings,
  updateSettings,
};

export default api;


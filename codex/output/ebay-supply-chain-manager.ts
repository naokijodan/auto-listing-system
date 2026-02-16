import { v4 as uuid } from "uuid";

export type Supplier = {
  id: string;
  name: string;
  rating: number;
  leadTimeDays: number;
  active: boolean;
};

export type Order = {
  id: string;
  supplierId: string;
  status: "draft" | "placed" | "in_transit" | "delivered" | "cancelled";
  eta: string;
  items: { sku: string; qty: number }[];
};

export type InventoryItem = {
  sku: string;
  name: string;
  stock: number;
  reorderPoint: number;
};

export type Shipment = {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: "label_created" | "in_transit" | "out_for_delivery" | "delivered" | "exception";
};

export type SCMSettings = {
  themeColor: string;
  autoReorder: boolean;
  safetyStockPct: number;
};

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const themeColor = "orange-600";

let suppliers: Supplier[] = [
  { id: "s1", name: "Acme Parts", rating: 4.7, leadTimeDays: 7, active: true },
  { id: "s2", name: "Global Widgets", rating: 4.2, leadTimeDays: 12, active: true },
  { id: "s3", name: "Rapid Manufacturing", rating: 3.9, leadTimeDays: 5, active: false },
];

let orders: Order[] = [
  { id: "o1", supplierId: "s1", status: "in_transit", eta: "2026-02-21", items: [{ sku: "SKU-001", qty: 100 }] },
  { id: "o2", supplierId: "s2", status: "placed", eta: "2026-02-25", items: [{ sku: "SKU-002", qty: 50 }] },
];

let inventory: InventoryItem[] = [
  { sku: "SKU-001", name: "Gear A", stock: 240, reorderPoint: 150 },
  { sku: "SKU-002", name: "Bolt B", stock: 80, reorderPoint: 120 },
  { sku: "SKU-003", name: "Plate C", stock: 500, reorderPoint: 200 },
];

let shipments: Shipment[] = [
  { id: "sh1", orderId: "o1", carrier: "DHL", trackingNumber: "DHL123456", status: "in_transit" },
];

let scmSettings: SCMSettings = {
  themeColor: "orange-600",
  autoReorder: true,
  safetyStockPct: 15,
};

/**
 * Dashboard (5)
 */
async function getDashboard() {
  await delay();
  return {
    totalSuppliers: suppliers.length,
    openOrders: orders.filter((o) => o.status === "placed" || o.status === "in_transit").length,
    lowStockSkus: inventory.filter((i) => i.stock < i.reorderPoint).map((i) => i.sku),
  };
}

async function getDashboardStats() {
  await delay();
  return {
    orderCountsWeekly: [12, 15, 9, 18],
    avgLeadTime: 9.1,
    onTimeDeliveryRate: 0.93,
  };
}

async function getDashboardRecent() {
  await delay();
  return orders.slice(0, 3);
}

async function getDashboardPerformance() {
  await delay();
  return { fulfillmentRate: 0.97, stockoutIncidents: 2, trend: [96, 95, 97, 98] };
}

async function getDashboardAlerts() {
  await delay();
  return [
    { id: "al1", type: "warning", message: "SKU-002 is below reorder point." },
    { id: "al2", type: "info", message: "Lead time improving week-over-week." },
  ];
}

/**
 * Main Feature: Suppliers (6) - CRUD + duplicate
 */
async function listSuppliers() {
  await delay();
  return suppliers;
}

async function getSupplier(id: string) {
  await delay();
  const s = suppliers.find((x) => x.id === id);
  if (!s) throw new Error("Supplier not found");
  return s;
}

async function createSupplier(input: Omit<Supplier, "id">) {
  await delay();
  const s: Supplier = { id: uuid(), ...input };
  suppliers.unshift(s);
  return s;
}

async function updateSupplier(id: string, patch: Partial<Omit<Supplier, "id">>) {
  await delay();
  const idx = suppliers.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Supplier not found");
  suppliers[idx] = { ...suppliers[idx], ...patch };
  return suppliers[idx];
}

async function deleteSupplier(id: string) {
  await delay();
  const idx = suppliers.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Supplier not found");
  const [removed] = suppliers.splice(idx, 1);
  return removed;
}

async function duplicateSupplier(id: string) {
  await delay();
  const s = suppliers.find((x) => x.id === id);
  if (!s) throw new Error("Supplier not found");
  const dup: Supplier = { ...s, id: uuid(), name: `${s.name} Copy` };
  suppliers.unshift(dup);
  return dup;
}

/**
 * Subfeature 1: Orders (4)
 */
async function listOrders() {
  await delay();
  return orders;
}

async function getOrder(id: string) {
  await delay();
  const o = orders.find((x) => x.id === id);
  if (!o) throw new Error("Order not found");
  return o;
}

async function createOrder(input: Omit<Order, "id">) {
  await delay();
  const o: Order = { id: uuid(), ...input };
  orders.unshift(o);
  return o;
}

async function updateOrder(id: string, patch: Partial<Omit<Order, "id">>) {
  await delay();
  const idx = orders.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Order not found");
  orders[idx] = { ...orders[idx], ...patch };
  return orders[idx];
}

/**
 * Subfeature 2: Inventory (4)
 */
async function listInventory() {
  await delay();
  return inventory;
}

async function getInventoryItem(sku: string) {
  await delay();
  const it = inventory.find((x) => x.sku === sku);
  if (!it) throw new Error("Item not found");
  return it;
}

async function adjustInventory(sku: string, delta: number) {
  await delay();
  const it = inventory.find((x) => x.sku === sku);
  if (!it) throw new Error("Item not found");
  it.stock = Math.max(0, it.stock + delta);
  return it;
}

async function restockInventory(sku: string, qty: number) {
  return adjustInventory(sku, Math.abs(qty));
}

/**
 * Subfeature 3: Logistics (4)
 */
async function listShipments() {
  await delay();
  return shipments;
}

async function getShipment(id: string) {
  await delay();
  const sh = shipments.find((x) => x.id === id);
  if (!sh) throw new Error("Shipment not found");
  return sh;
}

async function trackShipment(trackingNumber: string) {
  await delay();
  const sh = shipments.find((x) => x.trackingNumber === trackingNumber);
  if (!sh) throw new Error("Shipment not found");
  return { ...sh, lastUpdate: new Date().toISOString() };
}

async function updateShipmentStatus(id: string, status: Shipment["status"]) {
  await delay();
  const idx = shipments.findIndex((x) => x.id === id);
  if (idx === -1) throw new Error("Shipment not found");
  shipments[idx].status = status;
  return shipments[idx];
}

/**
 * Analysis (3)
 */
async function analyzeLeadTimes() {
  await delay();
  return { weightedAvgLeadTime: 8.4, bestSupplier: "Rapid Manufacturing" };
}

async function analyzeStockouts() {
  await delay();
  return { riskSkus: ["SKU-002"], riskScore: 0.72 };
}

async function analyzeShippingPerformance() {
  await delay();
  return { onTimeRate: 0.94, avgDelayDays: 0.6 };
}

/**
 * Settings (2)
 */
async function getSettings() {
  await delay();
  return scmSettings;
}

async function updateSettings(patch: Partial<SCMSettings>) {
  await delay();
  scmSettings = { ...scmSettings, ...patch };
  return scmSettings;
}

const api = {
  themeColor,

  // Dashboard (5)
  getDashboard,
  getDashboardStats,
  getDashboardRecent,
  getDashboardPerformance,
  getDashboardAlerts,

  // Suppliers main (6)
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  duplicateSupplier,

  // Orders (4)
  listOrders,
  getOrder,
  createOrder,
  updateOrder,

  // Inventory (4)
  listInventory,
  getInventoryItem,
  adjustInventory,
  restockInventory,

  // Logistics (4)
  listShipments,
  getShipment,
  trackShipment,
  updateShipmentStatus,

  // Analysis (3)
  analyzeLeadTimes,
  analyzeStockouts,
  analyzeShippingPerformance,

  // Settings (2)
  getSettings,
  updateSettings,
};

export default api;


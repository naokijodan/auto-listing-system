import useSWR from 'swr';
import { fetcher, api, ApiResponse, Product, Listing, JobLog, QueueStats, SyncSchedule } from './api';

// Products
export function useProducts(params?: {
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
  brand?: string;
  category?: string;
  sourceType?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const url = api.getProducts(params);
  return useSWR<ApiResponse<Product[]>>(url, fetcher, {
    refreshInterval: 30000, // 30秒ごとに更新
  });
}

export function useProduct(id: string | null) {
  return useSWR<ApiResponse<Product>>(
    id ? api.getProduct(id) : null,
    fetcher
  );
}

// Listings
export function useListings(params?: { status?: string; marketplace?: string; limit?: number; offset?: number }) {
  const url = api.getListings(params);
  return useSWR<ApiResponse<Listing[]>>(url, fetcher, {
    refreshInterval: 30000,
  });
}

export function useListing(id: string | null) {
  return useSWR<ApiResponse<Listing>>(
    id ? api.getListing(id) : null,
    fetcher
  );
}

// Jobs
export function useJobLogs(params?: { productId?: string; queueName?: string; status?: string; limit?: number }) {
  const url = api.getJobLogs(params);
  return useSWR<ApiResponse<JobLog[]>>(url, fetcher, {
    refreshInterval: 5000, // 5秒ごとに更新
  });
}

export function useQueueStats() {
  return useSWR<ApiResponse<QueueStats[]>>(api.getQueueStats(), fetcher, {
    refreshInterval: 5000,
  });
}

// Health
export function useHealth() {
  return useSWR<ApiResponse<{ status: string; timestamp: string }>>(
    api.getHealth(),
    fetcher,
    { refreshInterval: 60000 }
  );
}

// Dashboard stats (aggregated)
export function useDashboardStats() {
  const { data: products } = useProducts({ limit: 1 });
  const { data: listings } = useListings({ limit: 1 });
  const { data: queueStats } = useQueueStats();

  return {
    products: products?.pagination?.total ?? 0,
    listings: listings?.pagination?.total ?? 0,
    queueStats: queueStats?.data ?? [],
    isLoading: !products || !listings || !queueStats,
  };
}

// Analytics Types
export interface KpiData {
  totalProducts: number;
  totalListings: number;
  activeListings: number;
  soldToday: number;
  soldThisWeek: number;
  soldThisMonth: number;
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  grossProfit: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  outOfStockCount: number;
  staleListings30: number;
  staleListings60: number;
  staleRate: number;
  healthScore: number;
  healthScoreBreakdown: {
    staleScore: number;
    stockScore: number;
    profitScore: number;
  };
  productsByStatus: Record<string, number>;
  calculatedAt: string;
}

export interface SalesTrendData {
  date: string;
  listings: number;
  sold: number;
  revenue: number;
}

export interface RankingItem {
  category?: string;
  brand?: string;
  soldCount: number;
  revenue: number;
  profit: number;
}

export interface PnlData {
  period: { start: string; end: string; label: string };
  summary: {
    orderCount: number;
    itemCount: number;
    avgOrderValue: number;
    avgItemValue: number;
    avgProfitPerOrder: number;
  };
  revenue: { gross: number; shipping: number; total: number };
  costs: {
    cogs: number;
    marketplaceFees: number;
    paymentFees: number;
    totalFees: number;
    shipping: number;
    tax: number;
  };
  profit: {
    gross: number;
    grossMargin: number;
    operating: number;
    operatingMargin: number;
    net: number;
    netMargin: number;
  };
  currency: string;
  exchangeRate: number;
}

export interface FinancialDailyData {
  date: string;
  orders: number;
  items: number;
  revenue: number;
  cost: number;
  fees: number;
  profit: number;
}

// Analytics Hooks
export function useKpi() {
  return useSWR<ApiResponse<KpiData>>(api.getKpi(), fetcher, {
    refreshInterval: 60000, // 1分ごと
  });
}

export function useSalesTrends(days = 14) {
  return useSWR<ApiResponse<SalesTrendData[]>>(
    api.getSalesTrends(days),
    fetcher,
    { refreshInterval: 60000 }
  );
}

export function useCategoryRankings(params?: { limit?: number; period?: string }) {
  return useSWR<ApiResponse<RankingItem[]>>(
    api.getCategoryRankings(params),
    fetcher,
    { refreshInterval: 300000 } // 5分ごと
  );
}

export function useBrandRankings(params?: { limit?: number; period?: string }) {
  return useSWR<ApiResponse<RankingItem[]>>(
    api.getBrandRankings(params),
    fetcher,
    { refreshInterval: 300000 }
  );
}

export function usePnl(params?: { period?: string; startDate?: string; endDate?: string }) {
  return useSWR<ApiResponse<PnlData>>(api.getPnl(params), fetcher, {
    refreshInterval: 300000,
  });
}

export function useFinancialDaily(days = 30) {
  return useSWR<ApiResponse<FinancialDailyData[]>>(
    api.getFinancialDaily(days),
    fetcher,
    { refreshInterval: 300000 }
  );
}

// Exchange Rate
export interface ExchangeRateData {
  currentRate: {
    jpyToUsd: number;
    usdToJpy: number;
    fetchedAt: string | null;
    source: string;
  };
  history: Array<{
    id: string;
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    source: string;
    fetchedAt: string;
  }>;
}

export function useExchangeRate() {
  return useSWR<ExchangeRateData>(api.getExchangeRate(), fetcher, {
    refreshInterval: 300000, // 5分ごと
  });
}

// Order Stats
export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  shippedOrders: number;
  totalRevenue: number;
  totalProfit: number;
  avgOrderValue: number;
  recentOrders: number;
}

export function useOrderStats() {
  return useSWR<ApiResponse<OrderStats>>(api.getOrderStats(), fetcher, {
    refreshInterval: 60000,
  });
}

// Notification Channels
export interface NotificationChannel {
  id: string;
  channel: 'SLACK' | 'DISCORD' | 'LINE' | 'EMAIL';
  name: string;
  webhookUrl?: string;
  token?: string;
  enabledTypes: string[];
  minSeverity: string;
  // Phase 45: マーケットプレイスフィルター
  // 空配列 = 全マーケットプレイスの通知を受信
  marketplaceFilter: ('JOOM' | 'EBAY')[];
  isActive: boolean;
  lastUsedAt?: string;
  lastError?: string;
  errorCount: number;
}

export function useNotificationChannels() {
  return useSWR<ApiResponse<NotificationChannel[]>>(
    api.getNotificationChannels(),
    fetcher
  );
}

export function useNotificationChannel(id: string | null) {
  return useSWR<ApiResponse<NotificationChannel>>(
    id ? api.getNotificationChannel(id) : null,
    fetcher
  );
}

// Orders
export interface Order {
  id: string;
  marketplace: 'EBAY' | 'JOOM';
  marketplaceOrderId: string;
  buyerUsername: string;
  buyerEmail?: string;
  buyerName?: string;
  shippingAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  currency: string;
  marketplaceFee: number;
  paymentFee: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  shippedAt?: string;
  orderedAt: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  sales: Array<{
    id: string;
    sku: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    costPrice?: number;
    profitJpy?: number;
    profitRate?: number;
  }>;
}

export function useOrders(params?: {
  status?: string;
  marketplace?: string;
  limit?: number;
  offset?: number;
}) {
  return useSWR<ApiResponse<Order[]>>(api.getOrders(params), fetcher, {
    refreshInterval: 30000,
  });
}

export function useOrder(id: string | null) {
  return useSWR<ApiResponse<Order>>(
    id ? `/api/orders/${id}` : null,
    fetcher
  );
}

// Sync Schedules (Phase 44-C)
export function useSyncSchedules() {
  return useSWR<ApiResponse<SyncSchedule[]>>(api.getSyncSchedules(), fetcher, {
    refreshInterval: 60000, // 1分ごと
  });
}

export function useSyncSchedule(marketplace: string | null) {
  return useSWR<ApiResponse<SyncSchedule>>(
    marketplace ? api.getSyncSchedule(marketplace) : null,
    fetcher
  );
}

// Marketplace Stats (Phase 42)
export interface MarketplaceStats {
  joom: {
    totalListings: number;
    activeListings: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    lastSync: string | null;
    lastSyncType: string | null;
  };
  ebay: {
    totalListings: number;
    activeListings: number;
    ordersThisMonth: number;
    revenueThisMonth: number;
    lastSync: string | null;
    lastSyncType: string | null;
  };
  calculatedAt: string;
}

export function useMarketplaceStats() {
  return useSWR<ApiResponse<MarketplaceStats>>(api.getMarketplaceStats(), fetcher, {
    refreshInterval: 60000, // 1分ごと
  });
}

// Shipments (Phase 53-54)
export interface PendingShipment {
  id: string;
  marketplace: 'EBAY' | 'JOOM';
  marketplaceOrderId: string;
  buyerUsername: string;
  buyerName?: string;
  shippingAddress: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  total: number;
  currency: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  orderedAt: string;
  shipmentDeadline: string | null;
  hoursRemaining: number | null;
  isUrgent: boolean;
  sales: Array<{
    id: string;
    sku: string;
    title: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ShipmentStats {
  pending: number;
  urgent: number;
  shippedToday: number;
  totalShipped: number;
  byMarketplace: Record<string, number>;
}

export interface Carrier {
  id: string;
  name: string;
  nameJa: string;
}

export function usePendingShipments(params?: {
  marketplace?: string;
  limit?: number;
  urgentOnly?: boolean;
}) {
  return useSWR<ApiResponse<PendingShipment[]> & { urgentCount: number }>(
    api.getPendingShipments(params),
    fetcher,
    { refreshInterval: 30000 } // 30秒ごと
  );
}

export function useShipmentStats() {
  return useSWR<ApiResponse<ShipmentStats>>(api.getShipmentStats(), fetcher, {
    refreshInterval: 60000, // 1分ごと
  });
}

export function useCarriers() {
  return useSWR<ApiResponse<Carrier[]>>(api.getCarriers(), fetcher);
}

// Sourcing (Phase 55-56)
export type SourcingStatus = 'PENDING' | 'CONFIRMED' | 'ORDERED' | 'RECEIVED' | 'UNAVAILABLE';

export interface SourcingOrder {
  id: string;
  marketplace: 'EBAY' | 'JOOM';
  marketplaceOrderId: string;
  buyerUsername: string;
  buyerName?: string;
  total: number;
  currency: string;
  status: string;
  orderedAt: string;
  sourcingStatus: SourcingStatus;
  sourcingNotes?: string;
  sourcingUpdatedAt?: string;
  costPrice?: number;
  supplierOrderId?: string;
  expectedDeliveryDate?: string;
  sales: Array<{
    id: string;
    sku: string;
    title: string;
    quantity: number;
    unitPrice: number;
    product?: {
      id: string;
      title: string;
      titleEn?: string;
      sourceUrl?: string;
      price: number;
      images: string[];
      brand?: string;
      category?: string;
    };
  }>;
}

export interface SourcingStats {
  total: number;
  byStatus: Record<SourcingStatus, number>;
  byMarketplace: Record<string, { total: number; byStatus: Record<string, number> }>;
  costSummary: {
    totalCost: number;
    ordersWithCost: number;
    averageCost: number;
  };
  readyToShip: number;
  needsAttention: number;
}

export function usePendingSourcing(params?: {
  status?: string;
  marketplace?: string;
  limit?: number;
}) {
  return useSWR<ApiResponse<SourcingOrder[]> & { statusCounts: Record<string, number> }>(
    api.getPendingSourcing(params),
    fetcher,
    { refreshInterval: 30000 } // 30秒ごと
  );
}

export function useSourcingStats() {
  return useSWR<ApiResponse<SourcingStats>>(api.getSourcingStats(), fetcher, {
    refreshInterval: 60000, // 1分ごと
  });
}

// Pricing AI (Phase 61-62)
export type PricingStrategy = 'COMPETITIVE' | 'PROFIT_MAXIMIZE' | 'MARKET_AVERAGE' | 'PENETRATION' | 'PREMIUM';

export interface PriceRecommendation {
  listingId: string;
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;
  costPrice: number;
  currentMargin: number;
  recommendedMargin: number;
  competitorAvgPrice: number | null;
  competitorMinPrice: number | null;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  strategy: PricingStrategy;
}

export interface PricingStats {
  totalListings: number;
  adjustmentNeeded: number;
  avgMargin: number;
  lowMarginCount: number;
  highMarginCount: number;
  byStrategy: Record<string, number>;
}

export function usePricingStats() {
  return useSWR<ApiResponse<PricingStats>>(api.getPricingStats(), fetcher, {
    refreshInterval: 60000,
  });
}

export function usePriceRecommendations(params?: {
  marketplace?: string;
  strategy?: string;
  limit?: number;
}) {
  return useSWR<ApiResponse<PriceRecommendation[]> & {
    summary: {
      needsAdjustment: number;
      avgCurrentMargin: number;
      avgRecommendedMargin: number;
    };
  }>(api.getPriceRecommendations(params), fetcher, {
    refreshInterval: 60000,
  });
}

export function usePriceAdjustmentsNeeded(threshold?: number) {
  return useSWR<ApiResponse<PriceRecommendation[]>>(
    api.getPriceAdjustmentsNeeded(threshold),
    fetcher,
    { refreshInterval: 60000 }
  );
}

// Customer Support (Phase 63-64)
export interface CustomerSupportStats {
  totalMessages: number;
  pendingMessages: number;
  avgResponseTime: number;
  autoReplySent: number;
  byCategory: Record<string, number>;
  bySentiment: Record<string, number>;
}

export interface AutoReplyRule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerCondition: {
    keywords?: string[];
    orderStatus?: string;
    delayMinutes?: number;
    marketplace?: string;
  };
  templateId: string;
  template?: { id: string; name: string; category: string };
  priority: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  nameEn?: string;
  description?: string;
  category?: string;
  subject?: string;
  body: string;
  variables?: string[];
  isActive: boolean;
}

export interface PendingMessage {
  id: string;
  orderId?: string;
  marketplace: string;
  buyerUsername: string;
  subject: string;
  body: string;
  status: string;
  category?: string;
  sentiment?: string;
  urgency?: string;
  isAutoReply: boolean;
  createdAt: string;
  order?: {
    id: string;
    marketplaceOrderId: string;
    total: number;
  };
}

export interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

export function useCustomerSupportStats() {
  return useSWR<ApiResponse<CustomerSupportStats>>(
    api.getCustomerSupportStats(),
    fetcher,
    { refreshInterval: 60000 }
  );
}

export function usePendingMessages(limit?: number) {
  return useSWR<ApiResponse<PendingMessage[]>>(
    api.getPendingMessages(limit),
    fetcher,
    { refreshInterval: 30000 }
  );
}

export function useAutoReplyRules() {
  return useSWR<ApiResponse<AutoReplyRule[]>>(
    api.getAutoReplyRules(),
    fetcher
  );
}

export function useMessageTemplates(category?: string) {
  return useSWR<ApiResponse<MessageTemplate[]>>(
    api.getMessageTemplates(category),
    fetcher
  );
}

export function useTemplateVariables() {
  return useSWR<ApiResponse<TemplateVariable[]>>(
    api.getTemplateVariables(),
    fetcher
  );
}

// Reports (Phase 65-66)
import {
  reportApi,
  Report,
  ReportTemplate,
  ReportSchedule,
  ReportStats,
  ReportType,
  ReportFormat,
  ReportStatus,
} from './api';

export function useReports(params?: {
  status?: ReportStatus;
  reportType?: ReportType;
  format?: ReportFormat;
  limit?: number;
  offset?: number;
}) {
  return useSWR<ApiResponse<Report[]>>(
    reportApi.getReports(params),
    fetcher,
    { refreshInterval: 10000 } // 10秒ごとに更新（進捗確認のため）
  );
}

export function useReport(id: string | null) {
  return useSWR<ApiResponse<Report>>(
    id ? reportApi.getReport(id) : null,
    fetcher,
    { refreshInterval: 5000 } // 5秒ごとに更新（生成中の進捗確認）
  );
}

export function useReportStats() {
  return useSWR<ApiResponse<ReportStats>>(
    reportApi.getReportStats(),
    fetcher,
    { refreshInterval: 60000 }
  );
}

export function useReportTypes() {
  return useSWR<ApiResponse<{ value: string; label: string; description: string }[]>>(
    reportApi.getReportTypes(),
    fetcher
  );
}

export function useReportFormats() {
  return useSWR<ApiResponse<{ value: string; label: string; extension: string; mimeType: string }[]>>(
    reportApi.getReportFormats(),
    fetcher
  );
}

export function useReportTemplates(params?: { reportType?: ReportType; isActive?: boolean }) {
  return useSWR<ApiResponse<ReportTemplate[]>>(
    reportApi.getReportTemplates(params),
    fetcher
  );
}

export function useReportSchedules(params?: { isActive?: boolean }) {
  return useSWR<ApiResponse<ReportSchedule[]>>(
    reportApi.getReportSchedules(params),
    fetcher,
    { refreshInterval: 30000 }
  );
}

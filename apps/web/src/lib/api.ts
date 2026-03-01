export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Generic fetcher for SWR
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    const error = new Error('API error');
    throw error;
  }
  return res.json();
}

// Types
export interface Source {
  id: string;
  type: string;
  name: string;
}

export interface Product {
  id: string;
  sourceId: string;
  sourceItemId: string;
  sourceUrl: string;
  sourceHash: string;
  title: string;
  titleEn?: string;
  description?: string;
  descriptionEn?: string;
  price: number;
  images: string[];
  processedImages: string[];
  category?: string;
  brand?: string;
  condition?: string;
  weight?: number;
  attributes?: Record<string, unknown>;
  sellerId?: string;
  sellerName?: string;
  status: string;
  scrapedAt: string;
  createdAt: string;
  updatedAt: string;
  source?: Source;
  listings?: Listing[];
}

export interface Listing {
  id: string;
  productId: string;
  marketplace: string;
  externalId?: string;
  listingUrl?: string;
  listingPrice: number;
  shippingCost?: number;
  currency: string;
  status: string;
  marketplaceData?: Record<string, unknown>;
  publishedAt?: string;
  soldAt?: string;
  soldPrice?: number;
  createdAt: string;
  updatedAt: string;
  product?: {
    id: string;
    title: string;
    titleEn?: string;
    price: number;
    images: string[];
    processedImages: string[];
  };
}

export interface JobLog {
  id: string;
  productId?: string;
  listingId?: string;
  jobId: string;
  queueName: string;
  jobType: string;
  status: string;
  attempts: number;
  errorMessage?: string;
  errorStack?: string;
  duration?: number;
  result?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: Pagination;
  message?: string;
}

// API functions
export const api = {
  // Products
  getProducts: (params?: {
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
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.brand) query.set('brand', params.brand);
    if (params?.category) query.set('category', params.category);
    if (params?.sourceType) query.set('sourceType', params.sourceType);
    if (params?.minPrice) query.set('minPrice', params.minPrice.toString());
    if (params?.maxPrice) query.set('maxPrice', params.maxPrice.toString());
    if (params?.sortBy) query.set('sortBy', params.sortBy);
    if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
    const queryStr = query.toString();
    return `/api/products${queryStr ? `?${queryStr}` : ''}`;
  },

  getProduct: (id: string) => `/api/products/${id}`,

  // Listings
  getListings: (params?: { status?: string; marketplace?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.marketplace) query.set('marketplace', params.marketplace);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    const queryStr = query.toString();
    return `/api/listings${queryStr ? `?${queryStr}` : ''}`;
  },

  getListing: (id: string) => `/api/listings/${id}`,

  // Jobs
  getJobLogs: (params?: { productId?: string; queueName?: string; status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.productId) query.set('productId', params.productId);
    if (params?.queueName) query.set('queueName', params.queueName);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return `/api/jobs/logs${queryStr ? `?${queryStr}` : ''}`;
  },

  getQueueStats: () => `/api/jobs/stats`,

  // Health / Dashboard
  getHealth: () => `/api/health`,

  // Analytics
  getKpi: () => `/api/analytics/kpi`,
  getSalesTrends: (days = 14) => `/api/analytics/trends/sales?days=${days}`,
  getCategoryRankings: (params?: { limit?: number; period?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.period) query.set('period', params.period);
    return `/api/analytics/rankings/category?${query.toString()}`;
  },
  getBrandRankings: (params?: { limit?: number; period?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.period) query.set('period', params.period);
    return `/api/analytics/rankings/brand?${query.toString()}`;
  },

  // Financial Reports
  getPnl: (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    return `/api/analytics/financial/pnl?${query.toString()}`;
  },
  getFees: (params?: { period?: string }) => {
    const query = new URLSearchParams();
    if (params?.period) query.set('period', params.period);
    return `/api/analytics/financial/fees?${query.toString()}`;
  },
  getRoi: (params?: { groupBy?: string; period?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.groupBy) query.set('groupBy', params.groupBy);
    if (params?.period) query.set('period', params.period);
    if (params?.limit) query.set('limit', params.limit.toString());
    return `/api/analytics/financial/roi?${query.toString()}`;
  },
  getFinancialDaily: (days = 30) => `/api/analytics/financial/daily?days=${days}`,
  getTaxExport: (params?: { year?: number; quarter?: number; format?: string }) => {
    const query = new URLSearchParams();
    if (params?.year) query.set('year', params.year.toString());
    if (params?.quarter) query.set('quarter', params.quarter.toString());
    if (params?.format) query.set('format', params.format);
    return `/api/analytics/financial/tax-export?${query.toString()}`;
  },
  getPdfExport: (period = 'month') => `/api/analytics/financial/export-pdf?period=${period}`,

  // Notification Channels
  getNotificationChannels: () => `/api/notification-channels`,
  getNotificationChannel: (id: string) => `/api/notification-channels/${id}`,
  getEventTypes: () => `/api/notification-channels/config/event-types`,
  getChannelStats: () => `/api/notification-channels/stats/summary`,

  // Exchange Rate
  getExchangeRate: () => `/api/admin/exchange-rates`,

  // Orders
  getOrders: (params?: { status?: string; marketplace?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.marketplace) query.set('marketplace', params.marketplace);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    return `/api/orders?${query.toString()}`;
  },
  getOrderStats: () => `/api/orders/stats/summary`,

  // Marketplace Stats (Phase 42)
  getMarketplaceStats: () => `/api/analytics/marketplace-stats`,

  // Sync Schedules (Phase 44-C)
  getSyncSchedules: () => `/api/sync-schedules`,
  getSyncSchedule: (marketplace: string) => `/api/sync-schedules/${marketplace}`,

  // Shipments (Phase 53-54)
  getPendingShipments: (params?: { marketplace?: string; limit?: number; urgentOnly?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.marketplace) query.set('marketplace', params.marketplace);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.urgentOnly) query.set('urgentOnly', params.urgentOnly.toString());
    const queryStr = query.toString();
    return `/api/shipments/pending${queryStr ? `?${queryStr}` : ''}`;
  },
  getShipmentStats: () => `/api/shipments/stats`,
  getCarriers: () => `/api/shipments/carriers`,

  // Sourcing (Phase 55-56)
  getPendingSourcing: (params?: { status?: string; marketplace?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.marketplace) query.set('marketplace', params.marketplace);
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return `/api/sourcing/pending${queryStr ? `?${queryStr}` : ''}`;
  },
  getSourcingStats: () => `/api/sourcing/stats`,

  // Pricing AI (Phase 61-62)
  getPricingStats: () => `/api/pricing-ai/stats`,
  getPriceRecommendations: (params?: { marketplace?: string; strategy?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.marketplace) query.set('marketplace', params.marketplace);
    if (params?.strategy) query.set('strategy', params.strategy);
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return `/api/pricing-ai/recommendations${queryStr ? `?${queryStr}` : ''}`;
  },
  getPriceAdjustmentsNeeded: (threshold?: number) => {
    const query = threshold ? `?threshold=${threshold}` : '';
    return `/api/pricing-ai/adjustments-needed${query}`;
  },

  // Customer Support (Phase 63-64)
  getCustomerSupportStats: () => `/api/customer-support/stats`,
  getPendingMessages: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return `/api/customer-support/messages/pending${query}`;
  },
  getAutoReplyRules: () => `/api/customer-support/rules`,
  getMessageTemplates: (category?: string) => {
    const query = category ? `?category=${category}` : '';
    return `/api/customer-support/templates${query}`;
  },
  getTemplateVariables: () => `/api/customer-support/variables`,
};

// POST/PUT/DELETE helpers
export async function postApi<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    throw new Error('API error');
  }
  return res.json();
}

export async function deleteApi<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'DELETE',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    throw new Error('API error');
  }
  return res.json();
}

export async function putApi<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    throw new Error('API error');
  }
  return res.json();
}

export async function patchApi<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    throw new Error('API error');
  }
  return res.json();
}

// Product operations
export const productApi = {
  exportCsv: async (ids?: string[]): Promise<void> => {
    const params = ids ? `?ids=${ids.join(',')}` : '';
    const res = await fetch(`${API_BASE}/api/products/export${params}`);
    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  importCsv: async (csv: string, sourceType = 'OTHER') => {
    return postApi<{
      success: boolean;
      data: { created: number; updated: number; failed: number; errors: string[] };
    }>('/api/products/import', { csv, sourceType });
  },

  bulkDelete: async (ids: string[]) => {
    return deleteApi<{ success: boolean; data: { deletedCount: number } }>(
      '/api/products/bulk',
      { ids }
    );
  },

  bulkUpdate: async (ids: string[], updates: Record<string, unknown>) => {
    return patchApi<{ success: boolean; data: { updatedCount: number } }>(
      '/api/products/bulk',
      { ids, updates }
    );
  },

  bulkPublish: async (ids: string[], marketplace = 'JOOM', credentialId?: string) => {
    return postApi<{ success: boolean; data: { createdCount: number } }>(
      '/api/products/bulk/publish',
      { ids, marketplace, ...(credentialId && { credentialId }) }
    );
  },

  restore: async (ids: string[]) => {
    return postApi<{ success: boolean; data: { restoredCount: number } }>(
      '/api/products/restore',
      { ids }
    );
  },

  // Phase 40-D: Joom Preview
  previewJoom: async (productId: string) => {
    return postApi<{
      success: boolean;
      data: {
        product: {
          id: string;
          title: string;
          titleEn?: string;
          price: number;
          status: string;
        };
        joomPreview: {
          id: string;
          name: string;
          description: string;
          mainImage: string;
          extraImages: string[];
          price: number;
          currency: string;
          quantity: number;
          shipping: { price: number; time: string };
          tags: string[];
          parentSku: string;
          sku: string;
        };
        pricing: {
          originalPriceJpy: number;
          costUsd: number;
          shippingCost: number;
          platformFee: number;
          paymentFee: number;
          profit: number;
          finalPriceUsd: number;
          exchangeRate: number;
        };
        validation: {
          passed: boolean;
          warnings: string[];
        };
        seo: {
          score: number;
          estimatedVisibility: 'high' | 'medium' | 'low';
        };
      };
    }>(`/api/products/${productId}/preview-joom`);
  },

  // Approve product for Joom listing
  approve: async (productId: string) => {
    return patchApi<{ success: boolean }>(`/api/products/bulk`, {
      ids: [productId],
      updates: { status: 'APPROVED' },
    });
  },

  // Bulk approve
  bulkApprove: async (ids: string[]) => {
    return patchApi<{ success: boolean; data: { updatedCount: number } }>(
      '/api/products/bulk',
      { ids, updates: { status: 'APPROVED' } }
    );
  },

  // Bulk reject
  bulkReject: async (ids: string[]) => {
    return patchApi<{ success: boolean; data: { updatedCount: number } }>(
      '/api/products/bulk',
      { ids, updates: { status: 'REJECTED' } }
    );
  },
};

// Sync Schedule Types
export interface SyncScheduleConfig {
  interval: number; // hours
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface SyncSchedule {
  marketplace: 'JOOM' | 'EBAY' | 'ETSY' | 'SHOPIFY';
  inventory: SyncScheduleConfig;
  orders: SyncScheduleConfig;
  prices: SyncScheduleConfig;
  updatedAt: string;
}

// Sync Schedule API
export const syncScheduleApi = {
  getAll: async (): Promise<ApiResponse<SyncSchedule[]>> => {
    return fetcher<ApiResponse<SyncSchedule[]>>(api.getSyncSchedules());
  },

  get: async (marketplace: string): Promise<ApiResponse<SyncSchedule>> => {
    return fetcher<ApiResponse<SyncSchedule>>(api.getSyncSchedule(marketplace));
  },

  update: async (
    marketplace: string,
    data: Partial<Omit<SyncSchedule, 'marketplace' | 'updatedAt'>>
  ): Promise<ApiResponse<SyncSchedule>> => {
    return patchApi<ApiResponse<SyncSchedule>>(
      `/api/sync-schedules/${marketplace}`,
      data
    );
  },
};

// Report Types (Phase 65-66)
export type ReportType =
  | 'SALES_SUMMARY'
  | 'ORDER_DETAIL'
  | 'INVENTORY_STATUS'
  | 'PRODUCT_PERFORMANCE'
  | 'PROFIT_ANALYSIS'
  | 'CUSTOMER_ANALYSIS'
  | 'MARKETPLACE_COMPARISON'
  | 'AUDIT_REPORT'
  | 'CUSTOM';

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'HTML';
export type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Report {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  templateId?: string;
  parameters: Record<string, unknown>;
  timeRange?: string;
  format: ReportFormat;
  orientation: string;
  paperSize: string;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  status: ReportStatus;
  progress: number;
  errorMessage?: string;
  generatedBy?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  layout: Record<string, unknown>;
  sections: unknown[];
  header?: Record<string, unknown>;
  footer?: Record<string, unknown>;
  theme: string;
  customStyles: Record<string, unknown>;
  logoUrl?: string;
  dataSources: unknown[];
  charts: unknown[];
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSchedule {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  timezone: string;
  templateId: string;
  template?: ReportTemplate;
  parameters: Record<string, unknown>;
  format: ReportFormat;
  recipients: string[];
  channels: string[];
  uploadToStorage: boolean;
  isActive: boolean;
  lastRunAt?: string;
  lastRunStatus?: string;
  nextRunAt?: string;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportStats {
  totalReports: number;
  completedReports: number;
  failedReports: number;
  successRate: string;
  totalFileSize: number;
  byType: Record<string, number>;
  byFormat: Record<string, number>;
}

// Report API
export const reportApi = {
  // レポート一覧
  getReports: (params?: {
    status?: ReportStatus;
    reportType?: ReportType;
    format?: ReportFormat;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.reportType) query.set('reportType', params.reportType);
    if (params?.format) query.set('format', params.format);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    const queryStr = query.toString();
    return `/api/reports${queryStr ? `?${queryStr}` : ''}`;
  },

  // レポート詳細
  getReport: (id: string) => `/api/reports/${id}`,

  // レポート統計
  getReportStats: () => `/api/reports/stats/summary`,

  // レポートタイプ一覧
  getReportTypes: () => `/api/reports/types`,

  // レポートフォーマット一覧
  getReportFormats: () => `/api/reports/formats`,

  // レポートテンプレート一覧
  getReportTemplates: (params?: { reportType?: ReportType; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.reportType) query.set('reportType', params.reportType);
    if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
    const queryStr = query.toString();
    return `/api/reports/templates${queryStr ? `?${queryStr}` : ''}`;
  },

  // レポートスケジュール一覧
  getReportSchedules: (params?: { isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.isActive !== undefined) query.set('isActive', params.isActive.toString());
    const queryStr = query.toString();
    return `/api/reports/schedules${queryStr ? `?${queryStr}` : ''}`;
  },

  // レポート作成
  createReport: async (data: {
    name: string;
    description?: string;
    reportType: ReportType;
    templateId?: string;
    parameters?: Record<string, unknown>;
    timeRange?: string;
    format?: ReportFormat;
    orientation?: string;
    paperSize?: string;
  }): Promise<ApiResponse<Report>> => {
    return postApi<ApiResponse<Report>>('/api/reports', data);
  },

  // レポート生成トリガー
  generateReport: async (id: string): Promise<ApiResponse<{ reportId: string; jobId: string }>> => {
    return postApi<ApiResponse<{ reportId: string; jobId: string }>>(`/api/reports/${id}/generate`, {});
  },

  // レポートダウンロードURL取得
  getDownloadInfo: async (id: string): Promise<ApiResponse<{
    fileName: string;
    filePath: string;
    fileSize: number;
    format: ReportFormat;
    mimeType: string;
  }>> => {
    return fetcher<ApiResponse<{
      fileName: string;
      filePath: string;
      fileSize: number;
      format: ReportFormat;
      mimeType: string;
    }>>(`/api/reports/${id}/download`);
  },

  // レポートファイルダウンロード
  downloadFile: (id: string) => `${API_BASE}/api/reports/${id}/file`,

  // レポート削除
  deleteReport: async (id: string): Promise<ApiResponse<null>> => {
    return deleteApi<ApiResponse<null>>(`/api/reports/${id}`, {});
  },

  // テンプレート作成
  createTemplate: async (data: {
    name: string;
    description?: string;
    reportType: ReportType;
    layout?: Record<string, unknown>;
    sections?: unknown[];
    header?: string;
    footer?: string;
    theme?: string;
    customStyles?: Record<string, unknown>;
    logoUrl?: string;
    dataSources?: unknown[];
    charts?: unknown[];
  }): Promise<ApiResponse<ReportTemplate>> => {
    return postApi<ApiResponse<ReportTemplate>>('/api/reports/templates', data);
  },

  // スケジュール作成
  createSchedule: async (data: {
    templateId: string;
    name: string;
    description?: string;
    cronExpression: string;
    timezone?: string;
    format?: ReportFormat;
    parameters?: Record<string, unknown>;
    recipients?: string[];
    channels?: string[];
    uploadToStorage?: boolean;
    retentionDays?: number;
  }): Promise<ApiResponse<ReportSchedule>> => {
    return postApi<ApiResponse<ReportSchedule>>('/api/reports/schedules', data);
  },

  // スケジュール更新
  updateSchedule: async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      cronExpression: string;
      timezone: string;
      format: ReportFormat;
      parameters: Record<string, unknown>;
      recipients: string[];
      channels: string[];
      uploadToStorage: boolean;
      retentionDays: number;
      isActive: boolean;
    }>
  ): Promise<ApiResponse<ReportSchedule>> => {
    return patchApi<ApiResponse<ReportSchedule>>(`/api/reports/schedules/${id}`, data);
  },

  // スケジュール削除
  deleteSchedule: async (id: string): Promise<ApiResponse<null>> => {
    return deleteApi<ApiResponse<null>>(`/api/reports/schedules/${id}`, {});
  },
};

// Sales Forecast Types (Phase 67-68)
export interface ForecastResult {
  date: string;
  predictedRevenue: number;
  predictedOrders: number;
  confidence: number;
  lowerBound: number;
  upperBound: number;
}

export interface CategoryForecast {
  category: string;
  currentRevenue: number;
  predictedRevenue: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}

export interface ProductForecast {
  productId: string;
  title: string;
  currentSales: number;
  predictedSales: number;
  demandTrend: 'increasing' | 'decreasing' | 'stable';
  restockRecommendation: boolean;
  recommendedQuantity: number;
}

export interface InventoryRecommendation {
  productId: string;
  title: string;
  currentStock: number;
  predictedDemand: number;
  daysOfStock: number;
  action: 'restock_urgent' | 'restock_soon' | 'sufficient' | 'overstock';
  recommendedQuantity: number;
  urgency: 'high' | 'medium' | 'low';
}

export interface ForecastSummary {
  period: { start: string; end: string };
  forecastPeriod: { start: string; end: string };
  totalPredictedRevenue: number;
  totalPredictedOrders: number;
  averageConfidence: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
  dailyForecasts: ForecastResult[];
  categoryForecasts: CategoryForecast[];
  topGrowthProducts: ProductForecast[];
  inventoryRecommendations: InventoryRecommendation[];
}

export interface ForecastStats {
  predictedRevenue30d: number;
  predictedOrders30d: number;
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  forecastAccuracy: number;
  mape: number;
  urgentRestockCount: number;
  soonRestockCount: number;
  topGrowthCategory: string;
  topGrowthRate: number;
  topDemandProduct: string;
  topDemandPredicted: number;
}

export interface SeasonalityData {
  dayOfWeek: { day: string; factor: number; impact: string }[];
  monthOfYear: { month: string; factor: number; impact: string }[];
  insights: string[];
}

export interface TrendData {
  weeklyTrend: { week: string; revenue: number; orders: number }[];
  growthRate: number;
  trend: 'up' | 'down' | 'stable';
  peakWeek: string;
  peakRevenue: number;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgDailyRevenue: number;
    avgDailyOrders: number;
  };
}

// Sales Forecast API
export const salesForecastApi = {
  // 予測サマリー
  getSummary: (params?: { historicalDays?: number; forecastDays?: number }) => {
    const query = new URLSearchParams();
    if (params?.historicalDays) query.set('historicalDays', params.historicalDays.toString());
    if (params?.forecastDays) query.set('forecastDays', params.forecastDays.toString());
    const queryStr = query.toString();
    return `/api/sales-forecast/summary${queryStr ? `?${queryStr}` : ''}`;
  },

  // 日別予測
  getDaily: (params?: { historicalDays?: number; forecastDays?: number }) => {
    const query = new URLSearchParams();
    if (params?.historicalDays) query.set('historicalDays', params.historicalDays.toString());
    if (params?.forecastDays) query.set('forecastDays', params.forecastDays.toString());
    const queryStr = query.toString();
    return `/api/sales-forecast/daily${queryStr ? `?${queryStr}` : ''}`;
  },

  // カテゴリ別予測
  getCategories: (params?: { historicalDays?: number; forecastDays?: number }) => {
    const query = new URLSearchParams();
    if (params?.historicalDays) query.set('historicalDays', params.historicalDays.toString());
    if (params?.forecastDays) query.set('forecastDays', params.forecastDays.toString());
    const queryStr = query.toString();
    return `/api/sales-forecast/categories${queryStr ? `?${queryStr}` : ''}`;
  },

  // 商品別需要予測
  getProducts: (params?: { historicalDays?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.historicalDays) query.set('historicalDays', params.historicalDays.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const queryStr = query.toString();
    return `/api/sales-forecast/products${queryStr ? `?${queryStr}` : ''}`;
  },

  // 在庫補充推奨
  getInventoryRecommendations: (forecastDays?: number) => {
    const query = forecastDays ? `?forecastDays=${forecastDays}` : '';
    return `/api/sales-forecast/inventory-recommendations${query}`;
  },

  // 予測精度
  getAccuracy: (testDays?: number) => {
    const query = testDays ? `?testDays=${testDays}` : '';
    return `/api/sales-forecast/accuracy${query}`;
  },

  // 季節性
  getSeasonality: (historicalDays?: number) => {
    const query = historicalDays ? `?historicalDays=${historicalDays}` : '';
    return `/api/sales-forecast/seasonality${query}`;
  },

  // トレンド
  getTrends: (historicalDays?: number) => {
    const query = historicalDays ? `?historicalDays=${historicalDays}` : '';
    return `/api/sales-forecast/trends${query}`;
  },

  // 統計
  getStats: () => '/api/sales-forecast/stats',
};

// ========================================
// Dashboard Widget Types (Phase 70)
// ========================================

export interface DashboardWidget {
  id: string;
  name: string;
  type: string;
  description?: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  config: Record<string, unknown>;
  refreshInterval: number;
  isVisible: boolean;
  order: number;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetType {
  type: string;
  name: string;
  description: string;
  defaultConfig: Record<string, unknown>;
  minWidth: number;
  minHeight: number;
}

export interface WidgetData {
  id: string;
  type: string;
  name: string;
  gridX: number;
  gridY: number;
  gridWidth: number;
  gridHeight: number;
  content: unknown;
  error: string | null;
}

export interface QueryPerformanceStats {
  tables: number;
  indexes: number;
  databaseSize: string;
  cacheHitRatio: {
    heap: number;
    index: number;
    status: string;
  };
  unusedIndexes: number;
  highSeqScanTables: number;
  health: {
    score: number;
    status: string;
    issues: string[];
  };
}

// Dashboard Widget API
export const dashboardWidgetApi = {
  // ウィジェットタイプ一覧
  getTypes: () => '/api/dashboard-widgets/types',

  // ウィジェット一覧
  getWidgets: (userId?: string) => {
    const query = userId ? `?userId=${userId}` : '';
    return `/api/dashboard-widgets${query}`;
  },

  // ウィジェット作成
  createWidget: async (data: {
    name?: string;
    type: string;
    description?: string;
    gridX?: number;
    gridY?: number;
    gridWidth?: number;
    gridHeight?: number;
    config?: Record<string, unknown>;
    refreshInterval?: number;
    userId?: string;
  }) => {
    const res = await fetch(`${API_BASE}/api/dashboard-widgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create widget');
    return res.json();
  },

  // ウィジェット更新
  updateWidget: async (id: string, data: Partial<DashboardWidget>) => {
    const res = await fetch(`${API_BASE}/api/dashboard-widgets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update widget');
    return res.json();
  },

  // ウィジェット削除
  deleteWidget: async (id: string) => {
    const res = await fetch(`${API_BASE}/api/dashboard-widgets/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete widget');
    return res.json();
  },

  // ウィジェット順序更新
  reorderWidgets: async (widgets: { id: string; gridX?: number; gridY?: number; order?: number }[]) => {
    const res = await fetch(`${API_BASE}/api/dashboard-widgets/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets }),
    });
    if (!res.ok) throw new Error('Failed to reorder widgets');
    return res.json();
  },

  // ウィジェットデータ取得
  getWidgetData: (id: string) => `/api/dashboard-widgets/${id}/data`,

  // 全ウィジェットデータ取得
  getAllWidgetData: (userId?: string) => {
    const query = userId ? `?userId=${userId}` : '';
    return `/api/dashboard-widgets/data/all${query}`;
  },

  // デフォルトセットアップ
  setupDefaults: async (userId?: string) => {
    const res = await fetch(`${API_BASE}/api/dashboard-widgets/setup-defaults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to setup defaults');
    return res.json();
  },
};

// Query Performance API
export const queryPerformanceApi = {
  getSummary: () => '/api/query-performance/summary',
  getTableStats: () => '/api/query-performance/table-stats',
  getIndexUsage: () => '/api/query-performance/index-usage',
  getUnusedIndexes: () => '/api/query-performance/unused-indexes',
  getSeqScans: () => '/api/query-performance/seq-scans',
  getTableDetails: (tableName: string) => `/api/query-performance/tables/${tableName}`,
};

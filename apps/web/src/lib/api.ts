const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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

  bulkPublish: async (ids: string[], marketplace = 'JOOM') => {
    return postApi<{ success: boolean; data: { createdCount: number } }>(
      '/api/products/bulk/publish',
      { ids, marketplace }
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
  marketplace: 'JOOM' | 'EBAY';
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export interface DashboardStats {
  products: {
    total: number;
    active: number;
    outOfStock: number;
    error: number;
  };
  listings: {
    total: number;
    published: number;
    draft: number;
    sold: number;
  };
  jobs: {
    completed: number;
    failed: number;
    waiting: number;
    active: number;
  };
  exchangeRate: {
    rate: number;
    updatedAt: string;
    change: number;
  };
}

export interface Product {
  id: string;
  title: string;
  titleEn?: string;
  sourceUrl: string;
  sourcePrice: number;
  status: string;
  sourceSite: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  productId: string;
  marketplace: string;
  status: string;
  listingPrice: number;
  currency: string;
  externalId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export interface JobLog {
  id: string;
  jobType: string;
  status: string;
  attempts: number;
  errorMessage?: string;
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

// API endpoints
export const api = {
  // Dashboard
  dashboard: () => fetcher<{ data: DashboardStats }>('/api/admin/health'),

  // Products
  products: (params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    return fetcher<{ data: Product[]; total: number }>(`/api/products?${query}`);
  },

  // Listings
  listings: (params?: { status?: string; marketplace?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.marketplace) query.set('marketplace', params.marketplace);
    return fetcher<{ data: Listing[]; total: number }>(`/api/listings?${query}`);
  },

  // Jobs
  jobLogs: (limit = 50) => fetcher<{ data: JobLog[] }>(`/api/jobs/logs?limit=${limit}`),
  queueStats: () => fetcher<{ data: QueueStats[] }>('/api/jobs/stats'),

  // Reports
  dailyReport: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return fetcher<{ data: Record<string, unknown> }>(`/api/admin/reports/daily${query}`);
  },
};

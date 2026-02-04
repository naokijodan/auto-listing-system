import useSWR from 'swr';
import { fetcher, api, ApiResponse, Product, Listing, JobLog, QueueStats } from './api';

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

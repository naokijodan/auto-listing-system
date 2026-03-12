'use client';

// Shared TypeScript interfaces for Joom pages/components

export interface ListingStats {
  total: number;
  active: number;
  pending: number;
  sold: number;
  revenue: number;
}

export interface BatchPublishStatus {
  success: boolean;
  queue: {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  recentJobs: {
    statusCounts: Record<string, number>;
    jobs: Array<{
      jobId: string;
      productId: string;
      productTitle: string;
      status: string;
      result?: { listingUrl?: string; marketplaceListingId?: string };
      errorMessage?: string;
      completedAt?: string;
    }>;
  };
}

export interface PriceSyncStatus {
  success: boolean;
  queue: {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  recentChanges: Array<{
    listingId: string;
    productTitle: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    createdAt: string;
  }>;
  stats24h: {
    totalChanges: number;
    averageChangePercent: number;
  };
}

export interface ExchangeRateData {
  success: boolean;
  data: {
    fromCurrency: string;
    toCurrency: string;
    rate: number;
    usdToJpy: number;
    source: string;
    fetchedAt: string | null;
  };
}

export interface OrderSyncStatus {
  success: boolean;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  recentJobs: Array<{
    id: string;
    jobId: string;
    status: string;
    result?: {
      totalFetched?: number;
      totalCreated?: number;
      totalUpdated?: number;
    };
    errorMessage?: string;
    completedAt?: string;
  }>;
  stats24h: {
    newOrders: number;
  };
}

export interface InventorySyncStatus {
  success: boolean;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  recentJobs: Array<{
    id: string;
    jobId: string;
    status: string;
    result?: {
      totalProcessed?: number;
      totalSynced?: number;
      totalSkipped?: number;
      totalErrors?: number;
    };
    errorMessage?: string;
    completedAt?: string;
  }>;
}


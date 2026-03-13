import { z } from 'zod';

// KPI data used on the dashboard
export interface KpiData {
  totalProducts: number;
  totalListings: number;
  activeListings: number;
  soldToday: number;
  soldThisWeek: number;
  soldThisMonth: number;
  revenue: { today: number; thisWeek: number; thisMonth: number };
  grossProfit: { today: number; thisWeek: number; thisMonth: number };
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
}

// Trend data for sales/listings chart
export interface TrendData {
  date: string;
  listings: number;
  sold: number;
  revenue: number;
}

// Zod Schemas
export const KpiDataSchema = z.object({
  totalProducts: z.number(),
  totalListings: z.number(),
  activeListings: z.number(),
  soldToday: z.number(),
  soldThisWeek: z.number(),
  soldThisMonth: z.number(),
  revenue: z.object({
    today: z.number(),
    thisWeek: z.number(),
    thisMonth: z.number(),
  }),
  grossProfit: z.object({
    today: z.number(),
    thisWeek: z.number(),
    thisMonth: z.number(),
  }),
  outOfStockCount: z.number(),
  staleListings30: z.number(),
  staleListings60: z.number(),
  staleRate: z.number(),
  healthScore: z.number(),
  healthScoreBreakdown: z.object({
    staleScore: z.number(),
    stockScore: z.number(),
    profitScore: z.number(),
  }),
  productsByStatus: z.record(z.number()),
});

export const TrendDataSchema = z.object({
  date: z.string(),
  listings: z.number(),
  sold: z.number(),
  revenue: z.number(),
});

// Generic dashboard API response schema (success + data of any shape)
export const DashboardResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown(),
});


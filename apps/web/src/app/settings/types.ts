import { z } from 'zod';

// Marketplace Overview Types
export interface MarketplaceOverview {
  ebay: {
    connected: boolean;
    tokenExpired: boolean | null;
    environment: string;
    listings: Record<string, number>;
  };
  joom: {
    connected: boolean;
    listings: Record<string, number>;
  };
}

export interface ConnectionTestResult {
  success: boolean;
  status: string;
  message: string;
  environment?: string;
  tokenExpired?: boolean;
}

// Sync Schedule Types
export type MarketplaceId = 'JOOM' | 'EBAY' | 'ETSY' | 'SHOPIFY';

export interface SyncScheduleConfig {
  interval: number; // hours
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

export interface SyncSchedule {
  marketplace: MarketplaceId;
  inventory: SyncScheduleConfig;
  orders: SyncScheduleConfig;
  prices: SyncScheduleConfig;
  updatedAt: string;
}

// Zod Schemas
export const connectionTestResultSchema = z.object({
  success: z.boolean(),
  status: z.string(),
  message: z.string(),
  environment: z.string().optional(),
  tokenExpired: z.boolean().optional(),
});

export const marketplaceOverviewSchema = z.object({
  ebay: z.object({
    connected: z.boolean(),
    tokenExpired: z.boolean().nullable(),
    environment: z.string(),
    listings: z.record(z.number()),
  }),
  joom: z.object({
    connected: z.boolean(),
    listings: z.record(z.number()),
  }),
});

export const syncScheduleConfigSchema = z.object({
  interval: z.number(),
  enabled: z.boolean(),
  lastRun: z.string().optional(),
  nextRun: z.string().optional(),
});

export const marketplaceIdSchema = z.union([
  z.literal('JOOM'),
  z.literal('EBAY'),
  z.literal('ETSY'),
  z.literal('SHOPIFY'),
]);

export const syncScheduleSchema = z.object({
  marketplace: marketplaceIdSchema,
  inventory: syncScheduleConfigSchema,
  orders: syncScheduleConfigSchema,
  prices: syncScheduleConfigSchema,
  updatedAt: z.string(),
});

// Generic API Response Schema Factory
export const makeApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    pagination: z
      .object({
        total: z.number(),
        limit: z.number(),
        offset: z.number(),
      })
      .optional(),
    message: z.string().optional(),
  });

// Convenience concrete response schemas
export const marketplaceOverviewResponseSchema = makeApiResponseSchema(marketplaceOverviewSchema);
export const connectionTestResultResponseSchema = makeApiResponseSchema(connectionTestResultSchema);
export const syncSchedulesResponseSchema = makeApiResponseSchema(z.array(syncScheduleSchema));
export const syncScheduleResponseSchema = makeApiResponseSchema(syncScheduleSchema);

// System settings category response (key-value map)
export const systemSettingsCategoryResponseSchema = makeApiResponseSchema(z.record(z.any()));

export type MarketplaceOverviewType = z.infer<typeof marketplaceOverviewSchema>;
export type ConnectionTestResultType = z.infer<typeof connectionTestResultSchema>;
export type SyncScheduleConfigType = z.infer<typeof syncScheduleConfigSchema>;
export type SyncScheduleType = z.infer<typeof syncScheduleSchema>;


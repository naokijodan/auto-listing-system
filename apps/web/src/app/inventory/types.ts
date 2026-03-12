import { z } from 'zod';

// Zod schemas
export const PlatformKeySchema = z.enum([
  'ebay',
  'joom',
  'etsy',
  'shopify',
  'instagram_shop',
  'tiktok_shop',
]);

export const PlatformSummarySchema = z.object({
  name: z.string(),
  listings: z.number(),
  synced: z.number(),
  errors: z.number(),
  connected: z.boolean(),
});

export const InventorySummarySchema = z.object({
  totalProducts: z.number(),
  inStock: z.number(),
  outOfStock: z.number(),
  syncErrors: z.number(),
  platforms: z.record(PlatformKeySchema, PlatformSummarySchema),
});

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  stock: z.number(),
  status: z.record(
    PlatformKeySchema,
    z.enum(['listed', 'paused', 'unlisted', 'error'])
  ),
  lastSyncedAt: z.string().nullable().optional(),
});

export const InventoryEventSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  productName: z.string(),
  type: z.string(),
  diff: z.number(),
  source: z.string(),
});

export const ProductsResponseSchema = z.union([
  z.object({ items: z.array(ProductSchema).optional() }),
  z.array(ProductSchema),
]);

export type PlatformKey = z.infer<typeof PlatformKeySchema>;
export type PlatformSummary = z.infer<typeof PlatformSummarySchema>;
export type InventorySummary = z.infer<typeof InventorySummarySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type InventoryEvent = z.infer<typeof InventoryEventSchema>;
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;


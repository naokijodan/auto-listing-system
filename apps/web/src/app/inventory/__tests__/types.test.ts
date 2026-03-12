import { describe, it, expect } from 'vitest';
import {
  PlatformKeySchema,
  PlatformSummarySchema,
  InventorySummarySchema,
  ProductSchema,
  InventoryEventSchema,
  ProductsResponseSchema,
} from '../types';

describe('PlatformKeySchema', () => {
  it("should accept valid platform key 'ebay'", () => {
    expect(PlatformKeySchema.safeParse('ebay').success).toBe(true);
  });

  it("should accept valid platform key 'tiktok_shop'", () => {
    expect(PlatformKeySchema.safeParse('tiktok_shop').success).toBe(true);
  });

  it("should reject invalid platform key 'amazon'", () => {
    expect(PlatformKeySchema.safeParse('amazon').success).toBe(false);
  });

  it('should reject empty string', () => {
    expect(PlatformKeySchema.safeParse('').success).toBe(false);
  });
});

describe('PlatformSummarySchema', () => {
  const validSummary = {
    name: 'eBay',
    listings: 10,
    synced: 8,
    errors: 2,
    connected: true,
  };

  it('should accept valid platform summary', () => {
    expect(PlatformSummarySchema.safeParse(validSummary).success).toBe(true);
  });

  it('should reject missing fields', () => {
    const { name, ...missing } = validSummary as any;
    expect(PlatformSummarySchema.safeParse({ name }).success).toBe(false);
    expect(PlatformSummarySchema.safeParse(missing).success).toBe(false);
  });

  it('should reject non-number listings', () => {
    const invalid = { ...validSummary, listings: '10' } as any;
    expect(PlatformSummarySchema.safeParse(invalid).success).toBe(false);
  });
});

describe('InventorySummarySchema', () => {
  const fullPlatforms = {
    ebay: { name: 'eBay', listings: 1, synced: 1, errors: 0, connected: true },
    joom: { name: 'Joom', listings: 2, synced: 1, errors: 1, connected: false },
    etsy: { name: 'Etsy', listings: 3, synced: 2, errors: 1, connected: true },
    shopify: { name: 'Shopify', listings: 4, synced: 3, errors: 1, connected: true },
    instagram_shop: { name: 'Instagram Shop', listings: 5, synced: 4, errors: 1, connected: false },
    tiktok_shop: { name: 'TikTok Shop', listings: 6, synced: 5, errors: 1, connected: false },
  } as const;

  it('should accept valid inventory summary (with full platforms record)', () => {
    const valid = {
      totalProducts: 100,
      inStock: 80,
      outOfStock: 20,
      syncErrors: 5,
      platforms: fullPlatforms,
    };
    expect(InventorySummarySchema.safeParse(valid).success).toBe(true);
  });

  it('should reject missing totalProducts', () => {
    const invalid = {
      inStock: 80,
      outOfStock: 20,
      syncErrors: 5,
      platforms: fullPlatforms,
    } as any;
    expect(InventorySummarySchema.safeParse(invalid).success).toBe(false);
  });

  it('should accept with empty platforms record', () => {
    const valid = {
      totalProducts: 0,
      inStock: 0,
      outOfStock: 0,
      syncErrors: 0,
      platforms: {},
    };
    expect(InventorySummarySchema.safeParse(valid).success).toBe(true);
  });
});

describe('ProductSchema', () => {
  const base = {
    id: 'p-1',
    name: 'Sample Product',
    stock: 5,
  };

  it('should accept valid product with status', () => {
    const valid = {
      ...base,
      status: { ebay: 'listed', tiktok_shop: 'paused' },
      lastSyncedAt: '2026-03-12T00:00:00Z',
    } as const;
    expect(ProductSchema.safeParse(valid).success).toBe(true);
  });

  it('should accept product with empty status', () => {
    const valid = { ...base, status: {} };
    expect(ProductSchema.safeParse(valid).success).toBe(true);
  });

  it('should accept product with null lastSyncedAt', () => {
    const valid = { ...base, status: {}, lastSyncedAt: null };
    expect(ProductSchema.safeParse(valid).success).toBe(true);
  });

  it('should accept product without lastSyncedAt (optional)', () => {
    const valid = { ...base, status: {} };
    expect(ProductSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject missing id', () => {
    const { id, ...rest } = base as any;
    const invalid = { ...rest, status: {} } as any;
    expect(ProductSchema.safeParse(invalid).success).toBe(false);
  });

  it("should reject invalid status value (e.g., 'active')", () => {
    const invalid = { ...base, status: { ebay: 'active' } } as any;
    expect(ProductSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('InventoryEventSchema', () => {
  const validEvent = {
    id: 'e-1',
    timestamp: '2026-03-12T00:00:00Z',
    productName: 'Sample Product',
    type: 'stock-change',
    diff: -2,
    source: 'manual',
  };

  it('should accept valid inventory event', () => {
    expect(InventoryEventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('should reject missing fields', () => {
    const { id, ...rest } = validEvent as any;
    expect(InventoryEventSchema.safeParse(rest).success).toBe(false);
  });

  it('should reject non-number diff', () => {
    const invalid = { ...validEvent, diff: '3' } as any;
    expect(InventoryEventSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('ProductsResponseSchema', () => {
  const product = { id: 'p-1', name: 'P', stock: 1, status: {} };

  it('should accept object with items array', () => {
    const obj = { items: [product] };
    expect(ProductsResponseSchema.safeParse(obj).success).toBe(true);
  });

  it('should accept plain array of products', () => {
    const arr = [product];
    expect(ProductsResponseSchema.safeParse(arr).success).toBe(true);
  });

  it('should accept object with empty items', () => {
    const obj = { items: [] };
    expect(ProductsResponseSchema.safeParse(obj).success).toBe(true);
  });

  it('should accept object without items field', () => {
    const obj = {};
    expect(ProductsResponseSchema.safeParse(obj).success).toBe(true);
  });
});


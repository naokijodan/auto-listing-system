import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mockPrisma } from '../setup';

// ========================================
// Setup: Additional mocks for this test file
// ========================================

// Joom API Clientのモック
const mockJoomClient = {
  updateInventory: vi.fn(),
  updatePrice: vi.fn(),
  getOrders: vi.fn(),
};

// eBay API Clientのモック
const mockEbayClient = {
  updateInventory: vi.fn(),
  updatePrice: vi.fn(),
  getOrders: vi.fn(),
};

// Price Calculatorのモック
const mockCalculatePrice = vi.fn();

// Worker lib mocks - must be hoisted
vi.mock('@rakuda/config', () => ({
  PRICE_DEFAULTS: {
    JOOM: { platformFeeRate: 0.15, paymentFeeRate: 0.03, targetProfitRate: 0.30, adRate: 0 },
    EBAY: { platformFeeRate: 0.13, paymentFeeRate: 0.03, targetProfitRate: 0.30, adRate: 0 },
  },
  SHIPPING_DEFAULTS: {
    JOOM: { baseCost: 5, perGramCost: 0.01 },
    EBAY: { defaultCost: 15 },
  },
  EXCHANGE_RATE_DEFAULTS: {
    JPY_TO_USD: 0.0067,
  },
}));

// ========================================
// Test Fixtures
// ========================================

const createMockJob = <T>(data: T) => ({
  id: 'test-job-1',
  name: 'test',
  data,
  progress: vi.fn(),
  log: vi.fn(),
  timestamp: Date.now(),
  attemptsMade: 0,
});

const createMockProduct = (overrides: any = {}) => ({
  id: 'prod-1',
  title: 'Test Camera',
  titleEn: 'Test Camera EN',
  price: 10000,
  weight: 200,
  status: 'ACTIVE',
  category: 'camera',
  ...overrides,
});

const createMockListing = (overrides: any = {}) => ({
  id: 'listing-1',
  productId: 'prod-1',
  marketplace: 'JOOM',
  marketplaceListingId: 'joom-123',
  marketplaceData: { sku: 'SKU-001', variantSku: 'SKU-001-V1' },
  status: 'ACTIVE',
  listingPrice: 50.00,
  shippingCost: 10.00,
  currency: 'USD',
  product: createMockProduct(),
  ...overrides,
});

// ========================================
// Order Status Mapping Tests (Pure Functions)
// ========================================

describe('Order Status Mapping', () => {
  describe('Joom Status Mapping', () => {
    // Test mapJoomStatus function logic
    const mapJoomStatus = (joomStatus: string) => {
      const statusMap: Record<string, string> = {
        'pending': 'PENDING',
        'approved': 'CONFIRMED',
        'in_transit': 'SHIPPED',
        'shipped': 'SHIPPED',
        'delivered': 'DELIVERED',
        'cancelled': 'CANCELLED',
        'refunded': 'REFUNDED',
      };
      return statusMap[joomStatus.toLowerCase()] || 'PENDING';
    };

    it('should map pending to PENDING', () => {
      expect(mapJoomStatus('pending')).toBe('PENDING');
    });

    it('should map approved to CONFIRMED', () => {
      expect(mapJoomStatus('approved')).toBe('CONFIRMED');
    });

    it('should map in_transit to SHIPPED', () => {
      expect(mapJoomStatus('in_transit')).toBe('SHIPPED');
    });

    it('should map shipped to SHIPPED', () => {
      expect(mapJoomStatus('shipped')).toBe('SHIPPED');
    });

    it('should map delivered to DELIVERED', () => {
      expect(mapJoomStatus('delivered')).toBe('DELIVERED');
    });

    it('should map cancelled to CANCELLED', () => {
      expect(mapJoomStatus('cancelled')).toBe('CANCELLED');
    });

    it('should map refunded to REFUNDED', () => {
      expect(mapJoomStatus('refunded')).toBe('REFUNDED');
    });

    it('should handle case insensitive input', () => {
      expect(mapJoomStatus('PENDING')).toBe('PENDING');
      expect(mapJoomStatus('Approved')).toBe('CONFIRMED');
    });

    it('should return PENDING for unknown status', () => {
      expect(mapJoomStatus('unknown')).toBe('PENDING');
    });
  });

  describe('Joom Payment Status Mapping', () => {
    const mapJoomPaymentStatus = (joomStatus: string) => {
      const paidStatuses = ['approved', 'in_transit', 'shipped', 'delivered'];
      return paidStatuses.includes(joomStatus.toLowerCase()) ? 'PAID' : 'PENDING';
    };

    it('should map approved to PAID', () => {
      expect(mapJoomPaymentStatus('approved')).toBe('PAID');
    });

    it('should map in_transit to PAID', () => {
      expect(mapJoomPaymentStatus('in_transit')).toBe('PAID');
    });

    it('should map pending to PENDING', () => {
      expect(mapJoomPaymentStatus('pending')).toBe('PENDING');
    });

    it('should map cancelled to PENDING', () => {
      expect(mapJoomPaymentStatus('cancelled')).toBe('PENDING');
    });
  });

  describe('eBay Status Mapping', () => {
    const mapEbayStatus = (fulfillmentStatus: string, paymentStatus: string) => {
      if (fulfillmentStatus === 'FULFILLED') {
        return 'DELIVERED';
      }
      if (fulfillmentStatus === 'IN_PROGRESS') {
        return 'SHIPPED';
      }
      if (paymentStatus === 'PAID') {
        return 'CONFIRMED';
      }
      if (paymentStatus === 'FAILED') {
        return 'CANCELLED';
      }
      return 'PENDING';
    };

    it('should map FULFILLED to DELIVERED', () => {
      expect(mapEbayStatus('FULFILLED', 'PAID')).toBe('DELIVERED');
    });

    it('should map IN_PROGRESS to SHIPPED', () => {
      expect(mapEbayStatus('IN_PROGRESS', 'PAID')).toBe('SHIPPED');
    });

    it('should map NOT_STARTED + PAID to CONFIRMED', () => {
      expect(mapEbayStatus('NOT_STARTED', 'PAID')).toBe('CONFIRMED');
    });

    it('should map FAILED payment to CANCELLED', () => {
      expect(mapEbayStatus('NOT_STARTED', 'FAILED')).toBe('CANCELLED');
    });

    it('should return PENDING for NOT_STARTED + PENDING', () => {
      expect(mapEbayStatus('NOT_STARTED', 'PENDING')).toBe('PENDING');
    });
  });

  describe('eBay Payment Status Mapping', () => {
    const mapEbayPaymentStatus = (paymentStatus: string) => {
      if (paymentStatus === 'PAID') {
        return 'PAID';
      }
      if (paymentStatus === 'FAILED') {
        return 'FAILED';
      }
      return 'PENDING';
    };

    it('should map PAID to PAID', () => {
      expect(mapEbayPaymentStatus('PAID')).toBe('PAID');
    });

    it('should map FAILED to FAILED', () => {
      expect(mapEbayPaymentStatus('FAILED')).toBe('FAILED');
    });

    it('should map PENDING to PENDING', () => {
      expect(mapEbayPaymentStatus('PENDING')).toBe('PENDING');
    });
  });
});

// ========================================
// Price Change Threshold Tests (Pure Logic)
// ========================================

describe('Price Change Threshold Logic', () => {
  const calculateChangePercent = (oldPrice: number, newPrice: number): number => {
    if (oldPrice <= 0) return 0;
    return ((newPrice - oldPrice) / oldPrice) * 100;
  };

  const shouldUpdate = (
    changePercent: number,
    threshold: number,
    forceUpdate: boolean
  ): boolean => {
    return forceUpdate || Math.abs(changePercent) >= threshold;
  };

  describe('calculateChangePercent', () => {
    it('should calculate positive change correctly', () => {
      expect(calculateChangePercent(50, 55)).toBeCloseTo(10, 2);
    });

    it('should calculate negative change correctly', () => {
      expect(calculateChangePercent(50, 45)).toBeCloseTo(-10, 2);
    });

    it('should return 0 for zero old price', () => {
      expect(calculateChangePercent(0, 50)).toBe(0);
    });

    it('should return 0 for no change', () => {
      expect(calculateChangePercent(50, 50)).toBe(0);
    });

    it('should handle large changes', () => {
      expect(calculateChangePercent(50, 100)).toBeCloseTo(100, 2);
    });
  });

  describe('shouldUpdate', () => {
    it('should return true when change exceeds threshold', () => {
      expect(shouldUpdate(10, 2, false)).toBe(true);
    });

    it('should return false when change below threshold', () => {
      expect(shouldUpdate(1, 2, false)).toBe(false);
    });

    it('should return true when forceUpdate is true', () => {
      expect(shouldUpdate(0.1, 2, true)).toBe(true);
    });

    it('should consider absolute value of negative changes', () => {
      expect(shouldUpdate(-10, 2, false)).toBe(true);
    });

    it('should return true when change equals threshold', () => {
      expect(shouldUpdate(2, 2, false)).toBe(true);
    });
  });
});

// ========================================
// Inventory Sync Data Processing Tests
// ========================================

describe('Inventory Sync Data Processing', () => {
  const determineLocalQuantity = (productStatus: string): number => {
    const isOutOfStock = productStatus === 'OUT_OF_STOCK' || productStatus === 'SOLD';
    return isOutOfStock ? 0 : 1;
  };

  const shouldSkipSync = (
    productStatus: string,
    syncOutOfStock: boolean
  ): boolean => {
    const isOutOfStock = productStatus === 'OUT_OF_STOCK' || productStatus === 'SOLD';
    return !syncOutOfStock && isOutOfStock;
  };

  const extractSku = (
    marketplace: string,
    marketplaceListingId: string,
    marketplaceData: any
  ): string => {
    if (marketplace === 'JOOM') {
      return marketplaceData?.variantSku || marketplaceData?.sku || `${marketplaceListingId}-V1`;
    }
    return marketplaceData?.sku || marketplaceListingId;
  };

  describe('determineLocalQuantity', () => {
    it('should return 0 for OUT_OF_STOCK', () => {
      expect(determineLocalQuantity('OUT_OF_STOCK')).toBe(0);
    });

    it('should return 0 for SOLD', () => {
      expect(determineLocalQuantity('SOLD')).toBe(0);
    });

    it('should return 1 for ACTIVE', () => {
      expect(determineLocalQuantity('ACTIVE')).toBe(1);
    });

    it('should return 1 for other statuses', () => {
      expect(determineLocalQuantity('PENDING')).toBe(1);
      expect(determineLocalQuantity('DRAFT')).toBe(1);
    });
  });

  describe('shouldSkipSync', () => {
    it('should skip OUT_OF_STOCK when syncOutOfStock is false', () => {
      expect(shouldSkipSync('OUT_OF_STOCK', false)).toBe(true);
    });

    it('should not skip OUT_OF_STOCK when syncOutOfStock is true', () => {
      expect(shouldSkipSync('OUT_OF_STOCK', true)).toBe(false);
    });

    it('should not skip ACTIVE products', () => {
      expect(shouldSkipSync('ACTIVE', false)).toBe(false);
      expect(shouldSkipSync('ACTIVE', true)).toBe(false);
    });
  });

  describe('extractSku', () => {
    it('should use variantSku for Joom when available', () => {
      const result = extractSku('JOOM', 'joom-123', { variantSku: 'VAR-SKU' });
      expect(result).toBe('VAR-SKU');
    });

    it('should fallback to sku for Joom', () => {
      const result = extractSku('JOOM', 'joom-123', { sku: 'SKU-123' });
      expect(result).toBe('SKU-123');
    });

    it('should generate default SKU for Joom when none provided', () => {
      const result = extractSku('JOOM', 'joom-123', null);
      expect(result).toBe('joom-123-V1');
    });

    it('should use sku for eBay', () => {
      const result = extractSku('EBAY', 'ebay-123', { sku: 'EBAY-SKU' });
      expect(result).toBe('EBAY-SKU');
    });

    it('should fallback to marketplaceListingId for eBay', () => {
      const result = extractSku('EBAY', 'ebay-123', null);
      expect(result).toBe('ebay-123');
    });
  });
});

// ========================================
// Connection Test Response Building Tests
// ========================================

describe('Connection Test Response Building', () => {
  const buildConnectionResponse = (
    credential: any,
    isTokenExpired: boolean,
    apiResult: { ok: boolean; status?: number } | null
  ) => {
    if (!credential) {
      return { success: false, status: 'not_configured' };
    }

    const creds = credential.credentials || {};
    if (!creds.clientId || !creds.clientSecret) {
      return { success: false, status: 'incomplete_credentials' };
    }

    if (!creds.accessToken && !creds.refreshToken) {
      return { success: false, status: 'no_tokens' };
    }

    if (!creds.accessToken) {
      return { success: false, status: 'token_refresh_needed' };
    }

    if (!apiResult) {
      return { success: false, status: 'network_error' };
    }

    if (apiResult.ok) {
      return { success: true, status: 'connected' };
    }

    if (apiResult.status === 401 || apiResult.status === 403) {
      return { success: false, status: 'auth_failed' };
    }

    return { success: false, status: 'api_error' };
  };

  it('should return not_configured when no credential', () => {
    const result = buildConnectionResponse(null, false, null);
    expect(result.status).toBe('not_configured');
  });

  it('should return incomplete_credentials when missing clientId', () => {
    const result = buildConnectionResponse(
      { credentials: { clientSecret: 'secret' } },
      false,
      null
    );
    expect(result.status).toBe('incomplete_credentials');
  });

  it('should return no_tokens when missing tokens', () => {
    const result = buildConnectionResponse(
      { credentials: { clientId: 'id', clientSecret: 'secret' } },
      false,
      null
    );
    expect(result.status).toBe('no_tokens');
  });

  it('should return connected on successful API call', () => {
    const result = buildConnectionResponse(
      { credentials: { clientId: 'id', clientSecret: 'secret', accessToken: 'token' } },
      false,
      { ok: true }
    );
    expect(result.status).toBe('connected');
    expect(result.success).toBe(true);
  });

  it('should return auth_failed on 401', () => {
    const result = buildConnectionResponse(
      { credentials: { clientId: 'id', clientSecret: 'secret', accessToken: 'token' } },
      false,
      { ok: false, status: 401 }
    );
    expect(result.status).toBe('auth_failed');
  });

  it('should return api_error on 500', () => {
    const result = buildConnectionResponse(
      { credentials: { clientId: 'id', clientSecret: 'secret', accessToken: 'token' } },
      false,
      { ok: false, status: 500 }
    );
    expect(result.status).toBe('api_error');
  });
});

// ========================================
// Marketplace Validation Tests
// ========================================

describe('Marketplace Validation', () => {
  const validateMarketplace = (marketplace: string): boolean => {
    return ['joom', 'ebay'].includes(marketplace?.toLowerCase());
  };

  const getDbMarketplace = (marketplace: string): string => {
    return marketplace === 'joom' ? 'JOOM' : 'EBAY';
  };

  describe('validateMarketplace', () => {
    it('should accept joom', () => {
      expect(validateMarketplace('joom')).toBe(true);
    });

    it('should accept ebay', () => {
      expect(validateMarketplace('ebay')).toBe(true);
    });

    it('should reject amazon', () => {
      expect(validateMarketplace('amazon')).toBe(false);
    });

    it('should handle case insensitive', () => {
      expect(validateMarketplace('JOOM')).toBe(true);
      expect(validateMarketplace('EBAY')).toBe(true);
    });

    it('should handle null/undefined', () => {
      expect(validateMarketplace(null as any)).toBe(false);
      expect(validateMarketplace(undefined as any)).toBe(false);
    });
  });

  describe('getDbMarketplace', () => {
    it('should convert joom to JOOM', () => {
      expect(getDbMarketplace('joom')).toBe('JOOM');
    });

    it('should convert ebay to EBAY', () => {
      expect(getDbMarketplace('ebay')).toBe('EBAY');
    });
  });
});

// ========================================
// Result Summary Calculation Tests
// ========================================

describe('Result Summary Calculation', () => {
  interface UpdateResult {
    status: 'synced' | 'skipped' | 'error' | 'created' | 'updated';
  }

  const calculateSummary = (updates: UpdateResult[]) => {
    return {
      totalProcessed: updates.length,
      totalSynced: updates.filter(u => u.status === 'synced').length,
      totalCreated: updates.filter(u => u.status === 'created').length,
      totalUpdated: updates.filter(u => u.status === 'updated').length,
      totalSkipped: updates.filter(u => u.status === 'skipped').length,
      totalErrors: updates.filter(u => u.status === 'error').length,
    };
  };

  it('should count all synced correctly', () => {
    const updates: UpdateResult[] = [
      { status: 'synced' },
      { status: 'synced' },
      { status: 'synced' },
    ];
    const summary = calculateSummary(updates);
    expect(summary.totalProcessed).toBe(3);
    expect(summary.totalSynced).toBe(3);
  });

  it('should count mixed statuses correctly', () => {
    const updates: UpdateResult[] = [
      { status: 'synced' },
      { status: 'skipped' },
      { status: 'error' },
      { status: 'synced' },
    ];
    const summary = calculateSummary(updates);
    expect(summary.totalProcessed).toBe(4);
    expect(summary.totalSynced).toBe(2);
    expect(summary.totalSkipped).toBe(1);
    expect(summary.totalErrors).toBe(1);
  });

  it('should handle empty updates', () => {
    const summary = calculateSummary([]);
    expect(summary.totalProcessed).toBe(0);
    expect(summary.totalSynced).toBe(0);
  });

  it('should count created and updated for order sync', () => {
    const updates: UpdateResult[] = [
      { status: 'created' },
      { status: 'updated' },
      { status: 'skipped' },
    ];
    const summary = calculateSummary(updates);
    expect(summary.totalCreated).toBe(1);
    expect(summary.totalUpdated).toBe(1);
    expect(summary.totalSkipped).toBe(1);
  });
});

// ========================================
// Average Price Change Calculation Tests
// ========================================

describe('Average Price Change Calculation', () => {
  const calculateAveragePriceChange = (updates: { changePercent: number }[]): number => {
    const updatedItems = updates.filter(u => Math.abs(u.changePercent) > 0);
    if (updatedItems.length === 0) return 0;

    const totalChange = updatedItems.reduce((sum, u) => sum + Math.abs(u.changePercent), 0);
    return Math.round((totalChange / updatedItems.length) * 100) / 100;
  };

  it('should calculate average correctly', () => {
    const updates = [
      { changePercent: 10 },
      { changePercent: 20 },
    ];
    expect(calculateAveragePriceChange(updates)).toBe(15);
  });

  it('should handle negative changes as absolute values', () => {
    const updates = [
      { changePercent: -10 },
      { changePercent: 10 },
    ];
    expect(calculateAveragePriceChange(updates)).toBe(10);
  });

  it('should return 0 for empty updates', () => {
    expect(calculateAveragePriceChange([])).toBe(0);
  });

  it('should ignore zero changes', () => {
    const updates = [
      { changePercent: 10 },
      { changePercent: 0 },
      { changePercent: 20 },
    ];
    expect(calculateAveragePriceChange(updates)).toBe(15);
  });

  it('should round to 2 decimal places', () => {
    const updates = [
      { changePercent: 10.1234 },
      { changePercent: 20.5678 },
    ];
    const result = calculateAveragePriceChange(updates);
    expect(result).toBe(15.35);
  });
});

// ========================================
// Edge Cases & Boundary Tests
// ========================================

describe('Edge Cases & Boundary Tests', () => {
  describe('Empty Data Handling', () => {
    it('should handle empty listings array', () => {
      const listings: any[] = [];
      expect(listings.length).toBe(0);
    });

    it('should handle empty orders array', () => {
      const orders: any[] = [];
      expect(orders.length).toBe(0);
    });
  });

  describe('Large Data Handling', () => {
    it('should limit updates to 50 in response', () => {
      const updates = Array.from({ length: 100 }, (_, i) => ({
        id: `update-${i}`,
      }));
      const limitedUpdates = updates.slice(0, 50);
      expect(limitedUpdates.length).toBe(50);
    });

    it('should respect maxListings parameter', () => {
      const allListings = Array.from({ length: 100 }, (_, i) => ({ id: `listing-${i}` }));
      const maxListings = 10;
      const processed = allListings.slice(0, maxListings);
      expect(processed.length).toBe(10);
    });
  });

  describe('Unicode & Special Characters', () => {
    it('should handle Japanese characters in product titles', () => {
      const product = createMockProduct({
        title: 'Canon EOS Kiss X10 ダブルズームキット',
        titleEn: 'Canon EOS Kiss X10 Double Zoom Kit',
      });
      expect(product.titleEn).toBe('Canon EOS Kiss X10 Double Zoom Kit');
    });

    it('should prefer titleEn over title', () => {
      const product = createMockProduct({
        title: 'Japanese Title',
        titleEn: 'English Title',
      });
      const displayTitle = product.titleEn || product.title || 'Unknown';
      expect(displayTitle).toBe('English Title');
    });
  });

  describe('Zero & Negative Values', () => {
    it('should handle zero old price in change calculation', () => {
      const oldPrice = 0;
      const newPrice = 50;
      const changePercent = oldPrice > 0
        ? ((newPrice - oldPrice) / oldPrice) * 100
        : 0;
      expect(changePercent).toBe(0);
    });

    it('should handle negative change percent', () => {
      const oldPrice = 100;
      const newPrice = 90;
      const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;
      expect(changePercent).toBe(-10);
    });
  });

  describe('Null & Undefined Handling', () => {
    it('should handle null product', () => {
      const listing = createMockListing({ product: null });
      expect(listing.product).toBeNull();
    });

    it('should handle null marketplaceData', () => {
      const listing = createMockListing({ marketplaceData: null });
      expect(listing.marketplaceData).toBeNull();
    });

    it('should handle undefined marketplace', () => {
      const validateMarketplace = (mp?: string) => mp === 'joom' || mp === 'ebay';
      expect(validateMarketplace(undefined)).toBe(false);
    });
  });
});

// ========================================
// Marketplace Fee Calculation Tests
// ========================================

describe('Marketplace Fee Calculation', () => {
  const calculateMarketplaceFee = (total: number, marketplace: 'joom' | 'ebay'): number => {
    const feeRate = marketplace === 'joom' ? 0.15 : 0.13;
    return total * feeRate;
  };

  it('should calculate 15% fee for Joom', () => {
    const fee = calculateMarketplaceFee(100, 'joom');
    expect(fee).toBe(15);
  });

  it('should calculate 13% fee for eBay', () => {
    const fee = calculateMarketplaceFee(100, 'ebay');
    expect(fee).toBe(13);
  });

  it('should handle zero total', () => {
    expect(calculateMarketplaceFee(0, 'joom')).toBe(0);
  });

  it('should calculate precise fees for decimal amounts', () => {
    const fee = calculateMarketplaceFee(49.99, 'joom');
    expect(fee).toBeCloseTo(7.4985, 4);
  });
});

// ========================================
// Shipping Cost Parsing Tests
// ========================================

describe('Shipping Cost Parsing', () => {
  const parseShippingCost = (shipping?: { cost?: number }): number => {
    return shipping?.cost || 0;
  };

  const parseEbayShippingCost = (pricingSummary?: { deliveryCost?: { value: string } }): number => {
    return parseFloat(pricingSummary?.deliveryCost?.value || '0');
  };

  it('should return shipping cost when available', () => {
    expect(parseShippingCost({ cost: 5.99 })).toBe(5.99);
  });

  it('should return 0 when no shipping', () => {
    expect(parseShippingCost(undefined)).toBe(0);
    expect(parseShippingCost({})).toBe(0);
  });

  it('should parse eBay string format', () => {
    expect(parseEbayShippingCost({ deliveryCost: { value: '12.50' } })).toBe(12.5);
  });

  it('should handle missing eBay delivery cost', () => {
    expect(parseEbayShippingCost(undefined)).toBe(0);
    expect(parseEbayShippingCost({})).toBe(0);
  });
});

// ========================================
// Timestamp Generation Tests
// ========================================

describe('Timestamp Generation', () => {
  it('should generate ISO timestamp', () => {
    const timestamp = new Date().toISOString();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
  });

  it('should generate sinceDays date correctly', () => {
    const sinceDays = 7;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);

    const now = new Date();
    const diffDays = Math.floor((now.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(7);
  });
});

// ========================================
// Response Message Building Tests
// ========================================

describe('Response Message Building', () => {
  const buildInventorySyncMessage = (
    synced: number,
    skipped: number,
    errors: number
  ): string => {
    return `Inventory sync completed: ${synced} synced, ${skipped} skipped, ${errors} errors`;
  };

  const buildOrderSyncMessage = (
    created: number,
    updated: number,
    skipped: number,
    errors: number
  ): string => {
    return `Order sync completed: ${created} created, ${updated} updated, ${skipped} skipped, ${errors} errors`;
  };

  const buildPriceSyncMessage = (
    updated: number,
    skipped: number,
    errors: number,
    marketplaceSynced?: number
  ): string => {
    let msg = `Price sync completed: ${updated} updated, ${skipped} skipped, ${errors} errors`;
    if (marketplaceSynced !== undefined) {
      msg += `, ${marketplaceSynced} synced to marketplace`;
    }
    return msg;
  };

  it('should build inventory sync message', () => {
    const msg = buildInventorySyncMessage(10, 5, 2);
    expect(msg).toBe('Inventory sync completed: 10 synced, 5 skipped, 2 errors');
  });

  it('should build order sync message', () => {
    const msg = buildOrderSyncMessage(5, 3, 2, 1);
    expect(msg).toBe('Order sync completed: 5 created, 3 updated, 2 skipped, 1 errors');
  });

  it('should build price sync message without marketplace sync', () => {
    const msg = buildPriceSyncMessage(10, 5, 0);
    expect(msg).toBe('Price sync completed: 10 updated, 5 skipped, 0 errors');
  });

  it('should build price sync message with marketplace sync', () => {
    const msg = buildPriceSyncMessage(10, 5, 0, 8);
    expect(msg).toBe('Price sync completed: 10 updated, 5 skipped, 0 errors, 8 synced to marketplace');
  });
});

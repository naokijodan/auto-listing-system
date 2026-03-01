import { describe, it, expect, beforeEach, vi } from 'vitest';
import { server, mockPrisma } from '../setup';
import { shopifyPublishService } from '../../lib/shopify-publish-service';
import { shopifyApi, calculateShopifyPrice } from '../../lib/shopify-api';
import { http, HttpResponse } from 'msw';

// Mock image pipeline to avoid heavy processing
vi.mock('../../lib/joom-publish-service', () => ({
  imagePipelineService: {
    processImages: vi.fn().mockResolvedValue({ buffered: [], optimized: [
      'https://images.example.com/optimized-1.jpg',
      'https://images.example.com/optimized-2.jpg',
    ] }),
  },
}));

describe('Shopify Publish Full Flow', () => {
  const product = {
    id: 'testproductid123',
    title: 'Seiko SARX035',
    titleEn: 'Seiko Presage SARX035',
    description: 'Beautiful Seiko Presage',
    descriptionEn: 'Beautiful Seiko Presage',
    price: 45000,
    condition: 'Used',
    images: ['https://images.example.com/original.jpg'],
    processedImages: [],
    weight: 800, // grams
  } as any;

  const enrichmentTaskApproved = {
    id: 'task-1',
    productId: product.id,
    status: 'APPROVED',
    translations: {
      en: {
        title: 'Seiko Presage SARX035',
        description: 'Optimized description for Seiko Presage',
      },
    },
    attributes: { brand: 'Seiko', category: 'Watches', year: 2016, condition: 'Used' },
    pricing: { costJpy: 45000 },
    optimizedImages: [
      'https://images.example.com/optimized-1.jpg',
      'https://images.example.com/optimized-2.jpg',
    ],
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Shopify credentials
    mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
      id: 'cred-shopify-1',
      marketplace: 'SHOPIFY',
      isActive: true,
      credentials: { accessToken: 'shpat_123', shop: 'rakuda-store.myshopify.com' },
    });

    // Product and task
    mockPrisma.product.findUnique.mockResolvedValue(product);
    mockPrisma.enrichmentTask.findUnique.mockImplementation(async (args: any) => {
      if (args?.where?.id === 'task-1') return { ...enrichmentTaskApproved, product };
      if (args?.where?.productId === product.id) return enrichmentTaskApproved;
      return null;
    });

    // Listing & ShopifyProduct database actions
    mockPrisma.listing.upsert.mockResolvedValue({ id: 'listing-1' });
    mockPrisma.shopifyProduct.create.mockResolvedValue({ id: 'sp-1', productId: product.id });
    mockPrisma.shopifyProduct.findUnique.mockResolvedValue({ id: 'sp-1', productId: product.id });
  });

  it('should create Shopify product from enriched RAKUDA product', async () => {
    const spId = await shopifyPublishService.createShopifyListing('task-1');
    await shopifyPublishService.processImagesForListing(spId);

    const createSpy = vi.spyOn(shopifyApi, 'createProduct');
    const result = await shopifyPublishService.publishToShopify(spId);

    expect(result.success).toBe(true);
    expect(createSpy).toHaveBeenCalledTimes(1);
    const payload = createSpy.mock.calls[0][0];

    // Payload assertions
    expect(payload.title).toContain('Seiko');
    expect(payload.variants[0].sku).toBe(`RAKUDA-SHOP-${product.id}`);
    expect(payload.status).toBe('active');

    // DB updates
    expect(mockPrisma.shopifyProduct.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sp-1' },
      data: expect.objectContaining({ status: 'ACTIVE' }),
    }));
    expect(mockPrisma.listing.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { productId_marketplace: { productId: product.id, marketplace: 'SHOPIFY' } },
      data: expect.objectContaining({ status: 'ACTIVE' }),
    }));
    expect(mockPrisma.marketplaceSyncState.upsert).toHaveBeenCalled();
  });

  it('should handle Shopify API rate limiting gracefully', async () => {
    // First call 429, then success
    let called = 0;
    server.use(
      http.post('https://rakuda-store.myshopify.com/admin/api/2026-01/products.json', async () => {
        called += 1;
        if (called === 1) {
          return new HttpResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '1' } });
        }
        return HttpResponse.json({ product: { id: 999, title: 'OK', variants: [{ id: 1 }], status: 'active' } });
      }),
    );

    const spId = await shopifyPublishService.createShopifyListing('task-1');
    const res = await shopifyPublishService.publishToShopify(spId);
    expect(res.success).toBe(true);
    expect(called).toBeGreaterThanOrEqual(2);
  });

  it('should handle Shopify API error and set listing ERROR status', async () => {
    server.use(
      http.post('https://rakuda-store.myshopify.com/admin/api/2026-01/products.json', async () => {
        return new HttpResponse('Server error', { status: 500 });
      }),
    );

    const spId = await shopifyPublishService.createShopifyListing('task-1');
    const res = await shopifyPublishService.publishToShopify(spId);

    expect(res.success).toBe(false);
    expect(mockPrisma.listing.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { productId_marketplace: { productId: product.id, marketplace: 'SHOPIFY' } },
      data: expect.objectContaining({ status: 'ERROR' }),
    }));
  });

  it('should calculate correct USD price from JPY cost', async () => {
    const price = calculateShopifyPrice(45000);
    expect(price).toBeCloseTo(429.52, 2);

    const spId = await shopifyPublishService.createShopifyListing('task-1');
    const createSpy = vi.spyOn(shopifyApi, 'createProduct');
    await shopifyPublishService.publishToShopify(spId);
    const payload = createSpy.mock.calls[0][0];
    expect(payload.variants[0].price).toBe('429.52');
  });
});

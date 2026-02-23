import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';

// Mock all API clients
vi.mock('../../lib/ebay-api', () => ({
  ebayApi: {
    updateInventory: vi.fn().mockResolvedValue({ success: true }),
    getProduct: vi.fn(),
  },
}));
vi.mock('../../lib/joom-api', () => ({
  joomApi: {
    updateInventory: vi.fn().mockResolvedValue({ success: true }),
  },
}));
vi.mock('../../lib/etsy-api', () => ({
  etsyApi: {
    updateListingInventory: vi.fn().mockResolvedValue({ success: true }),
    getShopReceipts: vi.fn().mockResolvedValue({ results: [] }),
  },
}));
vi.mock('../../lib/shopify-api', () => ({
  shopifyApi: {
    setInventoryLevel: vi.fn().mockResolvedValue({ success: true }),
    getProduct: vi.fn().mockResolvedValue({ product: { variants: [] } }),
  },
}));

import { InventoryManager } from '../../lib/inventory-manager';
import { MarketplaceRouter } from '../../lib/marketplace-router';
import { ebayApi } from '../../lib/ebay-api';
import { joomApi } from '../../lib/joom-api';
import { etsyApi } from '../../lib/etsy-api';
import { shopifyApi } from '../../lib/shopify-api';

describe('Multi-Channel Inventory Sync (Task 8: INT-5〜INT-6)', () => {
  let inventoryManager: InventoryManager;
  let router: MarketplaceRouter;

  const mockProduct = {
    id: 'product-test-1',
    title: 'ヴィンテージ セイコー 腕時計 1970年代',
    titleEn: 'Vintage Seiko Watch 1970s',
    status: 'ACTIVE',
    price: 50000,
    brand: 'SEIKO',
    category: 'ヴィンテージ時計',
    attributes: { year: 1975 },
    inventoryMode: 'STOCKED',
  };

  const makeListings = () => [
    {
      id: 'lst-ebay-1',
      productId: 'product-test-1',
      marketplace: 'EBAY',
      status: 'ACTIVE',
      marketplaceListingId: 'ebay-12345',
      marketplaceData: { sku: 'RAKUDA-EBAY-product-test-1' },
      pausedByInventory: false,
    },
    {
      id: 'lst-joom-1',
      productId: 'product-test-1',
      marketplace: 'JOOM',
      status: 'ACTIVE',
      marketplaceListingId: 'joom-67890',
      marketplaceData: { sku: 'RAKUDA-product-test-1', joomProductId: 'joom-67890' },
      pausedByInventory: false,
    },
    {
      id: 'lst-etsy-1',
      productId: 'product-test-1',
      marketplace: 'ETSY',
      status: 'ACTIVE',
      marketplaceListingId: '111222333',
      marketplaceData: { sku: 'RAKUDA-ETSY-product-test-1', listingId: 111222333 },
      pausedByInventory: false,
    },
    {
      id: 'lst-shopify-1',
      productId: 'product-test-1',
      marketplace: 'SHOPIFY',
      status: 'ACTIVE',
      marketplaceListingId: 'shopify-prod-1',
      marketplaceData: {
        sku: 'RAKUDA-SHOPIFY-product-test-1',
        variantId: 'variant-1',
        inventoryItemId: 'inv-item-1',
        locationId: 'loc-1',
      },
      pausedByInventory: false,
    },
    {
      id: 'lst-instagram-1',
      productId: 'product-test-1',
      marketplace: 'INSTAGRAM_SHOP',
      status: 'ACTIVE',
      marketplaceListingId: 'shopify-prod-1',
      marketplaceData: {
        sku: 'RAKUDA-SHOPIFY-product-test-1',
        variantId: 'variant-1',
        inventoryItemId: 'inv-item-1',
        locationId: 'loc-1',
      },
      pausedByInventory: false,
    },
    {
      id: 'lst-tiktok-1',
      productId: 'product-test-1',
      marketplace: 'TIKTOK_SHOP',
      status: 'ACTIVE',
      marketplaceListingId: 'shopify-prod-1',
      marketplaceData: {
        sku: 'RAKUDA-SHOPIFY-product-test-1',
        variantId: 'variant-1',
        inventoryItemId: 'inv-item-1',
        locationId: 'loc-1',
      },
      pausedByInventory: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    inventoryManager = new InventoryManager();
    router = new MarketplaceRouter();

    // Default Prisma mocks
    mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
    mockPrisma.product.update.mockResolvedValue({ ...mockProduct });
    mockPrisma.listing.findMany.mockResolvedValue(makeListings());
    mockPrisma.listing.updateMany.mockResolvedValue({ count: 6 });
    mockPrisma.inventoryEvent.create.mockResolvedValue({ id: 'evt-1' });
    mockPrisma.inventoryEvent.update.mockResolvedValue({ id: 'evt-1' });
    mockPrisma.marketplaceSyncState.upsert.mockResolvedValue({ id: 'sync-1' });

    (ebayApi.updateInventory as any).mockResolvedValue({ success: true });
    (joomApi.updateInventory as any).mockResolvedValue({ success: true });
    (etsyApi.updateListingInventory as any).mockResolvedValue({ success: true });
    (shopifyApi.setInventoryLevel as any).mockResolvedValue({ success: true });
  });

  describe('Marketplace Router - 自動振り分け', () => {
    it('ヴィンテージ+ブランド品を全6チャネルに振り分ける', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        enrichmentTask: { translations: {} },
      });

      const result = await router.routeProduct('product-test-1');

      expect(result.targets).toContain('EBAY');
      expect(result.targets).toContain('JOOM');
      expect(result.targets).toContain('ETSY');
      expect(result.targets).toContain('SHOPIFY');
      expect(result.targets).toContain('INSTAGRAM_SHOP');
      expect(result.targets).toContain('TIKTOK_SHOP');
      expect(result.targets.length).toBe(6);
    });

    it('高価格帯商品（¥900K超）はEBAYのみ + Shopify Hub', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        price: 1000000,
        brand: 'ROLEX',
        enrichmentTask: null,
      });

      const result = await router.routeProduct('product-test-1');

      expect(result.targets).toContain('EBAY');
      expect(result.targets).not.toContain('JOOM');
      expect(result.targets).toContain('SHOPIFY');
      expect(result.targets).toContain('INSTAGRAM_SHOP');
      expect(result.targets).toContain('TIKTOK_SHOP');
    });

    it('低価格・ノーブランド品はJOOM+EBAYのみ', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'product-test-2',
        title: 'スマホケース',
        status: 'ACTIVE',
        price: 1000,
        brand: null,
        category: 'アクセサリー',
        attributes: {},
        enrichmentTask: null,
      });

      const result = await router.routeProduct('product-test-2');

      expect(result.targets).toContain('JOOM');
      expect(result.targets).toContain('EBAY');
      expect(result.targets).not.toContain('ETSY');
      expect(result.targets).not.toContain('SHOPIFY');
      expect(result.targets).not.toContain('INSTAGRAM_SHOP');
      expect(result.targets).not.toContain('TIKTOK_SHOP');
    });

    it('ヴィンテージキーワードでEtsy対象になる', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'product-test-3',
        title: 'vintage leather bag',
        status: 'ACTIVE',
        price: 5000,
        brand: null,
        category: 'バッグ',
        attributes: {},
        enrichmentTask: null,
      });

      const result = await router.routeProduct('product-test-3');

      expect(result.targets).toContain('ETSY');
    });
  });

  describe('在庫減算 → 全チャネル同期', () => {
    it('売上発生時に全6チャネルの在庫が更新される', async () => {
      await inventoryManager.recordInventoryChange({
        productId: 'product-test-1',
        eventType: 'SALE',
        quantity: -1,
        marketplace: 'EBAY',
        orderId: 'order-1',
        reason: 'eBay sale',
      });

      // eBay inventory update called
      expect(ebayApi.updateInventory).toHaveBeenCalledWith(
        'RAKUDA-EBAY-product-test-1',
        0,
      );

      // Joom inventory update called
      expect(joomApi.updateInventory).toHaveBeenCalledWith(
        'joom-67890',
        'RAKUDA-product-test-1',
        0,
      );

      // Etsy inventory update called
      expect(etsyApi.updateListingInventory).toHaveBeenCalledWith(
        111222333,
        expect.arrayContaining([
          expect.objectContaining({
            sku: 'RAKUDA-ETSY-product-test-1',
            offerings: [{ quantity: 0, is_enabled: false }],
          }),
        ]),
      );

      // Shopify inventory update called (shared for Instagram/TikTok)
      expect(shopifyApi.setInventoryLevel).toHaveBeenCalledWith(
        'inv-item-1',
        'loc-1',
        0,
      );

      // Sync state updated for all channels
      expect(mockPrisma.marketplaceSyncState.upsert).toHaveBeenCalled();
    });

    it('在庫0になったら全チャネルで出品停止', async () => {
      await inventoryManager.recordInventoryChange({
        productId: 'product-test-1',
        eventType: 'SALE',
        quantity: -1,
        marketplace: 'SHOPIFY',
        reason: 'Shopify sale',
      });

      // All listings should be paused
      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'product-test-1' },
          data: expect.objectContaining({
            pausedByInventory: true,
            status: 'PAUSED',
          }),
        }),
      );
    });
  });

  describe('在庫追加 → 全チャネル出品再開', () => {
    it('在庫0 → 入荷で全チャネル再開', async () => {
      const outOfStockProduct = {
        ...mockProduct,
        status: 'OUT_OF_STOCK',
      };
      mockPrisma.product.findUnique.mockResolvedValue(outOfStockProduct);

      await inventoryManager.recordInventoryChange({
        productId: 'product-test-1',
        eventType: 'RESTOCK',
        quantity: 1,
        reason: 'Restocked from warehouse',
      });

      // All marketplace APIs should be called to update stock to 1
      expect(ebayApi.updateInventory).toHaveBeenCalled();
      expect(joomApi.updateInventory).toHaveBeenCalled();
      expect(etsyApi.updateListingInventory).toHaveBeenCalled();
      expect(shopifyApi.setInventoryLevel).toHaveBeenCalled();

      // Listings should be set back to ACTIVE
      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pausedByInventory: false,
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  describe('Shopify Hub channels - 在庫重複防止', () => {
    it('Instagram/TikTok/Shopifyが同じinventoryItemIdの場合、API呼び出しは1回', async () => {
      await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      // Shopify setInventoryLevel should be called only once for the shared inventory item
      const shopifyCalls = (shopifyApi.setInventoryLevel as any).mock.calls;
      expect(shopifyCalls.length).toBe(1);
      expect(shopifyCalls[0]).toEqual(['inv-item-1', 'loc-1', 1]);
    });

    it('異なるinventoryItemIdの場合はそれぞれ呼び出される', async () => {
      const differentInventoryListings = [
        ...makeListings().filter((l) => l.marketplace !== 'TIKTOK_SHOP'),
        {
          id: 'lst-tiktok-different',
          productId: 'product-test-1',
          marketplace: 'TIKTOK_SHOP',
          status: 'ACTIVE',
          marketplaceListingId: 'shopify-prod-2',
          marketplaceData: {
            inventoryItemId: 'inv-item-2',
            locationId: 'loc-2',
          },
          pausedByInventory: false,
        },
      ];
      mockPrisma.listing.findMany.mockResolvedValue(differentInventoryListings);

      await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      const shopifyCalls = (shopifyApi.setInventoryLevel as any).mock.calls;
      expect(shopifyCalls.length).toBe(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('1つのチャネルがエラーでも他は正常に同期', async () => {
      (ebayApi.updateInventory as any).mockRejectedValue(new Error('eBay API down'));

      const errors = await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('EBAY');

      // Other channels should still succeed
      expect(joomApi.updateInventory).toHaveBeenCalled();
      expect(etsyApi.updateListingInventory).toHaveBeenCalled();
      expect(shopifyApi.setInventoryLevel).toHaveBeenCalled();
    });

    it('Shopify Hubエラーで3チャネル分のsyncState更新', async () => {
      (shopifyApi.setInventoryLevel as any).mockRejectedValue(new Error('Shopify rate limit'));

      const errors = await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('SHOPIFY Hub');

      // syncState upsert should be called for SHOPIFY, INSTAGRAM_SHOP, TIKTOK_SHOP with error
      const upsertCalls = mockPrisma.marketplaceSyncState.upsert.mock.calls;
      const errorChannels = upsertCalls
        .filter((c: any) => c[0]?.create?.syncStatus === 'ERROR' || c[0]?.update?.syncStatus === 'ERROR')
        .map((c: any) => c[0]?.where?.marketplace_productId?.marketplace);
      expect(errorChannels).toContain('SHOPIFY');
      expect(errorChannels).toContain('INSTAGRAM_SHOP');
      expect(errorChannels).toContain('TIKTOK_SHOP');
    });
  });

  describe('Reconciliation (在庫整合性チェック)', () => {
    it('全チャネルの在庫状態を取得・比較', async () => {
      const result = await inventoryManager.reconcileInventory('product-test-1');

      expect(result.product.id).toBe('product-test-1');
      expect(result.product.localStock).toBe(1);
      expect(result.marketplaces.length).toBe(6);

      const marketplaceNames = result.marketplaces.map((m) => m.marketplace);
      expect(marketplaceNames).toContain('EBAY');
      expect(marketplaceNames).toContain('JOOM');
      expect(marketplaceNames).toContain('ETSY');
      expect(marketplaceNames).toContain('SHOPIFY');
      expect(marketplaceNames).toContain('INSTAGRAM_SHOP');
      expect(marketplaceNames).toContain('TIKTOK_SHOP');
    });
  });

  describe('Inventory Summary', () => {
    it('全マーケットプレイスの在庫サマリを取得', async () => {
      mockPrisma.product.count.mockResolvedValue(10);
      mockPrisma.product.groupBy.mockResolvedValue([
        { status: 'ACTIVE', _count: 7 },
        { status: 'OUT_OF_STOCK', _count: 2 },
        { status: 'SOLD', _count: 1 },
      ]);
      mockPrisma.listing.groupBy.mockResolvedValue([
        { marketplace: 'EBAY', _count: 8 },
        { marketplace: 'JOOM', _count: 6 },
        { marketplace: 'ETSY', _count: 3 },
        { marketplace: 'SHOPIFY', _count: 5 },
        { marketplace: 'INSTAGRAM_SHOP', _count: 5 },
        { marketplace: 'TIKTOK_SHOP', _count: 5 },
      ]);
      mockPrisma.marketplaceSyncState.groupBy.mockResolvedValue([
        { marketplace: 'EBAY', syncStatus: 'SYNCED', _count: 7 },
        { marketplace: 'EBAY', syncStatus: 'ERROR', _count: 1 },
        { marketplace: 'JOOM', syncStatus: 'SYNCED', _count: 6 },
        { marketplace: 'ETSY', syncStatus: 'SYNCED', _count: 3 },
        { marketplace: 'SHOPIFY', syncStatus: 'SYNCED', _count: 5 },
        { marketplace: 'INSTAGRAM_SHOP', syncStatus: 'SYNCED', _count: 5 },
        { marketplace: 'TIKTOK_SHOP', syncStatus: 'SYNCED', _count: 5 },
      ]);
      mockPrisma.inventoryEvent.count.mockResolvedValue(2);

      const summary = await inventoryManager.getInventorySummary();

      expect(summary.totalProducts).toBe(10);
      expect(summary.inStock).toBe(7);
      expect(summary.outOfStock).toBe(3);
      expect(summary.byMarketplace['EBAY'].listed).toBe(8);
      expect(summary.byMarketplace['SHOPIFY'].listed).toBe(5);
      expect(summary.byMarketplace['INSTAGRAM_SHOP'].listed).toBe(5);
      expect(summary.byMarketplace['TIKTOK_SHOP'].listed).toBe(5);
    });
  });
});

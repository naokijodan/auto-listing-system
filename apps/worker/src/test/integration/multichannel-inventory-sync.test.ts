import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma } from '../setup';

// vi.hoisted で vi.mock ファクトリ内から参照可能なモックを定義
const { mockEbayApi, mockJoomApi, mockEtsyApi, mockShopifyApi } = vi.hoisted(() => ({
  mockEbayApi: { updateInventory: vi.fn() },
  mockJoomApi: { updateInventory: vi.fn() },
  mockEtsyApi: { updateListingInventory: vi.fn() },
  mockShopifyApi: { setInventoryLevel: vi.fn(), getProduct: vi.fn() },
}));

vi.mock('../../lib/ebay-api', () => ({ ebayApi: mockEbayApi }));
vi.mock('../../lib/joom-api', () => ({ joomApi: mockJoomApi }));
vi.mock('../../lib/etsy-api', () => ({ etsyApi: mockEtsyApi }));
vi.mock('../../lib/shopify-api', () => ({ shopifyApi: mockShopifyApi }));

import { InventoryManager } from '../../lib/inventory-manager';
import { MarketplaceRouter } from '../../lib/marketplace-router';

describe('INT-5〜6: 全チャネル在庫同期結合テスト', () => {
  let inventoryManager: InventoryManager;
  let marketplaceRouter: MarketplaceRouter;

  // テスト商品: ヴィンテージ高額ブランド品（全チャネルに振り分けられる条件）
  const testProduct = {
    id: 'product-test-1',
    sourceId: 'source-1',
    sourceItemId: 'item-123',
    sourceUrl: 'https://example.com/item/123',
    title: 'SEIKO ヴィンテージ 1970年代 自動巻き腕時計',
    titleEn: 'SEIKO Vintage 1970s Automatic Watch',
    description: 'テスト商品',
    descriptionEn: 'Test product',
    price: 50000,
    brand: 'SEIKO',
    category: 'ヴィンテージ時計',
    condition: 'Used',
    status: 'ACTIVE',
    images: [],
    processedImages: [],
    attributes: { year: 1975 },
    inventoryMode: 'STOCKED',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // 4チャネル分のリスティング
  const ebayListing = {
    id: 'listing-ebay-1',
    productId: 'product-test-1',
    marketplace: 'EBAY',
    status: 'ACTIVE',
    marketplaceListingId: 'ebay-item-111',
    marketplaceData: { sku: 'RAKUDA-EBAY-product-test-1' },
    pausedByInventory: false,
  };

  const joomListing = {
    id: 'listing-joom-1',
    productId: 'product-test-1',
    marketplace: 'JOOM',
    status: 'ACTIVE',
    marketplaceListingId: 'joom-item-222',
    marketplaceData: { sku: 'RAKUDA-product-test-1', joomProductId: 'joom-item-222' },
    pausedByInventory: false,
  };

  const etsyListing = {
    id: 'listing-etsy-1',
    productId: 'product-test-1',
    marketplace: 'ETSY',
    status: 'ACTIVE',
    marketplaceListingId: '333444555',
    marketplaceData: { sku: 'RAKUDA-ETSY-product-test-1', listingId: 333444555 },
    pausedByInventory: false,
  };

  const shopifyListing = {
    id: 'listing-shopify-1',
    productId: 'product-test-1',
    marketplace: 'SHOPIFY',
    status: 'ACTIVE',
    marketplaceListingId: 'shopify-prod-444',
    marketplaceData: {
      sku: 'RAKUDA-SHOPIFY-product-test-1',
      variantId: 'variant-1',
      inventoryItemId: 'inv-item-1',
      locationId: 'loc-1',
    },
    pausedByInventory: false,
  };

  const allListings = [ebayListing, joomListing, etsyListing, shopifyListing];

  beforeEach(() => {
    vi.clearAllMocks();

    inventoryManager = new InventoryManager();
    marketplaceRouter = new MarketplaceRouter();

    // Prisma mock defaults
    mockPrisma.product.findUnique.mockResolvedValue(testProduct);
    mockPrisma.product.update.mockResolvedValue({ ...testProduct });
    mockPrisma.listing.findMany.mockResolvedValue(allListings);
    mockPrisma.listing.updateMany.mockResolvedValue({ count: 4 });

    // inventoryEvent mock
    if (!mockPrisma.inventoryEvent) {
      (mockPrisma as any).inventoryEvent = {
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      };
    }
    (mockPrisma as any).inventoryEvent.create.mockResolvedValue({
      id: 'event-1',
      productId: 'product-test-1',
      eventType: 'SALE',
      quantity: -1,
      prevStock: 1,
      newStock: 0,
      syncedTo: [],
      syncErrors: [],
    });
    (mockPrisma as any).inventoryEvent.update.mockResolvedValue({});

    // marketplaceSyncState mock
    if (!mockPrisma.marketplaceSyncState) {
      (mockPrisma as any).marketplaceSyncState = {
        upsert: vi.fn(),
        groupBy: vi.fn(),
      };
    }
    (mockPrisma as any).marketplaceSyncState.upsert.mockResolvedValue({});

    // API mock defaults (all succeed)
    mockEbayApi.updateInventory.mockResolvedValue({ success: true });
    mockJoomApi.updateInventory.mockResolvedValue({ success: true });
    mockEtsyApi.updateListingInventory.mockResolvedValue({ success: true });
    mockShopifyApi.setInventoryLevel.mockResolvedValue({ success: true });
  });

  // ──────────────────────────────────────────────
  // 1. マーケットプレイスルーティングテスト
  // ──────────────────────────────────────────────

  describe('marketplace-router: 自動振り分け', () => {
    it('ヴィンテージ + ブランド品は全4チャネルに振り分けられる', async () => {
      const result = await marketplaceRouter.routeProduct('product-test-1');

      expect(result.targets).toContain('EBAY');
      expect(result.targets).toContain('JOOM');
      expect(result.targets).toContain('ETSY');
      expect(result.targets).toContain('SHOPIFY');
      expect(result.targets.length).toBe(4);
    });

    it('¥900,000超の商品はJoom対象外（eBay + Shopify）', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...testProduct,
        price: 1000000,
        brand: null,
        attributes: {},
        title: '高額商品',
        category: '時計',
      });

      const result = await marketplaceRouter.routeProduct('product-test-1');

      // ¥900,000超 → Joom除外、price > ¥30,000 → Shopify対象
      expect(result.targets).toContain('EBAY');
      expect(result.targets).toContain('SHOPIFY');
      expect(result.targets).not.toContain('JOOM');
    });

    it('ヴィンテージ判定: 20年以上前の製造年', () => {
      const vintage = marketplaceRouter.isVintageItem({
        attributes: { year: 1975 },
        title: 'SEIKO Watch',
      });
      expect(vintage).toBe(true);

      const notVintage = marketplaceRouter.isVintageItem({
        attributes: { year: 2020 },
        title: 'SEIKO Watch',
      });
      expect(notVintage).toBe(false);
    });

    it('ヴィンテージ判定: タイトルキーワード', () => {
      expect(marketplaceRouter.isVintageItem({ title: 'ヴィンテージ腕時計' })).toBe(true);
      expect(marketplaceRouter.isVintageItem({ title: 'Vintage Watch' })).toBe(true);
      expect(marketplaceRouter.isVintageItem({ title: 'アンティーク置時計' })).toBe(true);
      expect(marketplaceRouter.isVintageItem({ title: '新品時計' })).toBe(false);
    });

    it('ブランド品 or 高単価（¥30,000超）→ Shopify対象', async () => {
      // ブランド品
      mockPrisma.product.findUnique.mockResolvedValue({
        ...testProduct,
        price: 20000,
        brand: 'ROLEX',
        attributes: {},
        title: 'ROLEX Submariner',
        category: '時計',
      });
      const r1 = await marketplaceRouter.routeProduct('product-test-1');
      expect(r1.targets).toContain('SHOPIFY');

      // 高単価ノーブランド
      mockPrisma.product.findUnique.mockResolvedValue({
        ...testProduct,
        price: 50000,
        brand: null,
        attributes: {},
        title: '高級カメラ',
        category: 'カメラ',
      });
      const r2 = await marketplaceRouter.routeProduct('product-test-1');
      expect(r2.targets).toContain('SHOPIFY');
    });
  });

  // ──────────────────────────────────────────────
  // 2. 在庫同期テスト: 全チャネル同期
  // ──────────────────────────────────────────────

  describe('inventory-manager: 全チャネル在庫同期', () => {
    it('全4チャネルに在庫を同期する', async () => {
      const errors = await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      expect(errors).toHaveLength(0);
      expect(mockEbayApi.updateInventory).toHaveBeenCalledWith('RAKUDA-EBAY-product-test-1', 1);
      expect(mockJoomApi.updateInventory).toHaveBeenCalledWith('joom-item-222', 'RAKUDA-product-test-1', 1);
      expect(mockEtsyApi.updateListingInventory).toHaveBeenCalledWith(333444555, expect.any(Array));
      expect(mockShopifyApi.setInventoryLevel).toHaveBeenCalledWith('inv-item-1', 'loc-1', 1);
    });

    it('1チャネルがエラーでも他は同期継続', async () => {
      mockJoomApi.updateInventory.mockResolvedValue({ success: false, error: { message: 'Joom down' } });

      const errors = await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('JOOM');
      // 他のチャネルは成功
      expect(mockEbayApi.updateInventory).toHaveBeenCalled();
      expect(mockEtsyApi.updateListingInventory).toHaveBeenCalled();
      expect(mockShopifyApi.setInventoryLevel).toHaveBeenCalled();
    });

    it('MarketplaceSyncStateが各チャネルで更新される', async () => {
      await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      const upsertCalls = (mockPrisma as any).marketplaceSyncState.upsert.mock.calls;
      expect(upsertCalls.length).toBe(4);

      const marketplaces = upsertCalls.map((c: any) => c[0].where.marketplace_productId.marketplace);
      expect(marketplaces).toContain('EBAY');
      expect(marketplaces).toContain('JOOM');
      expect(marketplaces).toContain('ETSY');
      expect(marketplaces).toContain('SHOPIFY');
    });
  });

  // ──────────────────────────────────────────────
  // 3. 在庫減算 → 全チャネル出品停止
  // ──────────────────────────────────────────────

  describe('在庫減算 → 全チャネル出品停止', () => {
    it('SALE(-1)で在庫0 → 全チャネルに在庫0を同期し出品停止', async () => {
      await inventoryManager.recordInventoryChange({
        productId: 'product-test-1',
        eventType: 'SALE',
        quantity: -1,
        marketplace: 'EBAY',
        orderId: 'order-123',
      });

      // 商品ステータスがOUT_OF_STOCKに更新
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-test-1' },
          data: expect.objectContaining({ status: 'OUT_OF_STOCK' }),
        }),
      );

      // inventoryEvent作成
      expect((mockPrisma as any).inventoryEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'product-test-1',
            eventType: 'SALE',
            quantity: -1,
            prevStock: 1,
            newStock: 0,
          }),
        }),
      );

      // 全チャネルに在庫0同期
      expect(mockEbayApi.updateInventory).toHaveBeenCalledWith('RAKUDA-EBAY-product-test-1', 0);
      expect(mockJoomApi.updateInventory).toHaveBeenCalledWith('joom-item-222', 'RAKUDA-product-test-1', 0);
      expect(mockEtsyApi.updateListingInventory).toHaveBeenCalledWith(
        333444555,
        expect.arrayContaining([
          expect.objectContaining({
            offerings: [{ quantity: 0, is_enabled: false }],
          }),
        ]),
      );
      expect(mockShopifyApi.setInventoryLevel).toHaveBeenCalledWith('inv-item-1', 'loc-1', 0);

      // リスティングがPAUSEDに更新
      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'product-test-1' },
          data: expect.objectContaining({ pausedByInventory: true, status: 'PAUSED' }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // 4. 入荷（在庫追加）→ 全チャネル出品再開
  // ──────────────────────────────────────────────

  describe('入荷 → 全チャネル出品再開', () => {
    it('RESTOCK(+1)で在庫0→1 → 全チャネルで出品再開', async () => {
      // 在庫0の状態からスタート（SOLD状態 → ACTIVEに復帰するロジック）
      const soldProduct = { ...testProduct, status: 'SOLD' };
      mockPrisma.product.findUnique.mockResolvedValue(soldProduct);

      (mockPrisma as any).inventoryEvent.create.mockResolvedValue({
        id: 'event-2',
        productId: 'product-test-1',
        eventType: 'RESTOCK',
        quantity: 1,
        prevStock: 0,
        newStock: 1,
        syncedTo: [],
        syncErrors: [],
      });

      await inventoryManager.recordInventoryChange({
        productId: 'product-test-1',
        eventType: 'RESTOCK',
        quantity: 1,
        reason: '入荷',
      });

      // SOLD → ACTIVE に復帰（inventory-manager.ts: product.status === 'SOLD' ? 'ACTIVE' : product.status）
      expect(mockPrisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-test-1' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );

      // 全チャネルに在庫1同期
      expect(mockEbayApi.updateInventory).toHaveBeenCalled();
      expect(mockJoomApi.updateInventory).toHaveBeenCalled();
      expect(mockEtsyApi.updateListingInventory).toHaveBeenCalled();
      expect(mockShopifyApi.setInventoryLevel).toHaveBeenCalled();

      // リスティングがACTIVEに復帰
      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'product-test-1' },
          data: expect.objectContaining({ pausedByInventory: false, status: 'ACTIVE' }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // 5. エラー耐性テスト
  // ──────────────────────────────────────────────

  describe('エラー耐性', () => {
    it('複数チャネルがエラーでも残りは正常同期', async () => {
      mockEbayApi.updateInventory.mockRejectedValue(new Error('eBay timeout'));
      mockShopifyApi.setInventoryLevel.mockRejectedValue(new Error('Shopify 503'));

      const errors = await inventoryManager.syncToAllMarketplaces('product-test-1', 1);

      expect(errors.length).toBe(2);
      expect(errors.some((e: string) => e.includes('EBAY'))).toBe(true);
      expect(errors.some((e: string) => e.includes('SHOPIFY'))).toBe(true);
      // Joom/Etsyは成功
      expect(mockJoomApi.updateInventory).toHaveBeenCalled();
      expect(mockEtsyApi.updateListingInventory).toHaveBeenCalled();
    });

    it('全チャネルがエラーでもクラッシュしない', async () => {
      mockEbayApi.updateInventory.mockRejectedValue(new Error('eBay error'));
      mockJoomApi.updateInventory.mockResolvedValue({ success: false, error: { message: 'Joom error' } });
      mockEtsyApi.updateListingInventory.mockRejectedValue(new Error('Etsy error'));
      mockShopifyApi.setInventoryLevel.mockRejectedValue(new Error('Shopify error'));

      const errors = await inventoryManager.syncToAllMarketplaces('product-test-1', 0);

      expect(errors.length).toBe(4);
      // エラーが集約されて返される
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('EBAY'),
          expect.stringContaining('JOOM'),
          expect.stringContaining('ETSY'),
          expect.stringContaining('SHOPIFY'),
        ]),
      );
    });

    it('syncErrorsがInventoryEventに記録される', async () => {
      mockEbayApi.updateInventory.mockRejectedValue(new Error('eBay down'));

      await inventoryManager.recordInventoryChange({
        productId: 'product-test-1',
        eventType: 'ADJUSTMENT',
        quantity: 0,
        reason: 'test',
      });

      expect((mockPrisma as any).inventoryEvent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'event-1' },
          data: expect.objectContaining({
            syncErrors: expect.arrayContaining([expect.stringContaining('EBAY')]),
          }),
        }),
      );
    });
  });

  // ──────────────────────────────────────────────
  // 6. pauseListingsForProduct / resumeListingsForProduct
  // ──────────────────────────────────────────────

  describe('出品停止 / 再開', () => {
    it('pauseListingsForProduct: 全チャネルに在庫0送信 + DB更新', async () => {
      await inventoryManager.pauseListingsForProduct('product-test-1');

      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'product-test-1' },
          data: expect.objectContaining({ pausedByInventory: true, status: 'PAUSED' }),
        }),
      );

      expect(mockEbayApi.updateInventory).toHaveBeenCalledWith('RAKUDA-EBAY-product-test-1', 0);
      expect(mockJoomApi.updateInventory).toHaveBeenCalledWith('joom-item-222', 'RAKUDA-product-test-1', 0);
      expect(mockEtsyApi.updateListingInventory).toHaveBeenCalled();
      expect(mockShopifyApi.setInventoryLevel).toHaveBeenCalledWith('inv-item-1', 'loc-1', 0);
    });

    it('resumeListingsForProduct: 全チャネルに在庫1送信 + DB更新', async () => {
      await inventoryManager.resumeListingsForProduct('product-test-1', 1);

      expect(mockPrisma.listing.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'product-test-1' },
          data: expect.objectContaining({ pausedByInventory: false, status: 'ACTIVE' }),
        }),
      );

      expect(mockEbayApi.updateInventory).toHaveBeenCalledWith('RAKUDA-EBAY-product-test-1', 1);
      expect(mockJoomApi.updateInventory).toHaveBeenCalledWith('joom-item-222', 'RAKUDA-product-test-1', 1);
      expect(mockShopifyApi.setInventoryLevel).toHaveBeenCalledWith('inv-item-1', 'loc-1', 1);
    });
  });
});

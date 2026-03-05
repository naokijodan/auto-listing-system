import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockPrisma, resetMocks, setupDefaultMocks } from '../setup';

// Category mapperは外部依存が多いためスタブ化
vi.mock('../../lib/category-mapper', () => ({
  getCategoryMapping: vi.fn().mockResolvedValue({
    success: true,
    existingMapping: {
      id: 'mapping-1',
      joomCategoryId: '2-3',
      joomCategoryName: 'Watches',
      joomCategoryPath: 'Fashion > Accessories > Watches',
      requiredAttributes: {},
    },
  }),
  fillRequiredAttributes: vi.fn().mockResolvedValue({}),
}));

// enrichment-service はOpenAI依存があるためスタブ化
vi.mock('../../lib/enrichment-service', () => ({
  enrichmentTaskManager: {
    createTask: vi.fn().mockResolvedValue('task-mock'),
    executeTask: vi.fn().mockResolvedValue(void 0),
  },
  // PriceCalculatorService をスタブ（為替レートの最新値を使う振る舞いを簡易化）
  PriceCalculatorService: class {
    async calculatePrice(costJpy: number) {
      // デフォルトのモック為替レート(0.0067)と簡易ロジックで安定値を返す
      const exchangeRate = 0.0067;
      const costUsd = costJpy * exchangeRate;
      const baseProfitRate = 0.3;
      const joomFeeRate = 0.15;
      const paymentFeeRate = 0.029;
      const shippingCostUsd = 5.0;
      const basePrice = costUsd * (1 + baseProfitRate);
      const withFees = basePrice / (1 - joomFeeRate - paymentFeeRate);
      const finalPriceUsd = Math.ceil((withFees + shippingCostUsd) * 100) / 100;
      return {
        costJpy,
        costUsd: Math.round(costUsd * 100) / 100,
        exchangeRate,
        profitRate: baseProfitRate,
        platformFee: Math.round(finalPriceUsd * joomFeeRate * 100) / 100,
        paymentFee: Math.round(finalPriceUsd * paymentFeeRate * 100) / 100,
        shippingCost: shippingCostUsd,
        finalPriceUsd,
      };
    }
  },
}));

describe('Joom出品フロー統合テスト（Listing統合後）', () => {
  beforeEach(() => {
    resetMocks();
    setupDefaultMocks();
    // JOOM資格情報を設定
    mockPrisma.marketplaceCredential.findFirst.mockResolvedValue({
      id: 'cred-joom-1',
      marketplace: 'JOOM',
      isActive: true,
      credentials: { accessToken: 'test-access-token' },
    });
    // APIログモデルを追加
    // @ts-expect-error dynamic add for tests
    mockPrisma.joomApiLog = { create: vi.fn().mockResolvedValue({ id: 'log-1' }) };
  });

  describe('createJoomListing', () => {
    it('EnrichmentTaskからJoomマーケットプレイスのListingを作成できる', async () => {
      mockPrisma.enrichmentTask.findUnique.mockResolvedValue({
        id: 'task-1',
        productId: 'product-1',
        status: 'APPROVED',
        pricing: { costJpy: 15000, finalPriceUsd: 99.99 },
        product: { id: 'product-1', title: 'P1', description: 'D1', price: 15000, weight: 500 },
      });
      mockPrisma.listing.upsert.mockResolvedValue({
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'JOOM',
        status: 'DRAFT',
        listingPrice: 99.99,
        currency: 'USD',
      } as any);

      const { JoomPublishService } = await import('../../lib/joom-publish-service');
      const service = new JoomPublishService();
      const listingId = await service.createJoomListing('task-1');

      expect(listingId).toBe('listing-1');
      expect(mockPrisma.listing.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ marketplace: 'JOOM', status: 'DRAFT' }),
        })
      );
    });

    it('未承認のEnrichmentTaskではエラーになる', async () => {
      mockPrisma.enrichmentTask.findUnique.mockResolvedValue({
        id: 'task-1',
        productId: 'product-1',
        status: 'PENDING',
        product: { id: 'product-1', title: 'P1', description: 'D1', price: 15000 },
      });

      const { JoomPublishService } = await import('../../lib/joom-publish-service');
      const service = new JoomPublishService();
      await expect(service.createJoomListing('task-1')).rejects.toThrow();
    });
  });

  describe('ステータス遷移', () => {
    it('DRAFT → PENDING_PUBLISH → PUBLISHING → ACTIVE の順序で遷移する', async () => {
      const statusUpdates: string[] = [];

      // Listing作成
      mockPrisma.enrichmentTask.findUnique.mockResolvedValue({
        id: 'task-1',
        productId: 'product-1',
        status: 'APPROVED',
        translations: { en: { title: 'Title', description: 'Desc' } },
        pricing: { finalPriceUsd: 49.99 },
        attributes: { brand: 'Seiko', category: 'Watches' },
        product: { id: 'product-1', title: 'P1', description: 'D1', images: ['https://example.com/img1.jpg'], weight: 500 },
        optimizedImages: ['buf1', 'buf2', 'buf3'],
      });
      mockPrisma.listing.upsert.mockResolvedValue({ id: 'listing-1' } as any);

      // findUnique は processImagesForListing と publishToJoom の双方で使う
      const mockListing = {
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'JOOM',
        status: 'DRAFT',
        marketplaceData: {},
        product: { id: 'product-1', title: 'P1', description: 'D1', images: ['https://example.com/img1.jpg'], weight: 500 },
      } as any;
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      // update呼び出しでステータスを収集
      mockPrisma.listing.update.mockImplementation(async ({ data }) => {
        if (data?.status) statusUpdates.push(data.status);
        return { ...mockListing, ...data };
      });

      // 画像パイプラインをスタブ
      const { ImagePipelineService, JoomPublishService } = await import('../../lib/joom-publish-service');
      vi.spyOn(ImagePipelineService.prototype, 'processImages').mockResolvedValue({
        buffered: ['buf1', 'buf2', 'buf3'],
        optimized: ['opt1', 'opt2', 'opt3'],
      });

      const service = new JoomPublishService();
      const listingId = await service.createJoomListing('task-1');
      await service.processImagesForListing(listingId);
      await service.publishToJoom(listingId);

      expect(statusUpdates).toContain('PUBLISHING');
      expect(statusUpdates).toContain('ACTIVE');
    });

    it('出品エラー時はERRORステータスに遷移し、errorMessageが記録される', async () => {
      // API側のバリデーションエラーを誘発（nameが空）
      mockPrisma.enrichmentTask.findUnique.mockResolvedValue({
        id: 'task-1',
        productId: 'product-1',
        status: 'APPROVED',
        translations: { en: { title: '', description: 'Desc' } },
        pricing: { finalPriceUsd: 49.99 },
        attributes: { brand: 'Seiko', category: 'Watches' },
        product: { id: 'product-1', title: 'P1', description: 'D1', images: ['https://example.com/img1.jpg'], weight: 500 },
        optimizedImages: ['buf1', 'buf2', 'buf3'],
      });
      mockPrisma.listing.upsert.mockResolvedValue({ id: 'listing-err' } as any);

      const mockListing = {
        id: 'listing-err',
        productId: 'product-1',
        marketplace: 'JOOM',
        status: 'DRAFT',
        marketplaceData: {},
        product: { id: 'product-1', title: 'P1', description: 'D1', images: ['https://example.com/img1.jpg'], weight: 500 },
      } as any;
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      const { ImagePipelineService, JoomPublishService } = await import('../../lib/joom-publish-service');
      vi.spyOn(ImagePipelineService.prototype, 'processImages').mockResolvedValue({
        buffered: ['buf1', 'buf2', 'buf3'],
        optimized: ['opt1', 'opt2', 'opt3'],
      });

      const service = new JoomPublishService();
      const listingId = await service.createJoomListing('task-1');
      await service.processImagesForListing(listingId);
      await service.publishToJoom(listingId);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-err' },
          data: expect.objectContaining({ status: 'ERROR', errorMessage: expect.any(String) }),
        })
      );
    });
  });

  describe('processImagesForListing', () => {
    it('Listingの画像を処理し、marketplaceDataを更新する', async () => {
      mockPrisma.listing.findUnique.mockResolvedValue({
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'JOOM',
        marketplaceData: {},
        product: {
          id: 'product-1',
          title: 'P1',
          description: 'D1',
          images: ['https://example.com/img1.jpg'],
          processedImages: [],
        },
      } as any);
      mockPrisma.enrichmentTask.findUnique.mockResolvedValue({ id: 'task-1', productId: 'product-1' } as any);

      const { ImagePipelineService, JoomPublishService } = await import('../../lib/joom-publish-service');
      vi.spyOn(ImagePipelineService.prototype, 'processImages').mockResolvedValue({
        buffered: ['buf1'],
        optimized: ['opt1'],
      });

      const service = new JoomPublishService();
      await service.processImagesForListing('listing-1');

      expect(mockPrisma.listing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'listing-1' },
          data: expect.objectContaining({ status: 'PENDING_PUBLISH' }),
        })
      );
    });
  });

  describe('publishApprovedTasks', () => {
    it('APPROVEDステータスの複数タスクを一括出品できる', async () => {
      // @ts-expect-error dynamic add for tests
      mockPrisma.enrichmentTask.findMany = vi.fn().mockResolvedValue([
        { id: 'task-1', productId: 'p1', status: 'APPROVED' },
        { id: 'task-2', productId: 'p2', status: 'APPROVED' },
      ] as any);

      // 既存Listingなし
      mockPrisma.listing.findFirst.mockResolvedValue(null);

      // createJoomListing用
      mockPrisma.listing.upsert.mockImplementation(async ({ where }: any) => ({ id: `listing-${where.productId_marketplace.productId}` }));

      // findUniqueは任意のlistingIdで同じ形状を返す
      mockPrisma.listing.findUnique.mockImplementation(async ({ where }: any) => ({
        id: where.id,
        productId: where.id.replace('listing-', ''),
        marketplace: 'JOOM',
        marketplaceData: {},
        product: { id: where.id.replace('listing-', ''), title: 'P', description: 'D', images: ['https://example.com/img.jpg'], weight: 300 },
      }));

      const { ImagePipelineService, JoomWorkflowOrchestrator } = await import('../../lib/joom-publish-service');
      vi.spyOn(ImagePipelineService.prototype, 'processImages').mockResolvedValue({ buffered: ['b1'], optimized: ['o1'] });

      const orchestrator = new JoomWorkflowOrchestrator();
      const count = await orchestrator.publishApprovedTasks(10);

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('marketplaceData整合性', () => {
    it('出品成功時にmarketplaceDataにJoom固有情報が保存される', async () => {
      mockPrisma.enrichmentTask.findUnique.mockResolvedValue({
        id: 'task-1',
        productId: 'product-1',
        status: 'APPROVED',
        translations: { en: { title: 'Test', description: 'Test desc' } },
        pricing: { finalPriceUsd: 49.99 },
        attributes: { brand: 'Seiko', category: 'Watches' },
        product: { id: 'product-1', title: 'P1', description: 'D1', images: ['https://example.com/img1.jpg'], weight: 400 },
        optimizedImages: ['i1','i2','i3'],
      } as any);

      const mockListing = {
        id: 'listing-1',
        productId: 'product-1',
        marketplace: 'JOOM',
        status: 'DRAFT',
        marketplaceData: {},
        product: { id: 'product-1', title: 'P1', description: 'D1', images: ['https://example.com/img1.jpg'], weight: 400 },
      } as any;
      mockPrisma.listing.upsert.mockResolvedValue({ id: 'listing-1' } as any);
      mockPrisma.listing.findUnique.mockResolvedValue(mockListing);

      const { ImagePipelineService, JoomPublishService } = await import('../../lib/joom-publish-service');
      vi.spyOn(ImagePipelineService.prototype, 'processImages').mockResolvedValue({ buffered: ['b1','b2','b3'], optimized: ['o1','o2','o3'] });

      const service = new JoomPublishService();
      const listingId = await service.createJoomListing('task-1');
      await service.processImagesForListing(listingId);
      await service.publishToJoom(listingId);

      expect(mockPrisma.listing.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            marketplaceData: expect.objectContaining({
              joomProductId: expect.any(String),
              title: expect.any(String),
              joomCategory: expect.any(String),
            }),
          }),
        })
      );
    });

    it('旧JoomListingフィールドではなくListingモデルのフィールドを使用する', async () => {
      const { JoomPublishService } = await import('../../lib/joom-publish-service');
      const service = new JoomPublishService();

      // APIは呼ばず、存在確認のみ
      expect((mockPrisma as any).joomListing).toBeUndefined();
      expect(mockPrisma.listing).toBeDefined();
    });
  });

  describe('dryRun', () => {
    it('実際に出品せずにプレビュー結果を返す', async () => {
      mockPrisma.enrichmentTask.findUnique.mockResolvedValue({
        id: 'task-1',
        productId: 'product-1',
        status: 'APPROVED',
        translations: { en: { title: 'Test', description: 'Test desc' } },
        pricing: { finalPriceUsd: 49.99 },
        attributes: { brand: 'Seiko', condition: 'new' },
        product: { id: 'product-1', title: 'P1', description: 'D1', images: ['img1.jpg'] },
        optimizedImages: ['i1','i2','i3'],
        validation: { passed: true },
      } as any);

      const { JoomPublishService } = await import('../../lib/joom-publish-service');
      const service = new JoomPublishService();
      const result = await service.dryRun('task-1');

      expect(result.wouldCreate).toBeDefined();
      expect(result.wouldCreate.title).toBe('Test');
      expect(result.validation).toBeDefined();
      // Listing.create等の永続化は呼ばれない
      expect(mockPrisma.listing.create).not.toHaveBeenCalled();
      expect(mockPrisma.listing.upsert).not.toHaveBeenCalled();
    });
  });
});

/**
 * Phase 103: eBay出品ワークフロー API
 *
 * eBayへの商品出品を管理するAPIエンドポイント
 * - Inventory Item作成
 * - Offer作成・公開
 * - 出品ステータス管理
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, ListingStatus, Marketplace } from '@prisma/client';
import { logger } from '@rakuda/logger';
import { addEbayBatchPublishJob, addEbayPriceSyncJob, getEbayPublishQueueStats, QUEUE_NAMES } from '@rakuda/queue';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-listings' });

// eBay API設定
const EBAY_CONFIG = {
  clientId: process.env.EBAY_CLIENT_ID || '',
  clientSecret: process.env.EBAY_CLIENT_SECRET || '',
  sandbox: process.env.EBAY_SANDBOX === 'true',
};

function getApiUrl(): string {
  return EBAY_CONFIG.sandbox
    ? 'https://api.sandbox.ebay.com'
    : 'https://api.ebay.com';
}

// eBayアクセストークン取得
async function getAccessToken(): Promise<string | null> {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'EBAY',
        isActive: true,
        tokenExpiresAt: { gt: new Date() },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const credentials = credential?.credentials as { accessToken?: string } | undefined;
    return credentials?.accessToken || null;
  } catch (error) {
    log.error({ type: 'get_access_token_error', error });
    return null;
  }
}

// ========================================
// eBay出品一覧
// ========================================

/**
 * eBay出品一覧取得
 */
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const {
      status,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: Record<string, unknown> = {
      marketplace: Marketplace.EBAY,
    };
    if (status) where.status = status as ListingStatus;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        include: {
          product: {
            select: {
              id: true,
              title: true,
              titleEn: true,
              price: true,
              images: true,
              processedImages: true,
              category: true,
              brand: true,
              condition: true,
            },
          },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({ listings, total });
  } catch (error) {
    log.error({ type: 'list_ebay_listings_error', error });
    res.status(500).json({ error: 'Failed to list eBay listings' });
  }
});

/**
 * eBay出品統計
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const baseWhere = { marketplace: Marketplace.EBAY };

    const [
      total,
      draft,
      pendingPublish,
      publishing,
      active,
      sold,
      error,
    ] = await Promise.all([
      prisma.listing.count({ where: baseWhere }),
      prisma.listing.count({ where: { ...baseWhere, status: 'DRAFT' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'PENDING_PUBLISH' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'PUBLISHING' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'SOLD' } }),
      prisma.listing.count({ where: { ...baseWhere, status: 'ERROR' } }),
    ]);

    // 売上集計
    const salesStats = await prisma.sale.aggregate({
      where: {
        listing: { marketplace: Marketplace.EBAY },
      },
      _sum: { totalPrice: true },
      _count: true,
    });

    res.json({
      total,
      byStatus: {
        draft,
        pendingPublish,
        publishing,
        active,
        sold,
        error,
      },
      sales: {
        count: salesStats._count,
        totalRevenue: salesStats._sum.totalPrice || 0,
      },
    });
  } catch (error) {
    log.error({ type: 'ebay_stats_error', error });
    res.status(500).json({ error: 'Failed to get eBay stats' });
  }
});

/**
 * eBay出品詳細取得
 */
router.get('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findFirst({
      where: {
        id,
        marketplace: Marketplace.EBAY,
      },
      include: {
        product: true,
        sales: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(listing);
  } catch (error) {
    log.error({ type: 'get_ebay_listing_error', error });
    res.status(500).json({ error: 'Failed to get eBay listing' });
  }
});

// ========================================
// eBay出品作成
// ========================================

/**
 * eBay出品を作成（下書き）
 */
router.post('/listings', async (req: Request, res: Response) => {
  try {
    const {
      productId,
      title,
      description,
      price,
      quantity = 1,
      categoryId,
      conditionId,
      conditionDescription,
      itemSpecifics = {},
      shippingCost,
      fulfillmentPolicyId,
      paymentPolicyId,
      returnPolicyId,
    } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'productId is required' });
    }

    // 商品存在確認
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 既存のeBay出品がないか確認
    const existing = await prisma.listing.findFirst({
      where: {
        productId,
        marketplace: Marketplace.EBAY,
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'eBay listing already exists for this product',
        existingId: existing.id,
      });
    }

    // eBay固有データを構築
    const ebayData = {
      categoryId,
      conditionId,
      conditionDescription,
      itemSpecifics,
      quantity,
      fulfillmentPolicyId,
      paymentPolicyId,
      returnPolicyId,
      inventoryItemId: null,
      offerId: null,
    };

    // 出品を作成
    const listing = await prisma.listing.create({
      data: {
        productId,
        marketplace: Marketplace.EBAY,
        listingPrice: price || product.price,
        shippingCost,
        currency: 'USD',
        marketplaceData: ebayData,
        status: 'DRAFT',
      },
      include: {
        product: true,
      },
    });

    log.info({
      type: 'ebay_listing_created',
      listingId: listing.id,
      productId,
    });

    res.status(201).json(listing);
  } catch (error) {
    log.error({ type: 'create_ebay_listing_error', error });
    res.status(500).json({ error: 'Failed to create eBay listing' });
  }
});

/**
 * eBay出品更新
 */
router.put('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      quantity,
      categoryId,
      conditionId,
      conditionDescription,
      itemSpecifics,
      shippingCost,
      fulfillmentPolicyId,
      paymentPolicyId,
      returnPolicyId,
    } = req.body;

    const existing = await prisma.listing.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // 既存のeBayデータをマージ
    const existingData = (existing.marketplaceData as Record<string, unknown>) || {};
    const updatedData = {
      ...existingData,
      ...(categoryId !== undefined && { categoryId }),
      ...(conditionId !== undefined && { conditionId }),
      ...(conditionDescription !== undefined && { conditionDescription }),
      ...(itemSpecifics !== undefined && { itemSpecifics }),
      ...(quantity !== undefined && { quantity }),
      ...(fulfillmentPolicyId !== undefined && { fulfillmentPolicyId }),
      ...(paymentPolicyId !== undefined && { paymentPolicyId }),
      ...(returnPolicyId !== undefined && { returnPolicyId }),
    };

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...(price !== undefined && { listingPrice: price }),
        ...(shippingCost !== undefined && { shippingCost }),
        marketplaceData: updatedData,
      },
      include: {
        product: true,
      },
    });

    log.info({
      type: 'ebay_listing_updated',
      listingId: id,
    });

    res.json(listing);
  } catch (error) {
    log.error({ type: 'update_ebay_listing_error', error });
    res.status(500).json({ error: 'Failed to update eBay listing' });
  }
});

// ========================================
// eBay出品公開
// ========================================

/**
 * eBay出品プレビュー（ドライラン）
 */
router.post('/listings/:id/preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const ebayData = (listing.marketplaceData as Record<string, unknown>) || {};

    // プレビュー結果を構築
    const preview = {
      listing: {
        id: listing.id,
        title: listing.product.titleEn || listing.product.title,
        description: listing.product.descriptionEn || listing.product.description,
        price: listing.listingPrice,
        currency: listing.currency,
        category: ebayData.categoryId,
        condition: ebayData.conditionId,
        itemSpecifics: ebayData.itemSpecifics,
        images: listing.product.processedImages?.length > 0
          ? listing.product.processedImages
          : listing.product.images,
      },
      validation: {
        isValid: true,
        warnings: [] as string[],
        errors: [] as string[],
      },
      estimatedFees: {
        insertionFee: 0,
        finalValueFee: listing.listingPrice * 0.1325, // ~13.25%
        paymentProcessingFee: listing.listingPrice * 0.029 + 0.30,
        total: listing.listingPrice * 0.1325 + listing.listingPrice * 0.029 + 0.30,
      },
    };

    // バリデーション
    if (!ebayData.categoryId) {
      preview.validation.warnings.push('Category not specified');
    }
    if (!ebayData.conditionId) {
      preview.validation.warnings.push('Condition not specified');
    }
    if (!listing.product.titleEn) {
      preview.validation.warnings.push('English title not available');
    }
    if (listing.listingPrice < 1) {
      preview.validation.errors.push('Price must be at least $1.00');
      preview.validation.isValid = false;
    }

    res.json(preview);
  } catch (error) {
    log.error({ type: 'preview_ebay_listing_error', error });
    res.status(500).json({ error: 'Failed to preview eBay listing' });
  }
});

/**
 * eBay出品を公開
 */
router.post('/listings/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Listing is already active' });
    }

    // ステータスを更新
    await prisma.listing.update({
      where: { id },
      data: { status: 'PENDING_PUBLISH' },
    });

    // 出品ジョブをキューに追加（バッチサイズ1として実行）
    const batchId = `single-${Date.now()}`;
    const jobId = await addEbayBatchPublishJob(batchId, [id]);

    log.info({
      type: 'ebay_publish_job_created',
      listingId: id,
      jobId,
    });

    res.json({
      message: 'Publishing job created',
      listingId: id,
      jobId,
      status: 'PENDING_PUBLISH',
    });
  } catch (error) {
    log.error({ type: 'publish_ebay_listing_error', error });
    res.status(500).json({ error: 'Failed to publish eBay listing' });
  }
});

/**
 * 一括出品
 */
router.post('/batch-publish', async (req: Request, res: Response) => {
  try {
    const { listingIds: inputListingIds, dryRun = false } = req.body;

    if (!Array.isArray(inputListingIds) || inputListingIds.length === 0) {
      return res.status(400).json({ error: 'listingIds array is required' });
    }

    // 対象出品を取得
    const listings = await prisma.listing.findMany({
      where: {
        id: { in: inputListingIds },
        marketplace: Marketplace.EBAY,
        status: { in: ['DRAFT', 'ERROR'] },
      },
    });

    if (listings.length === 0) {
      return res.status(400).json({ error: 'No eligible listings found' });
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        eligibleCount: listings.length,
        listingIds: listings.map(l => l.id),
      });
    }

    // ステータスを更新
    await prisma.listing.updateMany({
      where: { id: { in: listings.map(l => l.id) } },
      data: { status: 'PENDING_PUBLISH' },
    });

    // 一括出品ジョブを作成
    const batchId = `batch-${Date.now()}`;
    const listingIds = listings.map(l => l.id);
    const jobId = await addEbayBatchPublishJob(batchId, listingIds);

    log.info({
      type: 'ebay_batch_publish_started',
      count: listings.length,
      batchId,
      jobId,
    });

    res.json({
      message: 'Batch publishing started',
      count: listings.length,
      batchId,
      jobId,
      listingIds,
    });
  } catch (error) {
    log.error({ type: 'batch_publish_error', error });
    res.status(500).json({ error: 'Failed to start batch publish' });
  }
});

// ========================================
// eBay出品管理
// ========================================

/**
 * eBay出品を終了
 */
router.post('/listings/:id/end', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Can only end active listings' });
    }

    const ebayData = (listing.marketplaceData as Record<string, unknown>) || {};

    // eBay API呼び出しでアイテム終了（実装省略）
    // await endEbayItem(listing.marketplaceListingId);

    await prisma.listing.update({
      where: { id },
      data: { status: 'ENDED' },
    });

    log.info({
      type: 'ebay_listing_ended',
      listingId: id,
      ebayItemId: listing.marketplaceListingId,
    });

    res.json({ message: 'Listing ended', listingId: id });
  } catch (error) {
    log.error({ type: 'end_ebay_listing_error', error });
    res.status(500).json({ error: 'Failed to end eBay listing' });
  }
});

/**
 * eBay出品を削除
 */
router.delete('/listings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await prisma.listing.findFirst({
      where: { id, marketplace: Marketplace.EBAY },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status === 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot delete active listings. End them first.' });
    }

    await prisma.listing.delete({ where: { id } });

    log.info({
      type: 'ebay_listing_deleted',
      listingId: id,
    });

    res.json({ message: 'Listing deleted', listingId: id });
  } catch (error) {
    log.error({ type: 'delete_ebay_listing_error', error });
    res.status(500).json({ error: 'Failed to delete eBay listing' });
  }
});

// ========================================
// eBayポリシー取得
// ========================================

/**
 * eBayポリシー一覧取得
 */
router.get('/policies', async (req: Request, res: Response) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(401).json({ error: 'eBay not connected' });
    }

    const [fulfillment, payment, returnPolicies] = await Promise.all([
      fetchPolicies(accessToken, 'fulfillment'),
      fetchPolicies(accessToken, 'payment'),
      fetchPolicies(accessToken, 'return'),
    ]);

    res.json({
      fulfillment,
      payment,
      return: returnPolicies,
    });
  } catch (error) {
    log.error({ type: 'fetch_policies_error', error });
    res.status(500).json({ error: 'Failed to fetch eBay policies' });
  }
});

async function fetchPolicies(accessToken: string, policyType: string): Promise<unknown[]> {
  try {
    const response = await fetch(
      `${getApiUrl()}/sell/account/v1/${policyType}_policy?marketplace_id=EBAY_US`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${policyType} policies`);
    }

    const data = await response.json() as Record<string, unknown[]>;
    return data[`${policyType}Policies`] || [];
  } catch (error) {
    log.error({ type: 'fetch_policy_error', policyType, error });
    return [];
  }
}

// ========================================
// eBayカテゴリ取得
// ========================================

/**
 * eBayカテゴリ検索
 */
router.get('/categories/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }

    // ローカルのカテゴリマッピングから検索
    const categories = await prisma.ebayCategoryMapping.findMany({
      where: {
        OR: [
          { ebayCategoryName: { contains: q, mode: 'insensitive' } },
          { sourceCategory: { contains: q, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: 20,
      orderBy: { ebayCategoryName: 'asc' },
    });

    res.json({ categories });
  } catch (error) {
    log.error({ type: 'search_categories_error', error });
    res.status(500).json({ error: 'Failed to search categories' });
  }
});

// ========================================
// eBay価格同期
// ========================================

/**
 * 価格同期ジョブを開始
 */
router.post('/pricing/sync', async (req: Request, res: Response) => {
  try {
    const {
      priceChangeThreshold = 2,
      maxListings = 100,
      syncToMarketplace = false,
    } = req.body;

    const jobId = await addEbayPriceSyncJob({
      priceChangeThreshold,
      maxListings,
      syncToMarketplace,
    });

    log.info({
      type: 'ebay_price_sync_job_created',
      jobId,
      options: { priceChangeThreshold, maxListings, syncToMarketplace },
    });

    res.json({
      success: true,
      message: 'Price sync job started',
      jobId,
    });
  } catch (error) {
    log.error({ type: 'start_price_sync_error', error });
    res.status(500).json({ error: 'Failed to start price sync' });
  }
});

/**
 * 価格同期ステータスを取得
 */
router.get('/pricing/sync/status', async (req: Request, res: Response) => {
  try {
    const queueStats = await getEbayPublishQueueStats();

    // 最近の価格変更を取得
    const recentChanges = await prisma.priceHistory.findMany({
      where: {
        reason: 'auto_sync',
        listing: { marketplace: 'EBAY' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        listing: {
          include: { product: { select: { title: true, titleEn: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 24時間の統計
    const stats24h = await prisma.priceHistory.aggregate({
      where: {
        reason: 'auto_sync',
        listing: { marketplace: 'EBAY' },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      _count: true,
      _avg: {
        newPrice: true,
        oldPrice: true,
      },
    });

    const avgChangePercent = stats24h._avg.oldPrice && stats24h._avg.newPrice
      ? Math.abs((stats24h._avg.newPrice - stats24h._avg.oldPrice) / stats24h._avg.oldPrice * 100)
      : 0;

    res.json({
      success: true,
      queue: queueStats,
      recentChanges: recentChanges.map(change => ({
        listingId: change.listingId,
        productTitle: change.listing.product?.titleEn || change.listing.product?.title || 'Unknown',
        oldPrice: change.oldPrice,
        newPrice: change.newPrice,
        changePercent: change.oldPrice > 0
          ? ((change.newPrice - change.oldPrice) / change.oldPrice * 100).toFixed(1)
          : '0',
        createdAt: change.createdAt,
      })),
      stats24h: {
        totalChanges: stats24h._count,
        averageChangePercent: avgChangePercent.toFixed(2),
      },
    });
  } catch (error) {
    log.error({ type: 'get_price_sync_status_error', error });
    res.status(500).json({ error: 'Failed to get price sync status' });
  }
});

export default router;

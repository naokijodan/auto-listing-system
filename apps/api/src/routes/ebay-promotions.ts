
/**
 * eBayプロモーション連携API
 * Phase 121: プロモーション管理
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';

const router = Router();

// プロモーションタイプ
const PROMOTION_TYPES = [
  { type: 'MARKDOWN_SALE', name: 'マークダウンセール', description: '値下げセール' },
  { type: 'ORDER_DISCOUNT', name: '注文割引', description: '複数購入割引' },
  { type: 'VOLUME_PRICING', name: 'ボリューム割引', description: '数量割引' },
  { type: 'SHIPPING_DISCOUNT', name: '送料割引', description: '送料無料・割引' },
  { type: 'COUPON', name: 'クーポン', description: '割引クーポン' },
  { type: 'CODELESS_COUPON', name: 'コードレスクーポン', description: '自動適用クーポン' },
];

// ========================================
// ダッシュボード
// ========================================

/**
 * @swagger
 * /api/ebay-promotions/dashboard:
 *   get:
 *     summary: プロモーションダッシュボード
 *     tags: [eBay Promotions]
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // プロモーション付きリスティング数を集計
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      select: { marketplaceData: true, status: true },
    });

    let activePromotions = 0;
    let scheduledPromotions = 0;
    let endedPromotions = 0;
    const promotionTypes: Record<string, number> = {};

    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const promotions = data?.promotions as Array<Record<string, unknown>> | undefined;

      if (promotions && Array.isArray(promotions)) {
        promotions.forEach(promo => {
          const status = promo.status as string;
          const type = promo.type as string;

          if (status === 'ACTIVE') activePromotions++;
          else if (status === 'SCHEDULED') scheduledPromotions++;
          else if (status === 'ENDED') endedPromotions++;

          if (type) {
            promotionTypes[type] = (promotionTypes[type] || 0) + 1;
          }
        });
      }
    });

    // 最近のプロモーション
    const recentPromotions = await prisma.listing.findMany({
      where: {
        marketplace: 'EBAY',
        marketplaceData: {
          path: ['promotions'],
          not: 'null' as any,
        },
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: { title: true, titleEn: true },
        },
      },
    });

    res.json({
      stats: {
        activePromotions,
        scheduledPromotions,
        endedPromotions,
        totalPromotions: activePromotions + scheduledPromotions + endedPromotions,
        promotionTypes,
      },
      promotionTypeOptions: PROMOTION_TYPES,
      recentPromotions: recentPromotions.map((l: any) => {
        const data = l.marketplaceData as Record<string, unknown>;
        const promotions = (data?.promotions || []) as Array<Record<string, unknown>>;
        return {
          listingId: l.id,
          title: l.product?.titleEn || l.product?.title,
          promotions: promotions.slice(0, 3),
          updatedAt: l.updatedAt,
        };
      }),
    });
  } catch (error) {
    logger.error('Promotions dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ========================================
// プロモーションタイプ一覧
// ========================================

/**
 * @swagger
 * /api/ebay-promotions/types:
 *   get:
 *     summary: プロモーションタイプ一覧
 *     tags: [eBay Promotions]
 */
router.get('/types', async (req: Request, res: Response) => {
  res.json({
    types: PROMOTION_TYPES,
    discountTypes: [
      { value: 'PERCENTAGE', label: 'パーセント割引' },
      { value: 'FIXED_AMOUNT', label: '固定額割引' },
    ],
    statusOptions: [
      { value: 'DRAFT', label: '下書き' },
      { value: 'SCHEDULED', label: '予約中' },
      { value: 'ACTIVE', label: '有効' },
      { value: 'PAUSED', label: '一時停止' },
      { value: 'ENDED', label: '終了' },
    ],
  });
});

// ========================================
// プロモーション作成
// ========================================

const createPromotionSchema = z.object({
  listingIds: z.array(z.string()).min(1).max(100),
  type: z.enum(['MARKDOWN_SALE', 'ORDER_DISCOUNT', 'VOLUME_PRICING', 'SHIPPING_DISCOUNT', 'COUPON', 'CODELESS_COUPON']),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discountValue: z.number().positive(),
  minQuantity: z.number().int().positive().optional(),
  minOrderAmount: z.number().positive().optional(),
  startDate: z.string(),
  endDate: z.string(),
  budget: z.number().positive().optional(),
  couponCode: z.string().optional(),
});

/**
 * @swagger
 * /api/ebay-promotions:
 *   post:
 *     summary: プロモーション作成
 *     tags: [eBay Promotions]
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = createPromotionSchema.parse(req.body);

    const promotionId = `promo_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const promotion = {
      id: promotionId,
      type: body.type,
      name: body.name,
      description: body.description,
      discountType: body.discountType,
      discountValue: body.discountValue,
      minQuantity: body.minQuantity,
      minOrderAmount: body.minOrderAmount,
      startDate: body.startDate,
      endDate: body.endDate,
      budget: body.budget,
      couponCode: body.couponCode,
      status: new Date(body.startDate) > new Date() ? 'SCHEDULED' : 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    const results: Array<{ listingId: string; success: boolean }> = [];

    for (const listingId of body.listingIds) {
      try {
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
        });

        if (!listing) {
          results.push({ listingId, success: false });
          continue;
        }

        const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
        const existingPromotions = (currentData.promotions || []) as Array<Record<string, unknown>>;

        await prisma.listing.update({
          where: { id: listingId },
          data: {
            marketplaceData: {
              ...currentData,
              promotions: [...existingPromotions, promotion],
            } as any,
          },
        });

        results.push({ listingId, success: true });
      } catch (err) {
        results.push({ listingId, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Created promotion ${promotionId} for ${successCount} listings`);

    res.status(201).json({
      promotionId,
      promotion,
      applied: successCount,
      total: body.listingIds.length,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Create promotion error:', error);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

// ========================================
// プロモーション一覧
// ========================================

/**
 * @swagger
 * /api/ebay-promotions:
 *   get:
 *     summary: プロモーション一覧
 *     tags: [eBay Promotions]
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, page = '1', limit = '20' } = req.query;

    const listings = await prisma.listing.findMany({
      where: {
        marketplace: 'EBAY',
        marketplaceData: {
          path: ['promotions'],
          not: 'null' as any,
        },
      },
      include: {
        product: {
          select: { title: true, titleEn: true },
        },
      },
    });

    // プロモーションを抽出
    const allPromotions: Array<{
      promotionId: string;
      listingId: string;
      listingTitle: string;
      promotion: Record<string, unknown>;
    }> = [];

    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const promotions = (data?.promotions || []) as Array<Record<string, unknown>>;

      promotions.forEach(promo => {
        if (status && promo.status !== status) return;
        if (type && promo.type !== type) return;

        allPromotions.push({
          promotionId: promo.id as string,
          listingId: listing.id,
          listingTitle: (listing as any).product?.titleEn || (listing as any).product?.title,
          promotion: promo,
        });
      });
    });

    // ページネーション
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedPromotions = allPromotions.slice(startIndex, startIndex + limitNum);

    res.json({
      data: paginatedPromotions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allPromotions.length,
        totalPages: Math.ceil(allPromotions.length / limitNum),
      },
    });
  } catch (error) {
    logger.error('List promotions error:', error);
    res.status(500).json({ error: 'Failed to list promotions' });
  }
});

// ========================================
// プロモーション詳細
// ========================================

/**
 * @swagger
 * /api/ebay-promotions/{listingId}/{promotionId}:
 *   get:
 *     summary: プロモーション詳細
 *     tags: [eBay Promotions]
 */
router.get('/:listingId/:promotionId', async (req: Request, res: Response) => {
  try {
    const { listingId, promotionId } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        product: {
          select: { title: true, titleEn: true, price: true },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const data = listing.marketplaceData as Record<string, unknown>;
    const promotions = (data?.promotions || []) as Array<Record<string, unknown>>;
    const promotion = promotions.find(p => p.id === promotionId);

    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    // 割引後価格を計算
    let discountedPrice = listing.listingPrice;
    if (promotion.discountType === 'PERCENTAGE') {
      discountedPrice = listing.listingPrice * (1 - (promotion.discountValue as number) / 100);
    } else if (promotion.discountType === 'FIXED_AMOUNT') {
      discountedPrice = listing.listingPrice - (promotion.discountValue as number);
    }

    res.json({
      listingId,
      listingTitle: listing.product.titleEn || listing.product.title,
      originalPrice: listing.listingPrice,
      discountedPrice: Math.max(0, discountedPrice),
      savings: listing.listingPrice - discountedPrice,
      promotion,
    });
  } catch (error) {
    logger.error('Get promotion error:', error);
    res.status(500).json({ error: 'Failed to get promotion' });
  }
});

// ========================================
// プロモーション更新
// ========================================

const updatePromotionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  discountValue: z.number().positive().optional(),
  endDate: z.string().optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'PAUSED', 'ENDED']).optional(),
});

/**
 * @swagger
 * /api/ebay-promotions/{listingId}/{promotionId}:
 *   patch:
 *     summary: プロモーション更新
 *     tags: [eBay Promotions]
 */
router.patch('/:listingId/:promotionId', async (req: Request, res: Response) => {
  try {
    const { listingId, promotionId } = req.params;
    const body = updatePromotionSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
    const promotions = (currentData.promotions || []) as Array<Record<string, unknown>>;
    const promoIndex = promotions.findIndex(p => p.id === promotionId);

    if (promoIndex === -1) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const updatedPromotion = {
      ...promotions[promoIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    promotions[promoIndex] = updatedPromotion;

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        marketplaceData: {
          ...currentData,
          promotions,
        } as any,
      },
    });

    res.json({ success: true, promotion: updatedPromotion });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Update promotion error:', error);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

// ========================================
// プロモーション削除
// ========================================

/**
 * @swagger
 * /api/ebay-promotions/{listingId}/{promotionId}:
 *   delete:
 *     summary: プロモーション削除
 *     tags: [eBay Promotions]
 */
router.delete('/:listingId/:promotionId', async (req: Request, res: Response) => {
  try {
    const { listingId, promotionId } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
    const promotions = (currentData.promotions || []) as Array<Record<string, unknown>>;
    const filteredPromotions = promotions.filter(p => p.id !== promotionId);

    if (filteredPromotions.length === promotions.length) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        marketplaceData: {
          ...currentData,
          promotions: filteredPromotions,
        } as any,
      },
    });

    res.json({ success: true, deletedPromotionId: promotionId });
  } catch (error) {
    logger.error('Delete promotion error:', error);
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
});

// ========================================
// 一括プロモーション操作
// ========================================

const bulkActionSchema = z.object({
  promotionIds: z.array(z.object({
    listingId: z.string(),
    promotionId: z.string(),
  })).min(1).max(100),
  action: z.enum(['activate', 'pause', 'end', 'delete']),
});

/**
 * @swagger
 * /api/ebay-promotions/bulk:
 *   post:
 *     summary: 一括プロモーション操作
 *     tags: [eBay Promotions]
 */
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const body = bulkActionSchema.parse(req.body);

    const results: Array<{ listingId: string; promotionId: string; success: boolean }> = [];

    for (const { listingId, promotionId } of body.promotionIds) {
      try {
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
        });

        if (!listing) {
          results.push({ listingId, promotionId, success: false });
          continue;
        }

        const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
        let promotions = (currentData.promotions || []) as Array<Record<string, unknown>>;
        const promoIndex = promotions.findIndex(p => p.id === promotionId);

        if (promoIndex === -1) {
          results.push({ listingId, promotionId, success: false });
          continue;
        }

        if (body.action === 'delete') {
          promotions = promotions.filter(p => p.id !== promotionId);
        } else {
          const statusMap: Record<string, string> = {
            activate: 'ACTIVE',
            pause: 'PAUSED',
            end: 'ENDED',
          };
          promotions[promoIndex] = {
            ...promotions[promoIndex],
            status: statusMap[body.action],
            updatedAt: new Date().toISOString(),
          };
        }

        await prisma.listing.update({
          where: { id: listingId },
          data: {
            marketplaceData: {
              ...currentData,
              promotions,
            } as any,
          },
        });

        results.push({ listingId, promotionId, success: true });
      } catch (err) {
        results.push({ listingId, promotionId, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Bulk ${body.action}: ${successCount}/${body.promotionIds.length} promotions`);

    res.json({
      message: `${successCount}/${body.promotionIds.length} promotions ${body.action}d`,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Bulk action error:', error);
    res.status(500).json({ error: 'Failed to perform bulk action' });
  }
});

// ========================================
// プロモーションテンプレート
// ========================================

/**
 * @swagger
 * /api/ebay-promotions/templates:
 *   get:
 *     summary: プロモーションテンプレート一覧
 *     tags: [eBay Promotions]
 */
router.get('/templates', async (req: Request, res: Response) => {
  const templates = [
    {
      id: 'flash_sale',
      name: 'フラッシュセール',
      type: 'MARKDOWN_SALE',
      discountType: 'PERCENTAGE',
      discountValue: 20,
      durationHours: 24,
      description: '24時間限定の緊急セール',
    },
    {
      id: 'weekend_sale',
      name: '週末セール',
      type: 'MARKDOWN_SALE',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      durationHours: 48,
      description: '週末限定セール',
    },
    {
      id: 'bulk_discount',
      name: 'まとめ買い割引',
      type: 'VOLUME_PRICING',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minQuantity: 3,
      description: '3点以上購入で10%オフ',
    },
    {
      id: 'free_shipping',
      name: '送料無料',
      type: 'SHIPPING_DISCOUNT',
      discountType: 'FIXED_AMOUNT',
      discountValue: 0,
      minOrderAmount: 50,
      description: '$50以上で送料無料',
    },
    {
      id: 'new_customer',
      name: '新規顧客割引',
      type: 'COUPON',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      description: '新規購入者限定10%オフ',
    },
  ];

  res.json({ templates });
});

// ========================================
// 統計
// ========================================

/**
 * @swagger
 * /api/ebay-promotions/stats:
 *   get:
 *     summary: プロモーション統計
 *     tags: [eBay Promotions]
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      select: { marketplaceData: true, listingPrice: true },
    });

    let totalPromotions = 0;
    let activePromotions = 0;
    let totalDiscount = 0;
    const typeStats: Record<string, number> = {};
    const statusStats: Record<string, number> = {};

    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const promotions = (data?.promotions || []) as Array<Record<string, unknown>>;

      promotions.forEach(promo => {
        totalPromotions++;
        const status = promo.status as string;
        const type = promo.type as string;

        statusStats[status] = (statusStats[status] || 0) + 1;
        typeStats[type] = (typeStats[type] || 0) + 1;

        if (status === 'ACTIVE') {
          activePromotions++;
          // 割引額を計算
          if (promo.discountType === 'PERCENTAGE') {
            totalDiscount += listing.listingPrice * ((promo.discountValue as number) / 100);
          } else if (promo.discountType === 'FIXED_AMOUNT') {
            totalDiscount += promo.discountValue as number;
          }
        }
      });
    });

    res.json({
      overview: {
        totalPromotions,
        activePromotions,
        totalPotentialDiscount: Math.round(totalDiscount * 100) / 100,
      },
      byType: Object.entries(typeStats)
        .map(([type, count]) => ({
          type,
          name: PROMOTION_TYPES.find(t => t.type === type)?.name || type,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      byStatus: statusStats,
    });
  } catch (error) {
    logger.error('Promotion stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export { router as ebayPromotionsRouter };

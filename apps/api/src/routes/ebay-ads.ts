/**
 * eBay広告連携API
 * Phase 123: Promoted Listings管理
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';

const router = Router();

// 広告キャンペーンタイプ
const CAMPAIGN_TYPES = [
  { type: 'PROMOTED_LISTINGS_STANDARD', name: 'Promoted Listings Standard', description: '成果報酬型広告' },
  { type: 'PROMOTED_LISTINGS_ADVANCED', name: 'Promoted Listings Advanced', description: 'CPC型広告' },
  { type: 'PROMOTED_LISTINGS_EXPRESS', name: 'Promoted Listings Express', description: '簡易設定型広告' },
];

// ビッディング戦略
const BIDDING_STRATEGIES = [
  { strategy: 'FIXED', name: '固定入札', description: '手動で入札額を設定' },
  { strategy: 'DYNAMIC', name: '動的入札', description: 'eBayが自動最適化' },
  { strategy: 'SUGGESTED', name: '推奨入札', description: 'eBay推奨額を使用' },
];

// ========================================
// ダッシュボード
// ========================================

/**
 * @swagger
 * /api/ebay-ads/dashboard:
 *   get:
 *     summary: 広告ダッシュボード
 *     tags: [eBay Ads]
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      include: { product: true },
    });

    let activeCampaigns = 0;
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalSales = 0;

    const campaignStats: Record<string, { count: number; spend: number }> = {};

    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const ads = data?.ads as Record<string, unknown>;

      if (ads?.campaignId) {
        activeCampaigns++;
        totalSpend += (ads.spend as number) || 0;
        totalClicks += (ads.clicks as number) || 0;
        totalImpressions += (ads.impressions as number) || 0;
        totalSales += (ads.attributedSales as number) || 0;

        const type = (ads.campaignType as string) || 'UNKNOWN';
        if (!campaignStats[type]) {
          campaignStats[type] = { count: 0, spend: 0 };
        }
        campaignStats[type].count++;
        campaignStats[type].spend += (ads.spend as number) || 0;
      }
    });

    const roas = totalSpend > 0 ? totalSales / totalSpend : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    res.json({
      stats: {
        activeCampaigns,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalClicks,
        totalImpressions,
        totalSales: Math.round(totalSales * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
      },
      campaignTypes: CAMPAIGN_TYPES,
      biddingStrategies: BIDDING_STRATEGIES,
      campaignStats: Object.entries(campaignStats)
        .map(([type, data]) => ({
          type,
          name: CAMPAIGN_TYPES.find(t => t.type === type)?.name || type,
          ...data,
        })),
    });
  } catch (error) {
    logger.error('Ads dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ========================================
// キャンペーンタイプ一覧
// ========================================

/**
 * @swagger
 * /api/ebay-ads/types:
 *   get:
 *     summary: 広告タイプ一覧
 *     tags: [eBay Ads]
 */
router.get('/types', async (req: Request, res: Response) => {
  res.json({
    campaignTypes: CAMPAIGN_TYPES,
    biddingStrategies: BIDDING_STRATEGIES,
    adRateRanges: {
      min: 1,
      max: 20,
      suggested: 5,
      description: '成果報酬率（%）',
    },
  });
});

// ========================================
// キャンペーン作成
// ========================================

const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  campaignType: z.enum(['PROMOTED_LISTINGS_STANDARD', 'PROMOTED_LISTINGS_ADVANCED', 'PROMOTED_LISTINGS_EXPRESS']),
  biddingStrategy: z.enum(['FIXED', 'DYNAMIC', 'SUGGESTED']),
  adRate: z.number().min(1).max(20).optional(),
  dailyBudget: z.number().positive().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  listingIds: z.array(z.string()).min(1).max(500),
});

/**
 * @swagger
 * /api/ebay-ads/campaigns:
 *   post:
 *     summary: キャンペーン作成
 *     tags: [eBay Ads]
 */
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const body = createCampaignSchema.parse(req.body);

    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const campaign = {
      id: campaignId,
      name: body.name,
      campaignType: body.campaignType,
      biddingStrategy: body.biddingStrategy,
      adRate: body.adRate,
      dailyBudget: body.dailyBudget,
      startDate: body.startDate,
      endDate: body.endDate,
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

        await prisma.listing.update({
          where: { id: listingId },
          data: {
            marketplaceData: {
              ...currentData,
              ads: {
                campaignId: campaign.id,
                campaignName: campaign.name,
                campaignType: campaign.campaignType,
                biddingStrategy: campaign.biddingStrategy,
                adRate: campaign.adRate,
                status: campaign.status,
                impressions: 0,
                clicks: 0,
                spend: 0,
                attributedSales: 0,
                startDate: campaign.startDate,
                endDate: campaign.endDate,
              },
            },
          },
        });

        results.push({ listingId, success: true });
      } catch (err) {
        results.push({ listingId, success: false });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Created campaign ${campaignId} for ${successCount} listings`);

    res.status(201).json({
      campaign,
      applied: successCount,
      total: body.listingIds.length,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// ========================================
// キャンペーン一覧
// ========================================

/**
 * @swagger
 * /api/ebay-ads/campaigns:
 *   get:
 *     summary: キャンペーン一覧
 *     tags: [eBay Ads]
 */
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;

    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      include: { product: true },
    });

    // キャンペーンごとに集計
    const campaigns: Record<string, {
      id: string;
      name: string;
      type: string;
      status: string;
      listingCount: number;
      impressions: number;
      clicks: number;
      spend: number;
      sales: number;
      listings: Array<{ id: string; title: string }>;
    }> = {};

    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const ads = data?.ads as Record<string, unknown>;

      if (ads?.campaignId) {
        const campaignId = ads.campaignId as string;

        if (status && ads.status !== status) return;
        if (type && ads.campaignType !== type) return;

        if (!campaigns[campaignId]) {
          campaigns[campaignId] = {
            id: campaignId,
            name: (ads.campaignName as string) || 'Unknown',
            type: (ads.campaignType as string) || 'UNKNOWN',
            status: (ads.status as string) || 'UNKNOWN',
            listingCount: 0,
            impressions: 0,
            clicks: 0,
            spend: 0,
            sales: 0,
            listings: [],
          };
        }

        campaigns[campaignId].listingCount++;
        campaigns[campaignId].impressions += (ads.impressions as number) || 0;
        campaigns[campaignId].clicks += (ads.clicks as number) || 0;
        campaigns[campaignId].spend += (ads.spend as number) || 0;
        campaigns[campaignId].sales += (ads.attributedSales as number) || 0;
        campaigns[campaignId].listings.push({
          id: listing.id,
          title: listing.product.titleEn || listing.product.title,
        });
      }
    });

    const campaignList = Object.values(campaigns).map(c => ({
      ...c,
      roas: c.spend > 0 ? Math.round((c.sales / c.spend) * 100) / 100 : 0,
      cpc: c.clicks > 0 ? Math.round((c.spend / c.clicks) * 100) / 100 : 0,
      ctr: c.impressions > 0 ? Math.round((c.clicks / c.impressions) * 10000) / 100 : 0,
      listings: c.listings.slice(0, 5), // 最初の5件のみ
    }));

    res.json({
      data: campaignList.sort((a, b) => b.spend - a.spend),
      total: campaignList.length,
    });
  } catch (error) {
    logger.error('List campaigns error:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

// ========================================
// キャンペーン詳細
// ========================================

/**
 * @swagger
 * /api/ebay-ads/campaigns/{campaignId}:
 *   get:
 *     summary: キャンペーン詳細
 *     tags: [eBay Ads]
 */
router.get('/campaigns/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      include: { product: true },
    });

    const campaignListings = listings.filter(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const ads = data?.ads as Record<string, unknown>;
      return ads?.campaignId === campaignId;
    });

    if (campaignListings.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const firstListing = campaignListings[0];
    const firstAds = (firstListing.marketplaceData as Record<string, unknown>).ads as Record<string, unknown>;

    const totals = campaignListings.reduce(
      (acc, listing) => {
        const data = listing.marketplaceData as Record<string, unknown>;
        const ads = data?.ads as Record<string, unknown>;
        return {
          impressions: acc.impressions + ((ads?.impressions as number) || 0),
          clicks: acc.clicks + ((ads?.clicks as number) || 0),
          spend: acc.spend + ((ads?.spend as number) || 0),
          sales: acc.sales + ((ads?.attributedSales as number) || 0),
        };
      },
      { impressions: 0, clicks: 0, spend: 0, sales: 0 }
    );

    res.json({
      campaign: {
        id: campaignId,
        name: firstAds.campaignName,
        type: firstAds.campaignType,
        biddingStrategy: firstAds.biddingStrategy,
        adRate: firstAds.adRate,
        status: firstAds.status,
        startDate: firstAds.startDate,
        endDate: firstAds.endDate,
      },
      stats: {
        listingCount: campaignListings.length,
        ...totals,
        roas: totals.spend > 0 ? Math.round((totals.sales / totals.spend) * 100) / 100 : 0,
        cpc: totals.clicks > 0 ? Math.round((totals.spend / totals.clicks) * 100) / 100 : 0,
        ctr: totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0,
      },
      listings: campaignListings.map(listing => {
        const ads = (listing.marketplaceData as Record<string, unknown>).ads as Record<string, unknown>;
        return {
          listingId: listing.id,
          title: listing.product.titleEn || listing.product.title,
          impressions: ads.impressions,
          clicks: ads.clicks,
          spend: ads.spend,
          sales: ads.attributedSales,
        };
      }),
    });
  } catch (error) {
    logger.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

// ========================================
// キャンペーン更新
// ========================================

const updateCampaignSchema = z.object({
  adRate: z.number().min(1).max(20).optional(),
  dailyBudget: z.number().positive().optional(),
  endDate: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'ENDED']).optional(),
});

/**
 * @swagger
 * /api/ebay-ads/campaigns/{campaignId}:
 *   patch:
 *     summary: キャンペーン更新
 *     tags: [eBay Ads]
 */
router.patch('/campaigns/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const body = updateCampaignSchema.parse(req.body);

    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
    });

    let updatedCount = 0;

    for (const listing of listings) {
      const data = listing.marketplaceData as Record<string, unknown>;
      const ads = data?.ads as Record<string, unknown>;

      if (ads?.campaignId === campaignId) {
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            marketplaceData: {
              ...data,
              ads: {
                ...ads,
                ...(body.adRate !== undefined && { adRate: body.adRate }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.endDate !== undefined && { endDate: body.endDate }),
                updatedAt: new Date().toISOString(),
              },
            },
          },
        });
        updatedCount++;
      }
    }

    logger.info(`Updated campaign ${campaignId}: ${updatedCount} listings`);

    res.json({
      success: true,
      updatedListings: updatedCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// ========================================
// キャンペーン削除
// ========================================

/**
 * @swagger
 * /api/ebay-ads/campaigns/{campaignId}:
 *   delete:
 *     summary: キャンペーン削除
 *     tags: [eBay Ads]
 */
router.delete('/campaigns/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
    });

    let deletedCount = 0;

    for (const listing of listings) {
      const data = listing.marketplaceData as Record<string, unknown>;
      const ads = data?.ads as Record<string, unknown>;

      if (ads?.campaignId === campaignId) {
        const { ads: _, ...restData } = data;
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            marketplaceData: restData,
          },
        });
        deletedCount++;
      }
    }

    logger.info(`Deleted campaign ${campaignId}: ${deletedCount} listings`);

    res.json({
      success: true,
      deletedFromListings: deletedCount,
    });
  } catch (error) {
    logger.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// ========================================
// 広告パフォーマンス分析
// ========================================

/**
 * @swagger
 * /api/ebay-ads/performance:
 *   get:
 *     summary: 広告パフォーマンス分析
 *     tags: [eBay Ads]
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      include: { product: true },
    });

    const adListings = listings.filter(l => {
      const data = l.marketplaceData as Record<string, unknown>;
      return data?.ads;
    });

    const performance = adListings.map(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const ads = data.ads as Record<string, unknown>;

      const impressions = (ads.impressions as number) || 0;
      const clicks = (ads.clicks as number) || 0;
      const spend = (ads.spend as number) || 0;
      const sales = (ads.attributedSales as number) || 0;

      return {
        listingId: listing.id,
        title: listing.product.titleEn || listing.product.title,
        campaignName: ads.campaignName,
        adRate: ads.adRate,
        impressions,
        clicks,
        spend: Math.round(spend * 100) / 100,
        sales: Math.round(sales * 100) / 100,
        ctr: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
        roas: spend > 0 ? Math.round((sales / spend) * 100) / 100 : 0,
        conversionRate: clicks > 0 ? Math.round((sales / clicks / listing.listingPrice) * 10000) / 100 : 0,
      };
    });

    // トップパフォーマー
    const topByRoas = [...performance].sort((a, b) => b.roas - a.roas).slice(0, 10);
    const topByClicks = [...performance].sort((a, b) => b.clicks - a.clicks).slice(0, 10);

    // 低パフォーマー（改善推奨）
    const lowPerformers = performance
      .filter(p => p.impressions > 1000 && p.roas < 1)
      .sort((a, b) => a.roas - b.roas)
      .slice(0, 10);

    res.json({
      summary: {
        totalAdListings: adListings.length,
        totalImpressions: performance.reduce((sum, p) => sum + p.impressions, 0),
        totalClicks: performance.reduce((sum, p) => sum + p.clicks, 0),
        totalSpend: Math.round(performance.reduce((sum, p) => sum + p.spend, 0) * 100) / 100,
        totalSales: Math.round(performance.reduce((sum, p) => sum + p.sales, 0) * 100) / 100,
      },
      topByRoas,
      topByClicks,
      lowPerformers,
      recommendations: lowPerformers.map(p => ({
        listingId: p.listingId,
        title: p.title,
        issue: p.roas < 0.5 ? '広告費用対効果が低い' : 'コンバージョン率が低い',
        suggestion: p.ctr < 1 ? '広告レートを上げるか、タイトルを改善' : '価格設定を見直し',
      })),
    });
  } catch (error) {
    logger.error('Performance analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze performance' });
  }
});

// ========================================
// 推奨広告レート取得
// ========================================

/**
 * @swagger
 * /api/ebay-ads/suggested-rate/{listingId}:
 *   get:
 *     summary: 推奨広告レート取得
 *     tags: [eBay Ads]
 */
router.get('/suggested-rate/:listingId', async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // カテゴリと価格に基づく推奨レート（実際にはeBay APIから取得）
    const category = listing.product.category || 'General';
    const price = listing.listingPrice;

    // シンプルな推奨ロジック
    let suggestedRate = 5; // デフォルト5%

    if (price < 20) {
      suggestedRate = 8; // 低価格商品は高いレートが必要
    } else if (price > 100) {
      suggestedRate = 3; // 高価格商品は低いレートでも効果的
    }

    // カテゴリ別調整
    if (category.toLowerCase().includes('electronics')) {
      suggestedRate += 2; // 競争が激しい
    }

    res.json({
      listingId,
      suggestedRate: Math.min(suggestedRate, 20),
      rateRange: { min: Math.max(suggestedRate - 2, 1), max: Math.min(suggestedRate + 3, 20) },
      reasoning: `価格帯 $${price} と カテゴリ ${category} に基づく推奨`,
    });
  } catch (error) {
    logger.error('Suggested rate error:', error);
    res.status(500).json({ error: 'Failed to get suggested rate' });
  }
});

// ========================================
// 統計
// ========================================

/**
 * @swagger
 * /api/ebay-ads/stats:
 *   get:
 *     summary: 広告統計
 *     tags: [eBay Ads]
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
    });

    let totalSpend = 0;
    let totalSales = 0;
    let totalClicks = 0;
    let totalImpressions = 0;
    let activeCount = 0;

    const dailyStats: Record<string, { spend: number; sales: number; clicks: number }> = {};

    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const ads = data?.ads as Record<string, unknown>;

      if (ads) {
        if (ads.status === 'ACTIVE') activeCount++;
        totalSpend += (ads.spend as number) || 0;
        totalSales += (ads.attributedSales as number) || 0;
        totalClicks += (ads.clicks as number) || 0;
        totalImpressions += (ads.impressions as number) || 0;
      }
    });

    res.json({
      overview: {
        activeListings: activeCount,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        roas: totalSpend > 0 ? Math.round((totalSales / totalSpend) * 100) / 100 : 0,
        avgCpc: totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0,
        avgCtr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
      },
    });
  } catch (error) {
    logger.error('Ads stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export { router as ebayAdsRouter };

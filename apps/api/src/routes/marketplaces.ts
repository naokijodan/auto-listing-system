import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'marketplaces-api' });

// eBay API エンドポイント
const EBAY_API_SANDBOX = 'https://api.sandbox.ebay.com';
const EBAY_API_PRODUCTION = 'https://api.ebay.com';
const IS_PRODUCTION = process.env.EBAY_ENV === 'production';
const EBAY_API_BASE = IS_PRODUCTION ? EBAY_API_PRODUCTION : EBAY_API_SANDBOX;

/**
 * eBayアクセストークンを取得
 */
async function getEbayAccessToken(): Promise<string | null> {
  const credential = await prisma.marketplaceCredential.findFirst({
    where: {
      marketplace: 'EBAY',
      isActive: true,
    },
  });

  if (!credential) {
    return null;
  }

  const creds = credential.credentials as { accessToken?: string };
  return creds.accessToken || null;
}

// ========================================
// eBay カテゴリAPI
// ========================================

/**
 * eBayカテゴリをサジェスト
 * GET /api/marketplaces/ebay/categories/suggest?q=camera
 */
router.get('/ebay/categories/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
      return;
    }

    const token = await getEbayAccessToken();
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'eBay not connected',
      });
      return;
    }

    const response = await fetch(
      `${EBAY_API_BASE}/commerce/taxonomy/v1/category_tree/0/get_category_suggestions?q=${encodeURIComponent(q)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as { errors?: Array<{ message?: string }> };
      log.error({
        type: 'ebay_category_suggest_error',
        status: response.status,
        error,
      });

      res.status(response.status).json({
        success: false,
        error: error.errors?.[0]?.message || 'eBay API error',
      });
      return;
    }

    const data = await response.json() as { categorySuggestions?: any[] };
    const suggestions = data.categorySuggestions?.map((s: any) => ({
      categoryId: s.category?.categoryId,
      categoryName: s.category?.categoryName,
      categoryTreeNodeLevel: s.categoryTreeNodeLevel,
      relevancy: s.relevancy,
    })) || [];

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * eBayカテゴリのItem Specificsを取得
 * GET /api/marketplaces/ebay/categories/:categoryId/aspects
 */
router.get('/ebay/categories/:categoryId/aspects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categoryId } = req.params;

    const token = await getEbayAccessToken();
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'eBay not connected',
      });
      return;
    }

    const response = await fetch(
      `${EBAY_API_BASE}/commerce/taxonomy/v1/category_tree/0/get_item_aspects_for_category?category_id=${categoryId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as { errors?: Array<{ message?: string }> };
      log.error({
        type: 'ebay_aspects_error',
        categoryId,
        status: response.status,
        error,
      });

      res.status(response.status).json({
        success: false,
        error: error.errors?.[0]?.message || 'eBay API error',
      });
      return;
    }

    const data = await response.json() as { aspects?: any[] };
    const aspects = data.aspects?.map((a: any) => ({
      localizedAspectName: a.localizedAspectName,
      aspectConstraint: {
        aspectRequired: a.aspectConstraint?.aspectRequired,
        aspectUsage: a.aspectConstraint?.aspectUsage,
        aspectMode: a.aspectConstraint?.aspectMode,
        itemToAspectCardinality: a.aspectConstraint?.itemToAspectCardinality,
      },
      aspectValues: a.aspectValues?.map((v: any) => v.localizedValue) || [],
    })) || [];

    res.json({
      success: true,
      categoryId,
      data: aspects,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 保存済みカテゴリマッピング一覧
 * GET /api/marketplaces/ebay/category-mappings
 */
router.get('/ebay/category-mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mappings = await prisma.ebayCategoryMapping.findMany({
      where: { isActive: true },
      orderBy: { sourceCategory: 'asc' },
    });

    res.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピングを追加/更新
 * POST /api/marketplaces/ebay/category-mappings
 */
router.post('/ebay/category-mappings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceCategory, ebayCategoryId, ebayCategoryName, itemSpecifics } = req.body;

    if (!sourceCategory || !ebayCategoryId || !ebayCategoryName) {
      res.status(400).json({
        success: false,
        error: 'sourceCategory, ebayCategoryId, and ebayCategoryName are required',
      });
      return;
    }

    const mapping = await prisma.ebayCategoryMapping.upsert({
      where: { sourceCategory },
      create: {
        sourceCategory,
        ebayCategoryId,
        ebayCategoryName,
        itemSpecifics: itemSpecifics || {},
      },
      update: {
        ebayCategoryId,
        ebayCategoryName,
        itemSpecifics: itemSpecifics || {},
        isActive: true,
      },
    });

    log.info({
      type: 'category_mapping_saved',
      sourceCategory,
      ebayCategoryId,
    });

    res.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピングを削除
 * DELETE /api/marketplaces/ebay/category-mappings/:id
 */
router.delete('/ebay/category-mappings/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.ebayCategoryMapping.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Category mapping deleted',
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// eBay ポリシーAPI
// ========================================

/**
 * eBayのFulfillment Policies一覧を取得
 * GET /api/marketplaces/ebay/policies/fulfillment
 */
router.get('/ebay/policies/fulfillment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await getEbayAccessToken();
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'eBay not connected',
      });
      return;
    }

    const response = await fetch(
      `${EBAY_API_BASE}/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as { errors?: Array<{ message?: string }> };
      res.status(response.status).json({
        success: false,
        error: error.errors?.[0]?.message || 'eBay API error',
      });
      return;
    }

    const data = await response.json() as { fulfillmentPolicies?: any[] };
    res.json({
      success: true,
      data: data.fulfillmentPolicies || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * eBayのPayment Policies一覧を取得
 * GET /api/marketplaces/ebay/policies/payment
 */
router.get('/ebay/policies/payment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await getEbayAccessToken();
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'eBay not connected',
      });
      return;
    }

    const response = await fetch(
      `${EBAY_API_BASE}/sell/account/v1/payment_policy?marketplace_id=EBAY_US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as { errors?: Array<{ message?: string }> };
      res.status(response.status).json({
        success: false,
        error: error.errors?.[0]?.message || 'eBay API error',
      });
      return;
    }

    const data = await response.json() as { paymentPolicies?: any[] };
    res.json({
      success: true,
      data: data.paymentPolicies || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * eBayのReturn Policies一覧を取得
 * GET /api/marketplaces/ebay/policies/return
 */
router.get('/ebay/policies/return', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = await getEbayAccessToken();
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'eBay not connected',
      });
      return;
    }

    const response = await fetch(
      `${EBAY_API_BASE}/sell/account/v1/return_policy?marketplace_id=EBAY_US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as { errors?: Array<{ message?: string }> };
      res.status(response.status).json({
        success: false,
        error: error.errors?.[0]?.message || 'eBay API error',
      });
      return;
    }

    const data = await response.json() as { returnPolicies?: any[] };
    res.json({
      success: true,
      data: data.returnPolicies || [],
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// eBay 出品管理API
// ========================================

/**
 * eBay出品の統計を取得
 * GET /api/marketplaces/ebay/inventory/stats
 */
router.get('/ebay/inventory/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, active, draft, error, sold] = await Promise.all([
      prisma.listing.count({ where: { marketplace: 'EBAY' } }),
      prisma.listing.count({ where: { marketplace: 'EBAY', status: 'ACTIVE' } }),
      prisma.listing.count({ where: { marketplace: 'EBAY', status: 'DRAFT' } }),
      prisma.listing.count({ where: { marketplace: 'EBAY', status: 'ERROR' } }),
      prisma.listing.count({ where: { marketplace: 'EBAY', status: 'SOLD' } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        draft,
        error,
        sold,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// Joom 出品管理API
// ========================================

/**
 * Joom出品の統計を取得
 * GET /api/marketplaces/joom/inventory/stats
 */
router.get('/joom/inventory/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [total, active, draft, error, sold] = await Promise.all([
      prisma.listing.count({ where: { marketplace: 'JOOM' } }),
      prisma.listing.count({ where: { marketplace: 'JOOM', status: 'ACTIVE' } }),
      prisma.listing.count({ where: { marketplace: 'JOOM', status: 'DRAFT' } }),
      prisma.listing.count({ where: { marketplace: 'JOOM', status: 'ERROR' } }),
      prisma.listing.count({ where: { marketplace: 'JOOM', status: 'SOLD' } }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        draft,
        error,
        sold,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * マーケットプレイス全体の概要
 * GET /api/marketplaces/overview
 */
router.get('/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [ebayCredential, joomCredential] = await Promise.all([
      prisma.marketplaceCredential.findFirst({
        where: { marketplace: 'EBAY', isActive: true },
      }),
      prisma.marketplaceCredential.findFirst({
        where: { marketplace: 'JOOM', isActive: true },
      }),
    ]);

    const [ebayStats, joomStats] = await Promise.all([
      prisma.listing.groupBy({
        by: ['status'],
        where: { marketplace: 'EBAY' },
        _count: true,
      }),
      prisma.listing.groupBy({
        by: ['status'],
        where: { marketplace: 'JOOM' },
        _count: true,
      }),
    ]);

    const formatStats = (stats: any[]) => {
      const result: Record<string, number> = {};
      stats.forEach((s) => {
        result[s.status] = s._count;
      });
      return result;
    };

    res.json({
      success: true,
      data: {
        ebay: {
          connected: !!ebayCredential,
          tokenExpired: ebayCredential?.tokenExpiresAt
            ? ebayCredential.tokenExpiresAt < new Date()
            : null,
          environment: IS_PRODUCTION ? 'production' : 'sandbox',
          listings: formatStats(ebayStats),
        },
        joom: {
          connected: !!joomCredential,
          listings: formatStats(joomStats),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as marketplacesRouter };

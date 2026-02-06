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
// eBay 接続テスト（トレーサー・バレット）
// ========================================

/**
 * eBay接続テスト
 * GET /api/marketplaces/ebay/test-connection
 *
 * トレーサー・バレット: 最小のAPI呼び出しで認証・接続を確認
 */
router.get('/ebay/test-connection', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 認証情報が設定されているか確認
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'EBAY',
        isActive: true,
      },
    });

    if (!credential) {
      res.json({
        success: false,
        status: 'not_configured',
        message: 'eBay認証情報が設定されていません',
        steps: [
          '1. eBay Developer Programに登録',
          '2. アプリケーションを作成してClient ID/Secretを取得',
          '3. OAuth認証フローを完了してRefresh Tokenを取得',
          '4. /api/marketplaces/credentials にPOSTで登録',
        ],
      });
      return;
    }

    const creds = credential.credentials as {
      clientId?: string;
      clientSecret?: string;
      accessToken?: string;
      refreshToken?: string;
    };

    // 2. 必要な認証情報があるか確認
    if (!creds.clientId || !creds.clientSecret) {
      res.json({
        success: false,
        status: 'incomplete_credentials',
        message: 'Client ID/Secretが設定されていません',
      });
      return;
    }

    if (!creds.accessToken && !creds.refreshToken) {
      res.json({
        success: false,
        status: 'no_tokens',
        message: 'アクセストークンが設定されていません。OAuth認証を完了してください。',
        oauthUrl: `${EBAY_API_BASE.replace('api.', 'auth.')}/oauth2/authorize`,
      });
      return;
    }

    // 3. トークンの有効期限確認
    const tokenExpired = credential.tokenExpiresAt
      ? credential.tokenExpiresAt < new Date()
      : false;

    // 4. 実際のAPIコールでテスト（読み取り専用: プライベートリストを取得）
    const token = creds.accessToken;
    if (!token) {
      res.json({
        success: false,
        status: 'token_refresh_needed',
        message: 'アクセストークンの更新が必要です',
        tokenExpired,
      });
      return;
    }

    // Sell Account APIで自分のアカウント情報を取得（最小のAPI呼び出し）
    const testUrl = `${EBAY_API_BASE}/sell/account/v1/privilege`;
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (testResponse.ok) {
      const privilegeData = await testResponse.json();

      log.info({
        type: 'ebay_connection_test_success',
        environment: IS_PRODUCTION ? 'production' : 'sandbox',
      });

      res.json({
        success: true,
        status: 'connected',
        message: 'eBay APIに正常に接続できました',
        environment: IS_PRODUCTION ? 'production' : 'sandbox',
        tokenExpired: false,
        privileges: privilegeData,
        credential: {
          id: credential.id,
          createdAt: credential.createdAt,
          tokenExpiresAt: credential.tokenExpiresAt,
        },
      });
    } else {
      const errorData = await testResponse.json().catch(() => ({})) as { errors?: Array<{ message?: string; errorId?: string }> };

      // 401/403はトークン関連の問題
      if (testResponse.status === 401 || testResponse.status === 403) {
        log.warn({
          type: 'ebay_connection_test_auth_failed',
          status: testResponse.status,
          error: errorData,
        });

        res.json({
          success: false,
          status: 'auth_failed',
          message: 'トークンが無効または期限切れです',
          httpStatus: testResponse.status,
          error: errorData.errors?.[0]?.message,
          tokenExpired: true,
        });
      } else {
        log.error({
          type: 'ebay_connection_test_api_error',
          status: testResponse.status,
          error: errorData,
        });

        res.json({
          success: false,
          status: 'api_error',
          message: 'eBay APIエラー',
          httpStatus: testResponse.status,
          error: errorData.errors?.[0]?.message || 'Unknown error',
        });
      }
    }
  } catch (error: any) {
    log.error({
      type: 'ebay_connection_test_exception',
      error: error.message,
    });

    res.json({
      success: false,
      status: 'network_error',
      message: 'ネットワークエラー',
      error: error.message,
    });
  }
});

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

// ========================================
// 認証情報管理API
// ========================================

/**
 * マーケットプレイス認証情報を登録/更新
 * POST /api/marketplaces/credentials
 */
router.post('/credentials', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { marketplace, credentials, name } = req.body;

    if (!marketplace || !credentials) {
      res.status(400).json({
        success: false,
        error: 'marketplace and credentials are required',
      });
      return;
    }

    if (!['EBAY', 'JOOM'].includes(marketplace)) {
      res.status(400).json({
        success: false,
        error: 'marketplace must be EBAY or JOOM',
      });
      return;
    }

    // 既存の認証情報を無効化
    await prisma.marketplaceCredential.updateMany({
      where: { marketplace },
      data: { isActive: false },
    });

    // 新しい認証情報を登録
    const credential = await prisma.marketplaceCredential.create({
      data: {
        marketplace,
        name: name || `${marketplace} Credentials`,
        credentials,
        isActive: true,
      },
    });

    log.info({
      type: 'marketplace_credential_created',
      marketplace,
      credentialId: credential.id,
    });

    res.json({
      success: true,
      data: {
        id: credential.id,
        marketplace: credential.marketplace,
        name: credential.name,
        createdAt: credential.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * マーケットプレイス認証情報一覧
 * GET /api/marketplaces/credentials
 */
router.get('/credentials', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credentials = await prisma.marketplaceCredential.findMany({
      select: {
        id: true,
        marketplace: true,
        name: true,
        isActive: true,
        tokenExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { marketplace: 'asc' },
    });

    res.json({
      success: true,
      data: credentials,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * マーケットプレイス認証情報を削除
 * DELETE /api/marketplaces/credentials/:id
 */
router.delete('/credentials/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.marketplaceCredential.delete({
      where: { id },
    });

    log.info({
      type: 'marketplace_credential_deleted',
      credentialId: id,
    });

    res.json({
      success: true,
      message: 'Credential deleted',
    });
  } catch (error) {
    next(error);
  }
});

export { router as marketplacesRouter };

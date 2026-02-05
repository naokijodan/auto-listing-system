import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'auth-api' });

// eBay OAuth設定
const EBAY_AUTH_SANDBOX = 'https://auth.sandbox.ebay.com';
const EBAY_AUTH_PRODUCTION = 'https://auth.ebay.com';
const IS_PRODUCTION = process.env.EBAY_ENV === 'production';
const EBAY_AUTH_BASE = IS_PRODUCTION ? EBAY_AUTH_PRODUCTION : EBAY_AUTH_SANDBOX;

// eBay OAuth スコープ
const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.marketing',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
].join(' ');

/**
 * eBay OAuth認証URLを生成
 * GET /api/auth/ebay/authorize
 */
router.get('/ebay/authorize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = process.env.EBAY_CLIENT_ID;
    const ruName = process.env.EBAY_RU_NAME;
    const redirectUri = process.env.EBAY_REDIRECT_URI || `${process.env.APP_URL}/api/auth/ebay/callback`;

    if (!clientId || !ruName) {
      res.status(400).json({
        success: false,
        error: 'eBay OAuth not configured. Set EBAY_CLIENT_ID and EBAY_RU_NAME.',
      });
      return;
    }

    // State生成（CSRF対策）
    const state = Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7),
    })).toString('base64');

    // セッションに保存（本番ではRedisを使用）
    await prisma.oAuthState.create({
      data: {
        state,
        provider: 'EBAY',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10分
      },
    });

    const authUrl = new URL(`${EBAY_AUTH_BASE}/oauth2/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', ruName);
    authUrl.searchParams.set('scope', EBAY_SCOPES);
    authUrl.searchParams.set('state', state);

    log.info({
      type: 'ebay_oauth_authorize',
      redirectUri: ruName,
    });

    res.json({
      success: true,
      authUrl: authUrl.toString(),
      expiresIn: 600,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * eBay OAuthコールバック
 * GET /api/auth/ebay/callback
 */
router.get('/ebay/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      log.error({
        type: 'ebay_oauth_error',
        error,
        errorDescription: error_description,
      });

      res.redirect(`${process.env.WEB_URL}/settings/marketplaces?error=${error}`);
      return;
    }

    if (!code || !state) {
      res.status(400).json({
        success: false,
        error: 'Missing code or state',
      });
      return;
    }

    // State検証
    const savedState = await prisma.oAuthState.findFirst({
      where: {
        state: state as string,
        provider: 'EBAY',
        expiresAt: { gt: new Date() },
      },
    });

    if (!savedState) {
      res.status(400).json({
        success: false,
        error: 'Invalid or expired state',
      });
      return;
    }

    // State削除
    await prisma.oAuthState.delete({ where: { id: savedState.id } });

    // トークン交換
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    const ruName = process.env.EBAY_RU_NAME;

    if (!clientId || !clientSecret || !ruName) {
      res.status(500).json({
        success: false,
        error: 'eBay OAuth configuration incomplete',
      });
      return;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch(`${EBAY_AUTH_BASE}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: ruName,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_token_expires_in?: number;
      error?: string;
      error_description?: string;
    };

    if (!tokenResponse.ok) {
      log.error({
        type: 'ebay_token_exchange_failed',
        error: tokenData,
      });

      res.redirect(`${process.env.WEB_URL}/settings/marketplaces?error=token_exchange_failed`);
      return;
    }

    // 認証情報を保存
    const expiresIn = tokenData.expires_in || 7200; // デフォルト2時間
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const refreshExpiresAt = tokenData.refresh_token_expires_in
      ? new Date(Date.now() + tokenData.refresh_token_expires_in * 1000)
      : null;

    await prisma.marketplaceCredential.upsert({
      where: {
        marketplace_name: {
          marketplace: 'EBAY',
          name: 'default',
        },
      },
      create: {
        marketplace: 'EBAY',
        name: 'default',
        isActive: true,
        credentials: {
          clientId,
          clientSecret,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
        tokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
      },
      update: {
        isActive: true,
        credentials: {
          clientId,
          clientSecret,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
        },
        tokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
      },
    });

    log.info({
      type: 'ebay_oauth_success',
      expiresAt,
    });

    res.redirect(`${process.env.WEB_URL}/settings/marketplaces?success=ebay_connected`);
  } catch (error) {
    next(error);
  }
});

/**
 * eBay認証状態を確認
 * GET /api/auth/ebay/status
 */
router.get('/ebay/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'EBAY',
        isActive: true,
      },
    });

    if (!credential) {
      res.json({
        connected: false,
        message: 'Not connected',
      });
      return;
    }

    const isExpired = credential.tokenExpiresAt && credential.tokenExpiresAt < new Date();
    const refreshExpired = credential.refreshTokenExpiresAt && credential.refreshTokenExpiresAt < new Date();

    res.json({
      connected: true,
      tokenExpired: isExpired,
      refreshTokenExpired: refreshExpired,
      tokenExpiresAt: credential.tokenExpiresAt,
      refreshTokenExpiresAt: credential.refreshTokenExpiresAt,
      environment: IS_PRODUCTION ? 'production' : 'sandbox',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * eBay接続を解除
 * DELETE /api/auth/ebay
 */
router.delete('/ebay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.marketplaceCredential.updateMany({
      where: {
        marketplace: 'EBAY',
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    log.info({ type: 'ebay_disconnected' });

    res.json({
      success: true,
      message: 'eBay disconnected',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Joom認証状態を確認
 * GET /api/auth/joom/status
 */
router.get('/joom/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: {
        marketplace: 'JOOM',
        isActive: true,
      },
    });

    if (!credential) {
      res.json({
        connected: false,
        message: 'Not connected',
      });
      return;
    }

    res.json({
      connected: true,
      tokenExpiresAt: credential.tokenExpiresAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Joom APIトークンを設定
 * POST /api/auth/joom/token
 */
router.post('/joom/token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accessToken, refreshToken } = req.body;

    if (!accessToken) {
      res.status(400).json({
        success: false,
        error: 'accessToken is required',
      });
      return;
    }

    await prisma.marketplaceCredential.upsert({
      where: {
        marketplace_name: {
          marketplace: 'JOOM',
          name: 'default',
        },
      },
      create: {
        marketplace: 'JOOM',
        name: 'default',
        isActive: true,
        credentials: {
          accessToken,
          refreshToken,
        },
      },
      update: {
        isActive: true,
        credentials: {
          accessToken,
          refreshToken,
        },
      },
    });

    log.info({ type: 'joom_token_saved' });

    res.json({
      success: true,
      message: 'Joom token saved',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Joom接続を解除
 * DELETE /api/auth/joom
 */
router.delete('/joom', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.marketplaceCredential.updateMany({
      where: {
        marketplace: 'JOOM',
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    log.info({ type: 'joom_disconnected' });

    res.json({
      success: true,
      message: 'Joom disconnected',
    });
  } catch (error) {
    next(error);
  }
});

export { router as authRouter };

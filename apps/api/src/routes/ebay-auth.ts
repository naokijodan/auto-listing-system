import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'ebay-auth' });

const EBAY_CONFIG = {
  clientId: process.env.EBAY_CLIENT_ID || '',
  clientSecret: process.env.EBAY_CLIENT_SECRET || '',
  redirectUri: process.env.EBAY_REDIRECT_URI || 'http://localhost:3010/api/ebay/callback',
  scope: [
    'https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.marketing',
    'https://api.ebay.com/oauth/api_scope/sell.account',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  ].join(' '),
  sandbox: process.env.EBAY_SANDBOX === 'true',
};

function getBaseUrl(): string {
  return EBAY_CONFIG.sandbox
    ? 'https://auth.sandbox.ebay.com'
    : 'https://auth.ebay.com';
}

function getApiUrl(): string {
  return EBAY_CONFIG.sandbox
    ? 'https://api.sandbox.ebay.com'
    : 'https://api.ebay.com';
}

// OAuth認証開始
router.get('/auth', (req: Request, res: Response) => {
  if (!EBAY_CONFIG.clientId) {
    res.status(500).json({ error: 'eBay client ID not configured' });
    return;
  }

  const authUrl = new URL(`${getBaseUrl()}/oauth2/authorize`);
  authUrl.searchParams.set('client_id', EBAY_CONFIG.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', EBAY_CONFIG.redirectUri);
  authUrl.searchParams.set('scope', EBAY_CONFIG.scope);
  authUrl.searchParams.set('state', 'ebay_oauth_state');

  log.info({ type: 'ebay_auth_start', sandbox: EBAY_CONFIG.sandbox });
  res.redirect(authUrl.toString());
});

// OAuthコールバック
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  const { code, error } = req.query;

  if (error) {
    log.error({ type: 'ebay_auth_error', error });
    res.status(400).json({ error: `OAuth error: ${error}` });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'No authorization code provided' });
    return;
  }

  try {
    const tokenResponse = await fetch(`${getApiUrl()}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${EBAY_CONFIG.clientId}:${EBAY_CONFIG.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: EBAY_CONFIG.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      log.error({ type: 'ebay_token_error', status: tokenResponse.status, error: errorText });
      res.status(400).json({ error: 'Failed to get token', details: errorText });
      return;
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      refresh_token_expires_in?: number;
    };
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const refreshExpiresAt = new Date(Date.now() + (tokenData.refresh_token_expires_in || 47304000) * 1000);

    await prisma.marketplaceCredential.upsert({
      where: {
        marketplace_name: {
          marketplace: 'EBAY',
          name: 'default',
        },
      },
      update: {
        credentials: {
          clientId: EBAY_CONFIG.clientId,
          clientSecret: EBAY_CONFIG.clientSecret,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          sandbox: EBAY_CONFIG.sandbox,
        },
        tokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        isActive: true,
      },
      create: {
        marketplace: 'EBAY',
        name: 'default',
        credentials: {
          clientId: EBAY_CONFIG.clientId,
          clientSecret: EBAY_CONFIG.clientSecret,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          sandbox: EBAY_CONFIG.sandbox,
        },
        tokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        isActive: true,
      },
    });

    log.info({ type: 'ebay_auth_success', expiresAt });
    res.redirect('/settings?ebay=connected');
  } catch (error) {
    next(error);
  }
});

// トークンリフレッシュ
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'EBAY', isActive: true },
    });

    if (!credential) {
      res.status(404).json({ error: 'No eBay credentials found' });
      return;
    }

    const creds = credential.credentials as Record<string, string>;

    const tokenResponse = await fetch(`${getApiUrl()}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refreshToken,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      res.status(400).json({ error: 'Failed to refresh token', details: errorText });
      return;
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string;
      expires_in: number;
    };
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    await prisma.marketplaceCredential.update({
      where: { id: credential.id },
      data: {
        credentials: {
          ...creds,
          accessToken: tokenData.access_token,
        },
        tokenExpiresAt: expiresAt,
      },
    });

    log.info({ type: 'ebay_token_refreshed', expiresAt });
    res.json({ success: true, expiresAt });
  } catch (error) {
    next(error);
  }
});

// 認証状態確認
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'EBAY', isActive: true },
    });

    if (!credential) {
      res.json({ connected: false });
      return;
    }

    const isExpired = credential.tokenExpiresAt && credential.tokenExpiresAt < new Date();
    const creds = credential.credentials as Record<string, unknown>;

    res.json({
      connected: true,
      sandbox: creds?.sandbox || false,
      tokenExpiresAt: credential.tokenExpiresAt,
      isExpired,
      needsRefresh: isExpired,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';

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

// BullMQ: scrapeQueue（手動トリガー用）
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const scrapeQueue = new Queue(QUEUE_NAMES.SCRAPE, { connection: redis });

// OAuth認証開始
router.get('/auth', (req: Request, res: Response) => {
  if (!EBAY_CONFIG.clientId) {
    res.status(500).json({ error: 'eBay client ID not configured' });
    return;
  }

  // マルチアカウント対応: accountName を state に含める
  const accountName = (req.query.accountName as string) || 'default';
  const stateData = JSON.stringify({ accountName });
  const stateEncoded = Buffer.from(stateData).toString('base64');

  const authUrl = new URL(`${getBaseUrl()}/oauth2/authorize`);
  authUrl.searchParams.set('client_id', EBAY_CONFIG.clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', EBAY_CONFIG.redirectUri);
  authUrl.searchParams.set('scope', EBAY_CONFIG.scope);
  authUrl.searchParams.set('state', stateEncoded);

  log.info({ type: 'ebay_auth_start', sandbox: EBAY_CONFIG.sandbox });
  res.redirect(authUrl.toString());
});

// OAuthコールバック
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  const { code, error, state } = req.query;

  if (error) {
    log.error({ type: 'ebay_auth_error', error });
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3012';
    res.redirect(`${frontendUrl}/settings?ebay=error&message=${encodeURIComponent(error as string)}`);
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'No authorization code provided' });
    return;
  }

  try {
    // accountName を state から復元
    let accountName = 'default';
    if (state && typeof state === 'string') {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8')) as { accountName?: string };
        accountName = stateData.accountName || 'default';
      } catch {
        // state がパースできない場合はデフォルト
      }
    }

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
          name: accountName,
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
        name: accountName,
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
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3012';
    res.redirect(`${frontendUrl}/settings?ebay=connected&account=${encodeURIComponent(accountName)}`);
  } catch (error) {
    next(error);
  }
});

// トークンリフレッシュ
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { credentialId } = req.body as { credentialId?: string };

    const credential = credentialId
      ? await prisma.marketplaceCredential.findUnique({
          where: { id: credentialId },
        })
      : await prisma.marketplaceCredential.findFirst({
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

// 全eBayアカウント一覧
router.get('/accounts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credentials = await prisma.marketplaceCredential.findMany({
      where: { marketplace: 'EBAY' },
      orderBy: { createdAt: 'asc' },
    });

    const accounts = credentials.map(cred => {
      const creds = cred.credentials as Record<string, unknown>;
      const isExpired = cred.tokenExpiresAt ? cred.tokenExpiresAt < new Date() : false;
      return {
        id: cred.id,
        name: cred.name,
        isActive: cred.isActive,
        sandbox: (creds?.sandbox as boolean) || false,
        tokenExpiresAt: cred.tokenExpiresAt,
        isExpired,
        needsRefresh: isExpired,
        createdAt: cred.createdAt,
      };
    });

    res.json({ accounts });
  } catch (error) {
    next(error);
  }
});

// アカウント削除（無効化）
router.delete('/accounts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.marketplaceCredential.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/ebay/taxonomy/sync - 手動Taxonomy同期
router.post('/taxonomy/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { marketplaceIds, categoryIds } = req.body as { marketplaceIds?: string[]; categoryIds?: string[] };
    const job = await scrapeQueue.add(
      'ebay-taxonomy-sync',
      {
        type: 'ebay-taxonomy-sync',
        marketplaceIds: marketplaceIds || ['EBAY_US'],
        categoryIds,
        triggeredAt: new Date().toISOString(),
        manual: true,
      },
      { priority: 3 }
    );
    log.info({ type: 'manual_ebay_taxonomy_sync_triggered', jobId: job.id });
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    next(error);
  }
});

// POST /api/ebay/policies/sync - 手動Policy同期
router.post('/policies/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { marketplaceIds } = req.body as { marketplaceIds?: string[] };
    const job = await scrapeQueue.add(
      'ebay-policy-sync',
      {
        type: 'ebay-policy-sync',
        marketplaceIds: marketplaceIds || ['EBAY_US'],
        triggeredAt: new Date().toISOString(),
        manual: true,
      },
      { priority: 3 }
    );
    log.info({ type: 'manual_ebay_policy_sync_triggered', jobId: job.id });
    res.json({ success: true, jobId: job.id });
  } catch (error) {
    next(error);
  }
});

export default router;

// =============================
// eBayポリシー取得（DB）
// =============================

// GET /api/ebay/policies - DB保存済みポリシー一覧取得
router.get('/policies', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { marketplaceId } = req.query as { marketplaceId?: string };
    const policies = await (prisma as any).ebayPolicy.findMany({
      where: marketplaceId ? { marketplaceId } : {},
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    const grouped = {
      fulfillment: policies.filter((p: any) => p.type === 'FULFILLMENT'),
      payment: policies.filter((p: any) => p.type === 'PAYMENT'),
      return: policies.filter((p: any) => p.type === 'RETURN'),
    };

    res.json({ success: true, data: grouped });
  } catch (error) {
    next(error);
  }
});

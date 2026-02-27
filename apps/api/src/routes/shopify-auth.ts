import express, { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'shopify-auth' });

function getApiKey(): string {
  return process.env.SHOPIFY_API_KEY || '';
}

function getApiSecret(): string {
  return process.env.SHOPIFY_API_SECRET || '';
}

function getScopes(): string {
  return (
    process.env.SHOPIFY_SCOPES ||
    'read_products,write_products,read_inventory,write_inventory,read_orders,write_orders'
  );
}

function getRedirectUri(): string {
  return process.env.SHOPIFY_REDIRECT_URI || 'http://localhost:3010/api/shopify/callback';
}

function normalizeShopDomain(shopParam?: string): string | null {
  if (!shopParam) return null;
  const shop = shopParam.toLowerCase().trim();
  if (shop.endsWith('.myshopify.com')) return shop;
  return `${shop}.myshopify.com`;
}

function verifyShopifyHmacFromQuery(query: Record<string, any>, secret: string): boolean {
  const { hmac, signature, ...rest } = query as any;
  if (!hmac || typeof hmac !== 'string') return false;
  const message = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${Array.isArray(rest[k]) ? rest[k].join(',') : rest[k]}`)
    .join('&');
  const calculated = crypto.createHmac('sha256', secret).update(message).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac, 'utf8'), Buffer.from(calculated, 'utf8'));
  } catch {
    return false;
  }
}

function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string | undefined, secret: string): boolean {
  if (!hmacHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(hmacHeader, 'utf8'), Buffer.from(digest, 'utf8'));
  } catch {
    return false;
  }
}

// GET /auth - OAuth認証開始
router.get('/auth', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = getApiKey();
    const apiSecret = getApiSecret();
    if (!apiKey || !apiSecret) {
      res.status(500).json({ error: 'SHOPIFY_API_KEY/SECRET not configured' });
      return;
    }

    const shopParam = (req.query.shop as string) || '';
    const shop = normalizeShopDomain(shopParam);
    if (!shop) {
      res.status(400).json({ error: 'Missing or invalid shop parameter' });
      return;
    }

    const state = crypto.randomBytes(16).toString('hex');
    const scopes = getScopes().split(',').map((s) => s.trim()).join(',');
    const redirectUri = getRedirectUri();

    await prisma.oAuthState.create({
      data: {
        state,
        provider: 'SHOPIFY',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        metadata: { shop, scopes, redirectUri },
      },
    });

    const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
    authUrl.searchParams.set('client_id', apiKey);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);

    log.info({ type: 'shopify_auth_start', shop });
    res.redirect(authUrl.toString());
  } catch (error) {
    next(error);
  }
});

// GET /callback - アクセストークン取得・DB保存
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code, state, shop: shopParam, hmac } = req.query as any;
    if (!code || !state || !shopParam) {
      res.status(400).json({ error: 'Missing code/state/shop' });
      return;
    }

    const record = await prisma.oAuthState.findUnique({ where: { state } });
    if (!record || record.provider !== 'SHOPIFY' || (record.expiresAt && record.expiresAt < new Date())) {
      res.status(400).json({ error: 'Invalid or expired state' });
      return;
    }

    const shop = normalizeShopDomain(String(shopParam));
    if (!shop) {
      res.status(400).json({ error: 'Invalid shop' });
      return;
    }

    // hmac検証
    const secret = getApiSecret();
    if (process.env.NODE_ENV === 'production') {
      if (!verifyShopifyHmacFromQuery(req.query as any, secret)) {
        res.status(401).json({ error: 'Invalid HMAC' });
        return;
      }
    }

    const apiKey = getApiKey();
    const apiSecret = getApiSecret();
    const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: apiKey, client_secret: apiSecret, code }),
    });
    const tokenText = await tokenResp.text();
    if (!tokenResp.ok) {
      log.error({ type: 'shopify_token_error', status: tokenResp.status, error: tokenText });
      res.status(400).json({ error: 'Failed to get token', details: tokenText });
      return;
    }
    const tokenData = JSON.parse(tokenText) as { access_token: string; scope?: string };

    await prisma.marketplaceCredential.upsert({
      where: { marketplace_name: { marketplace: 'SHOPIFY', name: 'default' } },
      update: {
        credentials: {
          apiKey,
          apiSecret,
          accessToken: tokenData.access_token,
          shop,
          scopes: tokenData.scope || getScopes(),
          apiBase: `https://${shop}/admin/api/2026-01`,
        },
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        isActive: true,
      },
      create: {
        marketplace: 'SHOPIFY',
        name: 'default',
        credentials: {
          apiKey,
          apiSecret,
          accessToken: tokenData.access_token,
          shop,
          scopes: tokenData.scope || getScopes(),
          apiBase: `https://${shop}/admin/api/2026-01`,
        },
        tokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        isActive: true,
      },
    });

    await prisma.oAuthState.delete({ where: { state } });

    log.info({ type: 'shopify_auth_success', shop });
    res.redirect('/settings?shopify=connected');
  } catch (error) {
    next(error);
  }
});

// POST /refresh - 永続トークンのため基本不要
router.post('/refresh', async (_req: Request, res: Response) => {
  res.json({ success: true, note: 'Shopify uses offline tokens; no refresh needed.' });
});

// GET /status - 認証状態確認
router.get('/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({ where: { marketplace: 'SHOPIFY', isActive: true } });
    if (!credential) {
      res.json({ connected: false });
      return;
    }
    const creds = (credential.credentials as any) || {};
    res.json({ connected: true, shop: creds.shop, scopes: creds.scopes, tokenExpiresAt: null });
  } catch (error) {
    next(error);
  }
});

// POST /webhook - Shopify Webhook受信
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const secret = getApiSecret();
    const hmacHeader = req.headers['x-shopify-hmac-sha256'] as string | undefined;
    const topic = (req.headers['x-shopify-topic'] as string | undefined) || 'unknown';
    const shopDomain = (req.headers['x-shopify-shop-domain'] as string | undefined) || '';
    const rawBody = req.body as any as Buffer;

    if (process.env.NODE_ENV === 'production') {
      if (!verifyShopifyWebhook(rawBody, hmacHeader, secret)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      payload = {};
    }

    await prisma.webhookEvent.create({
      data: {
        provider: 'SHOPIFY',
        eventType: topic,
        payload,
        headers: { shop: shopDomain },
        signature: hmacHeader || null,
        status: 'PENDING',
      },
    });

    // 必要に応じて、注文/在庫の即時処理をここでキック
    res.status(200).json({ received: true });
  } catch (e) {
    log.error({ type: 'shopify_webhook_error', error: (e as any).message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export const shopifyAuthRouter = router;


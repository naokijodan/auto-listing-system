import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ module: 'etsy-auth' });

const ETSY_API_BASE = 'https://openapi.etsy.com/v3';
const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';

function getClientId(): string {
  return process.env.ETSY_API_KEY || '';
}

function getRedirectUri(): string {
  return process.env.ETSY_REDIRECT_URI || 'http://localhost:3010/api/etsy/callback';
}

// GET /auth - OAuth認証開始（PKCE）
router.get('/auth', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId();
    if (!clientId) {
      res.status(500).json({ error: 'ETSY_API_KEY not configured' });
      return;
    }

    // PKCE: code_verifier → code_challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    // state: CSRF保護
    const state = crypto.randomBytes(16).toString('hex');

    const redirectUri = getRedirectUri();
    const scopes = [
      'listings_r', 'listings_w', 'listings_d',
      'transactions_r', 'transactions_w',
      'shops_r', 'shops_w',
      'profile_r',
      'email_r',
    ].join(' ');

    // セッションにcode_verifierとstateを保存（DBに一時保存）
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分
    await prisma.oAuthState.create({
      data: {
        state,
        provider: 'ETSY',
        expiresAt,
        metadata: {
          codeVerifier,
          redirectUri,
          scopes,
        },
      },
    });

    const authUrl = new URL(ETSY_AUTH_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    log.info({ type: 'etsy_auth_start' });
    res.redirect(authUrl.toString());
  } catch (error) {
    next(error);
  }
});

// GET /callback - OAuthコールバック
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  const { code, state, error } = req.query;

  if (error) {
    log.error({ type: 'etsy_auth_error', error });
    res.status(400).json({ error: `OAuth error: ${error}` });
    return;
  }

  if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  try {
    const record = await prisma.oAuthState.findUnique({ where: { state } });
    if (!record || record.provider !== 'ETSY' || (record.expiresAt && record.expiresAt < new Date())) {
      res.status(400).json({ error: 'Invalid or expired state' });
      return;
    }

    const metadata = (record.metadata as any) || {};
    const codeVerifier: string | undefined = metadata.codeVerifier;
    const redirectUri: string = metadata.redirectUri || getRedirectUri();
    const clientId = getClientId();

    if (!codeVerifier) {
      res.status(400).json({ error: 'code_verifier not found for state' });
      return;
    }

    const tokenResponse = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
    });

    const tokenText = await tokenResponse.text();
    if (!tokenResponse.ok) {
      log.error({ type: 'etsy_token_error', status: tokenResponse.status, error: tokenText });
      res.status(400).json({ error: 'Failed to get token', details: tokenText });
      return;
    }

    const tokenData = JSON.parse(tokenText) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      refresh_token_expires_in?: number;
      token_type?: string;
      scope?: string;
    };

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    const refreshExpiresAt = new Date(Date.now() + (tokenData.refresh_token_expires_in || 60 * 24 * 60 * 60) * 1000);

    await prisma.marketplaceCredential.upsert({
      where: {
        marketplace_name: { marketplace: 'ETSY', name: 'default' },
      },
      update: {
        credentials: {
          clientId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type || 'Bearer',
          scope: tokenData.scope,
          apiBase: ETSY_API_BASE,
        },
        tokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        isActive: true,
      },
      create: {
        marketplace: 'ETSY',
        name: 'default',
        credentials: {
          clientId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type || 'Bearer',
          scope: tokenData.scope,
          apiBase: ETSY_API_BASE,
        },
        tokenExpiresAt: expiresAt,
        refreshTokenExpiresAt: refreshExpiresAt,
        isActive: true,
      },
    });

    // stateを削除
    await prisma.oAuthState.delete({ where: { state } });

    log.info({ type: 'etsy_auth_success', expiresAt });
    res.redirect('/settings?etsy=connected');
  } catch (err) {
    next(err);
  }
});

// POST /refresh - トークンリフレッシュ
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'ETSY', isActive: true },
    });

    if (!credential) {
      res.status(404).json({ error: 'No Etsy credentials found' });
      return;
    }

    const creds = credential.credentials as Record<string, any>;
    const clientId: string = creds.clientId || getClientId();
    const refreshToken: string | undefined = creds.refreshToken;
    if (!refreshToken) {
      res.status(400).json({ error: 'No refresh token' });
      return;
    }

    const tokenResponse = await fetch(ETSY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshToken,
      }),
    });

    const tokenText = await tokenResponse.text();
    if (!tokenResponse.ok) {
      res.status(400).json({ error: 'Failed to refresh token', details: tokenText });
      return;
    }

    const tokenData = JSON.parse(tokenText) as {
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

    log.info({ type: 'etsy_token_refreshed', expiresAt });
    res.json({ success: true, expiresAt });
  } catch (error) {
    next(error);
  }
});

// GET /status - 認証状態確認
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'ETSY', isActive: true },
    });

    if (!credential) {
      res.json({ connected: false });
      return;
    }

    const isExpired = !!credential.tokenExpiresAt && credential.tokenExpiresAt < new Date();
    res.json({
      connected: true,
      tokenExpiresAt: credential.tokenExpiresAt,
      isExpired,
      needsRefresh: isExpired,
    });
  } catch (error) {
    next(error);
  }
});

export default router;



import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { z } from 'zod';
import crypto from 'crypto';

const router = Router();

// ========================================
// SSO統計
// ========================================
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalProviders,
      activeProviders,
      activeSessions,
      todayLogins,
      failedLogins,
      providersByType,
    ] = await Promise.all([
      prisma.sSOProvider.count(),
      prisma.sSOProvider.count({ where: { status: 'ACTIVE' } }),
      prisma.sSOSession.count({ where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
      prisma.sSOAuditLog.count({
        where: {
          action: 'LOGIN_SUCCESS',
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.sSOAuditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.sSOProvider.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
    ]);

    res.json({
      totalProviders,
      activeProviders,
      activeSessions,
      todayLogins,
      failedLogins,
      providersByType: providersByType.map((p) => ({
        type: p.type,
        count: p._count.id,
      })),
    });
  } catch (error) {
    console.error('Failed to get SSO stats:', error);
    res.status(500).json({ error: 'Failed to get SSO stats' });
  }
});

// ========================================
// プロバイダータイプ一覧
// ========================================
router.get('/provider-types', (_req: Request, res: Response) => {
  const providerTypes = [
    {
      type: 'GOOGLE',
      name: 'Google Workspace',
      description: 'Sign in with Google (OAuth 2.0)',
      icon: 'google',
      configFields: ['clientId', 'clientSecret'],
      scopes: ['openid', 'email', 'profile'],
    },
    {
      type: 'MICROSOFT',
      name: 'Microsoft Azure AD',
      description: 'Sign in with Microsoft (OIDC)',
      icon: 'microsoft',
      configFields: ['clientId', 'clientSecret', 'tenantId'],
      scopes: ['openid', 'email', 'profile', 'User.Read'],
    },
    {
      type: 'OKTA',
      name: 'Okta',
      description: 'Enterprise Identity Management',
      icon: 'okta',
      configFields: ['clientId', 'clientSecret', 'issuerUrl'],
      scopes: ['openid', 'email', 'profile'],
    },
    {
      type: 'AUTH0',
      name: 'Auth0',
      description: 'Identity Platform',
      icon: 'auth0',
      configFields: ['clientId', 'clientSecret', 'domain'],
      scopes: ['openid', 'email', 'profile'],
    },
    {
      type: 'SAML',
      name: 'SAML 2.0',
      description: 'Enterprise SAML Identity Provider',
      icon: 'saml',
      configFields: ['entityId', 'ssoUrl', 'certificate'],
      scopes: [],
    },
    {
      type: 'OIDC',
      name: 'OpenID Connect',
      description: 'Generic OIDC Provider',
      icon: 'oidc',
      configFields: ['clientId', 'clientSecret', 'issuerUrl'],
      scopes: ['openid', 'email', 'profile'],
    },
    {
      type: 'LDAP',
      name: 'LDAP/Active Directory',
      description: 'Enterprise Directory Service',
      icon: 'ldap',
      configFields: ['serverUrl', 'bindDn', 'bindPassword', 'baseDn'],
      scopes: [],
    },
  ];

  res.json(providerTypes);
});

// ========================================
// プロバイダー一覧
// ========================================
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const { status, type, organizationId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (organizationId) where.organizationId = organizationId;

    const providers = await prisma.sSOProvider.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        status: true,
        autoProvision: true,
        autoSync: true,
        allowedDomains: true,
        defaultRole: true,
        lastSyncAt: true,
        lastErrorAt: true,
        lastError: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: { where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } },
          },
        },
      },
    });

    res.json(
      providers.map((p) => ({
        ...p,
        activeSessions: p._count.sessions,
        _count: undefined,
      }))
    );
  } catch (error) {
    console.error('Failed to get SSO providers:', error);
    res.status(500).json({ error: 'Failed to get SSO providers' });
  }
});

// ========================================
// プロバイダー作成
// ========================================
const createProviderSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  type: z.enum(['GOOGLE', 'MICROSOFT', 'OKTA', 'AUTH0', 'SAML', 'OIDC', 'LDAP']),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  issuerUrl: z.string().optional(),
  authorizationUrl: z.string().optional(),
  tokenUrl: z.string().optional(),
  userInfoUrl: z.string().optional(),
  jwksUrl: z.string().optional(),
  entityId: z.string().optional(),
  ssoUrl: z.string().optional(),
  sloUrl: z.string().optional(),
  certificate: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  allowedDomains: z.array(z.string()).optional(),
  defaultRole: z.string().optional(),
  autoProvision: z.boolean().optional(),
  autoSync: z.boolean().optional(),
  organizationId: z.string().optional(),
  attributeMapping: z.record(z.string()).optional(),
});

router.post('/providers', async (req: Request, res: Response) => {
  try {
    const data = createProviderSchema.parse(req.body);

    // Googleの場合、URLを自動設定
    let urls: any = {};
    if (data.type === 'GOOGLE') {
      urls = {
        issuerUrl: 'https://accounts.google.com',
        authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
        jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
      };
    } else if (data.type === 'MICROSOFT') {
      const tenantId = (data as any).tenantId || 'common';
      urls = {
        issuerUrl: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        authorizationUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
        jwksUrl: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
      };
    }

    const provider = await prisma.sSOProvider.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        type: data.type,
        status: 'CONFIGURING',
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        issuerUrl: data.issuerUrl || urls.issuerUrl,
        authorizationUrl: data.authorizationUrl || urls.authorizationUrl,
        tokenUrl: data.tokenUrl || urls.tokenUrl,
        userInfoUrl: data.userInfoUrl || urls.userInfoUrl,
        jwksUrl: data.jwksUrl || urls.jwksUrl,
        entityId: data.entityId,
        ssoUrl: data.ssoUrl,
        sloUrl: data.sloUrl,
        certificate: data.certificate,
        scopes: data.scopes || ['openid', 'email', 'profile'],
        allowedDomains: data.allowedDomains || [],
        defaultRole: data.defaultRole || 'MEMBER',
        autoProvision: data.autoProvision ?? true,
        autoSync: data.autoSync ?? true,
        organizationId: data.organizationId,
        attributeMapping: data.attributeMapping || {},
      },
    });

    res.status(201).json(provider);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Failed to create SSO provider:', error);
    res.status(500).json({ error: 'Failed to create SSO provider' });
  }
});

// ========================================
// プロバイダー詳細
// ========================================
router.get('/providers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const provider = await prisma.sSOProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sessions: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // シークレットをマスク
    const masked = {
      ...provider,
      clientSecret: provider.clientSecret ? '********' : null,
      certificate: provider.certificate ? '[CERTIFICATE]' : null,
    };

    res.json(masked);
  } catch (error) {
    console.error('Failed to get SSO provider:', error);
    res.status(500).json({ error: 'Failed to get SSO provider' });
  }
});

// ========================================
// プロバイダー更新
// ========================================
router.patch('/providers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // clientSecretが'********'の場合は更新しない
    if (updateData.clientSecret === '********') {
      delete updateData.clientSecret;
    }

    const provider = await prisma.sSOProvider.update({
      where: { id },
      data: updateData,
    });

    res.json(provider);
  } catch (error) {
    console.error('Failed to update SSO provider:', error);
    res.status(500).json({ error: 'Failed to update SSO provider' });
  }
});

// ========================================
// プロバイダー削除
// ========================================
router.delete('/providers/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.sSOProvider.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete SSO provider:', error);
    res.status(500).json({ error: 'Failed to delete SSO provider' });
  }
});

// ========================================
// プロバイダーアクティベート
// ========================================
router.post('/providers/:id/activate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const provider = await prisma.sSOProvider.findUnique({ where: { id } });
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // 設定検証
    const errors: string[] = [];
    if (['GOOGLE', 'MICROSOFT', 'OKTA', 'AUTH0', 'OIDC'].includes(provider.type)) {
      if (!provider.clientId) errors.push('Client ID is required');
      if (!provider.clientSecret) errors.push('Client Secret is required');
    }
    if (provider.type === 'SAML') {
      if (!provider.entityId) errors.push('Entity ID is required');
      if (!provider.ssoUrl) errors.push('SSO URL is required');
      if (!provider.certificate) errors.push('Certificate is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Configuration incomplete', details: errors });
    }

    const updated = await prisma.sSOProvider.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    // 監査ログ
    await prisma.sSOAuditLog.create({
      data: {
        providerId: id,
        action: 'PROVIDER_ACTIVATED',
        status: 'SUCCESS',
        category: 'CONFIGURATION',
        details: { activatedAt: new Date().toISOString() },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to activate SSO provider:', error);
    res.status(500).json({ error: 'Failed to activate SSO provider' });
  }
});

// ========================================
// プロバイダーデアクティベート
// ========================================
router.post('/providers/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await prisma.sSOProvider.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // 全セッションを無効化
    await prisma.sSOSession.updateMany({
      where: { providerId: id, status: 'ACTIVE' },
      data: { status: 'REVOKED' },
    });

    // 監査ログ
    await prisma.sSOAuditLog.create({
      data: {
        providerId: id,
        action: 'PROVIDER_DEACTIVATED',
        status: 'SUCCESS',
        category: 'CONFIGURATION',
        details: { deactivatedAt: new Date().toISOString() },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Failed to deactivate SSO provider:', error);
    res.status(500).json({ error: 'Failed to deactivate SSO provider' });
  }
});

// ========================================
// SSO認証開始（OAuth/OIDC）
// ========================================
router.get('/providers/:id/authorize', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { redirectUri, state } = req.query;

    const provider = await prisma.sSOProvider.findUnique({ where: { id } });
    if (!provider || provider.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Provider not available' });
    }

    if (!provider.authorizationUrl || !provider.clientId) {
      return res.status(400).json({ error: 'Provider not properly configured' });
    }

    // PKCE対応（推奨）
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    const authState = (state as string) || crypto.randomBytes(16).toString('hex');

    // 認証URLを構築
    const params = new URLSearchParams({
      client_id: provider.clientId,
      response_type: 'code',
      redirect_uri: (redirectUri as string) || `${process.env.APP_URL}/api/sso/callback`,
      scope: provider.scopes.join(' '),
      state: authState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `${provider.authorizationUrl}?${params.toString()}`;

    // 監査ログ
    await prisma.sSOAuditLog.create({
      data: {
        providerId: id,
        action: 'LOGIN_INITIATED',
        status: 'SUCCESS',
        category: 'AUTHENTICATION',
        details: { state: authState },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      authUrl,
      state: authState,
      codeVerifier, // クライアント側で保存が必要
    });
  } catch (error) {
    console.error('Failed to initiate SSO:', error);
    res.status(500).json({ error: 'Failed to initiate SSO' });
  }
});

// ========================================
// セッション一覧
// ========================================
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const { providerId, userId, status, limit = '50' } = req.query;

    const where: any = {};
    if (providerId) where.providerId = providerId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const sessions = await prisma.sSOSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: {
        provider: {
          select: { id: true, name: true, displayName: true, type: true },
        },
      },
    });

    res.json(sessions);
  } catch (error) {
    console.error('Failed to get SSO sessions:', error);
    res.status(500).json({ error: 'Failed to get SSO sessions' });
  }
});

// ========================================
// セッション無効化
// ========================================
router.post('/sessions/:id/revoke', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const session = await prisma.sSOSession.update({
      where: { id },
      data: { status: 'REVOKED' },
      include: { provider: true },
    });

    // 監査ログ
    await prisma.sSOAuditLog.create({
      data: {
        providerId: session.providerId,
        userId: session.userId,
        action: 'SESSION_REVOKED',
        status: 'SUCCESS',
        category: 'SESSION',
        details: { sessionId: id },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to revoke SSO session:', error);
    res.status(500).json({ error: 'Failed to revoke SSO session' });
  }
});

// ========================================
// 監査ログ
// ========================================
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { providerId, userId, action, status, limit = '100', offset = '0' } = req.query;

    const where: any = {};
    if (providerId) where.providerId = providerId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.sSOAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          provider: {
            select: { id: true, name: true, type: true },
          },
        },
      }),
      prisma.sSOAuditLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (error) {
    console.error('Failed to get SSO audit logs:', error);
    res.status(500).json({ error: 'Failed to get SSO audit logs' });
  }
});

// ========================================
// ドメイン検証
// ========================================
router.post('/verify-domain', async (req: Request, res: Response) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // ドメインを使用しているプロバイダーを検索
    const providers = await prisma.sSOProvider.findMany({
      where: {
        status: 'ACTIVE',
        allowedDomains: { has: domain },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
      },
    });

    if (providers.length === 0) {
      return res.json({ ssoAvailable: false, providers: [] });
    }

    res.json({ ssoAvailable: true, providers });
  } catch (error) {
    console.error('Failed to verify domain:', error);
    res.status(500).json({ error: 'Failed to verify domain' });
  }
});

export { router as ssoRouter };

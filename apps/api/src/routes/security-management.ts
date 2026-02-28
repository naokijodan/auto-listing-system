
/**
 * セキュリティ管理API
 * Phase 82: セキュリティ強化
 */

import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import crypto from 'crypto';
import { authenticator } from 'otplib';

const router = Router();

// ========================================
// 2要素認証
// ========================================

/**
 * @swagger
 * /api/security/2fa/setup:
 *   post:
 *     summary: 2FA設定を開始
 *     tags: [Security]
 */
router.post('/2fa/setup', async (req, res, next) => {
  try {
    const { userId, method = 'TOTP' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 既存の設定を確認
    const existing = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existing?.isEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // シークレットを生成
    const secret = authenticator.generateSecret();

    // バックアップコードを生成
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex').toUpperCase()
    );

    // 2FA設定を作成または更新
    const twoFactorAuth = await prisma.twoFactorAuth.upsert({
      where: { userId },
      update: {
        method,
        totpSecret: secret,
        backupCodes,
        isVerified: false,
        isEnabled: false,
      },
      create: {
        userId,
        method,
        totpSecret: secret,
        backupCodes,
      },
    });

    // OTPAuthURLを生成
    const otpAuthUrl = authenticator.keyuri(userId, 'RAKUDA', secret);

    logger.info(`2FA setup initiated for user: ${userId}`);

    res.json({
      id: twoFactorAuth.id,
      method,
      secret,
      otpAuthUrl,
      backupCodes,
      message: '2FA設定が開始されました。認証アプリでQRコードをスキャンしてください。',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/2fa/verify:
 *   post:
 *     summary: 2FAを検証して有効化
 *     tags: [Security]
 */
router.post('/2fa/verify', async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code are required' });
    }

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth) {
      return res.status(404).json({ error: '2FA setup not found' });
    }

    if (twoFactorAuth.isEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // コードを検証
    const isValid = authenticator.verify({
      token: code,
      secret: twoFactorAuth.totpSecret || '',
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // 2FAを有効化
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        isEnabled: true,
        enabledAt: new Date(),
      },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'TWO_FACTOR_ENABLE',
        category: 'AUTHENTICATION',
        severity: 'INFO',
        userId,
        status: 'SUCCESS',
        details: { method: twoFactorAuth.method },
      },
    });

    logger.info(`2FA enabled for user: ${userId}`);

    res.json({
      success: true,
      message: '2FAが有効化されました',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/2fa/validate:
 *   post:
 *     summary: 2FAコードを検証（ログイン時）
 *     tags: [Security]
 */
router.post('/2fa/validate', async (req, res, next) => {
  try {
    const { userId, code, ipAddress, userAgent } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code are required' });
    }

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // コードを検証（TOTP）
    let isValid = authenticator.verify({
      token: code,
      secret: twoFactorAuth.totpSecret || '',
    });

    // バックアップコードで検証
    if (!isValid && twoFactorAuth.backupCodes.includes(code.toUpperCase())) {
      isValid = true;
      // バックアップコードを使用済みに
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: twoFactorAuth.backupCodes.filter(
            c => c !== code.toUpperCase()
          ),
          backupCodesUsed: { increment: 1 },
        },
      });
    }

    if (!isValid) {
      // 使用カウントをインクリメント（失敗追跡用）
      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          useCount: { increment: 1 },
        },
      });

      // 監査ログ
      await prisma.securityAuditLog.create({
        data: {
          action: 'TWO_FACTOR_VERIFY',
          category: 'AUTHENTICATION',
          severity: 'WARNING',
          userId,
          status: 'FAILURE',
          ipAddress,
          userAgent,
          details: { reason: 'invalid_code' },
        },
      });

      return res.status(400).json({ error: 'Invalid code' });
    }

    // 成功
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'TWO_FACTOR_VERIFY',
        category: 'AUTHENTICATION',
        severity: 'INFO',
        userId,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
      },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/2fa/disable:
 *   post:
 *     summary: 2FAを無効化
 *     tags: [Security]
 */
router.post('/2fa/disable', async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId and code are required' });
    }

    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // コードを検証
    const isValid = authenticator.verify({
      token: code,
      secret: twoFactorAuth.totpSecret || '',
    });

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // 2FAを無効化
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        isEnabled: false,
      },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'TWO_FACTOR_DISABLE',
        category: 'AUTHENTICATION',
        severity: 'WARNING',
        userId,
        status: 'SUCCESS',
      },
    });

    logger.info(`2FA disabled for user: ${userId}`);

    res.json({
      success: true,
      message: '2FAが無効化されました',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/2fa/status/{userId}:
 *   get:
 *     summary: 2FAステータスを取得
 *     tags: [Security]
 */
router.get('/2fa/status/:userId', async (req, res, next) => {
  try {
    const twoFactorAuth = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.params.userId },
    });

    if (!twoFactorAuth) {
      return res.json({
        enabled: false,
        verified: false,
        method: null,
      });
    }

    res.json({
      enabled: twoFactorAuth.isEnabled,
      verified: twoFactorAuth.isVerified,
      method: twoFactorAuth.method,
      enabledAt: twoFactorAuth.enabledAt,
      lastUsedAt: twoFactorAuth.lastUsedAt,
      remainingBackupCodes: twoFactorAuth.backupCodes.length,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 監査ログ
// ========================================

/**
 * @swagger
 * /api/security/audit-logs:
 *   get:
 *     summary: 監査ログ一覧を取得
 *     tags: [Security]
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const {
      userId,
      action,
      category,
      severity,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '50',
    } = req.query;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate as string);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [logs, total] = await Promise.all([
      prisma.securityAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.securityAuditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/audit-logs/stats:
 *   get:
 *     summary: 監査ログ統計を取得
 *     tags: [Security]
 */
router.get('/audit-logs/stats', async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, byAction, bySeverity, byStatus, recentCritical] = await Promise.all([
      prisma.securityAuditLog.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.securityAuditLog.groupBy({
        by: ['action'],
        _count: true,
        where: { createdAt: { gte: since } },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.securityAuditLog.groupBy({
        by: ['severity'],
        _count: true,
        where: { createdAt: { gte: since } },
      }),
      prisma.securityAuditLog.groupBy({
        by: ['status'],
        _count: true,
        where: { createdAt: { gte: since } },
      }),
      prisma.securityAuditLog.findMany({
        where: {
          severity: { in: ['CRITICAL', 'ERROR'] },
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      total,
      byAction: byAction.reduce((acc, item) => {
        acc[item.action] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySeverity: bySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      recentCritical,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// IPホワイトリスト
// ========================================

/**
 * @swagger
 * /api/security/ip-whitelist:
 *   get:
 *     summary: IPホワイトリスト一覧を取得
 *     tags: [Security]
 */
router.get('/ip-whitelist', async (req, res, next) => {
  try {
    const { scope, isActive, page = '1', limit = '50' } = req.query;

    const where: Record<string, unknown> = {};
    if (scope) where.scope = scope;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [entries, total] = await Promise.all([
      prisma.ipWhitelist.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.ipWhitelist.count({ where }),
    ]);

    res.json({
      data: entries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/ip-whitelist:
 *   post:
 *     summary: IPホワイトリストにエントリを追加
 *     tags: [Security]
 */
router.post('/ip-whitelist', async (req, res, next) => {
  try {
    const {
      ipAddress,
      ipType = 'SINGLE',
      name,
      description,
      scope = 'GLOBAL',
      userId,
      organizationId,
      expiresAt,
      createdBy,
    } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'ipAddress is required' });
    }

    // IP形式の検証
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipRegex.test(ipAddress)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    const entry = await prisma.ipWhitelist.create({
      data: {
        ipAddress,
        ipType,
        name,
        description,
        scope,
        userId,
        organizationId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy,
      },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'SETTINGS_CHANGE',
        category: 'SECURITY',
        severity: 'INFO',
        userId: createdBy,
        resourceType: 'IP_WHITELIST',
        resourceId: entry.id,
        status: 'SUCCESS',
        details: { ipAddress, scope },
      },
    });

    logger.info(`IP whitelist entry added: ${ipAddress}`);

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/ip-whitelist/{id}:
 *   delete:
 *     summary: IPホワイトリストからエントリを削除
 *     tags: [Security]
 */
router.delete('/ip-whitelist/:id', async (req, res, next) => {
  try {
    const entry = await prisma.ipWhitelist.delete({
      where: { id: req.params.id },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'SETTINGS_CHANGE',
        category: 'SECURITY',
        severity: 'WARNING',
        resourceType: 'IP_WHITELIST',
        resourceId: req.params.id,
        status: 'SUCCESS',
        details: { ipAddress: entry.ipAddress, action: 'deleted' },
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/ip-whitelist/check:
 *   post:
 *     summary: IPアドレスがホワイトリストにあるか確認
 *     tags: [Security]
 */
router.post('/ip-whitelist/check', async (req, res, next) => {
  try {
    const { ipAddress, userId, organizationId } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'ipAddress is required' });
    }

    // ホワイトリストを検索
    const entries = await prisma.ipWhitelist.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { scope: 'GLOBAL' },
              { scope: 'USER', userId },
              { scope: 'ORGANIZATION', organizationId },
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    });

    // IPがマッチするか確認
    const isAllowed = entries.some(entry => {
      if (entry.ipType === 'SINGLE') {
        return entry.ipAddress === ipAddress;
      }
      // CIDR範囲のチェック
      // 簡易実装（本番ではip-range-checkなどを使用）
      return entry.ipAddress.startsWith(ipAddress.split('.').slice(0, 3).join('.'));
    });

    res.json({ allowed: isAllowed, matchedEntries: isAllowed ? entries.length : 0 });
  } catch (error) {
    next(error);
  }
});

// ========================================
// セッション管理
// ========================================

/**
 * @swagger
 * /api/security/sessions:
 *   get:
 *     summary: アクティブセッション一覧を取得
 *     tags: [Security]
 */
router.get('/sessions', async (req, res, next) => {
  try {
    const { userId, isActive, page = '1', limit = '50' } = req.query;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const [sessions, total] = await Promise.all([
      prisma.userSession.findMany({
        where,
        orderBy: { lastUsedAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        select: {
          id: true,
          userId: true,
          userAgent: true,
          ipAddress: true,
          isActive: true,
          lastUsedAt: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      prisma.userSession.count({ where }),
    ]);

    res.json({
      data: sessions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/sessions/{id}/revoke:
 *   post:
 *     summary: セッションを無効化
 *     tags: [Security]
 */
router.post('/sessions/:id/revoke', async (req, res, next) => {
  try {
    const { reason, revokedBy } = req.body;

    const session = await prisma.userSession.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'SESSION_REVOKE',
        category: 'AUTHENTICATION',
        severity: 'WARNING',
        userId: revokedBy || session.userId,
        resourceType: 'SESSION',
        resourceId: session.id,
        status: 'SUCCESS',
        details: { reason, targetUserId: session.userId },
      },
    });

    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/sessions/revoke-all:
 *   post:
 *     summary: ユーザーの全セッションを無効化
 *     tags: [Security]
 */
router.post('/sessions/revoke-all', async (req, res, next) => {
  try {
    const { userId, reason, revokedBy, excludeCurrentSession } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const where: Record<string, unknown> = {
      userId,
      isActive: true,
    };
    if (excludeCurrentSession) {
      where.id = { not: excludeCurrentSession };
    }

    const result = await prisma.userSession.updateMany({
      where,
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason || 'Revoked all sessions',
      },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'SESSION_REVOKE_ALL',
        category: 'AUTHENTICATION',
        severity: 'WARNING',
        userId: revokedBy || userId,
        status: 'SUCCESS',
        details: { targetUserId: userId, sessionsRevoked: result.count },
      },
    });

    res.json({ success: true, revokedCount: result.count });
  } catch (error) {
    next(error);
  }
});

// ========================================
// セキュリティ設定
// ========================================

/**
 * @swagger
 * /api/security/settings:
 *   get:
 *     summary: セキュリティ設定を取得
 *     tags: [Security]
 */
router.get('/settings', async (req, res, next) => {
  try {
    const { scope = 'GLOBAL', organizationId, userId } = req.query;

    const where: Record<string, unknown> = { scope };
    if (organizationId) where.organizationId = organizationId;
    if (userId) where.userId = userId;

    let settings = await prisma.securitySetting.findFirst({ where });

    // デフォルト設定がなければ作成
    if (!settings) {
      settings = await prisma.securitySetting.create({
        data: {
          scope: scope as 'GLOBAL' | 'ORGANIZATION' | 'USER',
          organizationId: organizationId as string | undefined,
          userId: userId as string | undefined,
        },
      });
    }

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/settings:
 *   patch:
 *     summary: セキュリティ設定を更新
 *     tags: [Security]
 */
router.patch('/settings', async (req, res, next) => {
  try {
    const {
      scope = 'GLOBAL',
      organizationId,
      userId,
      ...updateData
    } = req.body;

    const where = {
      scope_organizationId_userId: {
        scope,
        organizationId: organizationId || null,
        userId: userId || null,
      },
    };

    const settings = await prisma.securitySetting.upsert({
      where,
      update: updateData,
      create: {
        scope,
        organizationId,
        userId,
        ...updateData,
      },
    });

    // 監査ログ
    await prisma.securityAuditLog.create({
      data: {
        action: 'SETTINGS_CHANGE',
        category: 'CONFIGURATION',
        severity: 'INFO',
        userId: req.body.updatedBy,
        resourceType: 'SECURITY_SETTINGS',
        resourceId: settings.id,
        status: 'SUCCESS',
        changes: updateData,
      },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/security/stats:
 *   get:
 *     summary: セキュリティ統計を取得
 *     tags: [Security]
 */
router.get('/stats', async (req, res, next) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      twoFactorEnabled,
      activeSessions,
      loginAttempts24h,
      failedLogins24h,
      ipWhitelistEntries,
      criticalEvents7d,
    ] = await Promise.all([
      prisma.twoFactorAuth.count({ where: { isEnabled: true } }),
      prisma.userSession.count({ where: { isActive: true } }),
      prisma.securityAuditLog.count({
        where: {
          action: 'LOGIN',
          createdAt: { gte: since24h },
        },
      }),
      prisma.securityAuditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: { gte: since24h },
        },
      }),
      prisma.ipWhitelist.count({ where: { isActive: true } }),
      prisma.securityAuditLog.count({
        where: {
          severity: 'CRITICAL',
          createdAt: { gte: since7d },
        },
      }),
    ]);

    res.json({
      twoFactorEnabled,
      activeSessions,
      loginAttempts24h,
      failedLogins24h,
      loginSuccessRate: loginAttempts24h > 0
        ? Math.round(((loginAttempts24h - failedLogins24h) / loginAttempts24h) * 100)
        : 100,
      ipWhitelistEntries,
      criticalEvents7d,
    });
  } catch (error) {
    next(error);
  }
});

export { router as securityManagementRouter };

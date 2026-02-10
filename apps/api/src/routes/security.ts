import { Router } from 'express';
import {
  prisma,
  SecurityEventType,
  SecurityEventSeverity,
  TwoFactorMethod,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'security' });

/**
 * セキュリティイベント一覧取得
 */
router.get('/events', async (req, res, next) => {
  try {
    const {
      userId,
      eventType,
      severity,
      ipAddress,
      startDate,
      endDate,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (eventType) where.eventType = eventType;
    if (severity) where.severity = severity;
    if (ipAddress) where.ipAddress = ipAddress;

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = new Date(startDate as string);
      if (endDate) where.occurredAt.lte = new Date(endDate as string);
    }

    const [events, total] = await Promise.all([
      prisma.securityEvent.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.securityEvent.count({ where }),
    ]);

    res.json({
      success: true,
      data: events,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ログイン試行一覧取得
 */
router.get('/login-attempts', async (req, res, next) => {
  try {
    const {
      userId,
      email,
      ipAddress,
      success,
      isBlocked,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (email) where.email = email;
    if (ipAddress) where.ipAddress = ipAddress;
    if (success !== undefined) where.success = success === 'true';
    if (isBlocked !== undefined) where.isBlocked = isBlocked === 'true';

    const [attempts, total] = await Promise.all([
      prisma.loginAttempt.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { attemptedAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.loginAttempt.count({ where }),
    ]);

    res.json({
      success: true,
      data: attempts,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ブロック中のIPアドレス一覧取得
 */
router.get('/blocked-ips', async (req, res, next) => {
  try {
    const blockedIps = await prisma.loginAttempt.findMany({
      where: {
        isBlocked: true,
        blockedUntil: { gt: new Date() },
      },
      distinct: ['ipAddress'],
      select: {
        ipAddress: true,
        blockedUntil: true,
        attemptCount: true,
        email: true,
      },
      orderBy: { blockedUntil: 'desc' },
    });

    res.json({
      success: true,
      data: blockedIps,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * IPアドレスのブロックを解除
 */
router.post('/unblock-ip', async (req, res, next) => {
  try {
    const { ipAddress } = req.body;

    if (!ipAddress) {
      throw new AppError(400, 'ipAddress is required', 'INVALID_INPUT');
    }

    await prisma.loginAttempt.updateMany({
      where: {
        ipAddress,
        isBlocked: true,
      },
      data: {
        isBlocked: false,
        blockedUntil: null,
      },
    });

    log.info({ ipAddress }, 'IP unblocked');

    res.json({
      success: true,
      message: `IP address ${ipAddress} has been unblocked`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * デバイスセッション一覧取得
 */
router.get('/device-sessions', async (req, res, next) => {
  try {
    const { userId, isActive, isTrusted, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isTrusted !== undefined) where.isTrusted = isTrusted === 'true';

    const [sessions, total] = await Promise.all([
      prisma.deviceSession.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { lastActivityAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.deviceSession.count({ where }),
    ]);

    res.json({
      success: true,
      data: sessions,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザーのデバイスセッション一覧取得
 */
router.get('/users/:userId/device-sessions', async (req, res, next) => {
  try {
    const sessions = await prisma.deviceSession.findMany({
      where: {
        userId: req.params.userId,
        isActive: true,
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * デバイスセッションを失効
 */
router.post('/device-sessions/:id/revoke', async (req, res, next) => {
  try {
    const session = await prisma.deviceSession.findUnique({
      where: { id: req.params.id },
    });

    if (!session) {
      throw new AppError(404, 'Device session not found', 'NOT_FOUND');
    }

    await prisma.deviceSession.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    log.info({ sessionId: req.params.id }, 'Device session revoked');

    res.json({
      success: true,
      message: 'Device session revoked',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * デバイスを信頼済みとしてマーク
 */
router.post('/device-sessions/:id/trust', async (req, res, next) => {
  try {
    const session = await prisma.deviceSession.update({
      where: { id: req.params.id },
      data: { isTrusted: true },
    });

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 2FA設定一覧取得
 */
router.get('/two-factor', async (req, res, next) => {
  try {
    const { userId, isEnabled, method, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (userId) where.userId = userId;
    if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true';
    if (method) where.method = method;

    const [twoFactorAuths, total] = await Promise.all([
      prisma.twoFactorAuth.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.twoFactorAuth.count({ where }),
    ]);

    // シークレットとバックアップコードを隠す
    const sanitized = twoFactorAuths.map((auth) => ({
      ...auth,
      totpSecret: undefined,
      totpUri: undefined,
      backupCodes: undefined,
    }));

    res.json({
      success: true,
      data: sanitized,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * ユーザーの2FA設定取得
 */
router.get('/users/:userId/two-factor', async (req, res, next) => {
  try {
    const twoFactor = await prisma.twoFactorAuth.findUnique({
      where: { userId: req.params.userId },
    });

    if (!twoFactor) {
      res.json({
        success: true,
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: twoFactor.id,
        method: twoFactor.method,
        isEnabled: twoFactor.isEnabled,
        isVerified: twoFactor.isVerified,
        backupCodesRemaining: twoFactor.backupCodes.length,
        backupCodesUsed: twoFactor.backupCodesUsed,
        lastUsedAt: twoFactor.lastUsedAt,
        useCount: twoFactor.useCount,
        enabledAt: twoFactor.enabledAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキーポリシー一覧取得
 */
router.get('/api-key-policies', async (req, res, next) => {
  try {
    const { limit = '50', offset = '0' } = req.query;

    const [policies, total] = await Promise.all([
      prisma.apiKeyPolicy.findMany({
        include: {
          apiKey: {
            select: { id: true, name: true, keyPrefix: true },
            include: {
              user: { select: { id: true, email: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
        skip: Number(offset),
      }),
      prisma.apiKeyPolicy.count(),
    ]);

    res.json({
      success: true,
      data: policies,
      pagination: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキーポリシーを作成
 */
router.post('/api-key-policies', async (req, res, next) => {
  try {
    const {
      apiKeyId,
      expiresAt,
      maxUsageCount,
      allowedIps = [],
      deniedIps = [],
      scopes = [],
      isReadOnly = false,
      rateLimit,
    } = req.body;

    if (!apiKeyId) {
      throw new AppError(400, 'apiKeyId is required', 'INVALID_INPUT');
    }

    const policy = await prisma.apiKeyPolicy.create({
      data: {
        apiKeyId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUsageCount,
        allowedIps,
        deniedIps,
        scopes,
        isReadOnly,
        rateLimit,
      },
    });

    log.info({ policyId: policy.id, apiKeyId }, 'API key policy created');

    res.status(201).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * APIキーポリシーを更新
 */
router.patch('/api-key-policies/:id', async (req, res, next) => {
  try {
    const {
      expiresAt,
      maxUsageCount,
      allowedIps,
      deniedIps,
      scopes,
      isReadOnly,
      rateLimit,
    } = req.body;

    const policy = await prisma.apiKeyPolicy.update({
      where: { id: req.params.id },
      data: {
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(maxUsageCount !== undefined && { maxUsageCount }),
        ...(allowedIps !== undefined && { allowedIps }),
        ...(deniedIps !== undefined && { deniedIps }),
        ...(scopes !== undefined && { scopes }),
        ...(isReadOnly !== undefined && { isReadOnly }),
        ...(rateLimit !== undefined && { rateLimit }),
      },
    });

    res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * パスワードポリシー一覧取得
 */
router.get('/password-policies', async (req, res, next) => {
  try {
    const policies = await prisma.passwordPolicy.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: policies,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * パスワードポリシーを作成
 */
router.post('/password-policies', async (req, res, next) => {
  try {
    const {
      name,
      description,
      isDefault = false,
      minLength = 8,
      maxLength = 128,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSymbols = false,
      forbiddenPatterns = [],
      passwordHistoryCount = 5,
      maxAgeDays,
      warnBeforeDays,
      maxFailedAttempts = 5,
      lockoutDurationMinutes = 30,
    } = req.body;

    if (!name) {
      throw new AppError(400, 'name is required', 'INVALID_INPUT');
    }

    // デフォルトポリシーを設定する場合、既存のデフォルトを解除
    if (isDefault) {
      await prisma.passwordPolicy.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const policy = await prisma.passwordPolicy.create({
      data: {
        name,
        description,
        isDefault,
        minLength,
        maxLength,
        requireUppercase,
        requireLowercase,
        requireNumbers,
        requireSymbols,
        forbiddenPatterns,
        passwordHistoryCount,
        maxAgeDays,
        warnBeforeDays,
        maxFailedAttempts,
        lockoutDurationMinutes,
      },
    });

    log.info({ policyId: policy.id, name }, 'Password policy created');

    res.status(201).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * パスワードポリシーを更新
 */
router.patch('/password-policies/:id', async (req, res, next) => {
  try {
    const {
      description,
      isDefault,
      minLength,
      maxLength,
      requireUppercase,
      requireLowercase,
      requireNumbers,
      requireSymbols,
      forbiddenPatterns,
      passwordHistoryCount,
      maxAgeDays,
      warnBeforeDays,
      maxFailedAttempts,
      lockoutDurationMinutes,
      isActive,
    } = req.body;

    // デフォルトポリシーを設定する場合、既存のデフォルトを解除
    if (isDefault) {
      await prisma.passwordPolicy.updateMany({
        where: { isDefault: true, id: { not: req.params.id } },
        data: { isDefault: false },
      });
    }

    const policy = await prisma.passwordPolicy.update({
      where: { id: req.params.id },
      data: {
        ...(description !== undefined && { description }),
        ...(isDefault !== undefined && { isDefault }),
        ...(minLength !== undefined && { minLength }),
        ...(maxLength !== undefined && { maxLength }),
        ...(requireUppercase !== undefined && { requireUppercase }),
        ...(requireLowercase !== undefined && { requireLowercase }),
        ...(requireNumbers !== undefined && { requireNumbers }),
        ...(requireSymbols !== undefined && { requireSymbols }),
        ...(forbiddenPatterns !== undefined && { forbiddenPatterns }),
        ...(passwordHistoryCount !== undefined && { passwordHistoryCount }),
        ...(maxAgeDays !== undefined && { maxAgeDays }),
        ...(warnBeforeDays !== undefined && { warnBeforeDays }),
        ...(maxFailedAttempts !== undefined && { maxFailedAttempts }),
        ...(lockoutDurationMinutes !== undefined && { lockoutDurationMinutes }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * セキュリティ統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalEvents24h,
      failedLogins24h,
      blockedIps,
      activeSessions,
      usersWithMfa,
      recentSuspiciousEvents,
    ] = await Promise.all([
      prisma.securityEvent.count({
        where: { occurredAt: { gte: last24h } },
      }),
      prisma.loginAttempt.count({
        where: { attemptedAt: { gte: last24h }, success: false },
      }),
      prisma.loginAttempt.count({
        where: { isBlocked: true, blockedUntil: { gt: now } },
      }),
      prisma.deviceSession.count({
        where: { isActive: true },
      }),
      prisma.twoFactorAuth.count({
        where: { isEnabled: true },
      }),
      prisma.securityEvent.count({
        where: {
          occurredAt: { gte: last7d },
          severity: { in: ['HIGH', 'CRITICAL'] },
        },
      }),
    ]);

    // イベントタイプ別集計
    const eventsByType = await prisma.securityEvent.groupBy({
      by: ['eventType'],
      where: { occurredAt: { gte: last24h } },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        last24Hours: {
          totalEvents: totalEvents24h,
          failedLogins: failedLogins24h,
        },
        current: {
          blockedIps,
          activeSessions,
          usersWithMfa,
        },
        last7Days: {
          suspiciousEvents: recentSuspiciousEvents,
        },
        eventsByType: eventsByType.reduce((acc, item) => {
          acc[item.eventType] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * セキュリティイベントタイプ一覧
 */
router.get('/event-types', async (_req, res, next) => {
  try {
    const eventTypes = Object.values(SecurityEventType).map((type) => ({
      value: type,
      label: getEventTypeLabel(type),
    }));

    res.json({
      success: true,
      data: eventTypes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 重要度一覧
 */
router.get('/severities', async (_req, res, next) => {
  try {
    const severities = Object.values(SecurityEventSeverity).map((sev) => ({
      value: sev,
      label: getSeverityLabel(sev),
    }));

    res.json({
      success: true,
      data: severities,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 2FA方式一覧
 */
router.get('/two-factor-methods', async (_req, res, next) => {
  try {
    const methods = Object.values(TwoFactorMethod).map((method) => ({
      value: method,
      label: getTwoFactorMethodLabel(method),
    }));

    res.json({
      success: true,
      data: methods,
    });
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数
function getEventTypeLabel(type: SecurityEventType): string {
  const labels: Record<SecurityEventType, string> = {
    LOGIN_SUCCESS: 'ログイン成功',
    LOGIN_FAILURE: 'ログイン失敗',
    LOGOUT: 'ログアウト',
    PASSWORD_CHANGE: 'パスワード変更',
    PASSWORD_RESET_REQUEST: 'パスワードリセット要求',
    PASSWORD_RESET_COMPLETE: 'パスワードリセット完了',
    MFA_ENABLED: 'MFA有効化',
    MFA_DISABLED: 'MFA無効化',
    MFA_CHALLENGE_SUCCESS: 'MFA認証成功',
    MFA_CHALLENGE_FAILURE: 'MFA認証失敗',
    API_KEY_CREATED: 'APIキー作成',
    API_KEY_REVOKED: 'APIキー失効',
    API_KEY_USED: 'APIキー使用',
    SESSION_CREATED: 'セッション作成',
    SESSION_REVOKED: 'セッション失効',
    PERMISSION_GRANTED: '権限付与',
    PERMISSION_REVOKED: '権限剥奪',
    ROLE_ASSIGNED: 'ロール割り当て',
    ROLE_REMOVED: 'ロール削除',
    ACCOUNT_LOCKED: 'アカウントロック',
    ACCOUNT_UNLOCKED: 'アカウントロック解除',
    SUSPICIOUS_ACTIVITY: '不審なアクティビティ',
    DATA_EXPORT: 'データエクスポート',
    DATA_DELETE: 'データ削除',
  };
  return labels[type] || type;
}

function getSeverityLabel(severity: SecurityEventSeverity): string {
  const labels: Record<SecurityEventSeverity, string> = {
    INFO: '情報',
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高',
    CRITICAL: '緊急',
  };
  return labels[severity] || severity;
}

function getTwoFactorMethodLabel(method: TwoFactorMethod): string {
  const labels: Record<TwoFactorMethod, string> = {
    TOTP: 'TOTP（認証アプリ）',
    SMS: 'SMS',
    EMAIL: 'メール',
    BACKUP_CODE: 'バックアップコード',
  };
  return labels[method] || method;
}

export { router as securityRouter };

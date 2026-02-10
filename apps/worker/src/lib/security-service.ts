/**
 * セキュリティサービス
 * Phase 33: セキュリティ強化
 */

import {
  prisma,
  SecurityEventType,
  SecurityEventSeverity,
  LoginFailureReason,
  DeviceType,
  TwoFactorMethod,
} from '@rakuda/database';
import { logger } from '@rakuda/logger';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

const log = logger.child({ module: 'security-service' });

// 暗号化設定
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// ブルートフォース保護設定
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const ATTEMPT_WINDOW_MINUTES = 15;

// ========================================
// セキュリティイベント
// ========================================

export interface SecurityEventParams {
  eventType: SecurityEventType;
  severity?: SecurityEventSeverity;
  description: string;
  details?: Record<string, unknown>;
  userId?: string;
  apiKeyId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  success?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * セキュリティイベントを記録
 */
export async function logSecurityEvent(params: SecurityEventParams): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        eventType: params.eventType,
        severity: params.severity || 'INFO',
        description: params.description,
        details: (params.details || {}) as any,
        userId: params.userId,
        apiKeyId: params.apiKeyId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        deviceId: params.deviceId,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        action: params.action,
        success: params.success ?? true,
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
      },
    });

    // 重要度が高い場合はログにも出力
    if (params.severity === 'HIGH' || params.severity === 'CRITICAL') {
      log.warn(params, 'High severity security event');
    }
  } catch (error) {
    log.error({ error, params }, 'Failed to log security event');
  }
}

/**
 * セキュリティイベントを取得
 */
export async function getSecurityEvents(params: {
  userId?: string;
  eventType?: SecurityEventType;
  severity?: SecurityEventSeverity;
  ipAddress?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ events: unknown[]; total: number }> {
  const where: Record<string, unknown> = {};

  if (params.userId) where.userId = params.userId;
  if (params.eventType) where.eventType = params.eventType;
  if (params.severity) where.severity = params.severity;
  if (params.ipAddress) where.ipAddress = params.ipAddress;

  if (params.startDate || params.endDate) {
    where.occurredAt = {};
    if (params.startDate) (where.occurredAt as Record<string, Date>).gte = params.startDate;
    if (params.endDate) (where.occurredAt as Record<string, Date>).lte = params.endDate;
  }

  const [events, total] = await Promise.all([
    prisma.securityEvent.findMany({
      where: where as any,
      orderBy: { occurredAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.securityEvent.count({ where: where as any }),
  ]);

  return { events, total };
}

// ========================================
// ログイン試行・ブルートフォース保護
// ========================================

/**
 * ログイン試行を記録
 */
export async function recordLoginAttempt(params: {
  userId?: string;
  email?: string;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
  geoLocation?: Record<string, unknown>;
  success: boolean;
  failureReason?: LoginFailureReason;
  mfaRequired?: boolean;
  mfaCompleted?: boolean;
}): Promise<{ isBlocked: boolean; blockedUntil?: Date }> {
  // 過去の試行回数を確認
  const windowStart = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60 * 1000);

  const recentAttempts = await prisma.loginAttempt.count({
    where: {
      ipAddress: params.ipAddress,
      attemptedAt: { gte: windowStart },
      success: false,
    },
  });

  const attemptCount = recentAttempts + (params.success ? 0 : 1);
  const isBlocked = attemptCount >= MAX_LOGIN_ATTEMPTS;
  const blockedUntil = isBlocked
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    : undefined;

  // ログイン試行を記録
  await prisma.loginAttempt.create({
    data: {
      userId: params.userId,
      email: params.email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      deviceFingerprint: params.deviceFingerprint,
      geoLocation: params.geoLocation as any,
      success: params.success,
      failureReason: params.failureReason,
      mfaRequired: params.mfaRequired || false,
      mfaCompleted: params.mfaCompleted || false,
      attemptCount,
      isBlocked,
      blockedUntil,
    },
  });

  // セキュリティイベントを記録
  await logSecurityEvent({
    eventType: params.success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
    severity: isBlocked ? 'HIGH' : params.success ? 'INFO' : 'LOW',
    description: params.success
      ? 'User logged in successfully'
      : `Login failed: ${params.failureReason}`,
    userId: params.userId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    success: params.success,
    errorCode: params.failureReason,
    details: {
      email: params.email,
      attemptCount,
      isBlocked,
      mfaRequired: params.mfaRequired,
    },
  });

  if (isBlocked) {
    log.warn({ ipAddress: params.ipAddress, email: params.email }, 'IP blocked due to too many failed attempts');
  }

  return { isBlocked, blockedUntil };
}

/**
 * IPアドレスがブロックされているか確認
 */
export async function isIpBlocked(ipAddress: string): Promise<{ blocked: boolean; until?: Date }> {
  const blockedAttempt = await prisma.loginAttempt.findFirst({
    where: {
      ipAddress,
      isBlocked: true,
      blockedUntil: { gt: new Date() },
    },
    orderBy: { attemptedAt: 'desc' },
  });

  return {
    blocked: !!blockedAttempt,
    until: blockedAttempt?.blockedUntil || undefined,
  };
}

/**
 * IPアドレスのブロックを解除
 */
export async function unblockIp(ipAddress: string): Promise<void> {
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
}

// ========================================
// デバイスセッション管理
// ========================================

/**
 * デバイスセッションを作成/更新
 */
export async function upsertDeviceSession(params: {
  userId: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: DeviceType;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  ipAddress: string;
  geoLocation?: Record<string, unknown>;
}): Promise<{ id: string; isNewDevice: boolean }> {
  const existing = await prisma.deviceSession.findUnique({
    where: {
      userId_deviceId: {
        userId: params.userId,
        deviceId: params.deviceId,
      },
    },
  });

  if (existing) {
    await prisma.deviceSession.update({
      where: { id: existing.id },
      data: {
        ipAddress: params.ipAddress,
        geoLocation: params.geoLocation as any,
        lastActivityAt: new Date(),
        lastSeenAt: new Date(),
        isActive: true,
      },
    });

    return { id: existing.id, isNewDevice: false };
  }

  const session = await prisma.deviceSession.create({
    data: {
      userId: params.userId,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      deviceType: params.deviceType || 'UNKNOWN',
      browser: params.browser,
      browserVersion: params.browserVersion,
      os: params.os,
      osVersion: params.osVersion,
      ipAddress: params.ipAddress,
      geoLocation: params.geoLocation as any,
    },
  });

  // 新しいデバイスからのログインをセキュリティイベントとして記録
  await logSecurityEvent({
    eventType: 'SESSION_CREATED',
    severity: 'MEDIUM',
    description: 'New device session created',
    userId: params.userId,
    ipAddress: params.ipAddress,
    deviceId: params.deviceId,
    details: {
      deviceName: params.deviceName,
      deviceType: params.deviceType,
      browser: params.browser,
      os: params.os,
    },
  });

  return { id: session.id, isNewDevice: true };
}

/**
 * ユーザーのデバイスセッション一覧を取得
 */
export async function getUserDeviceSessions(userId: string): Promise<unknown[]> {
  return prisma.deviceSession.findMany({
    where: { userId, isActive: true },
    orderBy: { lastActivityAt: 'desc' },
  });
}

/**
 * デバイスセッションを失効
 */
export async function revokeDeviceSession(userId: string, deviceId: string): Promise<void> {
  await prisma.deviceSession.update({
    where: {
      userId_deviceId: { userId, deviceId },
    },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
  });

  await logSecurityEvent({
    eventType: 'SESSION_REVOKED',
    description: 'Device session revoked',
    userId,
    deviceId,
  });
}

/**
 * デバイスを信頼済みとしてマーク
 */
export async function trustDevice(userId: string, deviceId: string): Promise<void> {
  await prisma.deviceSession.update({
    where: {
      userId_deviceId: { userId, deviceId },
    },
    data: { isTrusted: true },
  });
}

/**
 * 同時セッション数を制限
 */
export async function enforceSessionLimit(userId: string, maxSessions: number): Promise<void> {
  const sessions = await prisma.deviceSession.findMany({
    where: { userId, isActive: true },
    orderBy: { lastActivityAt: 'desc' },
  });

  if (sessions.length > maxSessions) {
    const sessionsToRevoke = sessions.slice(maxSessions);
    for (const session of sessionsToRevoke) {
      await revokeDeviceSession(userId, session.deviceId);
    }
  }
}

// ========================================
// 2要素認証
// ========================================

/**
 * TOTP 2FAをセットアップ
 */
export async function setupTotpTwoFactor(userId: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // TOTPシークレットを生成
  const secret = speakeasy.generateSecret({
    name: `RAKUDA:${user.email}`,
    length: 32,
  });

  // バックアップコードを生成
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // 暗号化して保存
  const encryptedSecret = encrypt(secret.base32);
  const encryptedBackupCodes = backupCodes.map((code) => encrypt(code));

  await prisma.twoFactorAuth.upsert({
    where: { userId },
    update: {
      method: 'TOTP',
      totpSecret: encryptedSecret,
      totpUri: secret.otpauth_url,
      backupCodes: encryptedBackupCodes,
      backupCodesUsed: 0,
      isEnabled: false,
      isVerified: false,
    },
    create: {
      userId,
      method: 'TOTP',
      totpSecret: encryptedSecret,
      totpUri: secret.otpauth_url,
      backupCodes: encryptedBackupCodes,
    },
  });

  // QRコードを生成
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

  return {
    secret: secret.base32,
    qrCodeUrl,
    backupCodes,
  };
}

/**
 * TOTPコードを検証
 */
export async function verifyTotpCode(userId: string, code: string): Promise<boolean> {
  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  });

  if (!twoFactor || !twoFactor.totpSecret) {
    return false;
  }

  const secret = decrypt(twoFactor.totpSecret);

  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 1, // 30秒前後を許容
  });

  if (isValid) {
    await prisma.twoFactorAuth.update({
      where: { userId },
      data: {
        lastUsedAt: new Date(),
        useCount: { increment: 1 },
      },
    });
  }

  return isValid;
}

/**
 * 2FAを有効化
 */
export async function enableTwoFactor(userId: string, code: string): Promise<boolean> {
  const isValid = await verifyTotpCode(userId, code);

  if (!isValid) {
    return false;
  }

  await prisma.twoFactorAuth.update({
    where: { userId },
    data: {
      isEnabled: true,
      isVerified: true,
      enabledAt: new Date(),
      verifiedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  await logSecurityEvent({
    eventType: 'MFA_ENABLED',
    description: 'Two-factor authentication enabled',
    userId,
  });

  return true;
}

/**
 * 2FAを無効化
 */
export async function disableTwoFactor(userId: string): Promise<void> {
  await prisma.twoFactorAuth.update({
    where: { userId },
    data: {
      isEnabled: false,
      isVerified: false,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false },
  });

  await logSecurityEvent({
    eventType: 'MFA_DISABLED',
    description: 'Two-factor authentication disabled',
    userId,
    severity: 'MEDIUM',
  });
}

/**
 * バックアップコードを使用
 */
export async function useBackupCode(userId: string, code: string): Promise<boolean> {
  const twoFactor = await prisma.twoFactorAuth.findUnique({
    where: { userId },
  });

  if (!twoFactor) {
    return false;
  }

  // バックアップコードを確認
  for (let i = 0; i < twoFactor.backupCodes.length; i++) {
    const decryptedCode = decrypt(twoFactor.backupCodes[i]);
    if (decryptedCode === code.toUpperCase()) {
      // 使用済みとしてマーク（削除）
      const newBackupCodes = [...twoFactor.backupCodes];
      newBackupCodes.splice(i, 1);

      await prisma.twoFactorAuth.update({
        where: { userId },
        data: {
          backupCodes: newBackupCodes,
          backupCodesUsed: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });

      await logSecurityEvent({
        eventType: 'MFA_CHALLENGE_SUCCESS',
        description: 'Backup code used for authentication',
        userId,
        severity: 'MEDIUM',
        details: { method: 'BACKUP_CODE', remainingCodes: newBackupCodes.length },
      });

      return true;
    }
  }

  return false;
}

/**
 * 2FAチャレンジを作成（SMS/Email用）
 */
export async function createTwoFactorChallenge(
  userId: string,
  method: TwoFactorMethod
): Promise<{ code: string; expiresAt: Date }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分有効

  await prisma.twoFactorChallenge.create({
    data: {
      userId,
      method,
      code: encrypt(code),
      expiresAt,
    },
  });

  return { code, expiresAt };
}

/**
 * 2FAチャレンジを検証
 */
export async function verifyTwoFactorChallenge(
  userId: string,
  code: string
): Promise<boolean> {
  const challenge = await prisma.twoFactorChallenge.findFirst({
    where: {
      userId,
      isUsed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge || !challenge.code) {
    return false;
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    return false;
  }

  const decryptedCode = decrypt(challenge.code);
  const isValid = decryptedCode === code;

  await prisma.twoFactorChallenge.update({
    where: { id: challenge.id },
    data: {
      attempts: { increment: 1 },
      ...(isValid && { isUsed: true, usedAt: new Date() }),
    },
  });

  return isValid;
}

// ========================================
// APIキーポリシー
// ========================================

/**
 * APIキーポリシーを作成
 */
export async function createApiKeyPolicy(params: {
  apiKeyId: string;
  expiresAt?: Date;
  maxUsageCount?: number;
  allowedIps?: string[];
  deniedIps?: string[];
  scopes?: string[];
  isReadOnly?: boolean;
  rateLimit?: number;
}): Promise<void> {
  await prisma.apiKeyPolicy.create({
    data: {
      apiKeyId: params.apiKeyId,
      expiresAt: params.expiresAt,
      maxUsageCount: params.maxUsageCount,
      allowedIps: params.allowedIps || [],
      deniedIps: params.deniedIps || [],
      scopes: params.scopes || [],
      isReadOnly: params.isReadOnly || false,
      rateLimit: params.rateLimit,
    },
  });
}

/**
 * APIキーポリシーを検証
 */
export async function validateApiKeyPolicy(
  apiKeyId: string,
  ipAddress: string,
  scope?: string
): Promise<{ valid: boolean; reason?: string }> {
  const policy = await prisma.apiKeyPolicy.findUnique({
    where: { apiKeyId },
  });

  if (!policy) {
    return { valid: true }; // ポリシーがない場合は許可
  }

  // 有効期限チェック
  if (policy.expiresAt && policy.expiresAt < new Date()) {
    return { valid: false, reason: 'API key has expired' };
  }

  // 使用回数チェック
  if (policy.maxUsageCount && policy.currentUsageCount >= policy.maxUsageCount) {
    return { valid: false, reason: 'API key usage limit exceeded' };
  }

  // IP制限チェック
  if (policy.deniedIps.length > 0 && isIpInList(ipAddress, policy.deniedIps)) {
    return { valid: false, reason: 'IP address is denied' };
  }

  if (policy.allowedIps.length > 0 && !isIpInList(ipAddress, policy.allowedIps)) {
    return { valid: false, reason: 'IP address is not allowed' };
  }

  // スコープチェック
  if (scope && policy.scopes.length > 0 && !policy.scopes.includes(scope)) {
    return { valid: false, reason: 'Scope not allowed' };
  }

  // 読み取り専用チェック
  if (policy.isReadOnly && scope && scope.startsWith('write:')) {
    return { valid: false, reason: 'API key is read-only' };
  }

  // 使用回数をインクリメント
  await prisma.apiKeyPolicy.update({
    where: { apiKeyId },
    data: {
      currentUsageCount: { increment: 1 },
      lastUsedAt: new Date(),
      lastUsedIp: ipAddress,
    },
  });

  return { valid: true };
}

// ========================================
// パスワードポリシー
// ========================================

/**
 * パスワードがポリシーに準拠しているか検証
 */
export async function validatePassword(
  password: string,
  userId?: string,
  policyName?: string
): Promise<{ valid: boolean; errors: string[] }> {
  const policy = await prisma.passwordPolicy.findFirst({
    where: policyName ? { name: policyName } : { isDefault: true },
  });

  if (!policy) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  // 長さチェック
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`Password must be at most ${policy.maxLength} characters`);
  }

  // 文字種チェック
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (policy.requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }

  // 禁止パターンチェック
  for (const pattern of policy.forbiddenPatterns) {
    if (new RegExp(pattern, 'i').test(password)) {
      errors.push('Password contains forbidden pattern');
      break;
    }
  }

  // パスワード履歴チェック
  if (userId && policy.passwordHistoryCount > 0) {
    const history = await prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: policy.passwordHistoryCount,
    });

    // ここでは実際のハッシュ比較が必要
    // bcrypt.compareを使用する必要がある
  }

  return { valid: errors.length === 0, errors };
}

/**
 * パスワード履歴を記録
 */
export async function recordPasswordHistory(
  userId: string,
  passwordHash: string
): Promise<void> {
  await prisma.passwordHistory.create({
    data: { userId, passwordHash },
  });
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * 文字列を暗号化
 */
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * 文字列を復号化
 */
function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * IPアドレスがリストに含まれるか確認（CIDR対応）
 */
function isIpInList(ip: string, list: string[]): boolean {
  for (const entry of list) {
    if (entry.includes('/')) {
      // CIDR notation
      if (isIpInCidr(ip, entry)) {
        return true;
      }
    } else {
      // Exact match
      if (ip === entry) {
        return true;
      }
    }
  }
  return false;
}

/**
 * IPアドレスがCIDR範囲に含まれるか確認
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * IPアドレスを数値に変換
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

/**
 * デバイスフィンガープリントを生成
 */
export function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
  return crypto
    .createHash('sha256')
    .update(`${userAgent}:${ipAddress}`)
    .digest('hex');
}

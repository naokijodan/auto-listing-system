import { Request, Response, NextFunction } from 'express';
import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'auth' });

// Redis接続（認証失敗追跡用）
let redis: IORedis | null = null;

try {
  redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
} catch (error) {
  log.warn('Redis not available for auth, rate limiting disabled');
}

// 認証設定
interface AuthConfig {
  apiKey: string;
  enabled: boolean;
  maxFailedAttempts: number;
  lockoutDurationMs: number;
  publicPaths: string[];
}

const config: AuthConfig = {
  apiKey: process.env.API_KEY || '',
  enabled: process.env.AUTH_ENABLED !== 'false',
  maxFailedAttempts: parseInt(process.env.AUTH_MAX_FAILED_ATTEMPTS || '5', 10),
  lockoutDurationMs: parseInt(process.env.AUTH_LOCKOUT_DURATION_MS || '900000', 10), // 15分
  publicPaths: [
    '/api/health',
    '/api/health/live',
    '/api/health/ready',
  ],
};

/**
 * クライアントIPを取得
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * 認証失敗を記録
 */
async function recordFailedAttempt(ip: string): Promise<number> {
  if (!redis) return 0;

  try {
    const key = `rakuda:auth:failed:${ip}`;
    const count = await redis.incr(key);
    await redis.expire(key, Math.ceil(config.lockoutDurationMs / 1000));
    return count;
  } catch (error) {
    log.error('Failed to record auth failure', error);
    return 0;
  }
}

/**
 * ロックアウト状態をチェック
 */
async function isLockedOut(ip: string): Promise<boolean> {
  if (!redis) return false;

  try {
    const key = `rakuda:auth:failed:${ip}`;
    const countStr = await redis.get(key);
    const count = parseInt(countStr || '0', 10);
    return count >= config.maxFailedAttempts;
  } catch (error) {
    log.error('Failed to check lockout status', error);
    return false;
  }
}

/**
 * 認証成功時にカウンターをリセット
 */
async function resetFailedAttempts(ip: string): Promise<void> {
  if (!redis) return;

  try {
    const key = `rakuda:auth:failed:${ip}`;
    await redis.del(key);
  } catch (error) {
    log.error('Failed to reset auth failures', error);
  }
}

/**
 * API Key認証ミドルウェア
 */
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 認証が無効の場合はスキップ
  if (!config.enabled) {
    return next();
  }

  // APIキーが設定されていない場合は警告してスキップ
  if (!config.apiKey) {
    log.warn('API_KEY not configured, authentication disabled');
    return next();
  }

  // パブリックパスはスキップ
  const path = req.path;
  if (config.publicPaths.some((p) => path.startsWith(p))) {
    return next();
  }

  const clientIp = getClientIp(req);

  // ロックアウトチェック
  if (await isLockedOut(clientIp)) {
    log.warn(`Locked out IP attempted access: ${clientIp}`);
    res.status(429).json({
      success: false,
      error: 'Too many failed attempts. Please try again later.',
      retryAfter: Math.ceil(config.lockoutDurationMs / 1000),
    });
    return;
  }

  // API Keyを取得
  const providedKey = req.headers['x-api-key'] as string;

  if (!providedKey) {
    await recordFailedAttempt(clientIp);
    log.warn(`Missing API key from ${clientIp}: ${req.method} ${req.path}`);
    res.status(401).json({
      success: false,
      error: 'API key is required. Please provide X-API-Key header.',
    });
    return;
  }

  // API Keyを検証（タイミング攻撃対策として定数時間比較を使用）
  if (!timingSafeEqual(providedKey, config.apiKey)) {
    const failCount = await recordFailedAttempt(clientIp);
    log.warn(`Invalid API key from ${clientIp}: ${req.method} ${req.path} (attempt ${failCount})`);

    if (failCount >= config.maxFailedAttempts) {
      res.status(429).json({
        success: false,
        error: 'Too many failed attempts. Please try again later.',
        retryAfter: Math.ceil(config.lockoutDurationMs / 1000),
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid API key.',
    });
    return;
  }

  // 認証成功
  await resetFailedAttempts(clientIp);

  // リクエストに認証情報を付与
  (req as any).authenticated = true;
  (req as any).clientIp = clientIp;

  next();
}

/**
 * タイミング攻撃対策の文字列比較
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * 管理者権限チェックミドルウェア（将来用）
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 現時点では認証済みであれば管理者とみなす
  if (!(req as any).authenticated) {
    res.status(403).json({
      success: false,
      error: 'Admin access required.',
    });
    return;
  }
  next();
}

/**
 * 認証状態を取得するエンドポイント用
 */
export function getAuthStatus(req: Request): {
  authenticated: boolean;
  clientIp: string;
} {
  return {
    authenticated: (req as any).authenticated || false,
    clientIp: (req as any).clientIp || getClientIp(req),
  };
}

/**
 * 認証設定を取得
 */
export function getAuthConfig(): Omit<AuthConfig, 'apiKey'> {
  return {
    enabled: config.enabled,
    maxFailedAttempts: config.maxFailedAttempts,
    lockoutDurationMs: config.lockoutDurationMs,
    publicPaths: config.publicPaths,
  };
}

import IORedis from 'ioredis';
import { logger } from '@rakuda/logger';

const log = logger.child({ module: 'scraping-daily-limit' });
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// 段階的拡大の設定
// 運用開始からの日数に応じて上限が変わる
interface ScalingConfig {
  phase1Days: number;  // Phase 1の期間（日）
  phase1Limit: number; // Phase 1の上限
  phase2Days: number;  // Phase 2の期間（日）
  phase2Limit: number; // Phase 2の上限
  phase3Limit: number; // Phase 3の上限（最大）
}

// 環境変数でオーバーライド可能
function parseEnvInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const DEFAULT_SCALING: ScalingConfig = {
  phase1Days: parseEnvInt('SCRAPE_DAILY_PHASE1_DAYS', 7), // 最初の7日間
  phase1Limit: parseEnvInt('SCRAPE_DAILY_LIMIT_PHASE1', 50), // 50商品/日
  phase2Days: parseEnvInt('SCRAPE_DAILY_PHASE2_DAYS', 14), // 次の14日間
  phase2Limit: parseEnvInt('SCRAPE_DAILY_LIMIT_PHASE2', 200), // 200商品/日
  phase3Limit: parseEnvInt('SCRAPE_DAILY_LIMIT_PHASE3', 500), // それ以降: 500商品/日
};

const DAILY_COUNT_KEY = 'rakuda:scrape:daily:count';
const SCALING_START_KEY = 'rakuda:scrape:scaling:start';

/**
 * 段階的拡大の開始日を設定（初回のみ）
 */
export async function initializeScaling(): Promise<void> {
  const exists = await redis.exists(SCALING_START_KEY);
  if (!exists) {
    const startIso = new Date().toISOString();
    await redis.set(SCALING_START_KEY, startIso);
    log.info({ type: 'scaling_initialized', startDate: startIso, config: DEFAULT_SCALING });
  }
}

/**
 * 今日の日付キー
 */
function todayKey(): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${DAILY_COUNT_KEY}:${today}`;
}

/**
 * 現在のフェーズに基づく1日の上限を取得
 */
export async function getDailyLimit(): Promise<{ limit: number; phase: number; daysActive: number }>
{
  const startStr = await redis.get(SCALING_START_KEY);
  if (!startStr) {
    return { limit: DEFAULT_SCALING.phase1Limit, phase: 1, daysActive: 0 };
  }

  const start = new Date(startStr);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

  if (daysActive < DEFAULT_SCALING.phase1Days) {
    return { limit: DEFAULT_SCALING.phase1Limit, phase: 1, daysActive };
  } else if (daysActive < DEFAULT_SCALING.phase1Days + DEFAULT_SCALING.phase2Days) {
    return { limit: DEFAULT_SCALING.phase2Limit, phase: 2, daysActive };
  } else {
    return { limit: DEFAULT_SCALING.phase3Limit, phase: 3, daysActive };
  }
}

/**
 * 今日のスクレイピング数を取得
 */
export async function getDailyCount(): Promise<number> {
  const count = await redis.get(todayKey());
  return count ? parseInt(count, 10) : 0;
}

/**
 * スクレイピング可能かチェック（上限未達か）
 */
export async function canScrape(): Promise<{ allowed: boolean; currentCount: number; dailyLimit: number; phase: number }>
{
  const [count, { limit, phase }] = await Promise.all([
    getDailyCount(),
    getDailyLimit(),
  ]);

  return {
    allowed: count < limit,
    currentCount: count,
    dailyLimit: limit,
    phase,
  };
}

/**
 * スクレイピングカウントを増加
 */
export async function incrementDailyCount(amount: number = 1): Promise<number> {
  const key = todayKey();
  const newCount = await redis.incrby(key, amount);
  // 明日の0時に自動削除（TTL = 残りの秒数 + 余裕1時間）
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const ttl = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000) + 3600;
  await redis.expire(key, ttl);
  return newCount;
}


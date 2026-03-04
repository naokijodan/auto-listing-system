import { logger } from '@rakuda/logger';
import { getConnection } from './redis';
import { alertManager } from './alert-manager';

// Source types supported by the system
export const SOURCE_TYPES = ['mercari', 'yahoo_auction', 'yahoo_flea', 'rakuma', 'rakuten', 'amazon'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

type EventType = 'success' | 'error' | 'captcha' | 'ban';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitInfo {
  state: CircuitState;
  openedAt?: number; // epoch ms
  reason?: string;
}

export interface ScrapeMetrics {
  sourceType: string;
  window: '1h';
  total: number;
  success: number;
  error: number;
  captcha: number;
  ban: number;
  errorRate: number;
  captchaRate: number;
  banRate: number;
  circuitState: CircuitState;
}

const WINDOW_MS = 60 * 60 * 1000; // 1 hour sliding window
const HALF_OPEN_DELAY_MS = 30 * 60 * 1000; // 30 minutes to transition to HALF_OPEN
const MIN_SAMPLE = 10;

// Thresholds
const THRESHOLDS = {
  banRate: 0.05, // >5%
  errorRate: 0.2, // >20%
  captchaRate: 0.1, // >10%
};

const METRICS_KEY_PREFIX = 'rakuda:scrape:metrics';
const CIRCUIT_KEY_PREFIX = 'rakuda:scrape:circuit';
const HALF_OPEN_TOKEN_SUFFIX = 'half_open_token';

const log = logger.child({ module: 'circuit-breaker' });

function ensureValidSource(sourceType: string): asserts sourceType is SourceType {
  if (!SOURCE_TYPES.includes(sourceType as SourceType)) {
    throw new Error(`Unknown sourceType: ${sourceType}`);
  }
}

function metricKey(sourceType: SourceType, eventType: EventType): string {
  return `${METRICS_KEY_PREFIX}:${sourceType}:${eventType}`;
}

function circuitKey(sourceType: SourceType): string {
  return `${CIRCUIT_KEY_PREFIX}:${sourceType}`;
}

function halfOpenTokenKey(sourceType: SourceType): string {
  return `${CIRCUIT_KEY_PREFIX}:${sourceType}:${HALF_OPEN_TOKEN_SUFFIX}`;
}

function nowMs(): number {
  return Date.now();
}

function buildReason(kind: 'ban' | 'error' | 'captcha', rate: number, threshold: number): string {
  const pct = (rate * 100).toFixed(1);
  const th = (threshold * 100).toFixed(0);
  const name = kind === 'ban' ? 'Ban率' : kind === 'error' ? 'エラー率' : 'CAPTCHA率';
  return `${name}が閾値超過: ${pct}% > ${th}%`;
}

async function readCircuit(sourceType: SourceType): Promise<CircuitInfo> {
  const redis = getConnection();
  const raw = await redis.get(circuitKey(sourceType));
  if (!raw) return { state: 'CLOSED' };
  try {
    const parsed = JSON.parse(raw) as CircuitInfo;
    if (!parsed.state) return { state: 'CLOSED' };
    return parsed;
  } catch {
    return { state: 'CLOSED' };
  }
}

async function writeCircuit(sourceType: SourceType, info: CircuitInfo): Promise<void> {
  const redis = getConnection();
  await redis.set(circuitKey(sourceType), JSON.stringify(info));
}

async function openCircuit(
  sourceType: SourceType,
  reason: string,
  rates: { errorRate: number; captchaRate: number; banRate: number }
): Promise<void> {
  const info: CircuitInfo = { state: 'OPEN', openedAt: nowMs(), reason };
  await writeCircuit(sourceType, info);

  // Clear any HALF_OPEN token when fully opening
  const redis = getConnection();
  await redis.del(halfOpenTokenKey(sourceType));

  log.error({
    type: 'circuit_breaker_opened',
    sourceType,
    reason,
    metrics: {
      errorRate: rates.errorRate,
      captchaRate: rates.captchaRate,
      banRate: rates.banRate,
    },
  });

  try {
    await alertManager.processEvent({
      type: 'CIRCUIT_BREAKER_OPENED',
      data: {
        sourceType,
        reason,
        errorRate: rates.errorRate,
        captchaRate: rates.captchaRate,
        banRate: rates.banRate,
      },
      timestamp: new Date().toISOString(),
    } as unknown as any);
  } catch (e) {
    log.error({ type: 'circuit_alert_error', error: e });
  }
}

async function closeCircuit(sourceType: SourceType): Promise<void> {
  await writeCircuit(sourceType, { state: 'CLOSED' });
  const redis = getConnection();
  await redis.del(halfOpenTokenKey(sourceType));
}

async function transitionOpenToHalfOpenIfDue(sourceType: SourceType): Promise<CircuitInfo> {
  const current = await readCircuit(sourceType);
  if (current.state !== 'OPEN' || !current.openedAt) return current;
  if (nowMs() - current.openedAt < HALF_OPEN_DELAY_MS) return current;
  const next: CircuitInfo = { state: 'HALF_OPEN', openedAt: current.openedAt, reason: current.reason };
  await writeCircuit(sourceType, next);
  return next;
}

async function recordEvent(sourceType: SourceType, eventType: EventType): Promise<void> {
  const redis = getConnection();
  const ts = nowMs();
  const key = metricKey(sourceType, eventType);
  const member = `${ts}-${Math.random().toString(36).slice(2, 10)}`;

  // Maintain sliding window and add event
  const minScore = 0; // use ZCOUNT with range later; still prune old entries opportunistically
  const cutoff = ts - WINDOW_MS;
  const pipeline = redis.pipeline();
  pipeline.zadd(key, ts, member);
  pipeline.zremrangebyscore(key, 0, cutoff);
  // set TTL to a bit more than window to avoid unbounded growth
  pipeline.expire(key, Math.ceil((WINDOW_MS * 2) / 1000));
  await pipeline.exec();

  // If currently HALF_OPEN and we recorded a failure/success, transition accordingly
  const info = await readCircuit(sourceType);
  if (info.state === 'HALF_OPEN') {
    if (eventType === 'success') {
      await closeCircuit(sourceType);
    } else {
      await openCircuit(sourceType, `Half-openチェック失敗: ${eventType}`, await computeRates(sourceType));
    }
    // Clear token so next half-open can be attempted after reopen window
    await redis.del(halfOpenTokenKey(sourceType));
    return;
  }

  // If CLOSED, evaluate thresholds and open if needed
  if (info.state === 'CLOSED') {
    await evaluateAndMaybeOpen(sourceType);
  }
}

async function countsWithinWindow(sourceType: SourceType): Promise<{ success: number; error: number; captcha: number; ban: number }> {
  const redis = getConnection();
  const ts = nowMs();
  const min = ts - WINDOW_MS;
  const pipeline = redis.pipeline();
  pipeline.zcount(metricKey(sourceType, 'success'), min, '+inf');
  pipeline.zcount(metricKey(sourceType, 'error'), min, '+inf');
  pipeline.zcount(metricKey(sourceType, 'captcha'), min, '+inf');
  pipeline.zcount(metricKey(sourceType, 'ban'), min, '+inf');
  const res = await pipeline.exec();
  if (!res) return { success: 0, error: 0, captcha: 0, ban: 0 };
  // ioredis returns [err, result][]; extract safely
  const values = res.map(([, v]) => (typeof v === 'number' ? v : parseInt(String(v ?? 0), 10) || 0));
  const [success, error, captcha, ban] = values as number[];
  return { success, error, captcha, ban };
}

async function computeRates(sourceType: SourceType): Promise<{ errorRate: number; captchaRate: number; banRate: number }> {
  const { success, error, captcha, ban } = await countsWithinWindow(sourceType);
  const total = success + error + captcha + ban;
  const safeDiv = (n: number, d: number): number => (d > 0 ? n / d : 0);
  return {
    errorRate: safeDiv(error, total),
    captchaRate: safeDiv(captcha, total),
    banRate: safeDiv(ban, total),
  };
}

async function evaluateAndMaybeOpen(sourceType: SourceType): Promise<void> {
  const counts = await countsWithinWindow(sourceType);
  const total = counts.success + counts.error + counts.captcha + counts.ban;
  if (total < MIN_SAMPLE) return;
  const safeDiv = (n: number, d: number): number => (d > 0 ? n / d : 0);
  const rates = {
    errorRate: safeDiv(counts.error, total),
    captchaRate: safeDiv(counts.captcha, total),
    banRate: safeDiv(counts.ban, total),
  };

  // Determine if any threshold is exceeded
  if (rates.banRate > THRESHOLDS.banRate) {
    await openCircuit(sourceType, buildReason('ban', rates.banRate, THRESHOLDS.banRate), rates);
    return;
  }
  if (rates.errorRate > THRESHOLDS.errorRate) {
    await openCircuit(sourceType, buildReason('error', rates.errorRate, THRESHOLDS.errorRate), rates);
    return;
  }
  if (rates.captchaRate > THRESHOLDS.captchaRate) {
    await openCircuit(sourceType, buildReason('captcha', rates.captchaRate, THRESHOLDS.captchaRate), rates);
  }
}

// Public API

export async function recordScrapeSuccess(sourceType: string): Promise<void> {
  ensureValidSource(sourceType);
  await recordEvent(sourceType, 'success');
}

export async function recordScrapeError(sourceType: string, _error: string): Promise<void> {
  // error message is not stored in metrics; could be logged or attached elsewhere if needed
  ensureValidSource(sourceType);
  await recordEvent(sourceType, 'error');
}

export async function recordScrapeCaptcha(sourceType: string): Promise<void> {
  ensureValidSource(sourceType);
  await recordEvent(sourceType, 'captcha');
}

export async function recordScrapeBan(sourceType: string): Promise<void> {
  ensureValidSource(sourceType);
  await recordEvent(sourceType, 'ban');
}

export async function isCircuitOpen(
  sourceType: string
): Promise<{ open: boolean; reason?: string }> {
  ensureValidSource(sourceType);
  const s = sourceType as SourceType;

  // Transition OPEN -> HALF_OPEN when due
  const info = await transitionOpenToHalfOpenIfDue(s);

  if (info.state === 'OPEN') {
    return { open: true, reason: info.reason };
  }

  if (info.state === 'HALF_OPEN') {
    // allow only one probe: acquire token using SET NX with short TTL as guard
    const redis = getConnection();
    const tokenKey = halfOpenTokenKey(s);
    try {
      const setRes = await redis.set(tokenKey, '1', 'EX', 5 * 60, 'NX'); // 5 minutes guard
      if (setRes === 'OK') {
        // this caller is allowed to pass
        return { open: false };
      }
      return { open: true, reason: 'HALF_OPEN_PROBE_IN_PROGRESS' };
    } catch (e) {
      log.error({ type: 'half_open_token_error', error: e });
      // Fail-safe: block when uncertain
      return { open: true, reason: 'HALF_OPEN_TOKEN_ERROR' };
    }
  }

  // CLOSED: fast path; no metric evaluation here for performance
  return { open: false };
}

export async function getScrapeMetrics(sourceType: string): Promise<ScrapeMetrics> {
  ensureValidSource(sourceType);
  const s = sourceType as SourceType;
  const [counts, circuit] = await Promise.all([countsWithinWindow(s), readCircuit(s)]);
  const total = counts.success + counts.error + counts.captcha + counts.ban;
  const safeDiv = (n: number, d: number): number => (d > 0 ? n / d : 0);
  return {
    sourceType: s,
    window: '1h',
    total,
    success: counts.success,
    error: counts.error,
    captcha: counts.captcha,
    ban: counts.ban,
    errorRate: safeDiv(counts.error, total),
    captchaRate: safeDiv(counts.captcha, total),
    banRate: safeDiv(counts.ban, total),
    circuitState: circuit.state,
  };
}

export async function getAllScrapeMetrics(): Promise<ScrapeMetrics[]> {
  const results = await Promise.all(SOURCE_TYPES.map((s) => getScrapeMetrics(s)));
  return results;
}

export async function resetCircuit(sourceType: string): Promise<void> {
  ensureValidSource(sourceType);
  const s = sourceType as SourceType;
  const redis = getConnection();
  await Promise.all([
    redis.del(circuitKey(s)),
    redis.del(halfOpenTokenKey(s)),
  ]);
  log.info({ type: 'circuit_reset', sourceType: s });
}

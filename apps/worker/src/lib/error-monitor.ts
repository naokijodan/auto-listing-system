import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { notifyJobFailed, sendNotification } from './notifications';

const log = logger.child({ module: 'error-monitor' });

/**
 * エラー監視設定
 */
export interface ErrorMonitorConfig {
  // 連続失敗でアラートを出す回数
  consecutiveFailureThreshold: number;
  // 時間内の失敗率でアラートを出す閾値（%）
  failureRateThreshold: number;
  // 失敗率を計算する時間枠（分）
  failureRateWindowMinutes: number;
  // 同一エラーの再通知抑制時間（分）
  errorCooldownMinutes: number;
}

const DEFAULT_CONFIG: ErrorMonitorConfig = {
  consecutiveFailureThreshold: 3,
  failureRateThreshold: 50,
  failureRateWindowMinutes: 30,
  errorCooldownMinutes: 60,
};

// 最近通知したエラーのキャッシュ
const recentAlerts: Map<string, Date> = new Map();

/**
 * エラーを記録してモニタリング
 */
export async function recordError(
  jobType: string,
  jobId: string,
  errorMessage: string,
  attempts: number,
  config: Partial<ErrorMonitorConfig> = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  log.warn({
    type: 'error_recorded',
    jobType,
    jobId,
    errorMessage: errorMessage.substring(0, 200),
    attempts,
  });

  // 最大試行回数に達した場合は即時通知
  if (attempts >= 3) {
    const alertKey = `${jobType}:max_attempts`;
    if (shouldSendAlert(alertKey, finalConfig.errorCooldownMinutes)) {
      await notifyJobFailed(jobType, jobId, errorMessage, attempts);
      markAlertSent(alertKey);
    }
  }

  // 連続失敗チェック
  await checkConsecutiveFailures(jobType, finalConfig);

  // 失敗率チェック
  await checkFailureRate(jobType, finalConfig);
}

/**
 * 連続失敗をチェック
 */
async function checkConsecutiveFailures(
  jobType: string,
  config: ErrorMonitorConfig
): Promise<void> {
  const recentJobs = await prisma.jobLog.findMany({
    where: { jobType },
    orderBy: { createdAt: 'desc' },
    take: config.consecutiveFailureThreshold + 1,
    select: { status: true },
  });

  const consecutiveFails = recentJobs.filter(
    (j, i) => i < config.consecutiveFailureThreshold && j.status === 'FAILED'
  ).length;

  if (consecutiveFails >= config.consecutiveFailureThreshold) {
    const alertKey = `${jobType}:consecutive_failures`;
    if (shouldSendAlert(alertKey, config.errorCooldownMinutes)) {
      await sendNotification({
        type: 'job_failed',
        title: '連続エラー検知',
        message: `${jobType}ジョブが${consecutiveFails}回連続で失敗しています。`,
        severity: 'error',
        data: {
          ジョブタイプ: jobType,
          連続失敗回数: consecutiveFails,
        },
      });
      markAlertSent(alertKey);
    }
  }
}

/**
 * 失敗率をチェック
 */
async function checkFailureRate(
  jobType: string,
  config: ErrorMonitorConfig
): Promise<void> {
  const windowStart = new Date(
    Date.now() - config.failureRateWindowMinutes * 60 * 1000
  );

  const jobs = await prisma.jobLog.findMany({
    where: {
      jobType,
      createdAt: { gte: windowStart },
    },
    select: { status: true },
  });

  if (jobs.length < 5) {
    // サンプル数が少なすぎる
    return;
  }

  const failedCount = jobs.filter(j => j.status === 'FAILED').length;
  const failureRate = (failedCount / jobs.length) * 100;

  if (failureRate >= config.failureRateThreshold) {
    const alertKey = `${jobType}:high_failure_rate`;
    if (shouldSendAlert(alertKey, config.errorCooldownMinutes)) {
      await sendNotification({
        type: 'job_failed',
        title: '高エラー率検知',
        message: `${jobType}ジョブの失敗率が${failureRate.toFixed(1)}%に達しました。`,
        severity: 'error',
        data: {
          ジョブタイプ: jobType,
          失敗率: `${failureRate.toFixed(1)}%`,
          サンプル数: jobs.length,
          時間枠: `${config.failureRateWindowMinutes}分`,
        },
      });
      markAlertSent(alertKey);
    }
  }
}

/**
 * アラートを送信すべきか判定
 */
function shouldSendAlert(alertKey: string, cooldownMinutes: number): boolean {
  const lastAlert = recentAlerts.get(alertKey);
  if (!lastAlert) return true;

  const cooldownMs = cooldownMinutes * 60 * 1000;
  return Date.now() - lastAlert.getTime() > cooldownMs;
}

/**
 * アラート送信済みをマーク
 */
function markAlertSent(alertKey: string): void {
  recentAlerts.set(alertKey, new Date());

  // 古いエントリを削除
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, date] of recentAlerts.entries()) {
    if (date.getTime() < oneHourAgo) {
      recentAlerts.delete(key);
    }
  }
}

/**
 * システムヘルスチェック
 */
export async function checkSystemHealth(): Promise<{
  healthy: boolean;
  checks: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  }>;
}> {
  const checks: Array<{
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
  }> = [];

  // 1. 最近のジョブ失敗率
  const recentJobs = await prisma.jobLog.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    select: { status: true },
  });

  if (recentJobs.length > 0) {
    const failedCount = recentJobs.filter(j => j.status === 'FAILED').length;
    const failureRate = (failedCount / recentJobs.length) * 100;

    if (failureRate > 50) {
      checks.push({
        name: 'ジョブ成功率',
        status: 'error',
        message: `過去1時間の失敗率: ${failureRate.toFixed(1)}%`,
      });
    } else if (failureRate > 20) {
      checks.push({
        name: 'ジョブ成功率',
        status: 'warning',
        message: `過去1時間の失敗率: ${failureRate.toFixed(1)}%`,
      });
    } else {
      checks.push({
        name: 'ジョブ成功率',
        status: 'ok',
        message: `過去1時間の失敗率: ${failureRate.toFixed(1)}%`,
      });
    }
  }

  // 2. 在庫切れ商品数
  const outOfStockCount = await prisma.product.count({
    where: { status: 'OUT_OF_STOCK' },
  });
  const activeCount = await prisma.product.count({
    where: { status: 'ACTIVE' },
  });

  if (activeCount > 0) {
    const outOfStockRate = (outOfStockCount / (outOfStockCount + activeCount)) * 100;

    if (outOfStockRate > 30) {
      checks.push({
        name: '在庫状況',
        status: 'warning',
        message: `在庫切れ: ${outOfStockCount}件 (${outOfStockRate.toFixed(1)}%)`,
      });
    } else {
      checks.push({
        name: '在庫状況',
        status: 'ok',
        message: `在庫切れ: ${outOfStockCount}件`,
      });
    }
  }

  // 3. エラー状態の商品
  const errorProducts = await prisma.product.count({
    where: { status: 'ERROR' },
  });

  if (errorProducts > 10) {
    checks.push({
      name: 'エラー商品',
      status: 'error',
      message: `${errorProducts}件の商品がエラー状態`,
    });
  } else if (errorProducts > 0) {
    checks.push({
      name: 'エラー商品',
      status: 'warning',
      message: `${errorProducts}件の商品がエラー状態`,
    });
  } else {
    checks.push({
      name: 'エラー商品',
      status: 'ok',
      message: 'エラー商品なし',
    });
  }

  // 4. Dead Letter Queue
  const deadLetterJobs = await prisma.jobLog.count({
    where: {
      status: 'DEAD_LETTER',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (deadLetterJobs > 10) {
    checks.push({
      name: 'Dead Letter Queue',
      status: 'error',
      message: `過去24時間で${deadLetterJobs}件のジョブがDLQに移動`,
    });
  } else if (deadLetterJobs > 0) {
    checks.push({
      name: 'Dead Letter Queue',
      status: 'warning',
      message: `過去24時間で${deadLetterJobs}件のジョブがDLQに移動`,
    });
  } else {
    checks.push({
      name: 'Dead Letter Queue',
      status: 'ok',
      message: 'DLQは空',
    });
  }

  // 5. 為替レートの鮮度
  const latestRate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'JPY', toCurrency: 'USD' },
    orderBy: { fetchedAt: 'desc' },
  });

  if (latestRate) {
    const hoursSinceUpdate =
      (Date.now() - latestRate.fetchedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate > 48) {
      checks.push({
        name: '為替レート',
        status: 'error',
        message: `最終更新: ${hoursSinceUpdate.toFixed(0)}時間前`,
      });
    } else if (hoursSinceUpdate > 24) {
      checks.push({
        name: '為替レート',
        status: 'warning',
        message: `最終更新: ${hoursSinceUpdate.toFixed(0)}時間前`,
      });
    } else {
      checks.push({
        name: '為替レート',
        status: 'ok',
        message: `最終更新: ${hoursSinceUpdate.toFixed(1)}時間前`,
      });
    }
  }

  const healthy = !checks.some(c => c.status === 'error');

  return { healthy, checks };
}

/**
 * ヘルスチェック結果を通知（問題がある場合のみ）
 */
export async function notifyHealthIssues(): Promise<void> {
  const { healthy, checks } = await checkSystemHealth();

  if (healthy) {
    return;
  }

  const issues = checks.filter(c => c.status === 'error' || c.status === 'warning');

  await sendNotification({
    type: 'job_failed',
    title: 'システムヘルス警告',
    message: `${issues.length}件の問題が検出されました。`,
    severity: checks.some(c => c.status === 'error') ? 'error' : 'warning',
    data: Object.fromEntries(
      issues.map(c => [c.name, c.message])
    ),
  });
}

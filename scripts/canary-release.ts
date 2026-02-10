#!/usr/bin/env npx tsx
/**
 * Phase 43: カナリアリリーススクリプト
 *
 * 安全なカテゴリの商品のみを段階的に出品
 * リスクを最小化しながら本番運用を開始
 *
 * 使用方法:
 *   # Phase 1: 最初の3件のみ（ウォッチ・アクセサリー）
 *   npx tsx scripts/canary-release.ts --phase=1
 *
 *   # Phase 2: 10件まで拡大
 *   npx tsx scripts/canary-release.ts --phase=2
 *
 *   # Phase 3: 25件まで拡大
 *   npx tsx scripts/canary-release.ts --phase=3
 *
 *   # ステータス確認
 *   npx tsx scripts/canary-release.ts --status
 *
 *   # ロールバック（出品停止）
 *   npx tsx scripts/canary-release.ts --rollback
 */

import { prisma, ProductStatus } from '@rakuda/database';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';

// ============================================================================
// カナリアリリース設定
// ============================================================================

/**
 * 安全なカテゴリ（禁制品リスクが低い）
 */
const SAFE_CATEGORIES = [
  'ウォッチ',
  'watch',
  'アクセサリー',
  'accessory',
  'jewelry',
  'ジュエリー',
  'バッグ',
  'bag',
  'ファッション',
  'fashion',
  'インテリア',
  'interior',
  'ホビー',
  'hobby',
  'コレクション',
  'collectible',
  '文房具',
  'stationery',
];

/**
 * 除外キーワード（危険な商品を除外）
 */
const EXCLUDED_KEYWORDS = [
  'バッテリー',
  'battery',
  '電池',
  'リチウム',
  'lithium',
  'ナイフ',
  'knife',
  '刃物',
  'blade',
  '武器',
  'weapon',
  '銃',
  'gun',
  '火薬',
  '爆発',
  'explosive',
  '医薬品',
  'medicine',
  '薬',
  'drug',
  '化粧品',
  'cosmetic',
  '食品',
  'food',
  '液体',
  'liquid',
  'アルコール',
  'alcohol',
  '偽',
  'fake',
  'レプリカ',
  'replica',
  'コピー',
  'copy',
];

/**
 * フェーズ別の出品上限
 */
const PHASE_LIMITS = {
  1: 3,   // Phase 1: 最初の3件（最小リスク）
  2: 10,  // Phase 2: 10件に拡大
  3: 25,  // Phase 3: 25件に拡大
  4: 20,  // Phase 4: 高価格帯テスト（$5,000+のみ）
  5: 100, // Phase 5: 100件（フル運用移行前）
};

/**
 * Phase 4用: 高価格帯閾値（円）
 * $5,000 = 約75万円 (為替150円想定)
 */
const HIGH_VALUE_THRESHOLD_JPY = 750000;

/**
 * Joom出品価格上限（円）
 * Phase 5テストの結果、¥950,000以上の商品が全てエラーとなった
 * 安全マージンを取り、¥900,000を上限とする（≒$6,000）
 */
const JOOM_PRICE_LIMIT_JPY = 900000;

// ============================================================================
// Circuit Breaker設定
// ============================================================================

/**
 * 連続エラー上限: この回数連続でエラーが発生したら処理を停止
 */
const MAX_CONSECUTIVE_ERRORS = 3;

/**
 * エラー率閾値: 全体のエラー率がこの値を超えたら処理を中断
 */
const ERROR_RATE_THRESHOLD = 0.05; // 5%

/**
 * Circuit Breaker状態管理
 */
interface CircuitBreakerState {
  consecutiveErrors: number;
  totalRequests: number;
  totalErrors: number;
  isTripped: boolean;
  tripReason?: string;
}

/**
 * Circuit Breakerの状態をリセット
 */
function resetCircuitBreaker(): CircuitBreakerState {
  return {
    consecutiveErrors: 0,
    totalRequests: 0,
    totalErrors: 0,
    isTripped: false,
  };
}

/**
 * エラー発生時のCircuit Breaker更新
 */
function recordError(state: CircuitBreakerState, errorMessage: string): CircuitBreakerState {
  const newState = {
    ...state,
    consecutiveErrors: state.consecutiveErrors + 1,
    totalRequests: state.totalRequests + 1,
    totalErrors: state.totalErrors + 1,
    isTripped: false,
    tripReason: undefined as string | undefined,
  };

  // 連続エラーチェック
  if (newState.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
    newState.isTripped = true;
    newState.tripReason = `Consecutive errors reached ${MAX_CONSECUTIVE_ERRORS}: ${errorMessage}`;
  }

  // エラー率チェック
  const errorRate = newState.totalErrors / newState.totalRequests;
  if (newState.totalRequests >= 5 && errorRate > ERROR_RATE_THRESHOLD) {
    newState.isTripped = true;
    newState.tripReason = `Error rate ${(errorRate * 100).toFixed(1)}% exceeded threshold ${ERROR_RATE_THRESHOLD * 100}%`;
  }

  return newState;
}

/**
 * 成功時のCircuit Breaker更新（連続エラーカウンタをリセット）
 */
function recordSuccess(state: CircuitBreakerState): CircuitBreakerState {
  return {
    ...state,
    consecutiveErrors: 0,
    totalRequests: state.totalRequests + 1,
  };
}

interface CanaryProduct {
  id: string;
  title: string;
  titleEn: string | null;
  category: string | null;
  brand: string | null;
  price: number;
  images: string[];
  isSafe: boolean;
  safetyReason: string;
}

interface CanaryResult {
  productId: string;
  title: string;
  listingId?: string;
  jobId?: string;
  status: 'queued' | 'skipped';
  skipReason?: string;
}

// ============================================================================
// ユーティリティ関数
// ============================================================================

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`🦜 ${title}`);
  console.log('='.repeat(60));
}

function logWarning(message: string) {
  console.log(`⚠️  ${message}`);
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

/**
 * 商品が安全かどうかを判定
 */
function evaluateSafety(product: {
  title: string | null;
  titleEn: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  descriptionEn: string | null;
}): { isSafe: boolean; reason: string } {
  const searchText = [
    product.title,
    product.titleEn,
    product.category,
    product.brand,
    product.description,
    product.descriptionEn,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // 除外キーワードチェック
  for (const keyword of EXCLUDED_KEYWORDS) {
    if (searchText.includes(keyword.toLowerCase())) {
      return { isSafe: false, reason: `Excluded keyword: ${keyword}` };
    }
  }

  // 安全カテゴリチェック
  const isInSafeCategory = SAFE_CATEGORIES.some((cat) =>
    searchText.includes(cat.toLowerCase())
  );

  if (!isInSafeCategory) {
    return { isSafe: false, reason: 'Not in safe category' };
  }

  return { isSafe: true, reason: 'Passed all safety checks' };
}

// ============================================================================
// メイン処理
// ============================================================================

async function checkStatus() {
  logSection('CANARY RELEASE STATUS');

  // カナリーリリースで出品された商品を取得
  const canaryListings = await prisma.listing.findMany({
    where: {
      marketplace: 'JOOM',
      marketplaceData: {
        path: ['canaryRelease'],
        equals: true,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          titleEn: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n📊 Canary Release Statistics:`);
  console.log(`  Total canary listings: ${canaryListings.length}`);

  // ステータス別集計
  const statusCounts: Record<string, number> = {};
  for (const listing of canaryListings) {
    const status = listing.status || 'UNKNOWN';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  }

  console.log('\n  Status breakdown:');
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`    ${status}: ${count}`);
  }

  // 最近の出品
  if (canaryListings.length > 0) {
    console.log('\n  Recent canary listings:');
    for (const listing of canaryListings.slice(0, 5)) {
      const title = listing.product?.titleEn || listing.product?.title || 'Unknown';
      console.log(`    - ${title.slice(0, 40)}... [${listing.status}]`);
    }
  }

  // エラーがあれば表示
  const failedListings = canaryListings.filter((l) => l.status === 'ERROR');
  if (failedListings.length > 0) {
    console.log('\n  ⚠️ Failed listings:');
    for (const listing of failedListings) {
      const title = listing.product?.titleEn || listing.product?.title || 'Unknown';
      const errorData = listing.marketplaceData as any;
      console.log(`    - ${title.slice(0, 40)}...`);
      console.log(`      Error: ${errorData?.error || 'Unknown error'}`);
    }
  }
}

async function rollback() {
  logSection('CANARY RELEASE ROLLBACK');
  logWarning('This will disable all canary release listings!');

  // カナリーリリースの出品を取得
  const canaryListings = await prisma.listing.findMany({
    where: {
      marketplace: 'JOOM',
      marketplaceData: {
        path: ['canaryRelease'],
        equals: true,
      },
      status: {
        in: ['ACTIVE', 'PENDING_PUBLISH', 'PUBLISHING'],
      },
    },
  });

  console.log(`\n  Found ${canaryListings.length} active canary listings.`);

  if (canaryListings.length === 0) {
    log('No active canary listings to rollback.');
    return;
  }

  // ステータスを DISABLED に更新
  let updated = 0;
  for (const listing of canaryListings) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        status: 'PAUSED',
        marketplaceData: {
          ...(listing.marketplaceData as object),
          rolledBackAt: new Date().toISOString(),
          rollbackReason: 'Canary rollback',
        },
      },
    });
    updated++;
    log(`Disabled listing: ${listing.id}`);
  }

  logSuccess(`Rolled back ${updated} listings.`);
  console.log('\n📋 Next steps:');
  console.log('  1. Check Joom Merchant Portal for any remaining active listings');
  console.log('  2. Review error logs: npx tsx scripts/canary-release.ts --status');
  console.log('  3. Fix issues before resuming canary release');
}

async function runCanaryRelease(phase: number) {
  const limit = PHASE_LIMITS[phase as keyof typeof PHASE_LIMITS] || 3;

  logSection(`CANARY RELEASE - PHASE ${phase}`);
  console.log('Date:', new Date().toISOString());
  console.log('Phase:', phase);
  console.log('Max Products:', limit);
  console.log('Marketplace: JOOM');

  try {
    // 1. 接続確認
    log('Checking connections...');
    await prisma.$queryRaw`SELECT 1`;
    logSuccess('Database connected.');

    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    await redis.ping();
    logSuccess('Redis connected.');

    // 2. Joom認証確認
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'JOOM', isActive: true },
    });
    if (!credential) {
      logError('No active Joom credentials found.');
      await prisma.$disconnect();
      return;
    }
    logSuccess('Joom credentials found.');

    // 3. 既存のカナリー出品数を確認
    const existingCanary = await prisma.listing.count({
      where: {
        marketplace: 'JOOM',
        marketplaceData: {
          path: ['canaryRelease'],
          equals: true,
        },
      },
    });

    console.log(`\n📊 Existing canary listings: ${existingCanary}`);
    const remainingSlots = Math.max(0, limit - existingCanary);
    console.log(`   Remaining slots for Phase ${phase}: ${remainingSlots}`);

    if (remainingSlots === 0) {
      log(`Phase ${phase} limit reached. Run --status to check progress.`);
      log(`Or proceed to Phase ${phase + 1} with: --phase=${phase + 1}`);
      await redis.quit();
      await prisma.$disconnect();
      return;
    }

    // 4. 出品候補を取得
    // Phase 4: 高価格帯テスト - $5,000以上の商品のみ
    const isHighValuePhase = phase === 4;

    if (isHighValuePhase) {
      logSection('PHASE 4: HIGH-VALUE TEST MODE');
      console.log(`  Testing products >= ¥${HIGH_VALUE_THRESHOLD_JPY.toLocaleString()} (~$${Math.round(HIGH_VALUE_THRESHOLD_JPY / 150).toLocaleString()})`);
      console.log('  Purpose: Test if errors are Patek-specific or high-value-wide');
    }

    logSection('FETCHING PRODUCTS');
    const products = await prisma.product.findMany({
      where: {
        status: {
          in: [ProductStatus.APPROVED, ProductStatus.READY_TO_REVIEW],
        },
        titleEn: { not: null },
        listings: {
          none: {
            marketplace: 'JOOM',
          },
        },
        // Phase 4: 高価格帯のみ（テスト用）
        // 通常フェーズ: Joom価格上限を適用（¥900,000以下）
        ...(isHighValuePhase
          ? { price: { gte: HIGH_VALUE_THRESHOLD_JPY } }
          : { price: { lte: JOOM_PRICE_LIMIT_JPY } }
        ),
      },
      take: remainingSlots * 3, // 安全チェックで除外されるものを考慮
      orderBy: { price: 'desc' }, // Phase 4では価格順でソート
    });

    log(`Found ${products.length} candidates${isHighValuePhase ? ' (high-value only)' : ''}.`);

    if (isHighValuePhase && products.length > 0) {
      console.log('\n  High-value candidates by price:');
      for (const p of products.slice(0, 10)) {
        const priceUSD = Math.round(p.price / 150);
        console.log(`    - ¥${p.price.toLocaleString()} (~$${priceUSD}) ${p.brand}: ${p.titleEn?.slice(0, 35)}...`);
      }
    }

    // 5. 安全性評価
    logSection('SAFETY EVALUATION');
    const safeProducts: CanaryProduct[] = [];

    for (const product of products) {
      const { isSafe, reason } = evaluateSafety(product);
      const images = (product.processedImages as string[]) || (product.images as string[]) || [];

      if (isSafe && product.titleEn && images.length > 0) {
        safeProducts.push({
          id: product.id,
          title: product.title || '',
          titleEn: product.titleEn,
          category: product.category,
          brand: product.brand,
          price: product.price || 0,
          images,
          isSafe,
          safetyReason: reason,
        });
      } else {
        log(`Excluded: ${(product.titleEn || product.title)?.slice(0, 40)}... - ${reason}`);
      }

      if (safeProducts.length >= remainingSlots) break;
    }

    console.log(`\n✅ Safe products found: ${safeProducts.length}`);

    if (safeProducts.length === 0) {
      log('No safe products available for canary release.');
      await redis.quit();
      await prisma.$disconnect();
      return;
    }

    // 6. 出品実行
    logSection('CANARY PUBLISH EXECUTION');
    const publishQueue = new Queue(QUEUE_NAMES.PUBLISH, { connection: redis });
    const results: CanaryResult[] = [];

    // Circuit Breaker初期化
    let circuitBreaker = resetCircuitBreaker();
    log(`Circuit Breaker initialized (max consecutive errors: ${MAX_CONSECUTIVE_ERRORS}, error rate threshold: ${ERROR_RATE_THRESHOLD * 100}%)`);

    for (const product of safeProducts) {
      // Circuit Breakerがトリップしていたら処理を停止
      if (circuitBreaker.isTripped) {
        logError('Circuit Breaker TRIPPED - Stopping canary release');
        logError(`Reason: ${circuitBreaker.tripReason}`);
        logError(`Stats: ${circuitBreaker.totalErrors}/${circuitBreaker.totalRequests} errors (${((circuitBreaker.totalErrors / circuitBreaker.totalRequests) * 100).toFixed(1)}%)`);
        break;
      }

      try {
        // Listingレコード作成
        const listing = await prisma.listing.create({
          data: {
            productId: product.id,
            marketplace: 'JOOM',
            status: 'PENDING_PUBLISH',
            listingPrice: 0,
            shippingCost: 0,
            currency: 'USD',
            marketplaceData: {
              canaryRelease: true,
              canaryPhase: phase,
              createdAt: new Date().toISOString(),
              safetyReason: product.safetyReason,
            },
          },
        });

        // 出品ジョブをキューに追加
        const job = await publishQueue.add(
          'publish',
          {
            productId: product.id,
            listingId: listing.id,
            marketplace: 'joom',
            listingData: {},
            isDryRun: false,
            canaryRelease: true,
            canaryPhase: phase,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
          }
        );

        // 成功時: Circuit Breakerの連続エラーカウンタをリセット
        circuitBreaker = recordSuccess(circuitBreaker);
        logSuccess(`Queued: ${product.titleEn?.slice(0, 40)}... (Job: ${job.id})`);

        results.push({
          productId: product.id,
          title: product.titleEn || product.title,
          listingId: listing.id,
          jobId: job.id,
          status: 'queued',
        });
      } catch (error: any) {
        // エラー時: Circuit Breakerを更新
        const errorMessage = error.message || 'Unknown error';
        circuitBreaker = recordError(circuitBreaker, errorMessage);

        logError(`Failed to queue: ${product.titleEn?.slice(0, 40)}...`);
        logError(`Error: ${errorMessage}`);
        logWarning(`Circuit Breaker: ${circuitBreaker.consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS} consecutive errors`);

        results.push({
          productId: product.id,
          title: product.titleEn || product.title,
          status: 'skipped',
          skipReason: errorMessage,
        });

        // Circuit Breakerがトリップしたかチェック
        if (circuitBreaker.isTripped) {
          logError('Circuit Breaker TRIPPED - Stopping canary release');
          logError(`Reason: ${circuitBreaker.tripReason}`);
          break;
        }
      }
    }

    // Circuit Breaker統計をログ出力
    if (circuitBreaker.totalRequests > 0) {
      const errorRate = (circuitBreaker.totalErrors / circuitBreaker.totalRequests) * 100;
      log(`Circuit Breaker Summary: ${circuitBreaker.totalErrors}/${circuitBreaker.totalRequests} errors (${errorRate.toFixed(1)}%)`);
      if (circuitBreaker.isTripped) {
        logWarning('Canary release was stopped early due to Circuit Breaker');
      }
    }

    // 7. 結果レポート
    logSection('CANARY RELEASE RESULT');
    console.log(`Phase: ${phase}`);
    console.log(`Products queued: ${results.length}`);
    console.log(`Total canary listings: ${existingCanary + results.length}`);
    console.log(`Phase ${phase} limit: ${limit}`);

    // Phase 4: 高価格帯テストの場合、追加情報を表示
    if (isHighValuePhase) {
      console.log('\n📊 Phase 4 High-Value Test Summary:');
      const queuedProducts = results.filter(r => r.status === 'queued');
      if (queuedProducts.length > 0) {
        console.log('  Queued products by brand:');
        const brandCounts: Record<string, number> = {};
        for (const r of queuedProducts) {
          const product = safeProducts.find(p => p.id === r.productId);
          if (product?.brand) {
            brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1;
          }
        }
        for (const [brand, count] of Object.entries(brandCounts).sort((a, b) => b[1] - a[1])) {
          console.log(`    - ${brand}: ${count} items`);
        }
      }
      console.log('\n  Watch for errors on:');
      console.log('    - Patek Philippe (known issue)');
      console.log('    - Rolex (high-value test)');
      console.log('    - Other $5,000+ watches');
      console.log('\n  Analysis goal:');
      console.log('    - If only Patek fails: Brand-specific issue');
      console.log('    - If all $5,000+ fail: Price-related issue');
      console.log('    - If random failures: Network/rate limit issue');
    }

    console.log('\n📤 Jobs queued! Monitor progress:');
    console.log('  - Bull Board: http://localhost:3000/admin/queues');
    console.log('  - Joom Portal: https://merchant.joom.com');

    // キュー状態
    const waiting = await publishQueue.getWaitingCount();
    const active = await publishQueue.getActiveCount();
    console.log('\n📊 Queue Status:');
    console.log(`  Waiting: ${waiting}`);
    console.log(`  Active: ${active}`);

    // 次のステップ
    console.log('\n📋 Next steps:');
    console.log('  1. Wait for jobs to complete');
    console.log('  2. Check status: npx tsx scripts/canary-release.ts --status');
    console.log('  3. Monitor Joom Merchant Portal for listing status');
    if (phase < 5) {
      console.log(`  4. If successful, proceed to Phase ${phase + 1}: --phase=${phase + 1}`);
    }
    console.log('  5. If issues found, rollback: --rollback');

    logSection('END OF CANARY RELEASE');

    await redis.quit();
  } catch (error: any) {
    console.error('\n❌ Fatal Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// エントリポイント
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--status')) {
    await checkStatus();
  } else if (args.includes('--rollback')) {
    await rollback();
  } else {
    const phaseArg = args.find((a) => a.startsWith('--phase='));
    const phase = phaseArg ? parseInt(phaseArg.split('=')[1], 10) : 1;

    if (phase < 1 || phase > 5) {
      console.error('Invalid phase. Use 1-5.');
      process.exit(1);
    }

    await runCanaryRelease(phase);
  }
}

main();

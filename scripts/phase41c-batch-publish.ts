#!/usr/bin/env npx tsx
/**
 * Phase 41-C: バッチ出品テストスクリプト
 *
 * 使用方法:
 *   # Dry-run (実際には出品しない)
 *   npx tsx scripts/phase41c-batch-publish.ts --dry-run
 *
 *   # 本番実行 (最大5件)
 *   npx tsx scripts/phase41c-batch-publish.ts --max=5
 *
 *   # 本番実行 (全件、上限100)
 *   npx tsx scripts/phase41c-batch-publish.ts
 */

import { prisma, ProductStatus } from '@rakuda/database';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';

interface BatchResult {
  productId: string;
  title: string;
  listingId?: string;
  jobId?: string;
  status: 'queued' | 'skipped';
  skipReason?: string;
}

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

async function main() {
  // コマンドライン引数解析
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const maxArg = args.find(a => a.startsWith('--max='));
  const maxProducts = maxArg ? parseInt(maxArg.split('=')[1], 10) : 100;
  const marketplace = 'joom'; // 現在はJoomのみ対応

  console.log('\n');
  logSection('Phase 41-C: Batch Publish');
  console.log('Date:', new Date().toISOString());
  console.log('Mode:', isDryRun ? 'DRY-RUN (no actual publishing)' : 'PRODUCTION');
  console.log('Max Products:', maxProducts);
  console.log('Marketplace:', marketplace.toUpperCase());

  if (!isDryRun) {
    console.log('\n⚠️  WARNING: This will create REAL listings on Joom!');
    console.log('    Run with --dry-run to preview first.');
  }

  try {
    // 1. データベース接続確認
    log('Checking database connection...');
    await prisma.$queryRaw`SELECT 1`;
    log('Database connected.');

    // 2. Redis接続確認
    log('Checking Redis connection...');
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    await redis.ping();
    log('Redis connected.');

    // 3. Joom認証確認
    log('Checking Joom credentials...');
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'JOOM', isActive: true },
    });
    if (!credential) {
      log('No active Joom credentials found.');
      await prisma.$disconnect();
      return;
    }
    log('Joom credentials found.');

    // 4. 出品対象商品を取得
    logSection('FETCHING PRODUCTS');
    log(`Fetching products (max: ${maxProducts})...`);

    const products = await prisma.product.findMany({
      where: {
        status: {
          in: [ProductStatus.APPROVED, ProductStatus.READY_TO_REVIEW],
        },
        titleEn: { not: null },
      },
      include: {
        listings: {
          where: {
            marketplace: 'JOOM',
          },
        },
      },
      take: maxProducts,
      orderBy: { createdAt: 'desc' },
    });

    log(`Found ${products.length} products.`);

    if (products.length === 0) {
      log('No products available for batch publish.');
      log('Tip: Import and translate products first.');
      await prisma.$disconnect();
      return;
    }

    // 5. 商品の分析
    logSection('PRODUCT ANALYSIS');
    const analysis = {
      total: products.length,
      hasTranslation: products.filter(p => p.titleEn).length,
      hasImages: products.filter(p => {
        const images = (p.processedImages as string[]) || (p.images as string[]) || [];
        return images.length > 0;
      }).length,
      alreadyListed: products.filter(p => p.listings.length > 0).length,
      ready: 0,
    };
    analysis.ready = products.filter(p => {
      const hasTranslation = !!p.titleEn;
      const images = (p.processedImages as string[]) || (p.images as string[]) || [];
      const hasImages = images.length > 0;
      const notListed = p.listings.length === 0;
      return hasTranslation && hasImages && notListed;
    }).length;

    console.log(`  Total products: ${analysis.total}`);
    console.log(`  With translation: ${analysis.hasTranslation}`);
    console.log(`  With images: ${analysis.hasImages}`);
    console.log(`  Already listed on Joom: ${analysis.alreadyListed}`);
    console.log(`  Ready to publish: ${analysis.ready}`);

    if (analysis.ready === 0) {
      log('No products ready for publishing.');
      await prisma.$disconnect();
      return;
    }

    // 6. バッチ出品実行
    logSection('BATCH PUBLISH EXECUTION');
    const publishQueue = new Queue(QUEUE_NAMES.PUBLISH, { connection: redis });

    const results: BatchResult[] = [];
    let totalQueued = 0;
    let totalSkipped = 0;

    for (const product of products) {
      // 既存出品チェック
      if (product.listings.length > 0) {
        results.push({
          productId: product.id,
          title: product.titleEn || product.title || 'Unknown',
          status: 'skipped',
          skipReason: 'Already listed on Joom',
        });
        totalSkipped++;
        continue;
      }

      // 翻訳チェック
      if (!product.titleEn) {
        results.push({
          productId: product.id,
          title: product.title || 'Unknown',
          status: 'skipped',
          skipReason: 'No English translation',
        });
        totalSkipped++;
        continue;
      }

      // 画像チェック
      const images = (product.processedImages as string[]) || (product.images as string[]) || [];
      if (images.length === 0) {
        results.push({
          productId: product.id,
          title: product.titleEn || product.title || 'Unknown',
          status: 'skipped',
          skipReason: 'No images available',
        });
        totalSkipped++;
        continue;
      }

      if (!isDryRun) {
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
              batchPublish: true,
              createdAt: new Date().toISOString(),
            },
          },
        });

        // 出品ジョブをキューに追加
        const job = await publishQueue.add(
          'publish',
          {
            productId: product.id,
            listingId: listing.id,
            marketplace: marketplace,
            listingData: {},
            isDryRun: false,
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

        log(`Queued: ${product.titleEn?.slice(0, 40)}... (Job: ${job.id})`);

        results.push({
          productId: product.id,
          title: product.titleEn || product.title || 'Unknown',
          listingId: listing.id,
          jobId: job.id,
          status: 'queued',
        });
      } else {
        log(`[DRY-RUN] Would queue: ${product.titleEn?.slice(0, 40)}...`);

        results.push({
          productId: product.id,
          title: product.titleEn || product.title || 'Unknown',
          status: 'queued',
        });
      }

      totalQueued++;
    }

    // 7. 結果レポート
    logSection('RESULT');
    console.log(`Mode: ${isDryRun ? 'DRY-RUN' : 'PRODUCTION'}`);
    console.log(`Total processed: ${results.length}`);
    console.log(`Queued: ${totalQueued}`);
    console.log(`Skipped: ${totalSkipped}`);

    if (isDryRun) {
      console.log('\n📋 DRY-RUN Summary:');
      console.log(`  ${totalQueued} products would be queued for publishing.`);
      console.log(`  ${totalSkipped} products would be skipped.`);
      console.log('\n  Run without --dry-run to actually publish.');
    } else {
      console.log('\n📤 Jobs queued! Monitor progress:');
      console.log('  - Bull Board: http://localhost:3000/admin/queues');
      console.log('  - Joom Merchant Portal: https://merchant.joom.com');
    }

    // キュー状態表示
    const waiting = await publishQueue.getWaitingCount();
    const active = await publishQueue.getActiveCount();
    const completed = await publishQueue.getCompletedCount();
    const failed = await publishQueue.getFailedCount();

    console.log('\n📊 Queue Status:');
    console.log(`  Waiting: ${waiting}`);
    console.log(`  Active: ${active}`);
    console.log(`  Completed: ${completed}`);
    console.log(`  Failed: ${failed}`);

    // スキップされた商品のサマリー
    if (totalSkipped > 0) {
      console.log('\n⏭️ Skipped Products:');
      const skipReasons: Record<string, number> = {};
      for (const r of results.filter(r => r.status === 'skipped')) {
        const reason = r.skipReason || 'Unknown';
        skipReasons[reason] = (skipReasons[reason] || 0) + 1;
      }
      for (const [reason, count] of Object.entries(skipReasons)) {
        console.log(`  ${reason}: ${count}`);
      }
    }

    logSection('END OF BATCH PUBLISH');

    await redis.quit();
  } catch (error: any) {
    console.error('\nFatal Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

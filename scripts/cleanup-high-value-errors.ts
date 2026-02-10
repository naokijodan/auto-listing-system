#!/usr/bin/env npx tsx
/**
 * Joom ERROR状態のListingをクリーンアップ
 *
 * 高価格帯商品（¥950,000以上）でJoom出品がERRORになったものを
 * PAUSED状態に更新し、理由をmarketplaceDataに記録する。
 *
 * 使用方法:
 *   # Dry-run（確認のみ）
 *   npx tsx scripts/cleanup-high-value-errors.ts --dry-run
 *
 *   # 実行
 *   npx tsx scripts/cleanup-high-value-errors.ts
 */

import { prisma } from '@rakuda/database';

interface ErrorListing {
  id: string;
  productId: string;
  status: string;
  listingPrice: number;
  errorMessage: string | null;
  marketplaceData: Record<string, unknown>;
  product: {
    id: string;
    title: string;
    titleEn: string | null;
    price: number;
    brand: string | null;
    status: string;
  };
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logSection(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  logSection('CLEANUP HIGH-VALUE JOOM ERRORS');
  console.log('Date:', new Date().toISOString());
  console.log('Mode:', isDryRun ? 'DRY-RUN (no changes)' : 'EXECUTE');

  try {
    // 1. ERROR状態のJoom Listingを取得
    logSection('FETCHING ERROR LISTINGS');

    const errorListings = await prisma.listing.findMany({
      where: {
        marketplace: 'JOOM',
        status: 'ERROR',
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            titleEn: true,
            price: true,
            brand: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as unknown as ErrorListing[];

    console.log(`\nFound ${errorListings.length} Joom listings with ERROR status.`);

    if (errorListings.length === 0) {
      log('No ERROR listings to clean up.');
      await prisma.$disconnect();
      return;
    }

    // 2. 詳細を表示
    logSection('ERROR LISTING DETAILS');

    console.log('\n| # | Brand | Price (JPY) | Price (USD) | Title | Error |');
    console.log('|---|-------|-------------|-------------|-------|-------|');

    for (let i = 0; i < errorListings.length; i++) {
      const listing = errorListings[i];
      const product = listing.product;
      const priceUSD = Math.round(product.price / 150);
      const title = (product.titleEn || product.title).slice(0, 30);
      const error = (listing.errorMessage || 'Unknown').slice(0, 30);

      console.log(
        `| ${i + 1} | ${product.brand || 'N/A'} | ${product.price.toLocaleString()} | $${priceUSD.toLocaleString()} | ${title}... | ${error}... |`
      );
    }

    // 3. 統計を表示
    logSection('STATISTICS');

    // ブランド別集計
    const brandCounts: Record<string, number> = {};
    const priceBuckets = {
      under500k: 0,
      '500k-750k': 0,
      '750k-900k': 0,
      '900k-1M': 0,
      over1M: 0,
    };

    for (const listing of errorListings) {
      const brand = listing.product.brand || 'Unknown';
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;

      const price = listing.product.price;
      if (price < 500000) {
        priceBuckets.under500k++;
      } else if (price < 750000) {
        priceBuckets['500k-750k']++;
      } else if (price < 900000) {
        priceBuckets['750k-900k']++;
      } else if (price < 1000000) {
        priceBuckets['900k-1M']++;
      } else {
        priceBuckets.over1M++;
      }
    }

    console.log('\nBy Brand:');
    for (const [brand, count] of Object.entries(brandCounts).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${brand}: ${count}`);
    }

    console.log('\nBy Price Range:');
    console.log(`  Under 500k: ${priceBuckets.under500k}`);
    console.log(`  500k-750k: ${priceBuckets['500k-750k']}`);
    console.log(`  750k-900k: ${priceBuckets['750k-900k']}`);
    console.log(`  900k-1M: ${priceBuckets['900k-1M']}`);
    console.log(`  Over 1M: ${priceBuckets.over1M}`);

    // 4. クリーンアップ実行
    if (isDryRun) {
      logSection('DRY-RUN COMPLETE');
      console.log(`Would update ${errorListings.length} listings to PAUSED status.`);
      console.log('\nTo execute, run without --dry-run flag:');
      console.log('  npx tsx scripts/cleanup-high-value-errors.ts');
    } else {
      logSection('EXECUTING CLEANUP');

      let updated = 0;
      const now = new Date().toISOString();

      for (const listing of errorListings) {
        const existingData = listing.marketplaceData || {};

        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            status: 'PAUSED',
            marketplaceData: {
              ...existingData,
              pausedReason: 'price_limit_exceeded',
              pausedAt: now,
              previousStatus: 'ERROR',
              previousError: listing.errorMessage,
              cleanupScript: 'cleanup-high-value-errors.ts',
            },
          },
        });

        updated++;
        log(
          `Updated: ${listing.product.brand} - ${(listing.product.titleEn || listing.product.title).slice(0, 40)}...`
        );
      }

      logSection('CLEANUP COMPLETE');
      console.log(`Updated ${updated} listings from ERROR to PAUSED.`);
      console.log('\nListing status: PAUSED (not ERROR, not deleted)');
      console.log('Product status: Unchanged (available for eBay)');
      console.log('Reason recorded: price_limit_exceeded');
    }

    // 5. Product状態を確認
    logSection('PRODUCT STATUS CHECK');

    const productIds = errorListings.map((l) => l.product.id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        status: true,
        listings: {
          select: {
            marketplace: true,
            status: true,
          },
        },
      },
    });

    console.log('\nProduct listings summary:');
    for (const product of products) {
      const joomListing = product.listings.find((l) => l.marketplace === 'JOOM');
      const ebayListing = product.listings.find((l) => l.marketplace === 'EBAY');

      console.log(
        `  Product ${product.id.slice(0, 8)}...: ` +
          `Status=${product.status}, ` +
          `Joom=${joomListing?.status || 'none'}, ` +
          `eBay=${ebayListing?.status || 'none'}`
      );
    }

    console.log('\nNext steps:');
    console.log('  1. These products are now available for eBay listing');
    console.log('  2. Joom listings are PAUSED (can be resumed if needed)');
    console.log('  3. Consider: Joom has ~$6,000 price limit for certain categories');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('\nError:', errorMessage);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

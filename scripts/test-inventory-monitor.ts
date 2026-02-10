#!/usr/bin/env npx tsx
/**
 * Active商品在庫監視テスト
 * 実際に数件の商品の在庫をチェックして結果を表示
 */

import { prisma } from '@rakuda/database';

async function main() {
  console.log('=== Active Inventory Monitor Test ===\n');

  // Active商品の確認
  const activeListings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      marketplace: 'JOOM'
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          titleEn: true,
          price: true,
          sourceUrl: true,
        },
      },
    },
    take: 5,
    orderBy: { updatedAt: 'asc' },
  });

  console.log(`Active listings: ${activeListings.length}\n`);

  for (const listing of activeListings) {
    const title = (listing.product.titleEn || listing.product.title || '').substring(0, 40);
    console.log(`- ${title}...`);
    console.log(`  Price: ¥${listing.product.price.toLocaleString()}`);
    console.log(`  Source: ${listing.product.sourceUrl?.substring(0, 50) || 'N/A'}...`);
    console.log('');
  }

  // InventoryLogの確認
  const recentLogs = await prisma.inventoryLog.findMany({
    orderBy: { checkedAt: 'desc' },
    take: 5,
  });

  console.log('=== Recent Inventory Logs ===');
  console.log(`Total logs: ${recentLogs.length}\n`);

  for (const log of recentLogs) {
    console.log(`- Product: ${log.productId.substring(0, 8)}...`);
    console.log(`  Available: ${log.isAvailable}`);
    console.log(`  Price: ¥${log.price.toLocaleString()}`);
    console.log(`  Checked: ${log.checkedAt.toISOString()}`);
    console.log('');
  }

  // ShadowLogの確認
  const shadowLogs = await prisma.shadowLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('=== Recent Shadow Logs ===');
  console.log(`Total logs: ${shadowLogs.length}\n`);

  for (const log of shadowLogs) {
    console.log(`- Service: ${log.service}`);
    console.log(`  Operation: ${log.operation}`);
    console.log(`  Decision: ${log.decision || 'N/A'}`);
    console.log(`  DryRun: ${log.isDryRun}`);
    console.log('');
  }

  // ProfitThresholdの確認
  const thresholds = await prisma.profitThreshold.findMany();

  console.log('=== Profit Thresholds ===');
  console.log(`Total: ${thresholds.length}\n`);

  for (const t of thresholds) {
    console.log(`- Marketplace: ${t.marketplace}`);
    console.log(`  Min Profit Rate: ${t.minProfitRate}%`);
    console.log(`  Min Profit Amount: ¥${t.minProfitAmount}`);
    console.log(`  Alert Rate: ${t.alertProfitRate}%`);
    console.log(`  Active: ${t.isActive}, DryRun: ${t.isDryRun}`);
    console.log('');
  }

  await prisma.$disconnect();
}

main().catch(console.error);

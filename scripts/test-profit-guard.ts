#!/usr/bin/env npx tsx
/**
 * Profit Guard テスト
 * 利益計算と赤字検知のテスト
 */

import { prisma } from '@rakuda/database';

// Profit Guard の関数を直接テスト
async function testProfitCalculation() {
  console.log('=== Profit Guard Test ===\n');

  // テストケース
  const testCases = [
    {
      name: '健全な利益（20%）',
      salePrice: 100, // USD
      costPrice: 12000, // JPY (為替150で$80相当)
      expectedProfit: true,
    },
    {
      name: 'ギリギリの利益（10%）',
      salePrice: 100, // USD
      costPrice: 13500, // JPY (為替150で$90相当)
      expectedProfit: true,
    },
    {
      name: '赤字（-10%）',
      salePrice: 100, // USD
      costPrice: 16500, // JPY (為替150で$110相当)
      expectedProfit: false,
    },
    {
      name: '大幅赤字（-50%）',
      salePrice: 100, // USD
      costPrice: 22500, // JPY (為替150で$150相当)
      expectedProfit: false,
    },
  ];

  const exchangeRate = 150; // USD/JPY
  const joomFeeRate = 0.15; // 15%手数料

  console.log('Exchange Rate: ¥150/USD');
  console.log('Joom Fee: 15%\n');

  for (const tc of testCases) {
    const salePriceJpy = tc.salePrice * exchangeRate;
    const fee = salePriceJpy * joomFeeRate;
    const netRevenue = salePriceJpy - fee;
    const profitJpy = netRevenue - tc.costPrice;
    const profitRate = (profitJpy / tc.costPrice) * 100;

    console.log(`📊 ${tc.name}`);
    console.log(`   Sale: $${tc.salePrice} (¥${salePriceJpy.toLocaleString()})`);
    console.log(`   Cost: ¥${tc.costPrice.toLocaleString()}`);
    console.log(`   Fee: ¥${fee.toLocaleString()}`);
    console.log(`   Net: ¥${netRevenue.toLocaleString()}`);
    console.log(`   Profit: ¥${profitJpy.toLocaleString()} (${profitRate.toFixed(1)}%)`);
    console.log(`   Status: ${profitJpy > 0 ? '✅ Profitable' : '❌ LOSS'}`);
    console.log('');
  }

  // ProfitThreshold確認
  const thresholds = await prisma.profitThreshold.findMany();
  console.log('=== Current Thresholds ===');
  for (const t of thresholds) {
    console.log(`${t.marketplace}: Min ${t.minProfitRate}%, Alert ${t.alertProfitRate}%, DryRun: ${t.isDryRun}`);
  }

  await prisma.$disconnect();
}

testProfitCalculation().catch(console.error);

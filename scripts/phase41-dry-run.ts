#!/usr/bin/env npx tsx
/**
 * Phase 41-A: Joom本番出品 Dry-Run検証スクリプト
 *
 * 使用方法:
 *   npx tsx scripts/phase41-dry-run.ts
 *
 * 検証項目:
 *   1. データベースから商品を取得
 *   2. Joom用ペイロードを生成
 *   3. バリデーションチェック
 *   4. ペイロードのログ出力（スキーマ確認用）
 *   5. 問題点のレポート
 */

import { prisma, ProductStatus } from '@rakuda/database';
import { joomApi, calculateJoomPrice, JoomProduct } from '../apps/worker/src/lib/joom-api';

interface ValidationResult {
  field: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
}

interface DryRunReport {
  productId: string;
  productTitle: string;
  payload: JoomProduct;
  validations: ValidationResult[];
  pricing: {
    originalJpy: number;
    finalUsd: number;
    breakdown: Record<string, number>;
  };
  seoScore: number;
  estimatedVisibility: string;
  canProceed: boolean;
}

const reports: DryRunReport[] = [];

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

/**
 * Joom用の商品ペイロードを生成
 */
function generateJoomPayload(product: any, pricing: any): JoomProduct {
  // 翻訳済みタイトル（英語）を優先
  const title = product.titleEn || product.title || '';

  // 翻訳済み説明（英語）を優先
  const description = product.descriptionEn || product.description || '';

  // 画像（処理済みを優先）
  const mainImage = product.processedImages?.[0] || product.images?.[0] || '';
  const extraImages = (product.processedImages || product.images || []).slice(1, 6);

  // SKU生成
  const sku = `RAKUDA-${product.sourceItemId || product.id.slice(0, 8)}`;

  // タグ生成
  const tags: string[] = [];
  if (product.brand) tags.push(product.brand);
  if (product.category) tags.push(product.category);
  if (product.condition) tags.push(product.condition);

  return {
    name: title,
    description: description,
    mainImage: mainImage,
    extraImages: extraImages,
    price: pricing.finalPriceUsd,
    currency: 'USD',
    quantity: 1,
    shipping: {
      price: pricing.breakdown.shippingCost,
      time: '15-30',
    },
    tags: tags,
    parentSku: sku,
    sku: sku,
  };
}

/**
 * ペイロードのバリデーション
 */
function validatePayload(payload: JoomProduct): ValidationResult[] {
  const results: ValidationResult[] = [];

  // 1. タイトルチェック
  if (!payload.name || payload.name.length === 0) {
    results.push({ field: 'name', status: 'error', message: 'Title is empty' });
  } else if (payload.name.length < 10) {
    results.push({ field: 'name', status: 'warning', message: `Title too short (${payload.name.length} chars, recommend 10+)` });
  } else if (payload.name.length > 200) {
    results.push({ field: 'name', status: 'warning', message: `Title too long (${payload.name.length} chars, max 200)` });
  } else {
    results.push({ field: 'name', status: 'ok', message: `Title OK (${payload.name.length} chars)` });
  }

  // 2. 説明チェック
  if (!payload.description || payload.description.length === 0) {
    results.push({ field: 'description', status: 'error', message: 'Description is empty' });
  } else if (payload.description.length < 50) {
    results.push({ field: 'description', status: 'warning', message: `Description too short (${payload.description.length} chars, recommend 50+)` });
  } else {
    results.push({ field: 'description', status: 'ok', message: `Description OK (${payload.description.length} chars)` });
  }

  // 3. メイン画像チェック
  if (!payload.mainImage) {
    results.push({ field: 'mainImage', status: 'error', message: 'Main image is missing' });
  } else if (!payload.mainImage.startsWith('http')) {
    results.push({ field: 'mainImage', status: 'error', message: 'Main image URL is invalid' });
  } else {
    results.push({ field: 'mainImage', status: 'ok', message: 'Main image OK' });
  }

  // 4. 追加画像チェック
  const extraCount = payload.extraImages?.length || 0;
  if (extraCount === 0) {
    results.push({ field: 'extraImages', status: 'warning', message: 'No extra images (recommend 2+)' });
  } else if (extraCount < 2) {
    results.push({ field: 'extraImages', status: 'warning', message: `Only ${extraCount} extra image(s) (recommend 2+)` });
  } else {
    results.push({ field: 'extraImages', status: 'ok', message: `${extraCount} extra images` });
  }

  // 5. 価格チェック
  if (payload.price < 1) {
    results.push({ field: 'price', status: 'error', message: 'Price too low (min $1.00)' });
  } else if (payload.price > 500) {
    results.push({ field: 'price', status: 'warning', message: `High price ($${payload.price}) may reduce visibility` });
  } else {
    results.push({ field: 'price', status: 'ok', message: `Price $${payload.price.toFixed(2)}` });
  }

  // 6. SKUチェック
  if (!payload.sku || payload.sku.length === 0) {
    results.push({ field: 'sku', status: 'error', message: 'SKU is missing' });
  } else {
    results.push({ field: 'sku', status: 'ok', message: `SKU: ${payload.sku}` });
  }

  // 7. タグチェック
  const tagCount = payload.tags?.length || 0;
  if (tagCount === 0) {
    results.push({ field: 'tags', status: 'warning', message: 'No tags (recommend 3+)' });
  } else if (tagCount < 3) {
    results.push({ field: 'tags', status: 'warning', message: `Only ${tagCount} tag(s) (recommend 3+)` });
  } else {
    results.push({ field: 'tags', status: 'ok', message: `${tagCount} tags` });
  }

  // 8. 送料チェック
  if (!payload.shipping) {
    results.push({ field: 'shipping', status: 'warning', message: 'Shipping info missing' });
  } else {
    results.push({ field: 'shipping', status: 'ok', message: `Shipping $${payload.shipping.price.toFixed(2)} (${payload.shipping.time} days)` });
  }

  return results;
}

/**
 * SEOスコアを計算
 */
function calculateSeoScore(payload: JoomProduct): number {
  let score = 50;

  // タイトル
  if (payload.name.length >= 30) score += 10;
  if (payload.name.length >= 50) score += 5;

  // 説明
  if (payload.description.length >= 100) score += 10;
  if (payload.description.length >= 200) score += 5;

  // 画像
  if (payload.mainImage) score += 5;
  if ((payload.extraImages?.length || 0) >= 2) score += 10;
  if ((payload.extraImages?.length || 0) >= 4) score += 5;

  // タグ
  if ((payload.tags?.length || 0) >= 3) score += 10;
  if ((payload.tags?.length || 0) >= 5) score += 5;

  return Math.min(score, 100);
}

async function processProduct(product: any): Promise<DryRunReport> {
  log(`Processing: ${product.title?.slice(0, 50)}...`);

  // 価格計算
  const pricing = await calculateJoomPrice(product.price, product.weight || 200);

  // ペイロード生成
  const payload = generateJoomPayload(product, pricing);

  // バリデーション
  const validations = validatePayload(payload);

  // SEOスコア
  const seoScore = calculateSeoScore(payload);

  // 可視性推定
  let estimatedVisibility = 'medium';
  if (seoScore >= 80) estimatedVisibility = 'high';
  else if (seoScore < 50) estimatedVisibility = 'low';

  // 進行可否判定
  const hasErrors = validations.some(v => v.status === 'error');
  const canProceed = !hasErrors;

  return {
    productId: product.id,
    productTitle: product.title,
    payload,
    validations,
    pricing: {
      originalJpy: product.price,
      finalUsd: pricing.finalPriceUsd,
      breakdown: pricing.breakdown,
    },
    seoScore,
    estimatedVisibility,
    canProceed,
  };
}

async function main() {
  console.log('\n');
  logSection('Phase 41-A: Joom Dry-Run Verification');
  console.log('Date:', new Date().toISOString());

  try {
    // 1. データベース接続確認
    log('Checking database connection...');
    await prisma.$queryRaw`SELECT 1`;
    log('Database connected.');

    // 2. 商品を取得（READY_TO_REVIEW または APPROVED ステータス）
    log('Fetching products for dry-run...');
    const products = await prisma.product.findMany({
      where: {
        status: {
          in: [ProductStatus.READY_TO_REVIEW, ProductStatus.APPROVED, ProductStatus.ACTIVE],
        },
      },
      take: 5, // 最大5件でテスト
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (products.length === 0) {
      log('No products found for dry-run.');
      log('Tip: Import some products first using the Chrome extension.');

      // デモ用のサンプルデータを使用
      log('\nUsing demo data for validation test...');
      const demoProduct = {
        id: 'demo-001',
        title: 'Vintage Japanese Watch - Seiko Presage Automatic',
        titleEn: 'Vintage Japanese Watch - Seiko Presage Automatic SARB033',
        description: 'Beautiful vintage watch from Japan. Excellent condition with original box.',
        descriptionEn: 'Beautiful vintage Seiko Presage automatic watch. This Japanese masterpiece features a stunning silver dial with applied indices, exhibition caseback showing the 6R15 movement, and classic 38mm case size. Comes with original box and papers. Water resistant to 100m. Perfect for formal occasions or daily wear.',
        price: 35000,
        weight: 150,
        brand: 'Seiko',
        category: 'Watches',
        condition: 'Used - Excellent',
        images: ['https://example.com/watch1.jpg', 'https://example.com/watch2.jpg', 'https://example.com/watch3.jpg'],
        processedImages: [],
        sourceItemId: 'yahoo-123456',
      };

      const report = await processProduct(demoProduct);
      reports.push(report);
    } else {
      log(`Found ${products.length} product(s).`);

      for (const product of products) {
        const report = await processProduct(product);
        reports.push(report);
      }
    }

    // 3. レポート出力
    logSection('DRY-RUN RESULTS');

    for (const report of reports) {
      console.log('\n' + '-'.repeat(60));
      console.log(`Product: ${report.productTitle?.slice(0, 60)}...`);
      console.log(`ID: ${report.productId}`);
      console.log('-'.repeat(60));

      // ペイロード（JSON）
      console.log('\n📦 JOOM PAYLOAD (JSON):');
      console.log(JSON.stringify(report.payload, null, 2));

      // 価格情報
      console.log('\n💰 PRICING:');
      console.log(`  Original: ¥${report.pricing.originalJpy.toLocaleString()}`);
      console.log(`  Final:    $${report.pricing.finalUsd.toFixed(2)}`);
      console.log(`  Breakdown:`);
      console.log(`    - Cost (USD):     $${report.pricing.breakdown.costUsd}`);
      console.log(`    - Shipping:       $${report.pricing.breakdown.shippingCost}`);
      console.log(`    - Platform Fee:   $${report.pricing.breakdown.platformFee}`);
      console.log(`    - Payment Fee:    $${report.pricing.breakdown.paymentFee}`);
      console.log(`    - Profit:         $${report.pricing.breakdown.profit}`);

      // バリデーション結果
      console.log('\n✅ VALIDATION:');
      for (const v of report.validations) {
        const icon = v.status === 'ok' ? '✓' : v.status === 'warning' ? '⚠️' : '❌';
        console.log(`  ${icon} ${v.field}: ${v.message}`);
      }

      // SEO情報
      console.log('\n📊 SEO:');
      console.log(`  Score: ${report.seoScore}/100`);
      console.log(`  Visibility: ${report.estimatedVisibility.toUpperCase()}`);

      // 最終判定
      console.log('\n🎯 STATUS:');
      if (report.canProceed) {
        console.log('  ✅ READY FOR LISTING');
      } else {
        console.log('  ❌ NOT READY - Fix errors above');
      }
    }

    // サマリー
    logSection('SUMMARY');
    const passCount = reports.filter(r => r.canProceed).length;
    const failCount = reports.filter(r => !r.canProceed).length;
    const warningCount = reports.reduce((sum, r) =>
      sum + r.validations.filter(v => v.status === 'warning').length, 0);

    console.log(`  Total Products:  ${reports.length}`);
    console.log(`  ✅ Ready:        ${passCount}`);
    console.log(`  ❌ Not Ready:    ${failCount}`);
    console.log(`  ⚠️  Warnings:     ${warningCount}`);

    if (passCount > 0) {
      console.log('\n🚀 Next Step: Run Phase 41-B to publish test products');
    } else if (reports.length === 0) {
      console.log('\n💡 Next Step: Import products using Chrome extension');
    } else {
      console.log('\n🔧 Next Step: Fix validation errors above');
    }

    logSection('END OF DRY-RUN');

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

main();

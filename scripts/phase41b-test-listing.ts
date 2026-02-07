#!/usr/bin/env npx tsx
/**
 * Phase 41-B: Joom本番テスト出品スクリプト
 *
 * 使用方法:
 *   npx tsx scripts/phase41b-test-listing.ts
 *
 * 注意:
 *   - このスクリプトは実際にJoom APIを呼び出します
 *   - 1件のみテスト出品します
 *   - 出品後、Joomマーチャントポータルで確認してください
 */

import { prisma, ProductStatus } from '@rakuda/database';
import { joomApi, calculateJoomPrice, JoomProduct } from '../apps/worker/src/lib/joom-api';

interface ListingResult {
  success: boolean;
  productId: string;
  joomProductId?: string;
  error?: string;
  payload?: JoomProduct;
}

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
}

/**
 * [EN]プレフィックスを除去
 */
function removeTranslationPrefix(text: string): string {
  if (!text) return '';
  return text.replace(/^\[(EN|RU|JA)\]\s*/i, '').trim();
}

/**
 * 説明文を最小長に達するまで拡張
 */
function ensureMinimumDescription(description: string, attributes: any): string {
  if (!description) description = '';
  if (description.length >= 100) return description;

  const additions: string[] = [];
  if (attributes?.brand) additions.push(`Brand: ${attributes.brand}.`);
  if (attributes?.condition) {
    const conditionMap: Record<string, string> = {
      'new': 'Brand new condition',
      'like_new': 'Like new condition',
      'good': 'Good condition',
      'fair': 'Fair condition'
    };
    additions.push(conditionMap[attributes.condition] || `Condition: ${attributes.condition}.`);
  }
  if (attributes?.material) additions.push(`Material: ${attributes.material}.`);
  if (attributes?.color) additions.push(`Color: ${attributes.color}.`);
  additions.push('Ships from Japan with careful packaging.');
  additions.push('Authentic Japanese product.');

  let enhanced = description;
  for (const addition of additions) {
    if (enhanced.length >= 100) break;
    enhanced = enhanced ? `${enhanced} ${addition}` : addition;
  }
  return enhanced;
}

/**
 * タグを属性から生成
 */
function generateTagsFromAttributes(product: any): string[] {
  const tags: string[] = [];
  const attributes = product.attributes || {};

  if (product.brand || attributes.brand) tags.push(product.brand || attributes.brand);
  if (product.category || attributes.category) tags.push(product.category || attributes.category);
  if (product.condition || attributes.condition) tags.push(product.condition || attributes.condition);
  if (attributes.material) tags.push(attributes.material);
  if (attributes.color) tags.push(attributes.color);
  tags.push('Japanese');
  tags.push('Authentic');
  if (attributes.model) tags.push(attributes.model);

  return [...new Set(tags.filter(Boolean))].slice(0, 10);
}

/**
 * 外部アクセス可能な画像URLを選択
 */
function selectExternalImage(processed: string | undefined, original: string | undefined): string {
  if (processed && !processed.includes('localhost') && !processed.includes('127.0.0.1')) {
    return processed;
  }
  if (original && !original.includes('localhost') && !original.includes('127.0.0.1')) {
    return original;
  }
  return '';
}

/**
 * Joom用ペイロードを生成
 */
async function generateJoomPayload(product: any, pricing: any): Promise<JoomProduct> {
  const rawTitle = product.titleEn || product.title || '';
  const title = removeTranslationPrefix(rawTitle);

  const rawDescription = product.descriptionEn || product.description || '';
  const cleanDescription = removeTranslationPrefix(rawDescription);
  const description = ensureMinimumDescription(cleanDescription, product.attributes);

  const processedImages = (product.processedImages || []) as string[];
  const originalImages = (product.images || []) as string[];

  const mainImage = selectExternalImage(processedImages[0], originalImages[0]);
  const extraImages = [];
  for (let i = 1; i < 6; i++) {
    const img = selectExternalImage(processedImages[i], originalImages[i]);
    if (img) extraImages.push(img);
  }

  const sku = `RAKUDA-${product.sourceItemId || product.id.slice(0, 8)}`;
  const tags = generateTagsFromAttributes(product);

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

async function listProductToJoom(product: any): Promise<ListingResult> {
  log(`Processing: ${product.title?.slice(0, 50)}...`);

  try {
    // 1. 価格計算
    const pricing = await calculateJoomPrice(product.price, product.weight || 200);
    log(`  Price: ¥${product.price} → $${pricing.finalPriceUsd}`);

    // 2. ペイロード生成
    const payload = await generateJoomPayload(product, pricing);
    log(`  Payload generated: ${payload.name.slice(0, 40)}...`);

    // 3. 画像URL確認
    if (!payload.mainImage) {
      return {
        success: false,
        productId: product.id,
        error: 'No external image URL available',
        payload,
      };
    }
    log(`  Main image: ${payload.mainImage.slice(0, 60)}...`);

    // 4. Joom APIに出品
    log(`  Calling Joom API...`);
    const response = await joomApi.createProduct(payload);

    if (!response.success) {
      log(`  ❌ API Error: ${response.error?.message}`);
      return {
        success: false,
        productId: product.id,
        error: response.error?.message || 'Unknown API error',
        payload,
      };
    }

    const joomProductId = response.data?.id;
    log(`  ✅ Listed successfully! Joom ID: ${joomProductId}`);

    // 5. DB更新: Listingレコード作成
    await prisma.listing.create({
      data: {
        productId: product.id,
        marketplace: 'JOOM',
        marketplaceListingId: joomProductId || null,
        status: 'PENDING_PUBLISH',
        listingPrice: pricing.finalPriceUsd,
        shippingCost: pricing.breakdown.shippingCost,
        currency: 'USD',
        marketplaceData: {
          title: payload.name,
          listingUrl: joomProductId ? `https://www.joom.com/product/${joomProductId}` : null,
          createdAt: new Date().toISOString(),
        },
      },
    });

    // 6. 商品ステータス更新
    await prisma.product.update({
      where: { id: product.id },
      data: { status: ProductStatus.ACTIVE },
    });

    return {
      success: true,
      productId: product.id,
      joomProductId: joomProductId,
      payload,
    };
  } catch (error: any) {
    log(`  ❌ Error: ${error.message}`);
    return {
      success: false,
      productId: product.id,
      error: error.message,
    };
  }
}

async function main() {
  console.log('\n');
  logSection('Phase 41-B: Joom Test Listing');
  console.log('Date:', new Date().toISOString());
  console.log('⚠️  This will create a REAL listing on Joom!');

  try {
    // 1. データベース接続確認
    log('Checking database connection...');
    await prisma.$queryRaw`SELECT 1`;
    log('Database connected.');

    // 2. Joom認証確認
    log('Checking Joom credentials...');
    const credential = await prisma.marketplaceCredential.findFirst({
      where: { marketplace: 'JOOM', isActive: true },
    });
    if (!credential) {
      log('❌ No active Joom credentials found.');
      return;
    }
    log('Joom credentials found.');

    // 3. 出品対象商品を取得（1件のみ）
    log('Fetching product for test listing...');
    const product = await prisma.product.findFirst({
      where: {
        status: {
          in: [ProductStatus.READY_TO_REVIEW, ProductStatus.APPROVED],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!product) {
      log('❌ No products available for listing.');
      log('Tip: Import and approve products first.');
      return;
    }
    log(`Found product: ${product.title?.slice(0, 50)}...`);

    // 4. テスト出品実行
    logSection('LISTING EXECUTION');
    const result = await listProductToJoom(product);

    // 5. 結果レポート
    logSection('RESULT');
    if (result.success) {
      console.log('✅ TEST LISTING SUCCESSFUL!');
      console.log(`  - Product ID: ${result.productId}`);
      console.log(`  - Joom Product ID: ${result.joomProductId}`);
      console.log('');
      console.log('🔗 Next Steps:');
      console.log('  1. Check the listing on Joom Merchant Portal');
      console.log('  2. Verify product details, images, and pricing');
      console.log('  3. If OK, proceed to Phase 41-C (batch listing)');
    } else {
      console.log('❌ TEST LISTING FAILED');
      console.log(`  - Product ID: ${result.productId}`);
      console.log(`  - Error: ${result.error}`);
      console.log('');
      console.log('🔧 Troubleshooting:');
      console.log('  1. Check the error message above');
      console.log('  2. Verify Joom API credentials');
      console.log('  3. Check product data (images, title, description)');
    }

    // ペイロードログ
    if (result.payload) {
      console.log('\n📦 PAYLOAD SENT:');
      console.log(JSON.stringify(result.payload, null, 2));
    }

    logSection('END OF TEST LISTING');

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

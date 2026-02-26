/**
 * Depop出品パイプラインサービス
 *
 * 商品データをDepop Selling APIに出品するためのパイプライン。
 * 翻訳 → 画像処理 → Depop出品 → ステータス更新
 */

import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { DepopApiClient, DepopProductInput } from './depop-api';
import { downloadImages, isValidImageUrl } from './image-downloader';
import { optimizeImage, optimizeImagesParallel } from './image-optimizer';
import { uploadFile } from './storage';
import { enrichmentTaskManager } from './enrichment-service';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

const log = logger.child({ module: 'depop-publish-service' });

// ========================================
// 型定義
// ========================================

export interface DepopPublishResult {
  success: boolean;
  depopProductId?: number;
  depopUrl?: string;
  error?: string;
}

export interface DepopBatchPublishResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  results: Array<{
    productId: string;
    success: boolean;
    depopProductId?: number;
    error?: string;
  }>;
}

// ========================================
// SKU生成
// ========================================

function generateDepopSku(productId: string, brand?: string): string {
  const prefix = brand
    ? brand.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
    : 'RAK';
  const shortId = productId.substring(0, 8).toUpperCase();
  return `${prefix}-${shortId}`;
}

// ========================================
// 画像処理
// ========================================

async function processImagesForDepop(
  images: string[],
  productId: string,
): Promise<string[]> {
  const maxImages = 4; // Depop最大4枚
  const targetImages = images.slice(0, maxImages);
  const processed: string[] = [];

  const tmpDir = path.join(os.tmpdir(), `depop-img-${productId}`);
  await fs.mkdir(tmpDir, { recursive: true });

  try {
    for (let i = 0; i < targetImages.length; i++) {
      const imgUrl = targetImages[i];
      if (!isValidImageUrl(imgUrl)) {
        log.warn({ imgUrl, productId }, 'Invalid image URL, skipping');
        continue;
      }

      try {
        const downloaded = await downloadImages([imgUrl], tmpDir);
        if (downloaded.length === 0) continue;

        const optimized = await optimizeImage(downloaded[0], {
          width: 1280,
          height: 1280,
          quality: 90,
          format: 'jpeg',
        });

        const s3Key = `depop/${productId}/image-${i}.jpg`;
        const uploadedUrl = await uploadFile(optimized, s3Key, 'image/jpeg');
        processed.push(uploadedUrl);
      } catch (error) {
        log.warn({ error, imgUrl, productId }, 'Failed to process image');
      }
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }

  return processed;
}

// ========================================
// 価格計算
// ========================================

function calculateDepopPrice(
  priceJpy: number,
  currency: 'USD' | 'GBP' | 'AUD' | 'EUR' = 'USD',
): { amount: number; currency: 'USD' | 'GBP' | 'AUD' | 'EUR' } {
  // 簡易為替レート（実際はDB/APIから取得）
  const rates: Record<string, number> = {
    USD: 0.0067,
    GBP: 0.0053,
    AUD: 0.0103,
    EUR: 0.0062,
  };

  const rate = rates[currency] || rates.USD;
  const basePrice = priceJpy * rate;

  // マージン30%追加
  const margin = 1.3;
  const finalPrice = Math.ceil(basePrice * margin * 100) / 100;

  return { amount: finalPrice, currency };
}

// ========================================
// Depop Condition マッピング
// ========================================

function mapCondition(
  condition?: string,
): 'NEW_WITH_TAGS' | 'NEW_WITHOUT_TAGS' | 'LIKE_NEW' | 'GOOD' | 'FAIR' {
  if (!condition) return 'GOOD';

  const normalized = condition.toLowerCase();
  if (normalized.includes('new') && normalized.includes('tag')) return 'NEW_WITH_TAGS';
  if (normalized.includes('new')) return 'NEW_WITHOUT_TAGS';
  if (normalized.includes('mint') || normalized.includes('excellent') || normalized.includes('like new')) return 'LIKE_NEW';
  if (normalized.includes('good') || normalized.includes('美品')) return 'GOOD';
  return 'FAIR';
}

// ========================================
// メイン出品ロジック
// ========================================

export async function publishToDepop(productId: string): Promise<DepopPublishResult> {
  const client = new DepopApiClient();

  try {
    // 1. 商品データ取得
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        source: true,
        depopListings: true,
      },
    });

    if (!product) {
      return { success: false, error: 'Product not found' };
    }

    // 2. 既存出品チェック
    const existingListing = product.depopListings[0];
    if (existingListing?.status === 'ACTIVE') {
      return { success: false, error: 'Already listed on Depop' };
    }

    // 3. 翻訳済みの説明文を使用（なければ翻訳実行）
    let description = product.descriptionEn || product.description;
    if (!product.descriptionEn) {
      try {
        const enriched = await enrichmentTaskManager.translate(product.description, 'en');
        description = enriched;
      } catch (error) {
        log.warn({ error, productId }, 'Translation failed, using original');
      }
    }

    // Depopの説明文フォーマット（最大1000文字）
    description = description.substring(0, 1000);

    // 4. 画像処理
    const images = product.processedImages.length > 0
      ? product.processedImages
      : product.images;

    const processedImages = await processImagesForDepop(images, productId);
    if (processedImages.length === 0) {
      return { success: false, error: 'No valid images available' };
    }

    // 5. SKU生成
    const sku = existingListing?.sku || generateDepopSku(productId, product.brand || undefined);

    // 6. 価格計算
    const price = calculateDepopPrice(product.price);

    // 7. Depop出品データ構築
    const depopData: DepopProductInput = {
      description,
      pictures: processedImages,
      price,
      quantity: 1,
      condition: mapCondition(product.condition || undefined),
      national_shipping_cost: { amount: 10.00, currency: 'USD' },
    };

    // 8. Depop APIに出品
    log.info({ productId, sku }, 'Publishing to Depop');
    const result = await client.createOrUpdateProduct(sku, depopData);

    // 9. DB更新
    const depopProductId = result.product_id;
    const listingData = {
      depopProductId,
      sku,
      description,
      pictures: processedImages,
      price: price.amount,
      currency: price.currency,
      quantity: 1,
      condition: depopData.condition,
      shippingType: 'MANUAL',
      shippingCost: 10.00,
      status: 'ACTIVE' as const,
      publishedAt: new Date(),
      errorMessage: null,
      errorCount: 0,
    };

    if (existingListing) {
      await prisma.depopListing.update({
        where: { id: existingListing.id },
        data: listingData,
      });
    } else {
      await prisma.depopListing.create({
        data: {
          ...listingData,
          productId,
        },
      });
    }

    log.info({ productId, depopProductId, sku }, 'Successfully published to Depop');

    return {
      success: true,
      depopProductId,
      depopUrl: `https://www.depop.com/products/${sku}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error, productId }, 'Failed to publish to Depop');

    // エラー記録
    const existing = await prisma.depopListing.findFirst({
      where: { productId },
    });

    if (existing) {
      await prisma.depopListing.update({
        where: { id: existing.id },
        data: {
          status: 'ERROR',
          errorMessage: message,
          errorCount: { increment: 1 },
        },
      });
    } else {
      await prisma.depopListing.create({
        data: {
          productId,
          status: 'ERROR',
          errorMessage: message,
          errorCount: 1,
        },
      });
    }

    return { success: false, error: message };
  }
}

// ========================================
// バッチ出品
// ========================================

export async function batchPublishToDepop(
  productIds: string[],
): Promise<DepopBatchPublishResult> {
  const results: DepopBatchPublishResult = {
    total: productIds.length,
    success: 0,
    failed: 0,
    skipped: 0,
    results: [],
  };

  for (const productId of productIds) {
    const result = await publishToDepop(productId);

    results.results.push({
      productId,
      success: result.success,
      depopProductId: result.depopProductId,
      error: result.error,
    });

    if (result.success) {
      results.success++;
    } else if (result.error?.includes('Already listed')) {
      results.skipped++;
    } else {
      results.failed++;
    }

    // レート制限を考慮して間隔を空ける
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  log.info(
    { total: results.total, success: results.success, failed: results.failed },
    'Depop batch publish completed',
  );

  return results;
}

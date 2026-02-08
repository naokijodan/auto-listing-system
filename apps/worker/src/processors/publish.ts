import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { PublishJobPayload, PublishJobResult } from '@rakuda/schema';
import { joomApi, isJoomConfigured } from '../lib/joom-api';
import { ebayApi, isEbayConfigured, mapConditionToEbay } from '../lib/ebay-api';
import { calculatePrice } from '../lib/price-calculator';
import { alertManager } from '../lib/alert-manager';
import { eventBus } from '../lib/event-bus';

/**
 * 出品ジョブプロセッサー
 */
export async function processPublishJob(
  job: Job<PublishJobPayload>
): Promise<PublishJobResult> {
  const { productId, listingId, marketplace, listingData, isDryRun } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'publish' });

  log.info({
    type: 'publish_start',
    productId,
    listingId,
    marketplace,
    isDryRun,
  });

  // 出品情報取得
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { product: true },
  });

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  const product = listing.product;

  // ステータス更新
  await prisma.listing.update({
    where: { id: listingId },
    data: { status: 'PUBLISHING' },
  });

  await prisma.product.update({
    where: { id: productId },
    data: { status: 'PUBLISHING' },
  });

  try {
    let marketplaceListingId: string | undefined;
    let listingUrl: string | undefined;

    if (isDryRun) {
      log.info({ type: 'dry_run', message: 'Skipping actual publish' });
      marketplaceListingId = `dry-run-${Date.now()}`;
    } else {
      if (marketplace === 'joom') {
        const result = await publishToJoom(product, listing, log);
        marketplaceListingId = result.id;
        listingUrl = result.url;
      } else if (marketplace === 'ebay') {
        const result = await publishToEbay(product, listing, log);
        marketplaceListingId = result.id;
        listingUrl = result.url;
      }
    }

    // ステータス更新
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ACTIVE',
        marketplaceListingId,
        listedAt: new Date(),
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: { status: 'ACTIVE' },
    });

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `publish-${Date.now()}`,
        queueName: 'publish',
        jobType: 'PUBLISH',
        status: 'COMPLETED',
        productId,
        result: {
          marketplace,
          marketplaceListingId,
          listingUrl,
        },
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'publish_complete',
      listingId,
      marketplaceListingId,
      listingUrl,
    });

    // Phase 27: リアルタイムイベント発火（出品成功）
    if (listingId) {
      await eventBus.publishListingUpdate(listingId, 'created', {
        productId,
        marketplace,
        marketplaceListingId,
        listingUrl,
        title: product.title,
      });
    }

    return {
      success: true,
      message: 'Published successfully',
      marketplaceListingId,
      listingUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    log.error({
      type: 'publish_error',
      error: error.message,
    });

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: 'ERROR',
        errorMessage: error.message,
      },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        status: 'ERROR',
        lastError: error.message,
      },
    });

    await prisma.jobLog.create({
      data: {
        jobId: job.id || `publish-${Date.now()}`,
        queueName: 'publish',
        jobType: 'PUBLISH',
        status: 'FAILED',
        productId,
        errorMessage: error.message,
        startedAt: new Date(),
      },
    });

    // Phase 26: AlertManager経由のアラート発火
    await alertManager.processEvent({
      type: 'LISTING_FAILED',
      productId,
      listingId,
      data: {
        title: product.title,
        marketplace: marketplace.toUpperCase(),
        error: error.message,
      },
      timestamp: new Date().toISOString(),
    });

    // Phase 27: リアルタイムイベント発火（出品失敗）
    if (listingId) {
      await eventBus.publishListingUpdate(listingId, 'updated', {
        productId,
        marketplace,
        status: 'error',
        error: error.message,
        title: product.title,
      });
    }

    throw error;
  }
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
  tags.push('Japanese');
  tags.push('Authentic');

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
  return processed || original || '';
}

/**
 * Joomに出品（Phase 41-C: API v3対応版）
 */
async function publishToJoom(
  product: any,
  listing: any,
  log: any
): Promise<{ id: string; url?: string }> {
  if (!(await isJoomConfigured())) {
    log.warn({ type: 'joom_not_configured' });
    return {
      id: `joom-placeholder-${Date.now()}`,
      url: undefined,
    };
  }

  // 価格計算
  const priceResult = await calculatePrice({
    sourcePrice: product.price,
    weight: product.weight || 200,
    category: product.category,
    marketplace: 'joom',
  });

  // SKU生成（RAKUDA形式）
  const parentSku = `RAKUDA-${product.sourceItemId || product.id.substring(0, 8)}`;

  // タイトル・説明文の処理
  const rawTitle = product.titleEn || product.title;
  const title = removeTranslationPrefix(rawTitle);
  const rawDescription = product.descriptionEn || product.description;
  const cleanDescription = removeTranslationPrefix(rawDescription);
  const description = ensureMinimumDescription(cleanDescription, product.attributes);

  // 画像URL（外部アクセス可能なURLを優先）
  const processedImages = (product.processedImages || []) as string[];
  const originalImages = (product.images || []) as string[];
  const mainImage = selectExternalImage(processedImages[0], originalImages[0]);
  const extraImages = [];
  for (let i = 1; i < 6; i++) {
    const img = selectExternalImage(processedImages[i], originalImages[i]);
    if (img) extraImages.push(img);
  }

  // タグ生成
  const tags = generateTagsFromAttributes(product);

  log.info({
    type: 'joom_publish_preparing',
    title: title.substring(0, 50),
    mainImage: mainImage.substring(0, 60),
    price: priceResult.listingPrice,
  });

  // Joom商品作成
  const result = await joomApi.createProduct({
    name: title,
    description: description,
    mainImage: mainImage,
    extraImages: extraImages,
    price: priceResult.listingPrice,
    currency: 'USD',
    quantity: 1,
    sku: parentSku,
    parentSku: parentSku,
    tags: tags,
    shipping: {
      price: priceResult.shippingCost,
      time: '15-30',
    },
  });

  if (!result.success) {
    // 既に存在する場合はエラーではなく既存IDを返す
    if (result.error?.message?.includes('already_exists')) {
      const match = result.error.message.match(/productID=([a-f0-9]+)/);
      if (match) {
        log.info({
          type: 'joom_product_already_exists',
          existingProductId: match[1],
        });
        return {
          id: match[1],
          url: `https://www.joom.com/en/products/${match[1]}`,
        };
      }
    }
    throw new Error(`Joom API error: ${result.error?.message}`);
  }

  const joomProductId = result.data?.id;

  // 商品を有効化
  if (joomProductId) {
    try {
      await joomApi.enableProduct(joomProductId);
      log.info({ type: 'joom_product_enabled', joomProductId });
    } catch (enableError: any) {
      log.warn({
        type: 'joom_enable_failed',
        joomProductId,
        error: enableError.message,
      });
    }
  }

  log.info({
    type: 'joom_published',
    joomProductId,
    price: priceResult.listingPrice,
    sku: parentSku,
  });

  return {
    id: joomProductId || `joom-${Date.now()}`,
    url: joomProductId
      ? `https://www.joom.com/en/products/${joomProductId}`
      : undefined,
  };
}

/**
 * eBayに出品
 */
async function publishToEbay(
  product: any,
  listing: any,
  log: any
): Promise<{ id: string; url?: string }> {
  if (!(await isEbayConfigured())) {
    log.warn({ type: 'ebay_not_configured' });
    // プレースホルダーを返す
    return {
      id: `ebay-placeholder-${Date.now()}`,
      url: undefined,
    };
  }

  // 価格計算
  const priceResult = await calculatePrice({
    sourcePrice: product.price,
    weight: product.weight || 200,
    category: product.category,
    marketplace: 'ebay',
    region: 'US',
  });

  // SKU生成
  const sku = `ALS-${product.id.substring(0, 8)}`;

  // Phase 45: 改善されたカテゴリマッピング
  // タイトル・説明文を使って高精度なカテゴリ推定
  const categoryResult = await ebayApi.getCategoryWithSpecifics(
    product.category || '',
    product.titleEn || product.title,
    product.descriptionEn || product.description
  );
  const finalCategoryId = categoryResult.categoryId || '99'; // デフォルト: Everything Else

  // ItemSpecificsをマージ（商品属性 + カテゴリデフォルト）
  const mergedAspects = {
    ...categoryResult.itemSpecifics,
    ...(product.attributes?.itemSpecifics || {}),
  };

  log.info({
    type: 'ebay_category_mapped',
    sourceCategory: product.category,
    ebayCategoryId: finalCategoryId,
    aspectsCount: Object.keys(mergedAspects).length,
  });

  // 1. インベントリアイテム作成
  const inventoryResult = await ebayApi.createOrUpdateInventoryItem(sku, {
    title: product.titleEn || product.title,
    description: product.descriptionEn || product.description,
    imageUrls: product.processedImages || product.images,
    condition: mapConditionToEbay(product.condition),
    conditionDescription: product.condition,
    aspects: mergedAspects,
  });

  if (!inventoryResult.success) {
    throw new Error(`eBay Inventory API error: ${inventoryResult.error?.message}`);
  }

  // 2. オファー作成
  const offerResult = await ebayApi.createOffer(sku, {
    marketplaceId: 'EBAY_US',
    format: 'FIXED_PRICE',
    categoryId: finalCategoryId,
    pricingPrice: priceResult.listingPrice,
    pricingCurrency: 'USD',
    quantity: 1,
    listingDescription: product.descriptionEn || product.description,
  });

  if (!offerResult.success) {
    throw new Error(`eBay Offer API error: ${offerResult.error?.message}`);
  }

  const offerId = offerResult.data?.offerId;

  // 3. オファー公開
  if (offerId) {
    const publishResult = await ebayApi.publishOffer(offerId);

    if (!publishResult.success) {
      throw new Error(`eBay Publish API error: ${publishResult.error?.message}`);
    }

    const listingId = publishResult.data?.listingId;

    log.info({
      type: 'ebay_published',
      ebayListingId: listingId,
      offerId,
      price: priceResult.listingPrice,
    });

    return {
      id: listingId || offerId,
      url: listingId
        ? `https://www.ebay.com/itm/${listingId}`
        : undefined,
    };
  }

  return {
    id: `ebay-${Date.now()}`,
    url: undefined,
  };
}

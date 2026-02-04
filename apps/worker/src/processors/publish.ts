import { Job } from 'bullmq';
import { prisma } from '@als/database';
import { logger } from '@als/logger';
import { PublishJobPayload, PublishJobResult } from '@als/schema';
import { joomApi, isJoomConfigured } from '../lib/joom-api';
import { ebayApi, isEbayConfigured, mapConditionToEbay } from '../lib/ebay-api';
import { calculatePrice } from '../lib/price-calculator';

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

    throw error;
  }
}

/**
 * Joomに出品
 */
async function publishToJoom(
  product: any,
  listing: any,
  log: any
): Promise<{ id: string; url?: string }> {
  if (!(await isJoomConfigured())) {
    log.warn({ type: 'joom_not_configured' });
    // プレースホルダーを返す
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

  // SKU生成
  const sku = `ALS-${product.id.substring(0, 8)}`;

  // Joom商品作成
  const result = await joomApi.createProduct({
    name: product.titleEn || product.title,
    description: product.descriptionEn || product.description,
    mainImage: product.processedImages?.[0] || product.images[0],
    extraImages: (product.processedImages || product.images).slice(1, 10),
    price: priceResult.listingPrice,
    currency: 'USD',
    quantity: 1,
    sku,
    shipping: {
      price: priceResult.shippingCost,
      time: '15-30',
    },
  });

  if (!result.success) {
    throw new Error(`Joom API error: ${result.error?.message}`);
  }

  // 商品を有効化
  if (result.data?.id) {
    await joomApi.enableProduct(result.data.id);
  }

  log.info({
    type: 'joom_published',
    joomProductId: result.data?.id,
    price: priceResult.listingPrice,
  });

  return {
    id: result.data?.id || `joom-${Date.now()}`,
    url: result.data?.id
      ? `https://www.joom.com/en/products/${result.data.id}`
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

  // カテゴリマッピング
  const categoryId = await ebayApi.getCategoryId(product.category || '');
  const finalCategoryId = categoryId || '175672'; // デフォルト: その他

  // 1. インベントリアイテム作成
  const inventoryResult = await ebayApi.createOrUpdateInventoryItem(sku, {
    title: product.titleEn || product.title,
    description: product.descriptionEn || product.description,
    imageUrls: product.processedImages || product.images,
    condition: mapConditionToEbay(product.condition),
    conditionDescription: product.condition,
    aspects: product.attributes?.itemSpecifics || {},
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

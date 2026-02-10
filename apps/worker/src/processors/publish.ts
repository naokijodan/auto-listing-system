import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { PublishJobPayload, PublishJobResult } from '@rakuda/schema';
import {
  processBatch,
  BatchProcessorConfig,
  BatchProcessorResult,
  BatchProgressInfo,
  MARKETPLACE_PRICE_LIMITS,
} from '@rakuda/config';
import { joomApi, isJoomConfigured } from '../lib/joom-api';
import { ebayApi, isEbayConfigured, mapConditionToEbay } from '../lib/ebay-api';
import { calculatePrice } from '../lib/price-calculator';
import { alertManager } from '../lib/alert-manager';
import { eventBus } from '../lib/event-bus';
import { RateLimiter } from '../lib/api-utils';

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
 * eBay APIエラーコード
 */
const EBAY_ERROR_CODES = {
  UNAUTHORIZED: 401,
  VALIDATION_ERROR: 422,
  RATE_LIMIT: 429,
} as const;

/**
 * eBay APIエラーをパース
 */
function parseEbayError(error: any): {
  code: number | string;
  message: string;
  isRetryable: boolean;
} {
  const errorCode = error?.code || 'UNKNOWN';
  const errorMessage = error?.message || 'Unknown eBay API error';

  // レート制限はリトライ可能
  if (errorCode === 'RATE_LIMIT' || errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return { code: EBAY_ERROR_CODES.RATE_LIMIT, message: errorMessage, isRetryable: true };
  }

  // 認証エラーはリトライ不可（トークン更新が必要）
  if (errorCode === 'AUTH_ERROR' || errorMessage.includes('unauthorized') || errorMessage.includes('token')) {
    return { code: EBAY_ERROR_CODES.UNAUTHORIZED, message: errorMessage, isRetryable: false };
  }

  // バリデーションエラーはリトライ不可
  if (errorCode === 'VALIDATION' || errorMessage.includes('validation')) {
    return { code: EBAY_ERROR_CODES.VALIDATION_ERROR, message: errorMessage, isRetryable: false };
  }

  // その他のエラー（ネットワーク等）はリトライ可能
  return { code: errorCode, message: errorMessage, isRetryable: true };
}

/**
 * Item Specifics を構造化
 */
function buildItemSpecifics(product: any, categoryDefaults: Record<string, string[]>): Record<string, string[]> {
  const aspects: Record<string, string[]> = { ...categoryDefaults };

  // ブランド
  if (product.brand) {
    aspects['Brand'] = [product.brand];
  } else if (product.attributes?.brand) {
    aspects['Brand'] = [product.attributes.brand];
  }

  // コンディション（eBay標準フォーマット）
  const conditionMap: Record<string, string> = {
    '新品': 'New',
    '未使用': 'New',
    '新品・未使用': 'New',
    '未使用に近い': 'New other',
    '目立った傷や汚れなし': 'Used',
    'やや傷や汚れあり': 'Used',
    '傷や汚れあり': 'Used',
    '全体的に状態が悪い': 'For parts or not working',
  };
  if (product.condition && conditionMap[product.condition]) {
    // Item Specificsの「Condition」は別途設定される
  }

  // カテゴリ固有の属性を追加
  if (product.attributes) {
    const attrs = product.attributes;

    // 時計カテゴリ
    if (attrs.model) aspects['Model'] = [attrs.model];
    if (attrs.movement) aspects['Movement'] = [attrs.movement];
    if (attrs.caseMaterial) aspects['Case Material'] = [attrs.caseMaterial];
    if (attrs.bandMaterial) aspects['Band Material'] = [attrs.bandMaterial];
    if (attrs.dialColor) aspects['Dial Color'] = [attrs.dialColor];
    if (attrs.caseSize) aspects['Case Size'] = [attrs.caseSize];

    // 一般的な属性
    if (attrs.color) aspects['Color'] = [attrs.color];
    if (attrs.size) aspects['Size'] = [attrs.size];
    if (attrs.material) aspects['Material'] = [attrs.material];
  }

  // Country/Region of Manufacture（日本固定）
  aspects['Country/Region of Manufacture'] = ['Japan'];

  return aspects;
}

/**
 * eBay出品のリトライロジック付き実行
 */
async function executeWithEbayRetry<T>(
  operation: () => Promise<T>,
  log: any,
  operationName: string,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  let retryDelay = 1000; // 初期遅延 1秒

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const parsedError = parseEbayError(error);

      log.warn({
        type: 'ebay_operation_retry',
        operation: operationName,
        attempt,
        maxRetries,
        error: parsedError.message,
        isRetryable: parsedError.isRetryable,
      });

      if (!parsedError.isRetryable) {
        throw error;
      }

      lastError = error;

      if (attempt < maxRetries) {
        // 指数バックオフ
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;

        // レート制限の場合は長めに待機
        if (parsedError.code === EBAY_ERROR_CODES.RATE_LIMIT) {
          retryDelay = Math.max(retryDelay, 5000);
        }
      }
    }
  }

  throw lastError;
}

/**
 * eBayに出品（完全実装版）
 */
async function publishToEbay(
  product: any,
  listing: any,
  log: any
): Promise<{ id: string; url?: string }> {
  if (!(await isEbayConfigured())) {
    log.warn({ type: 'ebay_not_configured' });
    return {
      id: `ebay-placeholder-${Date.now()}`,
      url: undefined,
    };
  }

  // SKU生成: ALS-{productId の先頭8文字}
  const sku = `ALS-${product.id.substring(0, 8)}`;

  log.info({
    type: 'ebay_publish_start',
    productId: product.id,
    sku,
    sourcePrice: product.price,
  });

  try {
    // 1. 価格計算
    const priceResult = await calculatePrice({
      sourcePrice: product.price,
      weight: product.weight || 200,
      category: product.category,
      marketplace: 'ebay',
      region: 'US',
    });

    log.info({
      type: 'ebay_price_calculated',
      sku,
      sourcePrice: product.price,
      listingPrice: priceResult.listingPrice,
      shippingCost: priceResult.shippingCost,
    });

    // 2. カテゴリマッピング（EbayCategoryMapping参照）
    const categoryResult = await ebayApi.getCategoryWithSpecifics(
      product.category || '',
      product.titleEn || product.title,
      product.descriptionEn || product.description
    );
    const finalCategoryId = categoryResult.categoryId || '99'; // デフォルト: Everything Else

    log.info({
      type: 'ebay_category_mapped',
      sku,
      sourceCategory: product.category,
      ebayCategoryId: finalCategoryId,
    });

    // 3. Item Specifics構造化
    const itemSpecifics = buildItemSpecifics(product, categoryResult.itemSpecifics);

    log.info({
      type: 'ebay_item_specifics_built',
      sku,
      aspectsCount: Object.keys(itemSpecifics).length,
      aspects: Object.keys(itemSpecifics),
    });

    // 4. 画像URL選択（外部アクセス可能なURLを優先）
    const imageUrls = (product.processedImages?.length > 0 ? product.processedImages : product.images) || [];
    const validImageUrls = imageUrls.filter((url: string) =>
      url && !url.includes('localhost') && !url.includes('127.0.0.1')
    );

    if (validImageUrls.length === 0) {
      throw new Error('No valid external image URLs available for eBay listing');
    }

    // 5. タイトル・説明文の処理
    const title = removeTranslationPrefix(product.titleEn || product.title).substring(0, 80); // eBayタイトル上限80文字
    const description = ensureMinimumDescription(
      removeTranslationPrefix(product.descriptionEn || product.description),
      product.attributes
    );

    // 6. Inventory Item作成（リトライ付き）
    const inventoryResult = await executeWithEbayRetry(
      () => ebayApi.createOrUpdateInventoryItem(sku, {
        title,
        description,
        imageUrls: validImageUrls.slice(0, 12), // eBay上限12枚
        condition: mapConditionToEbay(product.condition),
        conditionDescription: product.condition,
        aspects: itemSpecifics,
      }),
      log,
      'createInventoryItem'
    );

    if (!inventoryResult.success) {
      const errorInfo = parseEbayError(inventoryResult.error);
      throw new Error(`eBay Inventory API error (${errorInfo.code}): ${errorInfo.message}`);
    }

    log.info({
      type: 'ebay_inventory_created',
      sku,
    });

    // 7. Offer作成（リトライ付き）
    const offerResult = await executeWithEbayRetry(
      () => ebayApi.createOffer(sku, {
        marketplaceId: 'EBAY_US',
        format: 'FIXED_PRICE',
        categoryId: finalCategoryId,
        pricingPrice: priceResult.listingPrice,
        pricingCurrency: 'USD',
        quantity: 1,
        listingDescription: description,
      }),
      log,
      'createOffer'
    );

    if (!offerResult.success) {
      const errorInfo = parseEbayError(offerResult.error);
      throw new Error(`eBay Offer API error (${errorInfo.code}): ${errorInfo.message}`);
    }

    const offerId = offerResult.data?.offerId;

    if (!offerId) {
      throw new Error('eBay Offer creation returned no offerId');
    }

    log.info({
      type: 'ebay_offer_created',
      sku,
      offerId,
    });

    // 8. Offer公開（リトライ付き）
    const publishResult = await executeWithEbayRetry(
      () => ebayApi.publishOffer(offerId),
      log,
      'publishOffer'
    );

    if (!publishResult.success) {
      const errorInfo = parseEbayError(publishResult.error);
      throw new Error(`eBay Publish API error (${errorInfo.code}): ${errorInfo.message}`);
    }

    const ebayListingId = publishResult.data?.listingId;

    log.info({
      type: 'ebay_published',
      sku,
      offerId,
      ebayListingId,
      price: priceResult.listingPrice,
      category: finalCategoryId,
    });

    return {
      id: ebayListingId || offerId,
      url: ebayListingId
        ? `https://www.ebay.com/itm/${ebayListingId}`
        : undefined,
    };

  } catch (error: any) {
    const errorInfo = parseEbayError(error);

    log.error({
      type: 'ebay_publish_failed',
      sku,
      productId: product.id,
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
      isRetryable: errorInfo.isRetryable,
    });

    // エラーメッセージを構造化して再スロー
    const structuredError = new Error(
      `eBay publish failed [${errorInfo.code}]: ${errorInfo.message}`
    );
    (structuredError as any).code = errorInfo.code;
    (structuredError as any).isRetryable = errorInfo.isRetryable;

    throw structuredError;
  }
}

// ========================================
// Phase 46: バッチ出品処理（並列化対応）
// ========================================

/**
 * バッチ出品設定
 */
export interface BatchPublishConfig {
  /** 並列度（同時出品数） */
  concurrency: number;
  /** マーケットプレイス */
  marketplace: 'joom' | 'ebay';
  /** ドライラン */
  isDryRun: boolean;
  /** 進捗コールバック */
  onProgress?: (info: BatchProgressInfo<string, PublishJobResult>) => void;
  /** 最大エラー数（これを超えると停止） */
  maxErrors?: number;
}

/**
 * バッチ出品結果
 */
export interface BatchPublishResult {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{
    listingId: string;
    success: boolean;
    marketplaceListingId?: string;
    listingUrl?: string;
    error?: string;
  }>;
  stats: {
    duration: number;
    averageTimePerItem: number;
    itemsPerMinute: number;
  };
}

/** デフォルトバッチ出品設定 */
const DEFAULT_BATCH_PUBLISH_CONFIG: Partial<BatchProcessorConfig> = {
  concurrency: 2,
  chunkSize: 20,
  delayBetweenItems: 500,     // 500ms
  delayBetweenChunks: 2000,   // 2秒
  continueOnError: true,
  maxErrors: 10,
  itemTimeout: 60000,         // 1分
  retryCount: 2,
  retryDelay: 3000,           // 3秒
  useExponentialBackoff: true,
};

/** マーケットプレイス別レート制限 */
const marketplaceRateLimiters: Record<string, RateLimiter> = {
  joom: new RateLimiter(5, 60000),   // 5リクエスト/分
  ebay: new RateLimiter(10, 60000),  // 10リクエスト/分
};

/**
 * 複数商品を一括出品（並列処理）
 *
 * @param listingIds 出品するリスティングIDの配列
 * @param config 出品設定
 * @returns バッチ出品結果
 *
 * @example
 * ```typescript
 * const result = await processBatchPublish(
 *   ['listing-1', 'listing-2', 'listing-3'],
 *   {
 *     marketplace: 'joom',
 *     concurrency: 3,
 *     isDryRun: false,
 *     onProgress: (info) => {
 *       console.log(`Progress: ${info.percentage}%`);
 *     },
 *   }
 * );
 * console.log(`Success: ${result.succeeded}/${result.total}`);
 * ```
 */
export async function processBatchPublish(
  listingIds: string[],
  config: BatchPublishConfig
): Promise<BatchPublishResult> {
  const log = logger.child({ processor: 'batch-publish', marketplace: config.marketplace });

  log.info({
    type: 'batch_publish_start',
    totalListings: listingIds.length,
    concurrency: config.concurrency,
    marketplace: config.marketplace,
    isDryRun: config.isDryRun,
  });

  const rateLimiter = marketplaceRateLimiters[config.marketplace];

  // バッチ処理実行
  const batchResult = await processBatch<string, PublishJobResult>(
    listingIds,
    async (listingId, index) => {
      // レート制限
      await rateLimiter.acquire();

      // 単一出品処理
      return publishSingleListing(listingId, config.marketplace, config.isDryRun, log);
    },
    {
      config: {
        ...DEFAULT_BATCH_PUBLISH_CONFIG,
        concurrency: config.concurrency,
        maxErrors: config.maxErrors || 10,
      },
      onProgress: config.onProgress,
      onItemStart: (listingId, index) => {
        log.debug({
          type: 'batch_publish_item_start',
          listingId,
          index,
        });
      },
      onItemComplete: (result) => {
        log.info({
          type: 'batch_publish_item_complete',
          listingId: result.item,
          success: result.success,
          duration: result.duration,
          retryCount: result.retryCount,
        });
      },
      onError: (listingId, error, index) => {
        log.error({
          type: 'batch_publish_item_error',
          listingId,
          index,
          error: error.message,
        });
      },
      logger: (message, data) => {
        log.debug({ type: message, ...data });
      },
    }
  );

  // 結果を整形
  const results = batchResult.results.map(r => ({
    listingId: r.item,
    success: r.success,
    marketplaceListingId: r.result?.marketplaceListingId,
    listingUrl: r.result?.listingUrl,
    error: r.error?.message,
  }));

  const finalResult: BatchPublishResult = {
    total: listingIds.length,
    succeeded: batchResult.stats.succeeded,
    failed: batchResult.stats.failed,
    results,
    stats: {
      duration: batchResult.stats.duration,
      averageTimePerItem: batchResult.stats.averageItemDuration,
      itemsPerMinute: batchResult.stats.itemsPerSecond * 60,
    },
  };

  log.info({
    type: 'batch_publish_complete',
    total: finalResult.total,
    succeeded: finalResult.succeeded,
    failed: finalResult.failed,
    duration: finalResult.stats.duration,
    itemsPerMinute: finalResult.stats.itemsPerMinute.toFixed(2),
  });

  return finalResult;
}

/**
 * 単一リスティングを出品（内部関数）
 */
async function publishSingleListing(
  listingId: string,
  marketplace: 'joom' | 'ebay',
  isDryRun: boolean,
  log: any
): Promise<PublishJobResult> {
  // 出品情報取得
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { product: true },
  });

  if (!listing) {
    throw new Error(`Listing not found: ${listingId}`);
  }

  const product = listing.product;
  const productId = product.id;

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

    // リアルタイムイベント発火
    await eventBus.publishListingUpdate(listingId, 'created', {
      productId,
      marketplace,
      marketplaceListingId,
      listingUrl,
      title: product.title,
    });

    return {
      success: true,
      message: 'Published successfully',
      marketplaceListingId,
      listingUrl,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    // エラー時のステータス更新
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

    // AlertManager経由のアラート発火
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

    throw error;
  }
}

/**
 * 出品待ちリスティングを一括出品
 * ステータスがPENDING_PUBLISHのリスティングを自動取得して出品
 */
export async function processPendingPublish(
  marketplace: 'joom' | 'ebay',
  options: {
    maxListings?: number;
    concurrency?: number;
    isDryRun?: boolean;
    onProgress?: (info: BatchProgressInfo<string, PublishJobResult>) => void;
  } = {}
): Promise<BatchPublishResult> {
  const log = logger.child({ processor: 'pending-publish', marketplace });

  // 出品待ちリスティングを取得
  const pendingListings = await prisma.listing.findMany({
    where: {
      marketplace: marketplace.toUpperCase() as any,
      status: 'PENDING_PUBLISH',
    },
    take: options.maxListings || 50,
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (pendingListings.length === 0) {
    log.info({ type: 'no_pending_listings', marketplace });
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      stats: { duration: 0, averageTimePerItem: 0, itemsPerMinute: 0 },
    };
  }

  const listingIds = pendingListings.map(l => l.id);

  log.info({
    type: 'pending_publish_found',
    count: listingIds.length,
    marketplace,
  });

  return processBatchPublish(listingIds, {
    marketplace,
    concurrency: options.concurrency || 2,
    isDryRun: options.isDryRun || false,
    onProgress: options.onProgress,
  });
}

// ========================================
// Phase 50: 自動出品ジョブハンドラ
// ========================================

/**
 * 出品統計情報
 */
export interface PublishStats {
  period: string;
  marketplace: string;
  totalAttempted: number;
  succeeded: number;
  failed: number;
  successRate: number;
  errorBreakdown: Record<string, number>;
  avgProcessingTime: number;
}

/**
 * 自動出品ジョブデータ
 */
export interface AutoPublishJobData {
  marketplace: 'joom' | 'ebay';
  maxListings: number;
  scheduledAt: string;
  isDryRun?: boolean;
  manual?: boolean;
  triggeredAt?: string;
}

/**
 * 自動出品ジョブプロセッサー
 * スケジューラーから1時間ごとに呼び出される
 */
export async function processAutoPublishJob(
  job: Job<AutoPublishJobData>
): Promise<BatchPublishResult> {
  const { marketplace, maxListings, isDryRun } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'auto-publish', marketplace });

  log.info({
    type: 'auto_publish_start',
    marketplace,
    maxListings,
    isDryRun,
    scheduled: job.data.scheduledAt,
    manual: job.data.manual,
  });

  // 出品待ちリスティングを取得
  const pendingListings = await prisma.listing.findMany({
    where: {
      marketplace: marketplace.toUpperCase() as any,
      status: 'PENDING_PUBLISH',
      product: {
        // 必須フィールドが揃っているか確認
        titleEn: { not: null },
        images: { isEmpty: false },
      },
    },
    take: maxListings,
    orderBy: [
      { createdAt: 'asc' }, // 古いものから
    ],
    select: { id: true },
  });

  if (pendingListings.length === 0) {
    log.info({ type: 'auto_publish_no_pending', marketplace });
    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      stats: { duration: 0, averageTimePerItem: 0, itemsPerMinute: 0 },
    };
  }

  const listingIds = pendingListings.map(l => l.id);

  log.info({
    type: 'auto_publish_found',
    count: listingIds.length,
    marketplace,
  });

  // バッチ出品を実行
  const result = await processBatchPublish(listingIds, {
    marketplace,
    concurrency: 2,
    isDryRun: isDryRun || false,
    maxErrors: 5, // 5件エラーで停止（Circuit Breaker）
    onProgress: (info) => {
      log.debug({
        type: 'auto_publish_progress',
        current: info.current,
        total: info.total,
        percentage: info.percentage,
      });
    },
  });

  // 統計ログ出力
  await logPublishStats(marketplace, result, log);

  // アラート判定
  await checkPublishAlerts(marketplace, result, log);

  log.info({
    type: 'auto_publish_complete',
    marketplace,
    total: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    successRate: result.total > 0 ? ((result.succeeded / result.total) * 100).toFixed(1) : 100,
    duration: result.stats.duration,
  });

  return result;
}

/**
 * 出品統計をログ出力
 */
async function logPublishStats(
  marketplace: string,
  result: BatchPublishResult,
  log: any
): Promise<void> {
  const errorBreakdown: Record<string, number> = {};

  // エラー種別を集計
  for (const r of result.results) {
    if (!r.success && r.error) {
      // エラーメッセージから種別を抽出
      const errorType = categorizeError(r.error);
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    }
  }

  const stats: PublishStats = {
    period: new Date().toISOString().slice(0, 13), // 時間単位
    marketplace,
    totalAttempted: result.total,
    succeeded: result.succeeded,
    failed: result.failed,
    successRate: result.total > 0 ? (result.succeeded / result.total) * 100 : 100,
    errorBreakdown,
    avgProcessingTime: result.stats.averageTimePerItem,
  };

  log.info({
    type: 'publish_stats',
    stats,
  });

  // 統計をRedisに保存（24時間分保持）
  try {
    const { default: IORedis } = await import('ioredis');
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
    const key = `rakuda:publish_stats:${marketplace}:${stats.period}`;
    await redis.set(key, JSON.stringify(stats), 'EX', 86400 * 7); // 7日間保持
    await redis.quit();
  } catch (error) {
    log.warn({ type: 'publish_stats_save_failed', error });
  }
}

/**
 * エラーを種別に分類
 */
function categorizeError(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'RATE_LIMIT';
  }
  if (lower.includes('authentication') || lower.includes('unauthorized') || lower.includes('token')) {
    return 'AUTH_ERROR';
  }
  if (lower.includes('image') || lower.includes('photo')) {
    return 'IMAGE_ERROR';
  }
  if (lower.includes('category') || lower.includes('attribute')) {
    return 'CATEGORY_ERROR';
  }
  if (lower.includes('price') || lower.includes('currency')) {
    return 'PRICE_ERROR';
  }
  if (lower.includes('network') || lower.includes('timeout') || lower.includes('connection')) {
    return 'NETWORK_ERROR';
  }
  if (lower.includes('already_exists') || lower.includes('duplicate')) {
    return 'DUPLICATE';
  }
  if (lower.includes('validation')) {
    return 'VALIDATION_ERROR';
  }

  return 'OTHER';
}

/**
 * 出品結果に基づくアラート判定
 * エラー率が高い場合は通知
 */
async function checkPublishAlerts(
  marketplace: string,
  result: BatchPublishResult,
  log: any
): Promise<void> {
  if (result.total === 0) return;

  const errorRate = (result.failed / result.total) * 100;

  // エラー率50%超でWARNING
  if (errorRate >= 50) {
    const severity: 'ERROR' | 'WARNING' = errorRate >= 80 ? 'ERROR' : 'WARNING';

    log.warn({
      type: 'publish_high_error_rate',
      severity,
      marketplace,
      errorRate: errorRate.toFixed(1),
      failed: result.failed,
      total: result.total,
    });

    // 通知送信
    try {
      const { sendNotification } = await import('../lib/notification-service');

      await sendNotification({
        eventType: 'SYSTEM_ALERT',
        severity,
        title: `High Error Rate in ${marketplace.toUpperCase()} Publishing`,
        message: `Error rate: ${errorRate.toFixed(1)}% (${result.failed}/${result.total} failed)`,
        data: {
          marketplace,
          errorRate,
          failed: result.failed,
          total: result.total,
          topErrors: Object.entries(
            result.results
              .filter(r => !r.success && r.error)
              .reduce((acc, r) => {
                const type = categorizeError(r.error!);
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
          ).slice(0, 3),
        },
      });
    } catch (notifyError) {
      log.warn({ type: 'publish_alert_send_failed', error: notifyError });
    }
  }

  // 5回連続エラーでCircuit Breaker発動（既にBatchPublishで処理済み）
  const consecutiveErrors = result.results
    .slice(-10)
    .filter(r => !r.success).length;

  if (consecutiveErrors >= 5) {
    log.warn({
      type: 'publish_circuit_breaker_triggered',
      marketplace,
      consecutiveErrors,
    });
  }
}

/**
 * 直近の出品統計を取得
 */
export async function getPublishStats(
  marketplace: string,
  hours: number = 24
): Promise<PublishStats[]> {
  const stats: PublishStats[] = [];

  try {
    const { default: IORedis } = await import('ioredis');
    const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

    const now = new Date();
    for (let i = 0; i < hours; i++) {
      const hour = new Date(now.getTime() - i * 3600000);
      const period = hour.toISOString().slice(0, 13);
      const key = `rakuda:publish_stats:${marketplace}:${period}`;

      const data = await redis.get(key);
      if (data) {
        stats.push(JSON.parse(data));
      }
    }

    await redis.quit();
  } catch (error) {
    logger.warn({ type: 'get_publish_stats_failed', error });
  }

  return stats.reverse();
}

// ========================================
// Phase 51: 高価格帯ルーティング
// ========================================

/**
 * マーケットプレイス振り分け結果
 */
export interface MarketplaceRoutingResult {
  marketplace: 'joom' | 'ebay';
  reason: string;
  priceJpy: number;
  isHighValue: boolean;
}

/**
 * 商品の価格に基づいてマーケットプレイスを決定
 * - JOOM_PRICE_LIMIT_JPY（900,000円）以下 → Joom
 * - JOOM_PRICE_LIMIT_JPY 超 → eBay専用
 */
export function determineMarketplace(priceJpy: number): MarketplaceRoutingResult {
  const { JOOM_PRICE_LIMIT_JPY } = MARKETPLACE_PRICE_LIMITS;
  const isHighValue = priceJpy > JOOM_PRICE_LIMIT_JPY;

  if (isHighValue) {
    return {
      marketplace: 'ebay',
      reason: `High-value item (¥${priceJpy.toLocaleString()} > ¥${JOOM_PRICE_LIMIT_JPY.toLocaleString()}) - eBay only`,
      priceJpy,
      isHighValue: true,
    };
  }

  return {
    marketplace: 'joom',
    reason: `Standard price (¥${priceJpy.toLocaleString()}) - Joom eligible`,
    priceJpy,
    isHighValue: false,
  };
}

/**
 * バッチ出品（価格ベースルーティング付き）
 *
 * 高価格帯商品を自動的にeBayに振り分け、低価格帯はJoomに振り分ける
 *
 * @param listingIds 出品するリスティングIDの配列
 * @param options オプション設定
 * @returns マーケットプレイス別のバッチ出品結果
 */
export async function processBatchPublishWithRouting(
  listingIds: string[],
  options: {
    concurrency?: number;
    isDryRun?: boolean;
    onProgress?: (info: BatchProgressInfo<string, PublishJobResult>) => void;
    maxErrors?: number;
  } = {}
): Promise<{
  joom: BatchPublishResult;
  ebay: BatchPublishResult;
  routing: {
    total: number;
    joomEligible: number;
    ebayOnly: number;
  };
}> {
  const log = logger.child({ processor: 'batch-publish-routing' });

  log.info({
    type: 'routing_batch_publish_start',
    totalListings: listingIds.length,
  });

  // リスティングを取得して価格で振り分け
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds } },
    include: { product: { select: { id: true, price: true, title: true } } },
  });

  const joomListingIds: string[] = [];
  const ebayListingIds: string[] = [];

  for (const listing of listings) {
    const routing = determineMarketplace(listing.product.price);

    log.debug({
      type: 'listing_routed',
      listingId: listing.id,
      productPrice: listing.product.price,
      marketplace: routing.marketplace,
      reason: routing.reason,
    });

    if (routing.marketplace === 'ebay') {
      ebayListingIds.push(listing.id);
    } else {
      joomListingIds.push(listing.id);
    }
  }

  log.info({
    type: 'routing_complete',
    total: listings.length,
    joomEligible: joomListingIds.length,
    ebayOnly: ebayListingIds.length,
  });

  // 並列でJoomとeBayに出品
  const [joomResult, ebayResult] = await Promise.all([
    joomListingIds.length > 0
      ? processBatchPublish(joomListingIds, {
          marketplace: 'joom',
          concurrency: options.concurrency || 2,
          isDryRun: options.isDryRun || false,
          onProgress: options.onProgress,
          maxErrors: options.maxErrors,
        })
      : {
          total: 0,
          succeeded: 0,
          failed: 0,
          results: [],
          stats: { duration: 0, averageTimePerItem: 0, itemsPerMinute: 0 },
        },
    ebayListingIds.length > 0
      ? processBatchPublish(ebayListingIds, {
          marketplace: 'ebay',
          concurrency: options.concurrency || 2,
          isDryRun: options.isDryRun || false,
          onProgress: options.onProgress,
          maxErrors: options.maxErrors,
        })
      : {
          total: 0,
          succeeded: 0,
          failed: 0,
          results: [],
          stats: { duration: 0, averageTimePerItem: 0, itemsPerMinute: 0 },
        },
  ]);

  log.info({
    type: 'routing_batch_publish_complete',
    joom: {
      total: joomResult.total,
      succeeded: joomResult.succeeded,
      failed: joomResult.failed,
    },
    ebay: {
      total: ebayResult.total,
      succeeded: ebayResult.succeeded,
      failed: ebayResult.failed,
    },
  });

  return {
    joom: joomResult,
    ebay: ebayResult,
    routing: {
      total: listings.length,
      joomEligible: joomListingIds.length,
      ebayOnly: ebayListingIds.length,
    },
  };
}

/**
 * 高価格帯商品のeBay専用出品処理
 *
 * JOOM_PRICE_LIMIT_JPY を超える商品を検索し、eBayに出品
 */
export async function processHighValuePublish(
  options: {
    maxListings?: number;
    concurrency?: number;
    isDryRun?: boolean;
    onProgress?: (info: BatchProgressInfo<string, PublishJobResult>) => void;
  } = {}
): Promise<BatchPublishResult> {
  const log = logger.child({ processor: 'high-value-publish' });
  const { JOOM_PRICE_LIMIT_JPY } = MARKETPLACE_PRICE_LIMITS;

  log.info({
    type: 'high_value_publish_start',
    priceThreshold: JOOM_PRICE_LIMIT_JPY,
    maxListings: options.maxListings || 50,
  });

  // 高価格帯で出品待ちの商品を検索
  const highValueListings = await prisma.listing.findMany({
    where: {
      marketplace: 'EBAY',
      status: 'PENDING_PUBLISH',
      product: {
        price: { gt: JOOM_PRICE_LIMIT_JPY },
        titleEn: { not: null },
        images: { isEmpty: false },
      },
    },
    take: options.maxListings || 50,
    orderBy: { createdAt: 'asc' },
    select: { id: true, product: { select: { price: true } } },
  });

  if (highValueListings.length === 0) {
    log.info({
      type: 'high_value_publish_no_items',
      priceThreshold: JOOM_PRICE_LIMIT_JPY,
    });

    return {
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      stats: { duration: 0, averageTimePerItem: 0, itemsPerMinute: 0 },
    };
  }

  const listingIds = highValueListings.map(l => l.id);
  const priceRange = {
    min: Math.min(...highValueListings.map(l => l.product.price)),
    max: Math.max(...highValueListings.map(l => l.product.price)),
  };

  log.info({
    type: 'high_value_publish_found',
    count: listingIds.length,
    priceRange,
  });

  return processBatchPublish(listingIds, {
    marketplace: 'ebay',
    concurrency: options.concurrency || 2,
    isDryRun: options.isDryRun || false,
    onProgress: options.onProgress,
    maxErrors: 5,
  });
}

/**
 * 出品待ち商品のマーケットプレイス統計を取得
 */
export async function getPendingListingStats(): Promise<{
  total: number;
  joomEligible: number;
  ebayOnly: number;
  byPriceRange: {
    range: string;
    count: number;
    marketplace: 'joom' | 'ebay';
  }[];
}> {
  const { JOOM_PRICE_LIMIT_JPY } = MARKETPLACE_PRICE_LIMITS;

  // 出品待ちリスティングを取得
  const pendingListings = await prisma.listing.findMany({
    where: {
      status: 'PENDING_PUBLISH',
    },
    include: {
      product: {
        select: { price: true },
      },
    },
  });

  let joomEligible = 0;
  let ebayOnly = 0;
  const priceRanges: Record<string, { count: number; marketplace: 'joom' | 'ebay' }> = {
    '0-100k': { count: 0, marketplace: 'joom' },
    '100k-300k': { count: 0, marketplace: 'joom' },
    '300k-500k': { count: 0, marketplace: 'joom' },
    '500k-900k': { count: 0, marketplace: 'joom' },
    '900k+': { count: 0, marketplace: 'ebay' },
  };

  for (const listing of pendingListings) {
    const price = listing.product.price;

    if (price > JOOM_PRICE_LIMIT_JPY) {
      ebayOnly++;
      priceRanges['900k+'].count++;
    } else {
      joomEligible++;

      if (price < 100000) {
        priceRanges['0-100k'].count++;
      } else if (price < 300000) {
        priceRanges['100k-300k'].count++;
      } else if (price < 500000) {
        priceRanges['300k-500k'].count++;
      } else {
        priceRanges['500k-900k'].count++;
      }
    }
  }

  return {
    total: pendingListings.length,
    joomEligible,
    ebayOnly,
    byPriceRange: Object.entries(priceRanges).map(([range, data]) => ({
      range,
      count: data.count,
      marketplace: data.marketplace,
    })),
  };
}

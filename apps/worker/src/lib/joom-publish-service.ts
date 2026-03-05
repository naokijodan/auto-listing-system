/**
 * Phase 40: Joom出品ワークフロー
 * Joom APIへの商品出品を管理
 */
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { JoomApiClient, JoomProduct } from './joom-api';
import { downloadImages, isValidImageUrl } from './image-downloader';
import { optimizeImage, optimizeImagesParallel } from './image-optimizer';
import { uploadFile } from './storage';
import { enrichmentTaskManager } from './enrichment-service';
import { getCategoryMapping, fillRequiredAttributes, type ProductInfo } from './category-mapper';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

const log = logger.child({ module: 'joom-publish-service' });

/**
 * Joom国別送料テーブル（USD）
 * 重量ベース: base + (weightKg * perKg)
 */
const JOOM_SHIPPING_RATES: Record<string, { base: number; perKg: number }> = {
  // Tier 1: 主要市場（Joom Logistics対応）
  US: { base: 5.00, perKg: 2.00 },
  DE: { base: 4.50, perKg: 1.80 },
  FR: { base: 4.50, perKg: 1.80 },
  IT: { base: 5.00, perKg: 2.00 },
  ES: { base: 5.00, perKg: 2.00 },
  GB: { base: 5.50, perKg: 2.20 },
  // Tier 2: CIS市場
  RU: { base: 3.00, perKg: 1.50 },
  BY: { base: 3.50, perKg: 1.80 },
  KZ: { base: 4.00, perKg: 2.00 },
  // Tier 3: その他
  DEFAULT: { base: 6.00, perKg: 2.50 },
};

/**
 * 送料計算
 */
function calculateShippingCost(weightKg: number, countryCode: string = 'DEFAULT'): number {
  const rate = JOOM_SHIPPING_RATES[countryCode] || JOOM_SHIPPING_RATES.DEFAULT;
  return Math.round((rate.base + weightKg * rate.perKg) * 100) / 100;
}

/**
 * 送料方式
 */
type JoomShippingMethod = 'joom_logistics' | 'offline';

/**
 * Joom Logistics対応国
 */
const JOOM_LOGISTICS_COUNTRIES = ['US', 'DE', 'FR', 'IT', 'ES', 'GB'];

// ========================================
// 型定義
// ========================================

export interface JoomPublishResult {
  success: boolean;
  joomProductId?: string;
  joomListingUrl?: string;
  isExisting?: boolean;
  error?: string;
}

export interface BatchPublishResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  results: Array<{
    productId: string;
    success: boolean;
    joomProductId?: string;
    error?: string;
  }>;
}

export interface DryRunResult {
  wouldCreate: {
    title: string;
    description: string;
    price: number;
    images: string[];
    attributes: Record<string, any>;
  };
  validation: {
    passed: boolean;
    warnings: string[];
  };
  estimatedVisibility: 'low' | 'medium' | 'high';
}

// ========================================
// 画像処理サービス
// ========================================

export class ImagePipelineService {
  /**
   * 商品画像をダウンロード・最適化・アップロード
   */
  async processImages(
    productId: string,
    imageUrls: string[]
  ): Promise<{ buffered: string[]; optimized: string[] }> {
    const validUrls = imageUrls.filter(isValidImageUrl);

    if (validUrls.length === 0) {
      throw new Error('No valid image URLs');
    }

    // 一時ディレクトリ
    const tempDir = path.join(os.tmpdir(), `rakuda-images-${productId}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // 1. ダウンロード
      log.info({
        type: 'image_download_start',
        productId,
        count: validUrls.length,
      });

      const downloadResults = await downloadImages(validUrls, tempDir, {}, 3);
      const downloadedPaths = downloadResults
        .filter(r => r.success && r.filePath)
        .map(r => r.filePath!);

      if (downloadedPaths.length === 0) {
        throw new Error('All image downloads failed');
      }

      // 2. 最適化（Phase 48: 並列処理）
      log.info({
        type: 'image_optimize_start',
        productId,
        count: downloadedPaths.length,
        mode: 'parallel',
      });

      const optimizeResults = await optimizeImagesParallel(
        downloadedPaths,
        tempDir,
        {
          maxWidth: 1200,
          maxHeight: 1200,
          format: 'webp',
          quality: 85,
          background: 'white',
          concurrency: 4,  // 同時処理数
          onProgress: (completed, total) => {
            log.debug({
              type: 'image_optimize_progress',
              productId,
              completed,
              total,
            });
          },
        }
      );

      const optimizedPaths = optimizeResults
        .filter(r => r.success && r.outputPath)
        .map(r => r.outputPath!);

      // 3. S3/MinIOにアップロード
      log.info({
        type: 'image_upload_start',
        productId,
        count: optimizedPaths.length,
      });

      const bufferedUrls: string[] = [];
      const optimizedUrls: string[] = [];

      for (let i = 0; i < optimizedPaths.length; i++) {
        const optimizedPath = optimizedPaths[i];
        const key = `products/${productId}/image-${i}.webp`;

        const uploadResult = await uploadFile(optimizedPath, key);
        if (uploadResult.success && uploadResult.url) {
          bufferedUrls.push(uploadResult.url);
          optimizedUrls.push(uploadResult.url);
        }
      }

      log.info({
        type: 'image_pipeline_complete',
        productId,
        buffered: bufferedUrls.length,
        optimized: optimizedUrls.length,
      });

      return {
        buffered: bufferedUrls,
        optimized: optimizedUrls,
      };
    } finally {
      // 一時ファイルをクリーンアップ
      try {
        await fs.rm(tempDir, { recursive: true });
      } catch {
        // クリーンアップ失敗は無視
      }
    }
  }
}

// ========================================
// Joom出品サービス
// ========================================

export class JoomPublishService {
  private joomClient = new JoomApiClient();
  private imagePipeline = new ImagePipelineService();

  /**
   * Joom出品を作成
   */
  async createJoomListing(taskId: string): Promise<string> {
    const task = await prisma.enrichmentTask.findUnique({
      where: { id: taskId },
      include: { product: true },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'APPROVED') {
      throw new Error(`Task not approved: ${task.status}`);
    }

    // Listing を作成または取得（JOOM）
    const pricing = (task.pricing as any) || {};
    const initialPriceUsd: number = typeof pricing.finalPriceUsd === 'number' ? pricing.finalPriceUsd : 0;

    const existingListing = await prisma.listing.findFirst({
      where: {
        productId: task.productId,
        marketplace: 'JOOM',
        credentialId: null,
      },
    });

    const listing = existingListing
      ? await prisma.listing.update({
          where: { id: existingListing.id },
          data: { listingPrice: initialPriceUsd },
        })
      : await prisma.listing.create({
          data: {
            productId: task.productId,
            marketplace: 'JOOM',
            status: 'DRAFT',
            listingPrice: initialPriceUsd,
            currency: 'USD',
            marketplaceData: {},
          },
        });

    return listing.id;
  }

  /**
   * 画像を処理してJoomListingを更新
   */
  async processImagesForListing(listingId: string): Promise<void> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing) {
      throw new Error(`Listing not found: ${listingId}`);
    }

    const product = listing.product;

    // 画像処理（失敗時はフォールバックで続行）
    let buffered: string[] = [];
    let optimized: string[] = [];
    let hadError = false;
    try {
      const imageResult = await this.imagePipeline.processImages(
        product.id,
        product.images
      );
      buffered = imageResult.buffered;
      optimized = imageResult.optimized;
    } catch (err: any) {
      hadError = true;
      log.warn({ type: 'image_pipeline_failed', listingId, productId: product.id, error: err?.message });
    }

    // フォールバック: 最適化結果が0件なら元のURLを使用
    const finalImages = optimized.length > 0 ? optimized : (product.images || []);

    // タスクとListingを更新（marketplaceDataに画像を保存）
    const task = await prisma.enrichmentTask.findUnique({ where: { productId: listing.productId } });
    const existingData = (listing.marketplaceData as any) || {};

    if (hadError) {
      // エラーでもフォールバック画像で続行
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          status: 'PENDING_PUBLISH',
          marketplaceData: { ...(existingData || {}), joomImages: finalImages },
        },
      });
    } else {
      await prisma.$transaction([
        ...(task
          ? [
              prisma.enrichmentTask.update({
                where: { id: task.id },
                data: {
                  bufferedImages: buffered,
                  optimizedImages: optimized,
                  imageStatus: 'COMPLETED',
                },
              }),
            ]
          : []),
        prisma.listing.update({
          where: { id: listingId },
          data: {
            status: 'PENDING_PUBLISH',
            marketplaceData: { ...(existingData || {}), joomImages: finalImages },
          },
        }),
      ]);
    }

    log.info({
      type: 'images_processed',
      listingId,
      imageCount: finalImages.length,
    });
  }

  /**
   * Joomに出品
   */
  async publishToJoom(listingId: string): Promise<JoomPublishResult> {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { product: true },
    });

    if (!listing) {
      return { success: false, error: 'Listing not found' };
    }

    if (listing.marketplace !== 'JOOM') {
      return { success: false, error: 'Listing is not for JOOM' };
    }

    const task = await prisma.enrichmentTask.findUnique({ where: { productId: listing.productId } });
    if (!task) {
      return { success: false, error: 'EnrichmentTask not found for product' };
    }
    const translations = task.translations as any;
    const pricing = task.pricing as any;
    const attributes = task.attributes as any;

    // 翻訳は必須。価格は下でListing/Taskの両方から決定する
    if (!translations?.en) {
      return { success: false, error: 'Missing translations' };
    }

    try {
      // ステータスを更新
      await prisma.listing.update({ where: { id: listingId }, data: { status: 'PUBLISHING' } });

      // Phase 49: カテゴリマッピングを取得
      const productInfo: ProductInfo = {
        title: listing.product.title,
        titleEn: translations.en.title,
        description: listing.product.description || '',
        descriptionEn: translations.en.description,
        category: attributes?.category,
        brand: attributes?.brand,
        attributes: attributes,
      };

      const categoryMapping = await getCategoryMapping(productInfo);
      let joomCategory = attributes?.category || '';
      let filledAttributes = attributes || {};

      if (categoryMapping.success) {
        const mappingData = categoryMapping.existingMapping || categoryMapping.suggestion;
        if (mappingData) {
          joomCategory = mappingData.joomCategoryPath;
          // 必須属性を自動補完
          filledAttributes = await fillRequiredAttributes(productInfo, categoryMapping);
          log.info({
            type: 'category_mapped',
            joomListingId: listing.id,
            categoryId: mappingData.joomCategoryId,
            categoryPath: mappingData.joomCategoryPath,
          });
        }
      }

      // Joom商品データを構築
      const weightKg = listing.product.weight ? listing.product.weight / 1000 : 0.15;
      const defaultShipping = calculateShippingCost(weightKg);
      const md = (listing.marketplaceData as any) || {};
      // joomImages が空の場合、元の商品画像URLを直接使用
      const imageUrls: string[] = (md.joomImages && md.joomImages.length > 0)
        ? md.joomImages
        : (listing.product.images || []);
      // Listing.listingPrice を優先し、0以下の場合のみ enrichment の価格にフォールバック
      const listingPrice = typeof listing.listingPrice === 'number' ? listing.listingPrice : 0;
      const enrichmentPrice = typeof pricing?.finalPriceUsd === 'number' ? pricing.finalPriceUsd : 0;
      const finalPrice = listingPrice > 0 ? listingPrice : enrichmentPrice;

      if (!finalPrice || finalPrice <= 0) {
        throw new Error('Invalid price: must be greater than 0');
      }

      const joomProduct: JoomProduct = {
        name: translations.en.title,
        description: translations.en.description,
        mainImage: imageUrls[0] || '',
        extraImages: imageUrls.slice(1),
        price: finalPrice,
        currency: 'USD',
        quantity: 1,
        // DBはグラム単位。kgに変換し、未設定時は0.15kgを使用
        weight: weightKg,
        sku: `RAKUDA-${task.productId}`,
        shipping: {
          price: defaultShipping,
          time: '7-14 business days',
        },
        shippingMethod: 'offline',
        tags: joomCategory ? [joomCategory] : [],

        // 推奨フィールド追加（存在する場合のみ意味を持つ）
        brand: (listing.product as any).brand || attributes?.brand || undefined,
        categoryId: md.joomCategory || undefined,
        color: attributes?.color || undefined,
        size: attributes?.size || undefined,
        material: attributes?.material || attributes?.caseMaterial || undefined,
        condition: 'new',
        searchTags: attributes?.keywords || attributes?.searchTags || [],
        dangerousKind: 'none',
      };

      // mainImage が空の場合はエラー
      if (!joomProduct.mainImage) {
        throw new Error('No image available for listing. Product has no images.');
      }

      // Joom APIに出品
      const response = await this.joomClient.createProduct(joomProduct);

      if (!response.success) {
        // product_already_exists の場合はグレースフルに処理
        const errMsg = response.error?.message || '';
        if (
          response.error?.code === 'PRODUCT_ALREADY_EXISTS' ||
          errMsg.toLowerCase().includes('already_exists')
        ) {
          const existingIdMatch = errMsg.match(/productID=([a-f0-9]+)/);
          const existingProductId = existingIdMatch?.[1];

          if (existingProductId) {
            // Listingを既存商品IDでACTIVEに更新
            const existing = await prisma.listing.findUnique({ where: { id: listingId } });
            const currentData = (existing?.marketplaceData as any) || {};
            await prisma.listing.update({
              where: { id: listingId },
              data: {
                status: 'ACTIVE',
                listedAt: new Date(),
                updatedAt: new Date(),
                errorMessage: null,
                pausedByInventory: false,
                marketplaceListingId: existingProductId,
                marketplaceData: {
                  ...currentData,
                  joomProductId: existingProductId,
                  externalUrl: `https://www.joom.com/en/products/${existingProductId}`,
                },
              },
            });

            return {
              success: true,
              joomProductId: existingProductId,
              joomListingUrl: `https://www.joom.com/en/products/${existingProductId}`,
              isExisting: true,
            };
          }
        }

        // その他のエラーは通常通りスロー
        throw new Error(response.error?.message || 'Joom API error');
      }

      // 成功時の更新（Phase 49: カテゴリ情報も保存）
      const createdId = response.data?.id;
      if (!createdId) {
        throw new Error('Joom API did not return product ID');
      }
      const existing = await prisma.listing.findUnique({ where: { id: listingId } });
      const currentData = (existing?.marketplaceData as any) || {};
      await prisma.$transaction([
        prisma.listing.update({
          where: { id: listingId },
          data: {
            status: 'ACTIVE',
            listedAt: new Date(),
            updatedAt: new Date(),
            errorMessage: null,
            pausedByInventory: false,
            listingPrice: finalPrice,
            currency: 'USD',
            marketplaceListingId: createdId,
            marketplaceData: {
              ...currentData,
              joomProductId: createdId,
              title: translations.en.title,
              description: translations.en.description,
              joomCategory: joomCategory || null,
              joomAttributes: filledAttributes,
            },
          },
        }),
        prisma.enrichmentTask.update({ where: { id: task.id }, data: { status: 'PUBLISHED' } }),
      ]);

      // APIログを記録
      await this.logApiCall('POST', '/products', joomProduct, 200, { id: createdId }, true);

      log.info({ type: 'publish_success', listingId, joomProductId: createdId });

      return {
        success: true,
        joomProductId: createdId,
        joomListingUrl: `https://www.joom.com/product/${createdId}`,
      };
    } catch (error: any) {
      // エラー時の更新
      const existing = await prisma.listing.findUnique({ where: { id: listingId } });
      const currentData = (existing?.marketplaceData as any) || {};
      const errorCount = (currentData.errorCount || 0) + 1;
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
          marketplaceData: { ...currentData, lastError: error.message, errorCount },
        },
      });

      await this.logApiCall('POST', '/products', {}, null, null, false, error.message);

      log.error({
        type: 'publish_failed',
        listingId,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Dry-Run（プレビュー）
   */
  async dryRun(taskId: string): Promise<DryRunResult> {
    const task = await prisma.enrichmentTask.findUnique({
      where: { id: taskId },
      include: { product: true },
    });

    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const translations = task.translations as any;
    const pricing = task.pricing as any;
    const attributes = task.attributes as any;
    const validation = task.validation as any;

    const warnings: string[] = [];

    // 価格チェック
    if (pricing?.finalPriceUsd < 5) {
      warnings.push('Price might be too low for this category');
    }
    if (pricing?.finalPriceUsd > 500) {
      warnings.push('High price items may have lower conversion');
    }

    // 画像チェック
    if (task.optimizedImages.length < 3) {
      warnings.push('Recommended to have at least 3 images');
    }

    // 属性チェック
    if (!attributes?.brand) {
      warnings.push('No brand detected - may affect search visibility');
    }
    if ((attributes?.confidence || 0) < 0.7) {
      warnings.push('Low confidence in attribute extraction');
    }

    // 可視性スコア
    let visibility: 'low' | 'medium' | 'high' = 'medium';
    if (translations?.en?.title && attributes?.brand && task.optimizedImages.length >= 3) {
      visibility = 'high';
    } else if (warnings.length > 2) {
      visibility = 'low';
    }

    return {
      wouldCreate: {
        title: translations?.en?.title || task.product.title,
        description: translations?.en?.description || task.product.description,
        price: pricing?.finalPriceUsd || 0,
        images: task.optimizedImages,
        attributes: attributes || {},
      },
      validation: {
        passed: validation?.passed ?? true,
        warnings,
      },
      estimatedVisibility: visibility,
    };
  }

  /**
   * APIログを記録
   */
  private async logApiCall(
    method: string,
    endpoint: string,
    requestBody: any,
    statusCode: number | null,
    responseBody: any,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await prisma.joomApiLog.create({
      data: {
        method,
        endpoint,
        requestBody,
        statusCode,
        responseBody,
        success,
        errorMessage,
      },
    });
  }
}

// ========================================
// バッチ出品サービス
// ========================================

export class BatchPublishService {
  private publishService = new JoomPublishService();

  /**
   * バッチを作成
   */
  async createBatch(
    productIds: string[],
    options: {
      name?: string;
      dryRun?: boolean;
      concurrency?: number;
      createdById?: string;
    } = {}
  ): Promise<string> {
    const batch = await prisma.joomPublishBatch.create({
      data: {
        name: options.name,
        productIds,
        totalCount: productIds.length,
        dryRun: options.dryRun || false,
        concurrency: options.concurrency || 5,
        createdById: options.createdById,
        status: 'PENDING',
      },
    });

    log.info({
      type: 'batch_created',
      batchId: batch.id,
      count: productIds.length,
    });

    return batch.id;
  }

  /**
   * バッチを実行
   */
  async executeBatch(batchId: string): Promise<BatchPublishResult> {
    const batch = await prisma.joomPublishBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }

    await prisma.joomPublishBatch.update({
      where: { id: batchId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
      },
    });

    const results: BatchPublishResult['results'] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // 並列処理
    const concurrency = batch.concurrency;
    const productIds = batch.productIds;

    for (let i = 0; i < productIds.length; i += concurrency) {
      const chunk = productIds.slice(i, i + concurrency);
      const chunkResults = await Promise.all(
        chunk.map(async (productId) => {
          try {
            // エンリッチメントタスクを取得
            const task = await prisma.enrichmentTask.findUnique({
              where: { productId },
            });

            if (!task) {
              skippedCount++;
              return { productId, success: false, error: 'No enrichment task' };
            }

            if (task.status !== 'APPROVED') {
              skippedCount++;
              return { productId, success: false, error: `Not approved: ${task.status}` };
            }

            if (batch.dryRun) {
              // Dry-Runの場合はプレビューのみ
              const preview = await this.publishService.dryRun(task.id);
              return {
                productId,
                success: preview.validation.passed,
                error: preview.validation.warnings.join(', '),
              };
            }

            // JoomListingを作成
            const joomListingId = await this.publishService.createJoomListing(task.id);

            // 画像処理
            await this.publishService.processImagesForListing(joomListingId);

            // 出品
            const result = await this.publishService.publishToJoom(joomListingId);

            if (result.success) {
              successCount++;
            } else {
              failedCount++;
            }

            return {
              productId,
              success: result.success,
              joomProductId: result.joomProductId,
              error: result.error,
            };
          } catch (error: any) {
            failedCount++;
            return { productId, success: false, error: error.message };
          }
        })
      );

      results.push(...chunkResults);

      // 進捗を更新
      await prisma.joomPublishBatch.update({
        where: { id: batchId },
        data: {
          processedCount: i + chunk.length,
          successCount,
          failedCount,
          skippedCount,
        },
      });
    }

    // 最終更新
    const finalStatus = failedCount === 0 ? 'COMPLETED' :
                       successCount === 0 ? 'FAILED' : 'PARTIAL';

    await prisma.joomPublishBatch.update({
      where: { id: batchId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        successCount,
        failedCount,
        skippedCount,
        resultSummary: {
          success: results.filter(r => r.success).map(r => r.productId),
          failed: results.filter(r => !r.success && r.error).map(r => r.productId),
          skipped: results.filter(r => !r.success && !r.error).map(r => r.productId),
        },
      },
    });

    log.info({
      type: 'batch_completed',
      batchId,
      total: productIds.length,
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
    });

    return {
      total: productIds.length,
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      results,
    };
  }

  /**
   * バッチのステータスを取得
   */
  async getBatchStatus(batchId: string): Promise<any> {
    return prisma.joomPublishBatch.findUnique({
      where: { id: batchId },
    });
  }
}

// ========================================
// ワークフローオーケストレーター
// ========================================

export class JoomWorkflowOrchestrator {
  private taskManager = enrichmentTaskManager;
  private publishService = new JoomPublishService();

  /**
   * 商品の完全なワークフローを実行
   * スクレイピング済み → エンリッチメント → 画像処理 → 出品
   */
  async runFullWorkflow(productId: string): Promise<{
    enrichmentTaskId: string;
    joomListingId?: string;
    joomProductId?: string;
    status: string;
    error?: string;
  }> {
    log.info({
      type: 'workflow_start',
      productId,
    });

    try {
      // 1. エンリッチメントタスクを作成・実行
      const taskId = await this.taskManager.createTask(productId, 10);
      await this.taskManager.executeTask(taskId);

      const task = await prisma.enrichmentTask.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        throw new Error('Task creation failed');
      }

      // レビュー必要または却下の場合は一旦停止
      if (task.status === 'READY_TO_REVIEW' || task.status === 'REJECTED') {
        return {
          enrichmentTaskId: taskId,
          status: task.status,
        };
      }

      // 2. 承認済みの場合は出品処理へ
      if (task.status === 'APPROVED') {
        const joomListingId = await this.publishService.createJoomListing(taskId);
        await this.publishService.processImagesForListing(joomListingId);
        const result = await this.publishService.publishToJoom(joomListingId);

        return {
          enrichmentTaskId: taskId,
          joomListingId,
          joomProductId: result.joomProductId,
          status: result.success ? 'PUBLISHED' : 'PUBLISH_ERROR',
          error: result.error,
        };
      }

      return {
        enrichmentTaskId: taskId,
        status: task.status,
      };
    } catch (error: any) {
      log.error({
        type: 'workflow_error',
        productId,
        error: error.message,
      });

      return {
        enrichmentTaskId: '',
        status: 'ERROR',
        error: error.message,
      };
    }
  }

  /**
   * 承認済みタスクを自動出品
   */
  async publishApprovedTasks(limit: number = 10): Promise<number> {
    const approvedTasks = await prisma.enrichmentTask.findMany({
      where: { status: 'APPROVED' },
      take: limit,
    });

    let publishedCount = 0;

    for (const task of approvedTasks) {
      try {
        // Check if no Listing exists for this product with JOOM marketplace
        const existingListing = await prisma.listing.findFirst({
          where: { productId: task.productId, marketplace: 'JOOM' },
        });
        if (existingListing) {
          continue;
        }

        const joomListingId = await this.publishService.createJoomListing(task.id);
        await this.publishService.processImagesForListing(joomListingId);
        const result = await this.publishService.publishToJoom(joomListingId);

        if (result.success) {
          publishedCount++;
        }
      } catch (error: any) {
        log.error({
          type: 'auto_publish_error',
          taskId: task.id,
          error: error.message,
        });
      }
    }

    return publishedCount;
  }
}

// シングルトンインスタンス
export const imagePipelineService = new ImagePipelineService();
export const joomPublishService = new JoomPublishService();
export const batchPublishService = new BatchPublishService();
export const joomWorkflowOrchestrator = new JoomWorkflowOrchestrator();

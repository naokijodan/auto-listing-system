import { Job } from 'bullmq';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { InventoryJobPayload, InventoryJobResult } from '@rakuda/schema';
import { checkSingleProductInventory } from '../lib/inventory-checker';

/**
 * 在庫監視ジョブプロセッサー
 *
 * 仕入元サイトにアクセスして在庫・価格変動を検知し、
 * 必要に応じて出品の更新・取り下げを行う
 */
export async function processInventoryJob(
  job: Job<InventoryJobPayload>
): Promise<InventoryJobResult> {
  const { productId, sourceUrl, currentHash, checkPrice, checkStock } = job.data;
  const log = logger.child({ jobId: job.id, processor: 'inventory' });

  log.info({
    type: 'inventory_check_start',
    productId,
    sourceUrl,
    checkPrice,
    checkStock,
  });

  const startTime = Date.now();

  // 商品情報取得
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { listings: true },
  });

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  try {
    // 在庫チェック実行
    const result = await checkSingleProductInventory(productId);
    const duration = Date.now() - startTime;

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `inventory-${Date.now()}`,
        queueName: 'inventory',
        jobType: 'INVENTORY_CHECK',
        status: result.error ? 'FAILED' : 'COMPLETED',
        productId,
        payload: {
          sourceUrl,
          currentHash,
          checkPrice,
          checkStock,
        },
        result: {
          isAvailable: result.isAvailable,
          currentPrice: result.currentPrice,
          priceChanged: result.priceChanged,
          hashChanged: result.hashChanged,
          action: result.action,
        },
        errorMessage: result.error,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
      },
    });

    log.info({
      type: 'inventory_check_complete',
      productId,
      isAvailable: result.isAvailable,
      priceChanged: result.priceChanged,
      action: result.action,
      duration,
    });

    return {
      success: !result.error,
      message: result.error || 'Inventory check completed',
      isAvailable: result.isAvailable,
      currentPrice: result.currentPrice ?? undefined,
      priceChanged: result.priceChanged,
      hashChanged: result.hashChanged,
      newHash: result.newHash ?? undefined,
      action: result.action,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    log.error({
      type: 'inventory_check_error',
      productId,
      error: error.message,
      duration,
    });

    // ジョブログ記録
    await prisma.jobLog.create({
      data: {
        jobId: job.id || `inventory-${Date.now()}`,
        queueName: 'inventory',
        jobType: 'INVENTORY_CHECK',
        status: 'FAILED',
        productId,
        payload: {
          sourceUrl,
          currentHash,
          checkPrice,
          checkStock,
        },
        errorMessage: error.message,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
      },
    });

    throw error;
  }
}

/**
 * スケジュールされた在庫チェックジョブのプロセッサー
 */
export async function processScheduledInventoryCheck(
  job: Job<{
    scheduledAt: string;
    checkType: 'all' | 'specific';
    productIds?: string[];
    batchSize: number;
  }>
): Promise<{
  success: boolean;
  totalChecked: number;
  outOfStock: number;
  priceChanged: number;
  errors: number;
}> {
  const log = logger.child({ jobId: job.id, processor: 'scheduled-inventory' });
  const { checkType, productIds, batchSize } = job.data;

  log.info({
    type: 'scheduled_inventory_check_start',
    checkType,
    batchSize,
  });

  const startTime = Date.now();

  try {
    // チェック対象の商品を取得
    let products;
    if (checkType === 'specific' && productIds) {
      products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });
    } else {
      products = await prisma.product.findMany({
        where: {
          status: { in: ['ACTIVE', 'APPROVED', 'READY_TO_REVIEW'] },
        },
        select: { id: true },
        take: batchSize,
        orderBy: { updatedAt: 'asc' },
      });
    }

    const stats = {
      totalChecked: 0,
      outOfStock: 0,
      priceChanged: 0,
      errors: 0,
    };

    // バッチ処理（順次実行、レート制限あり）
    for (const product of products) {
      try {
        const result = await checkSingleProductInventory(product.id);
        stats.totalChecked++;

        if (!result.isAvailable) stats.outOfStock++;
        if (result.priceChanged) stats.priceChanged++;
        if (result.error) stats.errors++;

        // レート制限: 2-5秒待機
        const delay = 2000 + Math.random() * 3000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error: any) {
        stats.errors++;
        log.error({
          type: 'scheduled_check_item_error',
          productId: product.id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    log.info({
      type: 'scheduled_inventory_check_complete',
      stats,
      duration,
    });

    return {
      success: true,
      ...stats,
    };
  } catch (error: any) {
    log.error({
      type: 'scheduled_inventory_check_error',
      error: error.message,
    });

    return {
      success: false,
      totalChecked: 0,
      outOfStock: 0,
      priceChanged: 0,
      errors: 1,
    };
  }
}

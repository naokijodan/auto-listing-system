import { Router, Request, Response, NextFunction } from 'express';
import { prisma, ListingStatus, Marketplace } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from '@rakuda/config';

const router = Router();
const log = logger.child({ module: 'bulk-operations' });

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const publishQueue = new Queue(QUEUE_NAMES.PUBLISH, { connection: redis });
const inventoryQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redis });

// 一括操作のタイプ
type BulkOperationType =
  | 'STATUS_CHANGE'
  | 'PRICE_ADJUSTMENT'
  | 'REPUBLISH'
  | 'PAUSE_ALL'
  | 'ACTIVATE_ALL'
  | 'INVENTORY_CHECK';

interface BulkOperationRequest {
  operation: BulkOperationType;
  listingIds?: string[];
  productIds?: string[];
  filters?: {
    marketplace?: Marketplace;
    status?: ListingStatus;
    priceMin?: number;
    priceMax?: number;
    createdAfter?: string;
    createdBefore?: string;
  };
  params?: {
    newStatus?: ListingStatus;
    priceAdjustment?: number;
    priceAdjustmentType?: 'PERCENT' | 'FIXED';
  };
}

interface BulkOperationResultData {
  operationId: string;
  operation: BulkOperationType;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  startedAt: string;
  completedAt?: string;
  errors: Array<{ itemId: string; error: string }>;
}

/**
 * @swagger
 * /api/bulk/operations:
 *   post:
 *     summary: 一括操作を実行
 *     tags: [BulkOperations]
 */
router.post('/operations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as BulkOperationRequest;
    const { operation, listingIds, productIds, filters, params } = body;

    log.info({ type: 'bulk_operation_start', operation, filters });

    // 対象リスティングを取得
    let targetListings: Array<{ id: string; productId: string; status: ListingStatus }>;

    if (listingIds && listingIds.length > 0) {
      targetListings = await prisma.listing.findMany({
        where: { id: { in: listingIds } },
        select: { id: true, productId: true, status: true },
      });
    } else if (productIds && productIds.length > 0) {
      targetListings = await prisma.listing.findMany({
        where: { productId: { in: productIds } },
        select: { id: true, productId: true, status: true },
      });
    } else if (filters) {
      const whereClause: any = {};
      if (filters.marketplace) whereClause.marketplace = filters.marketplace;
      if (filters.status) whereClause.status = filters.status;
      if (filters.createdAfter || filters.createdBefore) {
        whereClause.createdAt = {};
        if (filters.createdAfter) whereClause.createdAt.gte = new Date(filters.createdAfter);
        if (filters.createdBefore) whereClause.createdAt.lte = new Date(filters.createdBefore);
      }

      targetListings = await prisma.listing.findMany({
        where: whereClause,
        select: { id: true, productId: true, status: true },
        take: 1000,
      });
    } else {
      res.status(400).json({ error: 'listingIds, productIds, or filters required' });
      return;
    }

    if (targetListings.length === 0) {
      res.status(404).json({ error: 'No listings found matching criteria' });
      return;
    }

    // 操作記録を作成
    const operationRecord = await prisma.shadowLog.create({
      data: {
        service: 'bulk-operations',
        operation,
        input: { listingIds: targetListings.map(l => l.id), filters, params },
        output: { status: 'PENDING', totalItems: targetListings.length },
        decision: 'BULK_OPERATION_STARTED',
        decisionReason: `Bulk ${operation} on ${targetListings.length} items`,
        isDryRun: false,
      },
    });

    const operationId = operationRecord.id;

    // 一括操作を実行
    const result = await executeBulkOperation(operationId, operation, targetListings, params);

    // 結果を更新
    await prisma.shadowLog.update({
      where: { id: operationId },
      data: {
        output: result as any,
      },
    });

    log.info({ type: 'bulk_operation_complete', operationId, result });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * 一括操作を実行
 */
async function executeBulkOperation(
  operationId: string,
  operation: BulkOperationType,
  listings: Array<{ id: string; productId: string; status: ListingStatus }>,
  params?: BulkOperationRequest['params']
): Promise<BulkOperationResultData> {
  const result: BulkOperationResultData = {
    operationId,
    operation,
    status: 'PROCESSING',
    totalItems: listings.length,
    processedItems: 0,
    successItems: 0,
    failedItems: 0,
    startedAt: new Date().toISOString(),
    errors: [],
  };

  try {
    switch (operation) {
      case 'STATUS_CHANGE':
        if (!params?.newStatus) {
          throw new Error('newStatus parameter required for STATUS_CHANGE');
        }
        await executeStatusChange(listings, params.newStatus, result);
        break;

      case 'PRICE_ADJUSTMENT':
        if (params?.priceAdjustment === undefined) {
          throw new Error('priceAdjustment parameter required');
        }
        await executePriceAdjustment(listings, params, result);
        break;

      case 'PAUSE_ALL':
        await executeStatusChange(listings, 'PAUSED', result);
        break;

      case 'ACTIVATE_ALL':
        await executeStatusChange(listings, 'ACTIVE', result);
        break;

      case 'REPUBLISH':
        await executeRepublish(listings, result);
        break;

      case 'INVENTORY_CHECK':
        await executeInventoryCheck(listings, result);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    result.status = 'COMPLETED';
    result.completedAt = new Date().toISOString();
  } catch (error: any) {
    result.status = 'FAILED';
    result.errors.push({ itemId: 'general', error: error.message });
  }

  return result;
}

/**
 * ステータス一括変更
 */
async function executeStatusChange(
  listings: Array<{ id: string }>,
  newStatus: ListingStatus,
  result: BulkOperationResultData
): Promise<void> {
  for (const listing of listings) {
    try {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { status: newStatus, updatedAt: new Date() },
      });
      result.successItems++;
    } catch (error: any) {
      result.failedItems++;
      result.errors.push({ itemId: listing.id, error: error.message });
    }
    result.processedItems++;
  }
}

/**
 * 価格一括調整
 */
async function executePriceAdjustment(
  listings: Array<{ id: string }>,
  params: NonNullable<BulkOperationRequest['params']>,
  result: BulkOperationResultData
): Promise<void> {
  const adjustment = params.priceAdjustment || 0;
  const adjustmentType = params.priceAdjustmentType || 'PERCENT';

  for (const listing of listings) {
    try {
      // まず現在の価格を取得
      const current = await prisma.listing.findUnique({
        where: { id: listing.id },
        select: { listingPrice: true },
      });

      if (!current) continue;

      let newPrice: number;
      const currentPrice = current.listingPrice || 0;

      if (adjustmentType === 'PERCENT') {
        newPrice = currentPrice * (1 + adjustment / 100);
      } else {
        newPrice = currentPrice + adjustment;
      }
      newPrice = Math.round(newPrice * 100) / 100;

      await prisma.listing.update({
        where: { id: listing.id },
        data: { listingPrice: newPrice, updatedAt: new Date() },
      });
      result.successItems++;
    } catch (error: any) {
      result.failedItems++;
      result.errors.push({ itemId: listing.id, error: error.message });
    }
    result.processedItems++;
  }
}

/**
 * 再出品キューに投入
 */
async function executeRepublish(
  listings: Array<{ id: string; productId: string }>,
  result: BulkOperationResultData
): Promise<void> {
  for (const listing of listings) {
    try {
      await publishQueue.add(
        'republish',
        { listingId: listing.id, productId: listing.productId },
        { priority: 5 }
      );
      result.successItems++;
    } catch (error: any) {
      result.failedItems++;
      result.errors.push({ itemId: listing.id, error: error.message });
    }
    result.processedItems++;
  }
}

/**
 * 在庫チェックキューに投入
 */
async function executeInventoryCheck(
  listings: Array<{ id: string; productId: string }>,
  result: BulkOperationResultData
): Promise<void> {
  const productIds = [...new Set(listings.map(l => l.productId))];
  for (const productId of productIds) {
    try {
      await inventoryQueue.add(
        'inventory-check',
        { productId },
        { priority: 3 }
      );
      result.successItems++;
    } catch (error: any) {
      result.failedItems++;
      result.errors.push({ itemId: productId, error: error.message });
    }
    result.processedItems++;
  }
}

/**
 * @swagger
 * /api/bulk/operations/{operationId}:
 *   get:
 *     summary: 一括操作の状態を取得
 *     tags: [BulkOperations]
 */
router.get('/operations/:operationId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { operationId } = req.params;

    const record = await prisma.shadowLog.findUnique({
      where: { id: operationId },
    });

    if (!record) {
      res.status(404).json({ error: 'Operation not found' });
      return;
    }

    res.json({
      operationId: record.id,
      operation: record.operation,
      input: record.input,
      result: record.output,
      createdAt: record.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/bulk/preview:
 *   post:
 *     summary: 一括操作のプレビュー（対象件数確認）
 *     tags: [BulkOperations]
 */
router.post('/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filters } = req.body as { filters: BulkOperationRequest['filters'] };

    if (!filters) {
      res.status(400).json({ error: 'filters required' });
      return;
    }

    const whereClause: any = {};
    if (filters.marketplace) whereClause.marketplace = filters.marketplace;
    if (filters.status) whereClause.status = filters.status;

    const count = await prisma.listing.count({ where: whereClause });

    const samples = await prisma.listing.findMany({
      where: whereClause,
      take: 5,
      include: {
        product: { select: { title: true, titleEn: true } },
      },
    });

    res.json({
      totalCount: count,
      samples: samples.map(s => ({
        id: s.id,
        title: s.product.titleEn || s.product.title,
        listingPrice: s.listingPrice,
        status: s.status,
        marketplace: s.marketplace,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export { router as bulkOperationsRouter };

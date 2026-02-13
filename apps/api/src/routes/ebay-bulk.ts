/**
 * Phase 105: eBay一括操作 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace, EbayBulkOperationType, BulkOperationStatus } from '@prisma/client';
import { logger } from '@rakuda/logger';
import { addEbayPublishJob } from '@rakuda/queue';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-bulk' });

// ========================================
// 一括価格変更
// ========================================

router.post('/price-update', async (req: Request, res: Response) => {
  try {
    const {
      listingIds,
      adjustmentType = 'percent', // 'percent' or 'fixed'
      adjustmentValue,
      dryRun = false,
    } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: 'listingIds array is required' });
    }

    if (adjustmentValue === undefined || adjustmentValue === null) {
      return res.status(400).json({ error: 'adjustmentValue is required' });
    }

    // 対象出品を取得
    const listings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        marketplace: Marketplace.EBAY,
        status: { in: ['DRAFT', 'ACTIVE'] },
      },
      select: {
        id: true,
        listingPrice: true,
        status: true,
        product: { select: { title: true } },
      },
    });

    if (listings.length === 0) {
      return res.status(400).json({ error: 'No eligible listings found' });
    }

    // 新価格を計算
    const updates = listings.map(listing => {
      let newPrice: number;
      if (adjustmentType === 'percent') {
        newPrice = listing.listingPrice * (1 + adjustmentValue / 100);
      } else {
        newPrice = listing.listingPrice + adjustmentValue;
      }
      newPrice = Math.max(0.01, Math.round(newPrice * 100) / 100);

      return {
        listingId: listing.id,
        title: listing.product?.title || 'Unknown',
        oldPrice: listing.listingPrice,
        newPrice,
        status: listing.status,
      };
    });

    if (dryRun) {
      return res.json({
        dryRun: true,
        message: `Would update ${updates.length} listings`,
        adjustmentType,
        adjustmentValue,
        preview: updates.slice(0, 20),
        totalCount: updates.length,
      });
    }

    // 一括操作レコード作成
    const operation = await prisma.ebayBulkOperation.create({
      data: {
        operationType: EbayBulkOperationType.PRICE_UPDATE,
        status: BulkOperationStatus.PROCESSING,
        listingIds,
        totalCount: listings.length,
        parameters: { adjustmentType, adjustmentValue },
        startedAt: new Date(),
      },
    });

    // 価格更新実行
    const results: Array<{ listingId: string; status: string; oldPrice?: number; newPrice?: number; error?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const update of updates) {
      try {
        await prisma.listing.update({
          where: { id: update.listingId },
          data: { listingPrice: update.newPrice },
        });

        // 価格履歴を記録
        await prisma.priceHistory.create({
          data: {
            listingId: update.listingId,
            price: update.newPrice,
            source: 'bulk_update',
            metadata: {
              oldPrice: update.oldPrice,
              newPrice: update.newPrice,
              reason: 'bulk_update',
            },
          },
        });

        results.push({
          listingId: update.listingId,
          status: 'updated',
          oldPrice: update.oldPrice,
          newPrice: update.newPrice,
        });
        successCount++;
      } catch (error: any) {
        results.push({
          listingId: update.listingId,
          status: 'error',
          error: error.message,
        });
        failureCount++;
      }
    }

    // 操作完了
    await prisma.ebayBulkOperation.update({
      where: { id: operation.id },
      data: {
        status: BulkOperationStatus.COMPLETED,
        successCount,
        failureCount,
        results,
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'bulk_price_update_complete',
      operationId: operation.id,
      successCount,
      failureCount,
    });

    res.json({
      operationId: operation.id,
      message: `Updated ${successCount} listings`,
      successCount,
      failureCount,
      results: results.slice(0, 50),
    });
  } catch (error) {
    log.error({ type: 'bulk_price_update_error', error });
    res.status(500).json({ error: 'Failed to update prices' });
  }
});

// ========================================
// 一括出品終了
// ========================================

router.post('/end', async (req: Request, res: Response) => {
  try {
    const {
      listingIds,
      reason = 'MANUAL_END',
      dryRun = false,
    } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: 'listingIds array is required' });
    }

    // 対象出品を取得（ACTIVE のみ終了可能）
    const listings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        marketplace: Marketplace.EBAY,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        marketplaceListingId: true,
        product: { select: { title: true } },
      },
    });

    if (listings.length === 0) {
      return res.status(400).json({ error: 'No active listings found' });
    }

    if (dryRun) {
      return res.json({
        dryRun: true,
        message: `Would end ${listings.length} listings`,
        eligibleCount: listings.length,
        listings: listings.slice(0, 20).map(l => ({
          id: l.id,
          title: l.product?.title,
        })),
      });
    }

    // 一括操作レコード作成
    const operation = await prisma.ebayBulkOperation.create({
      data: {
        operationType: EbayBulkOperationType.END_LISTING,
        status: BulkOperationStatus.PROCESSING,
        listingIds: listings.map(l => l.id),
        totalCount: listings.length,
        parameters: { reason },
        startedAt: new Date(),
      },
    });

    // 出品終了実行
    const results: Array<{ listingId: string; status: string; error?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const listing of listings) {
      try {
        await prisma.listing.update({
          where: { id: listing.id },
          data: { status: 'ENDED' },
        });

        // TODO: eBay APIで実際に終了する場合はここでAPIコール

        results.push({ listingId: listing.id, status: 'ended' });
        successCount++;
      } catch (error: any) {
        results.push({ listingId: listing.id, status: 'error', error: error.message });
        failureCount++;
      }
    }

    // 操作完了
    await prisma.ebayBulkOperation.update({
      where: { id: operation.id },
      data: {
        status: BulkOperationStatus.COMPLETED,
        successCount,
        failureCount,
        results,
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'bulk_end_complete',
      operationId: operation.id,
      successCount,
      failureCount,
    });

    res.json({
      operationId: operation.id,
      message: `Ended ${successCount} listings`,
      successCount,
      failureCount,
      results: results.slice(0, 50),
    });
  } catch (error) {
    log.error({ type: 'bulk_end_error', error });
    res.status(500).json({ error: 'Failed to end listings' });
  }
});

// ========================================
// 一括再出品
// ========================================

router.post('/relist', async (req: Request, res: Response) => {
  try {
    const {
      listingIds,
      priceAdjustment = 0, // パーセンテージ
      dryRun = false,
    } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: 'listingIds array is required' });
    }

    // 対象出品を取得（ENDEDのみ再出品可能）
    const listings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        marketplace: Marketplace.EBAY,
        status: 'ENDED',
      },
      select: {
        id: true,
        listingPrice: true,
        product: { select: { title: true } },
      },
    });

    if (listings.length === 0) {
      return res.status(400).json({ error: 'No ended listings found' });
    }

    // 新価格を計算
    const updates = listings.map(listing => {
      const newPrice = Math.max(
        0.01,
        Math.round(listing.listingPrice * (1 + priceAdjustment / 100) * 100) / 100
      );
      return {
        listingId: listing.id,
        title: listing.product?.title,
        oldPrice: listing.listingPrice,
        newPrice,
      };
    });

    if (dryRun) {
      return res.json({
        dryRun: true,
        message: `Would relist ${updates.length} listings`,
        priceAdjustment,
        preview: updates.slice(0, 20),
        totalCount: updates.length,
      });
    }

    // 一括操作レコード作成
    const operation = await prisma.ebayBulkOperation.create({
      data: {
        operationType: EbayBulkOperationType.RELIST,
        status: BulkOperationStatus.PROCESSING,
        listingIds: listings.map(l => l.id),
        totalCount: listings.length,
        parameters: { priceAdjustment },
        startedAt: new Date(),
      },
    });

    // 再出品実行（ステータスをDRAFTに戻す）
    const results: Array<{ listingId: string; status: string; newPrice?: number; error?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const update of updates) {
      try {
        await prisma.listing.update({
          where: { id: update.listingId },
          data: {
            status: 'DRAFT',
            listingPrice: update.newPrice,
            listedAt: null,
          },
        });

        results.push({
          listingId: update.listingId,
          status: 'relisted',
          newPrice: update.newPrice,
        });
        successCount++;
      } catch (error: any) {
        results.push({ listingId: update.listingId, status: 'error', error: error.message });
        failureCount++;
      }
    }

    // 操作完了
    await prisma.ebayBulkOperation.update({
      where: { id: operation.id },
      data: {
        status: BulkOperationStatus.COMPLETED,
        successCount,
        failureCount,
        results,
        completedAt: new Date(),
      },
    });

    log.info({
      type: 'bulk_relist_complete',
      operationId: operation.id,
      successCount,
      failureCount,
    });

    res.json({
      operationId: operation.id,
      message: `Relisted ${successCount} listings`,
      successCount,
      failureCount,
      results: results.slice(0, 50),
    });
  } catch (error) {
    log.error({ type: 'bulk_relist_error', error });
    res.status(500).json({ error: 'Failed to relist' });
  }
});

// ========================================
// 操作履歴取得
// ========================================

router.get('/operations', async (req: Request, res: Response) => {
  try {
    const { limit = '20', offset = '0' } = req.query;

    const [operations, total] = await Promise.all([
      prisma.ebayBulkOperation.findMany({
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.ebayBulkOperation.count(),
    ]);

    res.json({ operations, total });
  } catch (error) {
    log.error({ type: 'list_operations_error', error });
    res.status(500).json({ error: 'Failed to list operations' });
  }
});

// ========================================
// 操作詳細取得
// ========================================

router.get('/operations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const operation = await prisma.ebayBulkOperation.findUnique({
      where: { id },
    });

    if (!operation) {
      return res.status(404).json({ error: 'Operation not found' });
    }

    res.json(operation);
  } catch (error) {
    log.error({ type: 'get_operation_error', error });
    res.status(500).json({ error: 'Failed to get operation' });
  }
});

export default router;

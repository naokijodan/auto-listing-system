// @ts-nocheck
/**
 * Phase 113: eBayバルクエディター API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-bulk-editor' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const bulkQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

// バリデーション
const bulkEditSchema = z.object({
  listingIds: z.array(z.string()).min(1),
  changes: z.object({
    price: z.number().optional(),
    priceAdjustPercent: z.number().optional(),
    priceAdjustFixed: z.number().optional(),
    shippingCost: z.number().optional(),
    quantity: z.number().int().optional(),
    title: z.string().optional(),
    titlePrefix: z.string().optional(),
    titleSuffix: z.string().optional(),
    description: z.string().optional(),
  }),
  preview: z.boolean().default(false),
  syncToEbay: z.boolean().default(true),
});

const bulkStatusSchema = z.object({
  listingIds: z.array(z.string()).min(1),
  status: z.enum(['ACTIVE', 'ENDED', 'DRAFT']),
  syncToEbay: z.boolean().default(true),
});

// 編集可能リスティング一覧
router.get('/listings', async (req: Request, res: Response) => {
  try {
    const { status, search, limit = '100', offset = '0' } = req.query;
    const where: Record<string, unknown> = { marketplace: Marketplace.EBAY };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { product: { title: { contains: search as string, mode: 'insensitive' } } },
        { product: { titleEn: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: { product: { select: { title: true, titleEn: true, images: true, brand: true, category: true } } },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      listings: listings.map(l => ({
        id: l.id,
        title: l.product?.titleEn || l.product?.title,
        image: l.product?.images?.[0],
        brand: l.product?.brand,
        category: l.product?.category,
        price: l.listingPrice,
        shippingCost: l.shippingCost,
        currency: l.currency,
        status: l.status,
        externalId: l.externalId,
        listedAt: l.listedAt,
      })),
      total,
    });
  } catch (error) {
    log.error({ type: 'listings_error', error });
    res.status(500).json({ error: 'Failed to get listings' });
  }
});

// 一括編集（プレビュー/実行）
router.post('/edit', async (req: Request, res: Response) => {
  try {
    const validation = bulkEditSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { listingIds, changes, preview, syncToEbay } = validation.data;

    // 対象リスティング取得
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds }, marketplace: Marketplace.EBAY },
      include: { product: { select: { title: true, titleEn: true } } },
    });

    if (listings.length === 0) {
      return res.status(404).json({ error: 'No listings found' });
    }

    // 変更内容を計算
    const updates = listings.map(listing => {
      const update: Record<string, unknown> = { id: listing.id, original: {}, updated: {} };

      // 価格変更
      if (changes.price !== undefined) {
        update.original = { ...update.original as object, price: listing.listingPrice };
        update.updated = { ...update.updated as object, price: changes.price };
      } else if (changes.priceAdjustPercent !== undefined) {
        const newPrice = listing.listingPrice * (1 + changes.priceAdjustPercent / 100);
        update.original = { ...update.original as object, price: listing.listingPrice };
        update.updated = { ...update.updated as object, price: Math.round(newPrice * 100) / 100 };
      } else if (changes.priceAdjustFixed !== undefined) {
        const newPrice = listing.listingPrice + changes.priceAdjustFixed;
        update.original = { ...update.original as object, price: listing.listingPrice };
        update.updated = { ...update.updated as object, price: Math.max(0.01, Math.round(newPrice * 100) / 100) };
      }

      // 送料
      if (changes.shippingCost !== undefined) {
        update.original = { ...update.original as object, shippingCost: listing.shippingCost };
        update.updated = { ...update.updated as object, shippingCost: changes.shippingCost };
      }

      // タイトル変更
      const currentTitle = listing.product?.titleEn || listing.product?.title || '';
      if (changes.title !== undefined) {
        update.original = { ...update.original as object, title: currentTitle };
        update.updated = { ...update.updated as object, title: changes.title };
      } else if (changes.titlePrefix || changes.titleSuffix) {
        let newTitle = currentTitle;
        if (changes.titlePrefix) newTitle = changes.titlePrefix + ' ' + newTitle;
        if (changes.titleSuffix) newTitle = newTitle + ' ' + changes.titleSuffix;
        update.original = { ...update.original as object, title: currentTitle };
        update.updated = { ...update.updated as object, title: newTitle.substring(0, 80) };
      }

      return update;
    });

    // プレビューモード
    if (preview) {
      return res.json({ preview: true, count: updates.length, updates });
    }

    // 実行モード
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const update of updates) {
      try {
        const updateData: Record<string, unknown> = {};
        const updated = update.updated as Record<string, unknown>;

        if (updated.price !== undefined) updateData.listingPrice = updated.price;
        if (updated.shippingCost !== undefined) updateData.shippingCost = updated.shippingCost;

        await prisma.listing.update({
          where: { id: update.id as string },
          data: updateData,
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${update.id}: ${err.message}`);
      }
    }

    // eBay同期ジョブ
    if (syncToEbay && results.success > 0) {
      await bulkQueue.add('ebay-bulk-update', {
        listingIds: updates.filter((_, i) => i < results.success).map(u => u.id),
        changes,
      }, { priority: 2 });
    }

    // 履歴保存
    await prisma.notification.create({
      data: {
        type: 'BULK_EDIT',
        title: '一括編集完了',
        message: `${results.success}件を更新しました`,
        severity: 'INFO',
        metadata: { changes, results },
      },
    });

    log.info({ type: 'bulk_edit', count: results.success, changes });
    res.json({ message: 'Bulk edit completed', results });
  } catch (error) {
    log.error({ type: 'edit_error', error });
    res.status(500).json({ error: 'Failed to bulk edit' });
  }
});

// 一括ステータス変更
router.post('/status', async (req: Request, res: Response) => {
  try {
    const validation = bulkStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { listingIds, status, syncToEbay } = validation.data;

    const result = await prisma.listing.updateMany({
      where: { id: { in: listingIds }, marketplace: Marketplace.EBAY },
      data: { status },
    });

    if (syncToEbay && result.count > 0) {
      await bulkQueue.add('ebay-bulk-status', { listingIds, status }, { priority: 2 });
    }

    log.info({ type: 'bulk_status', count: result.count, status });
    res.json({ message: 'Status updated', count: result.count });
  } catch (error) {
    log.error({ type: 'status_error', error });
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 一括削除（下書きのみ）
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { listingIds } = req.body;
    if (!listingIds || !Array.isArray(listingIds)) {
      return res.status(400).json({ error: 'listingIds required' });
    }

    // 下書きのみ削除可能
    const result = await prisma.listing.deleteMany({
      where: { id: { in: listingIds }, marketplace: Marketplace.EBAY, status: 'DRAFT' },
    });

    log.info({ type: 'bulk_delete', count: result.count });
    res.json({ message: 'Deleted', count: result.count });
  } catch (error) {
    log.error({ type: 'delete_error', error });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// 編集履歴
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const history = await prisma.notification.findMany({
      where: { type: 'BULK_EDIT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ history: history.map(h => ({
      id: h.id,
      message: h.message,
      metadata: h.metadata,
      createdAt: h.createdAt,
    })) });
  } catch (error) {
    log.error({ type: 'history_error', error });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

export default router;

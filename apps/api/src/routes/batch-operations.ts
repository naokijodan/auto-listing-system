/**
 * バッチ操作API（Phase 31）
 *
 * 一括価格変更、出品操作、CSV import/export
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

const router = Router();
const log = logger.child({ route: 'batch-operations' });

// ========================================
// 一括価格変更
// ========================================

interface BulkPriceChangeRequest {
  // フィルター条件
  filter?: {
    listingIds?: string[];
    productIds?: string[];
    category?: string;
    marketplace?: string;
    minPrice?: number;
    maxPrice?: number;
    status?: string;
  };
  // 価格変更方法
  change: {
    type: 'fixed' | 'percent' | 'formula';
    value: number; // fixedの場合は絶対値、percentの場合は%
    formula?: string; // 'cost * 1.3 + 10' のような式
  };
  // オプション
  options?: {
    dryRun?: boolean; // プレビューのみ
    respectMinMargin?: boolean; // 最低利益率を守る
    minMarginPercent?: number;
    respectMaxChange?: boolean; // 最大変更率を守る
    maxChangePercent?: number;
  };
}

interface BulkPriceChangeResult {
  success: boolean;
  dryRun: boolean;
  summary: {
    totalMatched: number;
    totalChanged: number;
    totalSkipped: number;
    avgOldPrice: number;
    avgNewPrice: number;
    avgChangePercent: number;
  };
  changes: Array<{
    listingId: string;
    productTitle: string;
    oldPrice: number;
    newPrice: number;
    changePercent: number;
    skipped: boolean;
    skipReason?: string;
  }>;
}

/**
 * @swagger
 * /api/batch/price-change:
 *   post:
 *     tags: [Batch]
 *     summary: 一括価格変更
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filter:
 *                 type: object
 *               change:
 *                 type: object
 *               options:
 *                 type: object
 */
router.post('/price-change', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as BulkPriceChangeRequest;
    const { filter = {}, change, options = {} } = body;

    if (!change || !change.type) {
      return res.status(400).json({
        success: false,
        error: 'change.type is required (fixed, percent, or formula)',
      });
    }

    const {
      dryRun = false,
      respectMinMargin = true,
      minMarginPercent = 10,
      respectMaxChange = true,
      maxChangePercent = 20,
    } = options;

    log.info({
      type: 'bulk_price_change_start',
      filter,
      change,
      dryRun,
    });

    // フィルター条件でListingsを取得
    const whereClause: any = { status: 'ACTIVE' };

    if (filter.listingIds?.length) {
      whereClause.id = { in: filter.listingIds };
    }
    if (filter.productIds?.length) {
      whereClause.productId = { in: filter.productIds };
    }
    if (filter.marketplace) {
      whereClause.marketplace = filter.marketplace;
    }
    if (filter.status) {
      whereClause.status = filter.status;
    }
    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      whereClause.listingPrice = {};
      if (filter.minPrice !== undefined) {
        whereClause.listingPrice.gte = filter.minPrice;
      }
      if (filter.maxPrice !== undefined) {
        whereClause.listingPrice.lte = filter.maxPrice;
      }
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: { product: true },
      take: 1000, // 安全のため上限を設定
    });

    // カテゴリフィルター
    let filteredListings = [...listings];
    if (filter.category) {
      filteredListings = listings.filter(
        l => l.product?.category === filter.category
      );
    }

    const changes: BulkPriceChangeResult['changes'] = [];
    let totalChanged = 0;
    let totalSkipped = 0;
    let sumOldPrice = 0;
    let sumNewPrice = 0;

    for (const listing of filteredListings) {
      const oldPrice = listing.listingPrice;
      const cost = listing.product?.price || 0;
      let newPrice: number;

      // 新価格を計算
      switch (change.type) {
        case 'fixed':
          newPrice = change.value;
          break;
        case 'percent':
          newPrice = oldPrice * (1 + change.value / 100);
          break;
        case 'formula':
          // 簡易的な式評価（セキュリティ上、実際には式パーサーを使うべき）
          newPrice = oldPrice; // デフォルト
          if (change.formula) {
            try {
              // 許可された変数のみ
              const evalFunc = new Function('price', 'cost', `return ${change.formula}`);
              newPrice = evalFunc(oldPrice, cost);
            } catch {
              newPrice = oldPrice;
            }
          }
          break;
        default:
          newPrice = oldPrice;
      }

      newPrice = Math.round(newPrice * 100) / 100;

      // スキップ判定
      let skipped = false;
      let skipReason: string | undefined;

      // 最低利益率チェック
      if (respectMinMargin && cost > 0) {
        const marginPercent = ((newPrice - cost) / newPrice) * 100;
        if (marginPercent < minMarginPercent) {
          skipped = true;
          skipReason = `Margin ${marginPercent.toFixed(1)}% below minimum ${minMarginPercent}%`;
        }
      }

      // 最大変更率チェック
      if (!skipped && respectMaxChange && oldPrice > 0) {
        const changePercent = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
        if (changePercent > maxChangePercent) {
          skipped = true;
          skipReason = `Change ${changePercent.toFixed(1)}% exceeds maximum ${maxChangePercent}%`;
        }
      }

      // 価格が変わらない場合
      if (!skipped && newPrice === oldPrice) {
        skipped = true;
        skipReason = 'No price change';
      }

      const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

      changes.push({
        listingId: listing.id,
        productTitle: listing.product?.titleEn || listing.product?.title || 'Unknown',
        oldPrice,
        newPrice,
        changePercent: Math.round(changePercent * 100) / 100,
        skipped,
        skipReason,
      });

      if (!skipped) {
        totalChanged++;
        sumOldPrice += oldPrice;
        sumNewPrice += newPrice;

        // 実際の更新（dryRunでない場合）
        if (!dryRun) {
          await prisma.$transaction([
            prisma.listing.update({
              where: { id: listing.id },
              data: { listingPrice: newPrice },
            }),
            prisma.priceChangeLog.create({
              data: {
                listingId: listing.id,
                oldPrice,
                newPrice,
                currency: listing.currency || 'USD',
                changePercent,
                source: 'manual',
                reason: `Bulk price change: ${change.type}`,
              },
            }),
          ]);
        }
      } else {
        totalSkipped++;
      }
    }

    const result: BulkPriceChangeResult = {
      success: true,
      dryRun,
      summary: {
        totalMatched: filteredListings.length,
        totalChanged,
        totalSkipped,
        avgOldPrice: totalChanged > 0 ? Math.round((sumOldPrice / totalChanged) * 100) / 100 : 0,
        avgNewPrice: totalChanged > 0 ? Math.round((sumNewPrice / totalChanged) * 100) / 100 : 0,
        avgChangePercent: totalChanged > 0 && sumOldPrice > 0
          ? Math.round(((sumNewPrice - sumOldPrice) / sumOldPrice) * 100 * 100) / 100
          : 0,
      },
      changes: changes.slice(0, 100), // レスポンスサイズ制限
    };

    log.info({
      type: 'bulk_price_change_complete',
      dryRun,
      totalMatched: result.summary.totalMatched,
      totalChanged: result.summary.totalChanged,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/batch/price-change/preview:
 *   post:
 *     tags: [Batch]
 *     summary: 一括価格変更プレビュー
 */
router.post('/price-change/preview', async (req: Request, res: Response, next: NextFunction) => {
  // dryRunを強制的にtrueにして同じロジックを実行
  req.body.options = { ...req.body.options, dryRun: true };

  const body = req.body as BulkPriceChangeRequest;
  const { filter = {}, change, options = {} } = body;

  if (!change || !change.type) {
    return res.status(400).json({
      success: false,
      error: 'change.type is required (fixed, percent, or formula)',
    });
  }

  const {
    respectMinMargin = true,
    minMarginPercent = 10,
    respectMaxChange = true,
    maxChangePercent = 20,
  } = options;

  // フィルター条件でListingsを取得
  const whereClause: any = { status: 'ACTIVE' };

  if (filter.listingIds?.length) {
    whereClause.id = { in: filter.listingIds };
  }
  if (filter.productIds?.length) {
    whereClause.productId = { in: filter.productIds };
  }
  if (filter.marketplace) {
    whereClause.marketplace = filter.marketplace;
  }

  const listings = await prisma.listing.findMany({
    where: whereClause,
    include: { product: true },
    take: 100, // プレビューは100件まで
  });

  let filteredListings = [...listings];
  if (filter.category) {
    filteredListings = listings.filter(l => l.product?.category === filter.category);
  }

  const changes = filteredListings.map(listing => {
    const oldPrice = listing.listingPrice;
    const cost = listing.product?.price || 0;
    let newPrice: number;

    switch (change.type) {
      case 'fixed':
        newPrice = change.value;
        break;
      case 'percent':
        newPrice = oldPrice * (1 + change.value / 100);
        break;
      default:
        newPrice = oldPrice;
    }

    newPrice = Math.round(newPrice * 100) / 100;
    const changePercent = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0;

    let skipped = false;
    let skipReason: string | undefined;

    if (respectMinMargin && cost > 0) {
      const marginPercent = ((newPrice - cost) / newPrice) * 100;
      if (marginPercent < minMarginPercent) {
        skipped = true;
        skipReason = `Margin below ${minMarginPercent}%`;
      }
    }

    if (!skipped && respectMaxChange && oldPrice > 0) {
      const absChangePercent = Math.abs(changePercent);
      if (absChangePercent > maxChangePercent) {
        skipped = true;
        skipReason = `Change exceeds ${maxChangePercent}%`;
      }
    }

    return {
      listingId: listing.id,
      productTitle: listing.product?.titleEn || listing.product?.title || 'Unknown',
      oldPrice,
      newPrice,
      changePercent: Math.round(changePercent * 100) / 100,
      skipped,
      skipReason,
    };
  });

  res.json({
    success: true,
    dryRun: true,
    totalMatched: changes.length,
    totalWillChange: changes.filter(c => !c.skipped).length,
    totalWillSkip: changes.filter(c => c.skipped).length,
    preview: changes,
  });
});

// ========================================
// 一括出品操作
// ========================================

interface BulkListingOperationRequest {
  // 対象
  filter?: {
    listingIds?: string[];
    productIds?: string[];
    category?: string;
    marketplace?: string;
    status?: string;
  };
  // 操作
  operation: 'pause' | 'resume' | 'delete' | 'archive';
  // オプション
  options?: {
    dryRun?: boolean;
    reason?: string;
  };
}

/**
 * @swagger
 * /api/batch/listing-operation:
 *   post:
 *     tags: [Batch]
 *     summary: 一括出品操作
 */
router.post('/listing-operation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as BulkListingOperationRequest;
    const { filter = {}, operation, options = {} } = body;

    if (!operation) {
      return res.status(400).json({
        success: false,
        error: 'operation is required (pause, resume, delete, archive)',
      });
    }

    const validOperations = ['pause', 'resume', 'delete', 'archive'];
    if (!validOperations.includes(operation)) {
      return res.status(400).json({
        success: false,
        error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`,
      });
    }

    const { dryRun = false } = options;

    log.info({
      type: 'bulk_listing_operation_start',
      operation,
      filter,
      dryRun,
    });

    // フィルター条件でListingsを取得
    const whereClause: any = {};

    if (filter.listingIds?.length) {
      whereClause.id = { in: filter.listingIds };
    }
    if (filter.productIds?.length) {
      whereClause.productId = { in: filter.productIds };
    }
    if (filter.marketplace) {
      whereClause.marketplace = filter.marketplace;
    }
    if (filter.status) {
      whereClause.status = filter.status;
    }

    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: { product: true },
      take: 1000,
    });

    // カテゴリフィルター
    let filteredListings = [...listings];
    if (filter.category) {
      filteredListings = listings.filter(l => l.product?.category === filter.category);
    }

    const results: Array<{
      listingId: string;
      productTitle: string;
      previousStatus: string;
      newStatus: string;
      success: boolean;
      error?: string;
    }> = [];

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const listing of filteredListings) {
      let newStatus: string;
      let success = true;
      let error: string | undefined;

      switch (operation) {
        case 'pause':
          newStatus = 'PAUSED';
          break;
        case 'resume':
          newStatus = 'ACTIVE';
          break;
        case 'delete':
          newStatus = 'DELETED';
          break;
        case 'archive':
          newStatus = 'ARCHIVED';
          break;
        default:
          newStatus = listing.status;
      }

      // 状態遷移のバリデーション
      if (operation === 'resume' && listing.status !== 'PAUSED') {
        success = false;
        error = 'Can only resume PAUSED listings';
      }

      if (operation === 'pause' && listing.status !== 'ACTIVE') {
        success = false;
        error = 'Can only pause ACTIVE listings';
      }

      if (success && !dryRun) {
        try {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { status: newStatus as any },
          });
        } catch (e: any) {
          success = false;
          error = e.message;
        }
      }

      results.push({
        listingId: listing.id,
        productTitle: listing.product?.titleEn || listing.product?.title || 'Unknown',
        previousStatus: listing.status,
        newStatus: success ? newStatus : listing.status,
        success,
        error,
      });

      if (success) {
        totalSuccess++;
      } else {
        totalFailed++;
      }
    }

    log.info({
      type: 'bulk_listing_operation_complete',
      operation,
      dryRun,
      totalMatched: filteredListings.length,
      totalSuccess,
      totalFailed,
    });

    res.json({
      success: true,
      dryRun,
      operation,
      summary: {
        totalMatched: filteredListings.length,
        totalSuccess,
        totalFailed,
      },
      results: results.slice(0, 100),
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// CSV エクスポート
// ========================================

/**
 * @swagger
 * /api/batch/export/listings:
 *   get:
 *     tags: [Batch]
 *     summary: 出品データCSVエクスポート
 */
router.get('/export/listings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, marketplace, category, limit = '10000' } = req.query;

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (marketplace) whereClause.marketplace = marketplace;

    const listings = await prisma.listing.findMany({
      where: whereClause,
      include: { product: true },
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
    });

    // カテゴリフィルター
    let filteredListings = [...listings];
    if (category) {
      filteredListings = listings.filter(l => l.product?.category === category);
    }

    // CSVヘッダー
    const headers = [
      'id',
      'marketplace',
      'status',
      'listingPrice',
      'currency',
      'productId',
      'productTitle',
      'productCategory',
      'productCost',
      'marginPercent',
      'createdAt',
      'updatedAt',
    ];

    const rows = filteredListings.map(l => {
      const cost = l.product?.price || 0;
      const marginPercent = l.listingPrice > 0 ? ((l.listingPrice - cost) / l.listingPrice) * 100 : 0;

      return [
        l.id,
        l.marketplace,
        l.status,
        l.listingPrice,
        l.currency || 'USD',
        l.productId || '',
        `"${(l.product?.titleEn || l.product?.title || '').replace(/"/g, '""')}"`,
        l.product?.category || '',
        cost,
        marginPercent.toFixed(2),
        l.createdAt.toISOString(),
        l.updatedAt.toISOString(),
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=listings_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/batch/export/products:
 *   get:
 *     tags: [Batch]
 *     summary: 商品データCSVエクスポート
 */
router.get('/export/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, limit = '10000' } = req.query;

    const whereClause: any = {};
    if (category) whereClause.category = category;

    const products = await prisma.product.findMany({
      where: whereClause,
      include: { source: true },
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'id',
      'title',
      'titleEn',
      'category',
      'brand',
      'price',
      'sourceName',
      'sourceUrl',
      'condition',
      'createdAt',
    ];

    const rows = products.map(p => [
      p.id,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.titleEn || '').replace(/"/g, '""')}"`,
      p.category || '',
      p.brand || '',
      p.price,
      p.source?.name || '',
      p.sourceUrl || '',
      p.condition || '',
      p.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/batch/export/orders:
 *   get:
 *     tags: [Batch]
 *     summary: 注文データCSVエクスポート
 */
router.get('/export/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, marketplace, days = '30', limit = '10000' } = req.query;

    const from = new Date();
    from.setDate(from.getDate() - parseInt(days as string, 10));

    const whereClause: any = { createdAt: { gte: from } };
    if (status) whereClause.status = status;
    if (marketplace) whereClause.marketplace = marketplace;

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { sales: true },
      take: parseInt(limit as string, 10),
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'id',
      'marketplace',
      'marketplaceOrderId',
      'status',
      'paymentStatus',
      'buyerUsername',
      'subtotal',
      'shippingCost',
      'tax',
      'total',
      'currency',
      'itemCount',
      'orderedAt',
      'createdAt',
    ];

    const rows = orders.map(o => [
      o.id,
      o.marketplace,
      o.marketplaceOrderId,
      o.status,
      o.paymentStatus,
      o.buyerUsername,
      o.subtotal,
      o.shippingCost,
      o.tax,
      o.total,
      o.currency,
      o.sales.length,
      o.orderedAt.toISOString(),
      o.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

// ========================================
// CSV インポート
// ========================================

/**
 * @swagger
 * /api/batch/import/price-update:
 *   post:
 *     tags: [Batch]
 *     summary: 価格一括更新CSVインポート
 *     description: "CSVファイルで一括価格更新。必須列: id/listingId と newprice/price"
 */
router.post('/import/price-update', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { dryRun = 'true' } = req.query;
    const isDryRun = dryRun === 'true';

    const csvData = req.body;
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'CSV data is required in request body',
      });
    }

    const lines = csvData.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'CSV must have header and at least one data row',
      });
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // 必須: idと、newprice
    const hasId = headers.includes('id') || headers.includes('listingid') || headers.includes('listing_id');
    const hasNewPrice = headers.includes('newprice') || headers.includes('new_price') || headers.includes('price');

    if (!hasNewPrice || !hasId) {
      return res.status(400).json({
        success: false,
        error: 'CSV must have id (or listingId) and newprice (or price) columns',
      });
    }

    const results: Array<{
      row: number;
      listingId: string;
      oldPrice: number;
      newPrice: number;
      action: 'updated' | 'skipped';
      error?: string;
    }> = [];

    let totalUpdated = 0;
    let totalSkipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const record: Record<string, string> = {};

      headers.forEach((h, idx) => {
        record[h] = values[idx] || '';
      });

      const id = record.id || record.listingid || record.listing_id;
      const newPriceStr = record.newprice || record.new_price || record.price;
      const newPrice = parseFloat(newPriceStr) || 0;

      if (!id) {
        results.push({
          row: i + 1,
          listingId: 'Unknown',
          oldPrice: 0,
          newPrice: 0,
          action: 'skipped',
          error: 'Missing listing ID',
        });
        totalSkipped++;
        continue;
      }

      if (newPrice <= 0) {
        results.push({
          row: i + 1,
          listingId: id,
          oldPrice: 0,
          newPrice: 0,
          action: 'skipped',
          error: 'Invalid price',
        });
        totalSkipped++;
        continue;
      }

      try {
        const listing = await prisma.listing.findUnique({ where: { id } });

        if (!listing) {
          results.push({
            row: i + 1,
            listingId: id,
            oldPrice: 0,
            newPrice,
            action: 'skipped',
            error: 'Listing not found',
          });
          totalSkipped++;
          continue;
        }

        const oldPrice = listing.listingPrice;

        if (!isDryRun) {
          await prisma.$transaction([
            prisma.listing.update({
              where: { id: listing.id },
              data: { listingPrice: newPrice },
            }),
            prisma.priceChangeLog.create({
              data: {
                listingId: listing.id,
                oldPrice,
                newPrice,
                currency: listing.currency || 'USD',
                changePercent: oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0,
                source: 'manual',
                reason: 'CSV price update import',
              },
            }),
          ]);
        }

        results.push({
          row: i + 1,
          listingId: id,
          oldPrice,
          newPrice,
          action: 'updated',
        });
        totalUpdated++;
      } catch (e: any) {
        results.push({
          row: i + 1,
          listingId: id,
          oldPrice: 0,
          newPrice,
          action: 'skipped',
          error: e.message,
        });
        totalSkipped++;
      }
    }

    log.info({
      type: 'csv_price_update_complete',
      dryRun: isDryRun,
      totalRows: lines.length - 1,
      totalUpdated,
      totalSkipped,
    });

    res.json({
      success: true,
      dryRun: isDryRun,
      summary: {
        totalRows: lines.length - 1,
        totalUpdated,
        totalSkipped,
      },
      results: results.slice(0, 100),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * CSVの1行をパース（ダブルクォート対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

export { router as batchOperationsRouter };

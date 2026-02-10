/**
 * Phase 38: 検索機能強化 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type {
  SearchAnalyzer,
  SearchSyncMode,
  SearchQueryType,
  SynonymType,
  SearchFilterType,
} from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ========================================
// 検索 API
// ========================================

/**
 * 商品検索
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const {
      q,
      queryType = 'KEYWORD',
      category,
      brand,
      status,
      priceMin,
      priceMax,
      page = '1',
      pageSize = '20',
      sortBy,
      sortOrder = 'desc',
      userId,
      sessionId,
    } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const startTime = Date.now();
    const pageNum = parseInt(page as string, 10);
    const size = Math.min(parseInt(pageSize as string, 10), 100);
    const offset = (pageNum - 1) * size;

    // 検索クエリ構築
    const where: Record<string, unknown> = {
      OR: [
        { title: { contains: q as string, mode: 'insensitive' } },
        { titleEn: { contains: q as string, mode: 'insensitive' } },
        { description: { contains: q as string, mode: 'insensitive' } },
        { category: { contains: q as string, mode: 'insensitive' } },
        { brand: { contains: q as string, mode: 'insensitive' } },
      ],
    };

    // フィルター適用
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (priceMin !== undefined || priceMax !== undefined) {
      where.price = {};
      if (priceMin !== undefined) {
        (where.price as Record<string, unknown>).gte = parseInt(priceMin as string, 10);
      }
      if (priceMax !== undefined) {
        (where.price as Record<string, unknown>).lte = parseInt(priceMax as string, 10);
      }
    }

    // ソート
    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy as string] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          titleEn: true,
          description: true,
          category: true,
          brand: true,
          price: true,
          status: true,
          images: true,
          createdAt: true,
        },
        orderBy,
        take: size,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    const took = Date.now() - startTime;

    // 検索ログ記録
    await prisma.searchLog.create({
      data: {
        userId: userId as string | undefined,
        sessionId: sessionId as string | undefined,
        query: q as string,
        queryType: queryType as SearchQueryType,
        filters: { category, brand, status, priceMin, priceMax },
        entityType: 'products',
        resultCount: total,
        topResults: items.slice(0, 5).map((i) => i.id),
        executionTime: took,
        clickedResults: [],
      },
    });

    // 人気検索更新
    await updatePopularSearch(q as string, 'products');

    res.json({
      items,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
      took,
    });
  } catch (error) {
    console.error('Failed to search products:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

/**
 * 注文検索
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const {
      q,
      marketplace,
      status,
      dateFrom,
      dateTo,
      page = '1',
      pageSize = '20',
      sortBy,
      sortOrder = 'desc',
      userId,
      sessionId,
    } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const startTime = Date.now();
    const pageNum = parseInt(page as string, 10);
    const size = Math.min(parseInt(pageSize as string, 10), 100);
    const offset = (pageNum - 1) * size;

    const where: Record<string, unknown> = {
      OR: [
        { marketplaceOrderId: { contains: q as string, mode: 'insensitive' } },
        { buyerName: { contains: q as string, mode: 'insensitive' } },
        { buyerEmail: { contains: q as string, mode: 'insensitive' } },
      ],
    };

    if (marketplace) where.marketplace = marketplace;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(dateTo as string);
      }
    }

    const orderBy: Record<string, unknown> = {};
    if (sortBy) {
      orderBy[sortBy as string] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          marketplaceOrderId: true,
          marketplace: true,
          status: true,
          total: true,
          currency: true,
          buyerName: true,
          createdAt: true,
        },
        orderBy,
        take: size,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    const took = Date.now() - startTime;

    await prisma.searchLog.create({
      data: {
        userId: userId as string | undefined,
        sessionId: sessionId as string | undefined,
        query: q as string,
        queryType: 'KEYWORD',
        filters: { marketplace, status, dateFrom, dateTo },
        entityType: 'orders',
        resultCount: total,
        topResults: items.slice(0, 5).map((i) => i.id),
        executionTime: took,
        clickedResults: [],
      },
    });

    await updatePopularSearch(q as string, 'orders');

    res.json({
      items,
      total,
      page: pageNum,
      pageSize: size,
      totalPages: Math.ceil(total / size),
      took,
    });
  } catch (error) {
    console.error('Failed to search orders:', error);
    res.status(500).json({ error: 'Failed to search orders' });
  }
});

/**
 * 検索結果クリック記録
 */
router.post('/click', async (req: Request, res: Response) => {
  try {
    const { searchLogId, resultId } = req.body;

    if (!searchLogId || !resultId) {
      return res.status(400).json({ error: 'searchLogId and resultId are required' });
    }

    const log = await prisma.searchLog.findUnique({
      where: { id: searchLogId },
    });

    if (log) {
      const clickedResults = [...log.clickedResults, resultId];
      await prisma.searchLog.update({
        where: { id: searchLogId },
        data: { clickedResults },
      });

      // 人気検索のクリック数更新
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      await prisma.popularSearch.updateMany({
        where: {
          query: log.query.toLowerCase(),
          entityType: log.entityType,
          periodStart,
        },
        data: {
          clickCount: { increment: 1 },
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to record click:', error);
    res.status(500).json({ error: 'Failed to record click' });
  }
});

/**
 * コンバージョン記録
 */
router.post('/conversion', async (req: Request, res: Response) => {
  try {
    const { searchLogId, resultId } = req.body;

    if (!searchLogId || !resultId) {
      return res.status(400).json({ error: 'searchLogId and resultId are required' });
    }

    await prisma.searchLog.update({
      where: { id: searchLogId },
      data: {
        selectedResult: resultId,
        hasConversion: true,
      },
    });

    const log = await prisma.searchLog.findUnique({
      where: { id: searchLogId },
    });

    if (log) {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

      await prisma.popularSearch.updateMany({
        where: {
          query: log.query.toLowerCase(),
          entityType: log.entityType,
          periodStart,
        },
        data: {
          conversionCount: { increment: 1 },
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to record conversion:', error);
    res.status(500).json({ error: 'Failed to record conversion' });
  }
});

// ========================================
// 検索インデックス API
// ========================================

/**
 * インデックス一覧
 */
router.get('/indexes', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.query;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;

    const indexes = await prisma.searchIndex.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(indexes);
  } catch (error) {
    console.error('Failed to list indexes:', error);
    res.status(500).json({ error: 'Failed to list indexes' });
  }
});

/**
 * インデックス作成
 */
router.post('/indexes', async (req: Request, res: Response) => {
  try {
    const { name, description, entityType, fields, analyzer, syncMode } = req.body;

    const weights: Record<string, number> = {};
    for (const [field, config] of Object.entries(fields as Record<string, { weight: number }>)) {
      weights[field] = config.weight;
    }

    const index = await prisma.searchIndex.create({
      data: {
        name,
        description,
        entityType,
        fields: fields ?? {},
        weights: weights ?? {},
        analyzer: (analyzer as SearchAnalyzer) ?? 'JAPANESE',
        syncMode: (syncMode as SearchSyncMode) ?? 'REALTIME',
        isActive: true,
      },
    });

    res.status(201).json(index);
  } catch (error) {
    console.error('Failed to create index:', error);
    res.status(500).json({ error: 'Failed to create index' });
  }
});

/**
 * インデックス同期
 */
router.post('/indexes/:id/sync', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const index = await prisma.searchIndex.findUnique({
      where: { id },
    });

    if (!index) {
      return res.status(404).json({ error: 'Index not found' });
    }

    await prisma.searchIndex.update({
      where: { id },
      data: { syncStatus: 'SYNCING' },
    });

    const startTime = Date.now();
    let documentCount = 0;

    try {
      switch (index.entityType) {
        case 'products':
          documentCount = await prisma.product.count();
          break;
        case 'orders':
          documentCount = await prisma.order.count();
          break;
        case 'listings':
          documentCount = await prisma.listing.count();
          break;
      }

      await prisma.searchIndex.update({
        where: { id },
        data: {
          syncStatus: 'COMPLETED',
          lastSyncAt: new Date(),
          documentCount,
        },
      });

      res.json({
        documentCount,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      await prisma.searchIndex.update({
        where: { id },
        data: { syncStatus: 'FAILED' },
      });
      throw error;
    }
  } catch (error) {
    console.error('Failed to sync index:', error);
    res.status(500).json({ error: 'Failed to sync index' });
  }
});

// ========================================
// シノニム API
// ========================================

/**
 * シノニム一覧
 */
router.get('/synonyms', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.query;

    const where: Record<string, unknown> = { isActive: true };
    if (entityType) {
      where.OR = [
        { entityType },
        { entityType: null },
      ];
    }

    const synonyms = await prisma.searchSynonym.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { term: 'asc' }],
    });

    res.json(synonyms);
  } catch (error) {
    console.error('Failed to list synonyms:', error);
    res.status(500).json({ error: 'Failed to list synonyms' });
  }
});

/**
 * シノニム作成
 */
router.post('/synonyms', async (req: Request, res: Response) => {
  try {
    const { entityType, term, synonyms, synonymType, priority } = req.body;

    const synonym = await prisma.searchSynonym.create({
      data: {
        entityType,
        term: term.toLowerCase(),
        synonyms: synonyms.map((s: string) => s.toLowerCase()),
        synonymType: (synonymType as SynonymType) ?? 'EQUIVALENT',
        priority: priority ?? 0,
        isActive: true,
      },
    });

    res.status(201).json(synonym);
  } catch (error) {
    console.error('Failed to create synonym:', error);
    res.status(500).json({ error: 'Failed to create synonym' });
  }
});

/**
 * シノニム更新
 */
router.patch('/synonyms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { synonyms, priority, isActive } = req.body;

    const data: Record<string, unknown> = {};
    if (synonyms !== undefined) {
      data.synonyms = synonyms.map((s: string) => s.toLowerCase());
    }
    if (priority !== undefined) data.priority = priority;
    if (isActive !== undefined) data.isActive = isActive;

    const synonym = await prisma.searchSynonym.update({
      where: { id },
      data,
    });

    res.json(synonym);
  } catch (error) {
    console.error('Failed to update synonym:', error);
    res.status(500).json({ error: 'Failed to update synonym' });
  }
});

/**
 * シノニム削除
 */
router.delete('/synonyms/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.searchSynonym.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete synonym:', error);
    res.status(500).json({ error: 'Failed to delete synonym' });
  }
});

// ========================================
// フィルター API
// ========================================

/**
 * フィルター一覧
 */
router.get('/filters/:entityType', async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;

    const filters = await prisma.searchFilter.findMany({
      where: {
        entityType,
        isActive: true,
      },
      orderBy: { position: 'asc' },
    });

    res.json(filters);
  } catch (error) {
    console.error('Failed to list filters:', error);
    res.status(500).json({ error: 'Failed to list filters' });
  }
});

/**
 * フィルター作成
 */
router.post('/filters', async (req: Request, res: Response) => {
  try {
    const {
      name,
      displayName,
      description,
      entityType,
      field,
      filterType,
      options,
      position,
      isCollapsed,
      showCount,
    } = req.body;

    const filter = await prisma.searchFilter.create({
      data: {
        name,
        displayName,
        description,
        entityType,
        field,
        filterType: filterType as SearchFilterType,
        options: options ?? [],
        position: position ?? 0,
        isCollapsed: isCollapsed ?? false,
        showCount: showCount ?? true,
        isActive: true,
      },
    });

    res.status(201).json(filter);
  } catch (error) {
    console.error('Failed to create filter:', error);
    res.status(500).json({ error: 'Failed to create filter' });
  }
});

/**
 * フィルター集計値取得
 */
router.get('/filters/:entityType/:field/aggregations', async (req: Request, res: Response) => {
  try {
    const { entityType, field } = req.params;
    const results: Array<{ value: string; count: number }> = [];

    switch (entityType) {
      case 'products':
        if (field === 'category') {
          const categories = await prisma.product.groupBy({
            by: ['category'],
            _count: { id: true },
          });
          for (const cat of categories) {
            if (cat.category) {
              results.push({ value: cat.category, count: cat._count.id });
            }
          }
        } else if (field === 'brand') {
          const brands = await prisma.product.groupBy({
            by: ['brand'],
            _count: { id: true },
          });
          for (const brand of brands) {
            if (brand.brand) {
              results.push({ value: brand.brand, count: brand._count.id });
            }
          }
        } else if (field === 'status') {
          const statuses = await prisma.product.groupBy({
            by: ['status'],
            _count: { id: true },
          });
          for (const status of statuses) {
            results.push({ value: status.status, count: status._count.id });
          }
        }
        break;

      case 'orders':
        if (field === 'marketplace') {
          const marketplaces = await prisma.order.groupBy({
            by: ['marketplace'],
            _count: { id: true },
          });
          for (const mp of marketplaces) {
            results.push({ value: mp.marketplace, count: mp._count.id });
          }
        } else if (field === 'status') {
          const statuses = await prisma.order.groupBy({
            by: ['status'],
            _count: { id: true },
          });
          for (const status of statuses) {
            results.push({ value: status.status, count: status._count.id });
          }
        }
        break;
    }

    res.json(results.sort((a, b) => b.count - a.count));
  } catch (error) {
    console.error('Failed to get filter aggregations:', error);
    res.status(500).json({ error: 'Failed to get filter aggregations' });
  }
});

// ========================================
// サジェスト API
// ========================================

/**
 * サジェスト取得
 */
router.get('/suggest', async (req: Request, res: Response) => {
  try {
    const { q, entityType, limit = '10' } = req.query;

    if (!q || !entityType) {
      return res.status(400).json({ error: 'q and entityType are required' });
    }

    const prefix = (q as string).toLowerCase();
    const limitNum = Math.min(parseInt(limit as string, 10), 20);

    const suggestions = await prisma.searchSuggestion.findMany({
      where: {
        prefix: { startsWith: prefix },
        entityType: entityType as string,
        isActive: true,
      },
      orderBy: [{ weight: 'desc' }, { selectCount: 'desc' }],
      take: limitNum,
    });

    // 人気検索から補完
    if (suggestions.length < limitNum) {
      const popular = await prisma.popularSearch.findMany({
        where: {
          query: { startsWith: prefix },
          entityType: entityType as string,
        },
        orderBy: { searchCount: 'desc' },
        take: limitNum - suggestions.length,
      });

      for (const p of popular) {
        if (!suggestions.some((s) => s.suggestion === p.query)) {
          suggestions.push({
            id: p.id,
            prefix,
            suggestion: p.query,
            entityType: entityType as string,
            weight: p.searchCount / 100,
            selectCount: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            source: 'QUERY',
          });
        }
      }
    }

    res.json(suggestions.map((s) => s.suggestion));
  } catch (error) {
    console.error('Failed to get suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * サジェスト選択記録
 */
router.post('/suggest/select', async (req: Request, res: Response) => {
  try {
    const { suggestion, entityType } = req.body;

    await prisma.searchSuggestion.updateMany({
      where: {
        suggestion: suggestion.toLowerCase(),
        entityType,
      },
      data: {
        selectCount: { increment: 1 },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to record suggestion select:', error);
    res.status(500).json({ error: 'Failed to record suggestion select' });
  }
});

// ========================================
// 人気・トレンド検索 API
// ========================================

/**
 * 人気検索ワード
 */
router.get('/popular', async (req: Request, res: Response) => {
  try {
    const { entityType, limit = '10' } = req.query;

    if (!entityType) {
      return res.status(400).json({ error: 'entityType is required' });
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const popular = await prisma.popularSearch.findMany({
      where: {
        entityType: entityType as string,
        periodStart,
      },
      orderBy: { searchCount: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json(popular.map((p) => ({
      query: p.query,
      count: p.searchCount,
    })));
  } catch (error) {
    console.error('Failed to get popular searches:', error);
    res.status(500).json({ error: 'Failed to get popular searches' });
  }
});

/**
 * トレンド検索ワード
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { entityType, limit = '10' } = req.query;

    if (!entityType) {
      return res.status(400).json({ error: 'entityType is required' });
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const trending = await prisma.popularSearch.findMany({
      where: {
        entityType: entityType as string,
        periodStart,
      },
      orderBy: { trendScore: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json(trending.map((t) => ({
      query: t.query,
      trendScore: t.trendScore,
    })));
  } catch (error) {
    console.error('Failed to get trending searches:', error);
    res.status(500).json({ error: 'Failed to get trending searches' });
  }
});

// ========================================
// 検索分析 API
// ========================================

/**
 * 検索統計
 */
router.get('/analytics/stats', async (req: Request, res: Response) => {
  try {
    const { entityType, startDate, endDate } = req.query;

    if (!entityType || !startDate || !endDate) {
      return res.status(400).json({ error: 'entityType, startDate, and endDate are required' });
    }

    const logs = await prisma.searchLog.findMany({
      where: {
        entityType: entityType as string,
        searchedAt: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        },
      },
      select: {
        query: true,
        resultCount: true,
        executionTime: true,
        clickedResults: true,
        hasConversion: true,
      },
    });

    const totalSearches = logs.length;
    const uniqueQueries = new Set(logs.map((l) => l.query.toLowerCase())).size;

    const avgResultCount =
      totalSearches > 0
        ? logs.reduce((sum, l) => sum + l.resultCount, 0) / totalSearches
        : 0;

    const executionTimes = logs
      .map((l) => l.executionTime)
      .filter((t): t is number => t !== null);
    const avgExecutionTime =
      executionTimes.length > 0
        ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length
        : 0;

    const zeroResultSearches = logs.filter((l) => l.resultCount === 0).length;
    const zeroResultRate = totalSearches > 0 ? zeroResultSearches / totalSearches : 0;

    const searchesWithClicks = logs.filter((l) => l.clickedResults.length > 0).length;
    const clickThroughRate = totalSearches > 0 ? searchesWithClicks / totalSearches : 0;

    const conversions = logs.filter((l) => l.hasConversion).length;
    const conversionRate = totalSearches > 0 ? conversions / totalSearches : 0;

    res.json({
      totalSearches,
      uniqueQueries,
      avgResultCount,
      avgExecutionTime,
      zeroResultRate,
      clickThroughRate,
      conversionRate,
    });
  } catch (error) {
    console.error('Failed to get search stats:', error);
    res.status(500).json({ error: 'Failed to get search stats' });
  }
});

/**
 * 結果0件の検索ワード
 */
router.get('/analytics/zero-results', async (req: Request, res: Response) => {
  try {
    const { entityType, limit = '20' } = req.query;

    if (!entityType) {
      return res.status(400).json({ error: 'entityType is required' });
    }

    const logs = await prisma.searchLog.groupBy({
      by: ['query'],
      where: {
        entityType: entityType as string,
        resultCount: 0,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: parseInt(limit as string, 10),
    });

    res.json(logs.map((l) => ({
      query: l.query,
      count: l._count.id,
    })));
  } catch (error) {
    console.error('Failed to get zero result queries:', error);
    res.status(500).json({ error: 'Failed to get zero result queries' });
  }
});

// ========================================
// ヘルパー関数
// ========================================

async function updatePopularSearch(query: string, entityType: string): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  try {
    await prisma.popularSearch.upsert({
      where: {
        query_entityType_periodStart: {
          query: query.toLowerCase(),
          entityType,
          periodStart,
        },
      },
      update: {
        searchCount: { increment: 1 },
        lastSearchedAt: now,
      },
      create: {
        query: query.toLowerCase(),
        entityType,
        searchCount: 1,
        periodStart,
        periodEnd,
        lastSearchedAt: now,
      },
    });
  } catch {
    // 重複エラーを無視
  }
}

export default router;

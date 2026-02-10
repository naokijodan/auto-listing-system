/**
 * Phase 38: 検索機能強化サービス
 *
 * 機能:
 * - 全文検索（PostgreSQL pg_trgm）
 * - 検索インデックス管理
 * - 検索ログ・分析
 * - シノニム・サジェスト
 */

import { PrismaClient } from '@prisma/client';
import type {
  SearchIndex,
  SearchLog,
  SearchSynonym,
  SearchFilter,
  PopularSearch,
  SearchSuggestion,
  SearchAnalyzer,
  SearchSyncMode,
  SearchSyncStatus,
  SearchQueryType,
  SynonymType,
  SearchFilterType,
  SuggestionSource,
} from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// 型定義
// ========================================

interface SearchResult<T> {
  items: T[];
  total: number;
  took: number; // ミリ秒
  highlights?: Record<string, string[]>;
}

interface SearchOptions {
  query: string;
  queryType?: SearchQueryType;
  filters?: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  highlight?: boolean;
  userId?: string;
  sessionId?: string;
}

interface SearchIndexInput {
  name: string;
  description?: string;
  entityType: string;
  fields: Record<string, { weight: number; analyzer?: string }>;
  analyzer?: SearchAnalyzer;
  syncMode?: SearchSyncMode;
}

interface SearchLogInput {
  userId?: string;
  sessionId?: string;
  query: string;
  queryType?: SearchQueryType;
  filters?: Record<string, unknown>;
  entityType: string;
  indexName?: string;
  resultCount: number;
  topResults?: string[];
  executionTime?: number;
  source?: string;
  userAgent?: string;
  ipAddress?: string;
}

// ========================================
// 検索サービス
// ========================================

export class SearchService {
  /**
   * 商品検索
   */
  static async searchProducts(options: SearchOptions): Promise<SearchResult<{
    id: string;
    title: string;
    titleEn: string | null;
    description: string;
    category: string | null;
    brand: string | null;
    price: number;
    status: string;
  }>> {
    const startTime = Date.now();
    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    // シノニム展開
    const expandedQuery = await this.expandQueryWithSynonyms(options.query, 'products');

    // 検索クエリ構築
    const where: Record<string, unknown> = {
      OR: [
        { title: { contains: expandedQuery, mode: 'insensitive' } },
        { titleEn: { contains: expandedQuery, mode: 'insensitive' } },
        { description: { contains: expandedQuery, mode: 'insensitive' } },
        { category: { contains: expandedQuery, mode: 'insensitive' } },
        { brand: { contains: expandedQuery, mode: 'insensitive' } },
      ],
    };

    // フィルター適用
    if (options.filters) {
      if (options.filters.category) {
        where.category = options.filters.category;
      }
      if (options.filters.brand) {
        where.brand = options.filters.brand;
      }
      if (options.filters.status) {
        where.status = options.filters.status;
      }
      if (options.filters.priceMin !== undefined || options.filters.priceMax !== undefined) {
        where.price = {};
        if (options.filters.priceMin !== undefined) {
          (where.price as Record<string, unknown>).gte = options.filters.priceMin;
        }
        if (options.filters.priceMax !== undefined) {
          (where.price as Record<string, unknown>).lte = options.filters.priceMax;
        }
      }
    }

    // ソート
    const orderBy: Record<string, unknown> = {};
    if (options.sortBy) {
      orderBy[options.sortBy] = options.sortOrder ?? 'desc';
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
        },
        orderBy,
        take: pageSize,
        skip: offset,
      }),
      prisma.product.count({ where }),
    ]);

    const took = Date.now() - startTime;

    // 検索ログ記録
    await this.logSearch({
      userId: options.userId,
      sessionId: options.sessionId,
      query: options.query,
      queryType: options.queryType ?? 'KEYWORD',
      filters: options.filters,
      entityType: 'products',
      resultCount: total,
      topResults: items.slice(0, 5).map((i) => i.id),
      executionTime: took,
    });

    return { items, total, took };
  }

  /**
   * 注文検索
   */
  static async searchOrders(options: SearchOptions): Promise<SearchResult<{
    id: string;
    marketplaceOrderId: string;
    marketplace: string;
    status: string;
    total: number;
    currency: string;
    createdAt: Date;
  }>> {
    const startTime = Date.now();
    const page = options.page ?? 1;
    const pageSize = Math.min(options.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      OR: [
        { marketplaceOrderId: { contains: options.query, mode: 'insensitive' } },
        { buyerName: { contains: options.query, mode: 'insensitive' } },
        { buyerEmail: { contains: options.query, mode: 'insensitive' } },
      ],
    };

    // フィルター適用
    if (options.filters) {
      if (options.filters.marketplace) {
        where.marketplace = options.filters.marketplace;
      }
      if (options.filters.status) {
        where.status = options.filters.status;
      }
      if (options.filters.dateFrom || options.filters.dateTo) {
        where.createdAt = {};
        if (options.filters.dateFrom) {
          (where.createdAt as Record<string, unknown>).gte = new Date(options.filters.dateFrom as string);
        }
        if (options.filters.dateTo) {
          (where.createdAt as Record<string, unknown>).lte = new Date(options.filters.dateTo as string);
        }
      }
    }

    const orderBy: Record<string, unknown> = {};
    if (options.sortBy) {
      orderBy[options.sortBy] = options.sortOrder ?? 'desc';
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
          createdAt: true,
        },
        orderBy,
        take: pageSize,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    const took = Date.now() - startTime;

    await this.logSearch({
      userId: options.userId,
      sessionId: options.sessionId,
      query: options.query,
      queryType: options.queryType ?? 'KEYWORD',
      filters: options.filters,
      entityType: 'orders',
      resultCount: total,
      topResults: items.slice(0, 5).map((i) => i.id),
      executionTime: took,
    });

    return { items, total, took };
  }

  /**
   * シノニム展開
   */
  private static async expandQueryWithSynonyms(
    query: string,
    entityType: string
  ): Promise<string> {
    const synonyms = await prisma.searchSynonym.findMany({
      where: {
        OR: [
          { entityType },
          { entityType: null },
        ],
        term: { in: query.toLowerCase().split(/\s+/) },
        isActive: true,
      },
    });

    if (synonyms.length === 0) {
      return query;
    }

    // シノニムを含めたクエリを返す
    let expandedQuery = query;
    for (const synonym of synonyms) {
      for (const syn of synonym.synonyms) {
        if (!expandedQuery.toLowerCase().includes(syn.toLowerCase())) {
          expandedQuery += ` ${syn}`;
        }
      }
    }

    return expandedQuery;
  }

  /**
   * 検索ログ記録
   */
  private static async logSearch(input: SearchLogInput): Promise<void> {
    await prisma.searchLog.create({
      data: {
        ...input,
        filters: (input.filters ?? {}) as any,
        topResults: input.topResults ?? [],
        clickedResults: [],
      },
    });

    // 人気検索ワード更新
    await this.updatePopularSearch(input.query, input.entityType);
  }

  /**
   * 人気検索ワード更新
   */
  private static async updatePopularSearch(
    query: string,
    entityType: string
  ): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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
  }

  /**
   * 検索結果クリック記録
   */
  static async recordClick(
    searchLogId: string,
    clickedResultId: string
  ): Promise<void> {
    const log = await prisma.searchLog.findUnique({
      where: { id: searchLogId },
    });

    if (log) {
      const clickedResults = [...log.clickedResults, clickedResultId];
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
  }

  /**
   * コンバージョン記録
   */
  static async recordConversion(
    searchLogId: string,
    selectedResultId: string
  ): Promise<void> {
    await prisma.searchLog.update({
      where: { id: searchLogId },
      data: {
        selectedResult: selectedResultId,
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
  }
}

// ========================================
// 検索インデックスサービス
// ========================================

export class SearchIndexService {
  /**
   * インデックス作成
   */
  static async createIndex(input: SearchIndexInput): Promise<SearchIndex> {
    const weights: Record<string, number> = {};
    for (const [field, config] of Object.entries(input.fields)) {
      weights[field] = config.weight;
    }

    return prisma.searchIndex.create({
      data: {
        name: input.name,
        description: input.description,
        entityType: input.entityType,
        fields: input.fields as any,
        weights: weights as any,
        analyzer: input.analyzer ?? 'JAPANESE',
        syncMode: input.syncMode ?? 'REALTIME',
        isActive: true,
      },
    });
  }

  /**
   * インデックス一覧
   */
  static async listIndexes(entityType?: string): Promise<SearchIndex[]> {
    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;

    return prisma.searchIndex.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * インデックス同期
   */
  static async syncIndex(indexId: string): Promise<{
    documentCount: number;
    duration: number;
  }> {
    const index = await prisma.searchIndex.findUnique({
      where: { id: indexId },
    });

    if (!index) {
      throw new Error(`Index not found: ${indexId}`);
    }

    await prisma.searchIndex.update({
      where: { id: indexId },
      data: { syncStatus: 'SYNCING' },
    });

    const startTime = Date.now();
    let documentCount = 0;

    try {
      // エンティティタイプに応じたドキュメント数をカウント
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
        default:
          documentCount = 0;
      }

      await prisma.searchIndex.update({
        where: { id: indexId },
        data: {
          syncStatus: 'COMPLETED',
          lastSyncAt: new Date(),
          documentCount,
        },
      });
    } catch (error) {
      await prisma.searchIndex.update({
        where: { id: indexId },
        data: { syncStatus: 'FAILED' },
      });
      throw error;
    }

    return {
      documentCount,
      duration: Date.now() - startTime,
    };
  }
}

// ========================================
// シノニムサービス
// ========================================

export class SynonymService {
  /**
   * シノニム作成
   */
  static async createSynonym(input: {
    entityType?: string;
    term: string;
    synonyms: string[];
    synonymType?: SynonymType;
    priority?: number;
  }): Promise<SearchSynonym> {
    return prisma.searchSynonym.create({
      data: {
        entityType: input.entityType,
        term: input.term.toLowerCase(),
        synonyms: input.synonyms.map((s) => s.toLowerCase()),
        synonymType: input.synonymType ?? 'EQUIVALENT',
        priority: input.priority ?? 0,
        isActive: true,
      },
    });
  }

  /**
   * シノニム一覧
   */
  static async listSynonyms(entityType?: string): Promise<SearchSynonym[]> {
    const where: Record<string, unknown> = { isActive: true };
    if (entityType) {
      where.OR = [
        { entityType },
        { entityType: null },
      ];
    }

    return prisma.searchSynonym.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { term: 'asc' }],
    });
  }

  /**
   * シノニム更新
   */
  static async updateSynonym(
    id: string,
    data: { synonyms?: string[]; priority?: number; isActive?: boolean }
  ): Promise<SearchSynonym> {
    const updateData: Record<string, unknown> = {};
    if (data.synonyms !== undefined) {
      updateData.synonyms = data.synonyms.map((s) => s.toLowerCase());
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return prisma.searchSynonym.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * シノニム削除
   */
  static async deleteSynonym(id: string): Promise<void> {
    await prisma.searchSynonym.delete({
      where: { id },
    });
  }
}

// ========================================
// フィルターサービス
// ========================================

export class SearchFilterService {
  /**
   * フィルター作成
   */
  static async createFilter(input: {
    name: string;
    displayName: string;
    description?: string;
    entityType: string;
    field: string;
    filterType: SearchFilterType;
    options?: unknown[];
    position?: number;
    isCollapsed?: boolean;
    showCount?: boolean;
  }): Promise<SearchFilter> {
    return prisma.searchFilter.create({
      data: {
        ...input,
        options: (input.options ?? []) as any,
        position: input.position ?? 0,
        isCollapsed: input.isCollapsed ?? false,
        showCount: input.showCount ?? true,
        isActive: true,
      },
    });
  }

  /**
   * フィルター一覧
   */
  static async listFilters(entityType: string): Promise<SearchFilter[]> {
    return prisma.searchFilter.findMany({
      where: {
        entityType,
        isActive: true,
      },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * フィルター集計値取得
   */
  static async getFilterAggregations(
    entityType: string,
    field: string,
    baseFilters?: Record<string, unknown>
  ): Promise<Array<{ value: string; count: number }>> {
    // PostgreSQLのGROUP BYを使用した集計
    // 実際の実装ではPrisma.$queryRawを使用
    const results: Array<{ value: string; count: number }> = [];

    switch (entityType) {
      case 'products':
        if (field === 'category') {
          const categories = await prisma.product.groupBy({
            by: ['category'],
            _count: { id: true },
            where: baseFilters as any,
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
            where: baseFilters as any,
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
            where: baseFilters as any,
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
            where: baseFilters as any,
          });
          for (const mp of marketplaces) {
            results.push({ value: mp.marketplace, count: mp._count.id });
          }
        } else if (field === 'status') {
          const statuses = await prisma.order.groupBy({
            by: ['status'],
            _count: { id: true },
            where: baseFilters as any,
          });
          for (const status of statuses) {
            results.push({ value: status.status, count: status._count.id });
          }
        }
        break;
    }

    return results.sort((a, b) => b.count - a.count);
  }
}

// ========================================
// サジェストサービス
// ========================================

export class SuggestionService {
  /**
   * サジェスト取得
   */
  static async getSuggestions(
    prefix: string,
    entityType: string,
    limit: number = 10
  ): Promise<string[]> {
    const suggestions = await prisma.searchSuggestion.findMany({
      where: {
        prefix: { startsWith: prefix.toLowerCase() },
        entityType,
        isActive: true,
      },
      orderBy: [{ weight: 'desc' }, { selectCount: 'desc' }],
      take: limit,
    });

    if (suggestions.length < limit) {
      // サジェストが少ない場合、人気検索から補完
      const popular = await prisma.popularSearch.findMany({
        where: {
          query: { startsWith: prefix.toLowerCase() },
          entityType,
        },
        orderBy: { searchCount: 'desc' },
        take: limit - suggestions.length,
      });

      for (const p of popular) {
        if (!suggestions.some((s) => s.suggestion === p.query)) {
          suggestions.push({
            id: p.id,
            prefix: prefix.toLowerCase(),
            suggestion: p.query,
            entityType,
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

    return suggestions.map((s) => s.suggestion);
  }

  /**
   * サジェスト選択記録
   */
  static async recordSuggestionSelect(
    suggestion: string,
    entityType: string
  ): Promise<void> {
    await prisma.searchSuggestion.updateMany({
      where: {
        suggestion: suggestion.toLowerCase(),
        entityType,
      },
      data: {
        selectCount: { increment: 1 },
      },
    });
  }

  /**
   * サジェスト生成（バッチ）
   */
  static async generateSuggestions(entityType: string): Promise<number> {
    let created = 0;

    // 商品名からサジェスト生成
    if (entityType === 'products') {
      const products = await prisma.product.findMany({
        select: { title: true, titleEn: true },
        take: 1000,
      });

      for (const product of products) {
        const titles = [product.title, product.titleEn].filter(Boolean) as string[];
        for (const title of titles) {
          const words = title.split(/\s+/).filter((w) => w.length >= 2);
          for (const word of words) {
            const prefix = word.substring(0, 2).toLowerCase();
            try {
              await prisma.searchSuggestion.upsert({
                where: {
                  id: `${prefix}_${word.toLowerCase()}_${entityType}`,
                },
                update: {
                  weight: { increment: 0.1 },
                },
                create: {
                  prefix,
                  suggestion: word.toLowerCase(),
                  entityType,
                  weight: 1,
                  source: 'PRODUCT',
                  isActive: true,
                },
              });
              created++;
            } catch {
              // 重複エラーを無視
            }
          }
        }
      }
    }

    return created;
  }
}

// ========================================
// 人気検索サービス
// ========================================

export class PopularSearchService {
  /**
   * 人気検索ワード取得
   */
  static async getPopularSearches(
    entityType: string,
    limit: number = 10
  ): Promise<Array<{ query: string; count: number }>> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const popular = await prisma.popularSearch.findMany({
      where: {
        entityType,
        periodStart,
      },
      orderBy: { searchCount: 'desc' },
      take: limit,
    });

    return popular.map((p) => ({
      query: p.query,
      count: p.searchCount,
    }));
  }

  /**
   * トレンドスコア計算（バッチ）
   */
  static async calculateTrendScores(): Promise<number> {
    const now = new Date();
    const currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentPopular = await prisma.popularSearch.findMany({
      where: { periodStart: currentPeriodStart },
    });

    const lastPopular = await prisma.popularSearch.findMany({
      where: { periodStart: lastPeriodStart },
    });

    const lastCounts: Record<string, number> = {};
    for (const p of lastPopular) {
      lastCounts[`${p.query}_${p.entityType}`] = p.searchCount;
    }

    let updated = 0;

    for (const p of currentPopular) {
      const lastCount = lastCounts[`${p.query}_${p.entityType}`] ?? 0;
      const growth = lastCount > 0 ? (p.searchCount - lastCount) / lastCount : 1;
      const trendScore = p.searchCount * (1 + growth);

      await prisma.popularSearch.update({
        where: { id: p.id },
        data: { trendScore },
      });
      updated++;
    }

    return updated;
  }

  /**
   * トレンド検索ワード取得
   */
  static async getTrendingSearches(
    entityType: string,
    limit: number = 10
  ): Promise<Array<{ query: string; trendScore: number }>> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const trending = await prisma.popularSearch.findMany({
      where: {
        entityType,
        periodStart,
      },
      orderBy: { trendScore: 'desc' },
      take: limit,
    });

    return trending.map((t) => ({
      query: t.query,
      trendScore: t.trendScore,
    }));
  }
}

// ========================================
// 検索分析サービス
// ========================================

export class SearchAnalyticsService {
  /**
   * 検索統計取得
   */
  static async getSearchStats(
    entityType: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    avgResultCount: number;
    avgExecutionTime: number;
    zeroResultRate: number;
    clickThroughRate: number;
    conversionRate: number;
  }> {
    const logs = await prisma.searchLog.findMany({
      where: {
        entityType,
        searchedAt: {
          gte: startDate,
          lte: endDate,
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

    return {
      totalSearches,
      uniqueQueries,
      avgResultCount,
      avgExecutionTime,
      zeroResultRate,
      clickThroughRate,
      conversionRate,
    };
  }

  /**
   * 結果0件の検索ワード取得
   */
  static async getZeroResultQueries(
    entityType: string,
    limit: number = 20
  ): Promise<Array<{ query: string; count: number }>> {
    const logs = await prisma.searchLog.groupBy({
      by: ['query'],
      where: {
        entityType,
        resultCount: 0,
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return logs.map((l) => ({
      query: l.query,
      count: l._count.id,
    }));
  }
}

export default {
  SearchService,
  SearchIndexService,
  SynonymService,
  SearchFilterService,
  SuggestionService,
  PopularSearchService,
  SearchAnalyticsService,
};

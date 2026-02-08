import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import {
  mapToEbayCategory,
  suggestCategories,
  getAllCategories as getBuiltInCategories,
  getItemSpecificsForCategory,
  EBAY_CATEGORY_MAP,
  inferCategoryFromText,
} from '@rakuda/enrichment';

const router = Router();
const log = logger.child({ module: 'categories' });

/**
 * カテゴリマッピング一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, isActive, limit = 100, offset = 0 } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { sourceCategory: { contains: search as string, mode: 'insensitive' } },
        { ebayCategoryName: { contains: search as string, mode: 'insensitive' } },
        { ebayCategoryId: { contains: search as string } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [categories, total] = await Promise.all([
      prisma.ebayCategoryMapping.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { sourceCategory: 'asc' },
        include: {
          _count: { select: { templates: true } },
        },
      }),
      prisma.ebayCategoryMapping.count({ where }),
    ]);

    res.json({
      success: true,
      data: categories,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピング取得（単一）
 */
router.get('/:id', async (req, res, next) => {
  try {
    const category = await prisma.ebayCategoryMapping.findUnique({
      where: { id: req.params.id },
      include: {
        templates: true,
      },
    });

    if (!category) {
      throw new AppError(404, 'Category mapping not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピング作成
 */
router.post('/', async (req, res, next) => {
  try {
    const { sourceCategory, ebayCategoryId, ebayCategoryName, itemSpecifics = {}, isActive = true } =
      req.body;

    if (!sourceCategory || !ebayCategoryId || !ebayCategoryName) {
      throw new AppError(400, 'sourceCategory, ebayCategoryId, and ebayCategoryName are required', 'INVALID_REQUEST');
    }

    const category = await prisma.ebayCategoryMapping.create({
      data: {
        sourceCategory,
        ebayCategoryId,
        ebayCategoryName,
        itemSpecifics,
        isActive,
      },
    });

    logger.info({
      type: 'category_mapping_created',
      categoryId: category.id,
      sourceCategory,
      ebayCategoryId,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピング更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { sourceCategory, ebayCategoryId, ebayCategoryName, itemSpecifics, isActive } = req.body;

    const updateData: any = {};
    if (sourceCategory !== undefined) updateData.sourceCategory = sourceCategory;
    if (ebayCategoryId !== undefined) updateData.ebayCategoryId = ebayCategoryId;
    if (ebayCategoryName !== undefined) updateData.ebayCategoryName = ebayCategoryName;
    if (itemSpecifics !== undefined) updateData.itemSpecifics = itemSpecifics;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await prisma.ebayCategoryMapping.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピング削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.ebayCategoryMapping.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Category mapping deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピング一括インポート
 */
router.post('/import', async (req, res, next) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      throw new AppError(400, 'mappings array is required', 'INVALID_REQUEST');
    }

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const mapping of mappings) {
      try {
        await prisma.ebayCategoryMapping.upsert({
          where: { sourceCategory: mapping.sourceCategory },
          create: {
            sourceCategory: mapping.sourceCategory,
            ebayCategoryId: mapping.ebayCategoryId,
            ebayCategoryName: mapping.ebayCategoryName,
            itemSpecifics: mapping.itemSpecifics || {},
            isActive: mapping.isActive ?? true,
          },
          update: {
            ebayCategoryId: mapping.ebayCategoryId,
            ebayCategoryName: mapping.ebayCategoryName,
            itemSpecifics: mapping.itemSpecifics || {},
            isActive: mapping.isActive ?? true,
          },
        });
        results.created++;
      } catch (e) {
        results.failed++;
        results.errors.push(`Failed to import ${mapping.sourceCategory}: ${(e as Error).message}`);
      }
    }

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * カテゴリマッピングエクスポート
 */
router.get('/export/json', async (req, res, next) => {
  try {
    const categories = await prisma.ebayCategoryMapping.findMany({
      where: { isActive: true },
      orderBy: { sourceCategory: 'asc' },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=category_mappings.json');
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

/**
 * eBayカテゴリ検索（DBマッピング + モックデータ）
 */
router.get('/ebay/search', async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      throw new AppError(400, 'query parameter is required', 'INVALID_REQUEST');
    }

    const searchQuery = (query as string).toLowerCase();

    // DBのカテゴリマッピングを検索
    const dbMappings = await prisma.ebayCategoryMapping.findMany({
      where: {
        OR: [
          { sourceCategory: { contains: query as string, mode: 'insensitive' } },
          { ebayCategoryName: { contains: query as string, mode: 'insensitive' } },
        ],
      },
      take: 10,
    });

    // DBマッピングを整形
    const dbCategories = dbMappings.map(m => ({
      id: m.ebayCategoryId,
      name: m.ebayCategoryName || m.sourceCategory,
      path: m.ebayCategoryName,
      source: 'database',
    }));

    // よく使うカテゴリのモックデータ（DBにない場合のフォールバック）
    const commonCategories = [
      { id: '31387', name: 'Wristwatches', path: 'Jewelry & Watches > Watches, Parts & Accessories > Wristwatches' },
      { id: '260324', name: 'Watch Parts', path: 'Jewelry & Watches > Watches, Parts & Accessories > Parts, Tools & Guides > Parts' },
      { id: '14324', name: 'Collectible Japanese Anime Items', path: 'Collectibles > Animation Art & Merchandise > Japanese, Anime > Other Japanese Anime Items' },
      { id: '183454', name: 'Action Figures', path: 'Toys & Hobbies > Action Figures & Accessories > Action Figures' },
      { id: '158798', name: 'Video Games', path: 'Video Games & Consoles > Video Games' },
      { id: '139973', name: 'Trading Cards', path: 'Toys & Hobbies > Collectible Card Games > CCG Individual Cards' },
      { id: '11450', name: 'Clothing, Shoes & Accessories', path: 'Clothing, Shoes & Accessories' },
      { id: '281', name: 'Jewelry & Watches', path: 'Jewelry & Watches' },
      { id: '220', name: 'Toys & Hobbies', path: 'Toys & Hobbies' },
      { id: '1', name: 'Collectibles', path: 'Collectibles' },
    ].filter(c =>
      c.name.toLowerCase().includes(searchQuery) ||
      c.path.toLowerCase().includes(searchQuery)
    ).map(c => ({ ...c, source: 'common' }));

    // 結果をマージ（重複除去）
    const seenIds = new Set(dbCategories.map(c => c.id));
    const additionalCategories = commonCategories.filter(c => !seenIds.has(c.id));

    res.json({
      success: true,
      data: [...dbCategories, ...additionalCategories].slice(0, 15),
      message: dbCategories.length > 0 ? 'Results from database mappings' : 'Results from common categories',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 45: AIカテゴリ推定
 * 商品タイトルと説明文からeBayカテゴリを推定
 */
router.post('/infer', async (req, res, next) => {
  try {
    const { title, description = '', sourceCategory, useAI = true } = req.body;

    if (!title) {
      throw new AppError(400, 'title is required', 'INVALID_REQUEST');
    }

    log.info({
      type: 'category_infer_start',
      titlePreview: title.substring(0, 50),
      sourceCategory,
      useAI,
    });

    // 1. まずDBのマッピングを確認
    let dbMapping = null;
    if (sourceCategory) {
      dbMapping = await prisma.ebayCategoryMapping.findUnique({
        where: { sourceCategory },
      });
    }

    if (dbMapping) {
      log.info({
        type: 'category_infer_db_match',
        sourceCategory,
        ebayCategoryId: dbMapping.ebayCategoryId,
      });

      return res.json({
        success: true,
        data: {
          categoryId: dbMapping.ebayCategoryId,
          categoryName: dbMapping.ebayCategoryName,
          categoryPath: dbMapping.ebayCategoryName,
          confidence: 1.0,
          source: 'database',
          itemSpecifics: dbMapping.itemSpecifics,
        },
      });
    }

    // 2. enrichmentエンジンでカテゴリ推定
    const result = await mapToEbayCategory(
      sourceCategory || null,
      title,
      description,
      useAI
    );

    log.info({
      type: 'category_infer_complete',
      categoryId: result.categoryId,
      confidence: result.confidence,
      source: result.source,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 45: カテゴリサジェスト
 * クエリに基づいてカテゴリ候補を提案
 */
router.get('/suggest', async (req, res, next) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query) {
      throw new AppError(400, 'query parameter is required', 'INVALID_REQUEST');
    }

    // 1. DBマッピングを検索
    const dbMappings = await prisma.ebayCategoryMapping.findMany({
      where: {
        OR: [
          { sourceCategory: { contains: query as string, mode: 'insensitive' } },
          { ebayCategoryName: { contains: query as string, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: Number(limit),
    });

    const dbResults = dbMappings.map(m => ({
      category: m.sourceCategory,
      categoryId: m.ebayCategoryId,
      categoryName: m.ebayCategoryName,
      similarity: 1.0,
      source: 'database' as const,
    }));

    // 2. ビルトインカテゴリから検索
    const builtInResults = suggestCategories(query as string, Number(limit));
    const builtInFormatted = builtInResults.map(r => ({
      category: r.category,
      categoryId: r.categoryId,
      categoryName: EBAY_CATEGORY_MAP[r.category]?.categoryName || r.category,
      similarity: r.similarity,
      source: 'builtin' as const,
    }));

    // 3. 結果をマージ（重複除去、スコア順）
    const seenIds = new Set<string>();
    const merged = [...dbResults, ...builtInFormatted]
      .filter(r => {
        if (seenIds.has(r.categoryId)) return false;
        seenIds.add(r.categoryId);
        return true;
      })
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: merged,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 45: ビルトインカテゴリ一覧
 * enrichmentエンジンに組み込まれたカテゴリを取得
 */
router.get('/builtin', async (_req, res, next) => {
  try {
    const categories = getBuiltInCategories();

    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 45: カテゴリのItemSpecifics取得
 */
router.get('/item-specifics/:categoryId', async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    // 1. DBから取得を試行
    const dbMapping = await prisma.ebayCategoryMapping.findFirst({
      where: { ebayCategoryId: categoryId },
    });

    if (dbMapping && dbMapping.itemSpecifics) {
      return res.json({
        success: true,
        data: {
          categoryId,
          itemSpecifics: dbMapping.itemSpecifics,
          source: 'database',
        },
      });
    }

    // 2. ビルトインから取得
    const builtInSpecifics = getItemSpecificsForCategory(categoryId);

    res.json({
      success: true,
      data: {
        categoryId,
        itemSpecifics: builtInSpecifics || {},
        source: builtInSpecifics ? 'builtin' : 'none',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 45: ビルトインカテゴリをDBに同期
 * ビルトインのカテゴリマッピングをDBにインポート
 */
router.post('/sync-builtin', async (_req, res, next) => {
  try {
    const builtInCategories = getBuiltInCategories();
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
    };

    for (const cat of builtInCategories) {
      try {
        const existing = await prisma.ebayCategoryMapping.findUnique({
          where: { sourceCategory: cat.category },
        });

        if (existing) {
          // 既存のものは更新しない（ユーザーのカスタマイズを尊重）
          results.skipped++;
          continue;
        }

        // 新規作成
        await prisma.ebayCategoryMapping.create({
          data: {
            sourceCategory: cat.category,
            ebayCategoryId: cat.categoryId,
            ebayCategoryName: cat.categoryName,
            itemSpecifics: EBAY_CATEGORY_MAP[cat.category]?.itemSpecifics || {},
            isActive: true,
          },
        });
        results.created++;
      } catch {
        // 重複などのエラーはスキップ
        results.skipped++;
      }
    }

    log.info({
      type: 'category_sync_builtin_complete',
      ...results,
    });

    res.json({
      success: true,
      data: results,
      message: `Synced ${results.created} categories, skipped ${results.skipped}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Phase 45: テキストからカテゴリ推定（ルールベース高速版）
 * AIを使用せず、キーワードマッチングのみで推定
 */
router.post('/infer-fast', async (req, res, next) => {
  try {
    const { title, description = '' } = req.body;

    if (!title) {
      throw new AppError(400, 'title is required', 'INVALID_REQUEST');
    }

    const result = inferCategoryFromText(title, description);

    if (result.category && EBAY_CATEGORY_MAP[result.category]) {
      const categoryInfo = EBAY_CATEGORY_MAP[result.category];
      return res.json({
        success: true,
        data: {
          category: result.category,
          categoryId: categoryInfo.categoryId,
          categoryName: categoryInfo.categoryName,
          categoryPath: categoryInfo.categoryPath,
          confidence: result.confidence,
          hints: result.hints,
          itemSpecifics: categoryInfo.itemSpecifics,
        },
      });
    }

    res.json({
      success: true,
      data: {
        category: null,
        categoryId: null,
        categoryName: null,
        confidence: 0,
        hints: result.hints,
        message: 'No category match found',
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as categoriesRouter };

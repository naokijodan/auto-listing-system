/**
 * eBay多言語対応API
 * Phase 120: タイトル・説明文の多言語化
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// サポート言語
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
];

// ========================================
// ダッシュボード
// ========================================

/**
 * @swagger
 * /api/ebay-multilingual/dashboard:
 *   get:
 *     summary: 多言語対応ダッシュボード
 *     tags: [eBay Multilingual]
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    // 翻訳済みリスティング数
    const translatedListings = await prisma.listing.count({
      where: {
        marketplace: 'EBAY',
        marketplaceData: {
          path: '$.translations',
          not: 'null',
        },
      },
    });

    // 総リスティング数
    const totalListings = await prisma.listing.count({
      where: { marketplace: 'EBAY' },
    });

    // 言語別統計（marketplaceDataから集計）
    const listings = await prisma.listing.findMany({
      where: {
        marketplace: 'EBAY',
        status: 'ACTIVE',
      },
      select: {
        marketplaceData: true,
      },
    });

    const languageStats: Record<string, number> = {};
    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const translations = data?.translations as Record<string, unknown> | undefined;
      if (translations) {
        Object.keys(translations).forEach(lang => {
          languageStats[lang] = (languageStats[lang] || 0) + 1;
        });
      }
    });

    // 最近の翻訳
    const recentTranslations = await prisma.listing.findMany({
      where: {
        marketplace: 'EBAY',
        marketplaceData: {
          path: '$.translations',
          not: 'null',
        },
      },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        product: {
          select: { title: true, titleEn: true },
        },
      },
    });

    res.json({
      stats: {
        totalListings,
        translatedListings,
        translationRate: totalListings > 0
          ? Math.round((translatedListings / totalListings) * 100)
          : 0,
        languageStats,
      },
      supportedLanguages: SUPPORTED_LANGUAGES,
      recentTranslations: recentTranslations.map(l => ({
        id: l.id,
        title: l.product.titleEn || l.product.title,
        languages: Object.keys((l.marketplaceData as any)?.translations || {}),
        updatedAt: l.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Multilingual dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ========================================
// 言語一覧
// ========================================

/**
 * @swagger
 * /api/ebay-multilingual/languages:
 *   get:
 *     summary: サポート言語一覧
 *     tags: [eBay Multilingual]
 */
router.get('/languages', async (req: Request, res: Response) => {
  res.json({
    languages: SUPPORTED_LANGUAGES,
    defaultLanguage: 'en',
    ebayMarkets: [
      { code: 'EBAY_US', language: 'en', country: 'United States' },
      { code: 'EBAY_UK', language: 'en', country: 'United Kingdom' },
      { code: 'EBAY_DE', language: 'de', country: 'Germany' },
      { code: 'EBAY_FR', language: 'fr', country: 'France' },
      { code: 'EBAY_IT', language: 'it', country: 'Italy' },
      { code: 'EBAY_ES', language: 'es', country: 'Spain' },
      { code: 'EBAY_AU', language: 'en', country: 'Australia' },
      { code: 'EBAY_CA', language: 'en', country: 'Canada' },
    ],
  });
});

// ========================================
// 翻訳生成
// ========================================

const translateSchema = z.object({
  listingId: z.string(),
  targetLanguages: z.array(z.string()).min(1).max(5),
  fields: z.array(z.enum(['title', 'description', 'keywords'])).default(['title', 'description']),
});

/**
 * @swagger
 * /api/ebay-multilingual/translate:
 *   post:
 *     summary: リスティングを翻訳
 *     tags: [eBay Multilingual]
 */
router.post('/translate', async (req: Request, res: Response) => {
  try {
    const body = translateSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({
      where: { id: body.listingId },
      include: {
        product: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const sourceTitle = listing.product.titleEn || listing.product.title;
    const sourceDescription = listing.product.descriptionEn || listing.product.description;

    const translations: Record<string, Record<string, string>> = {};

    for (const lang of body.targetLanguages) {
      const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
      if (!langInfo) continue;

      translations[lang] = {};

      // タイトル翻訳
      if (body.fields.includes('title')) {
        const titleResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert eBay listing translator. Translate the product title to ${langInfo.name} (${langInfo.nativeName}).
Keep it concise (max 80 characters), maintain SEO keywords, and use natural e-commerce language for ${langInfo.name} speakers.
Only return the translated title, nothing else.`,
            },
            {
              role: 'user',
              content: sourceTitle,
            },
          ],
          max_tokens: 100,
          temperature: 0.3,
        });
        translations[lang].title = titleResponse.choices[0]?.message?.content?.trim() || sourceTitle;
      }

      // 説明文翻訳
      if (body.fields.includes('description')) {
        const descResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an expert eBay listing translator. Translate the product description to ${langInfo.name} (${langInfo.nativeName}).
Maintain the original formatting and structure. Use natural e-commerce language.
Only return the translated description, nothing else.`,
            },
            {
              role: 'user',
              content: sourceDescription,
            },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        });
        translations[lang].description = descResponse.choices[0]?.message?.content?.trim() || sourceDescription;
      }

      // キーワード生成
      if (body.fields.includes('keywords')) {
        const keywordsResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `Generate 10 SEO keywords for this eBay product in ${langInfo.name}.
Return only a comma-separated list of keywords, nothing else.`,
            },
            {
              role: 'user',
              content: sourceTitle,
            },
          ],
          max_tokens: 200,
          temperature: 0.5,
        });
        translations[lang].keywords = keywordsResponse.choices[0]?.message?.content?.trim() || '';
      }
    }

    // リスティングを更新
    const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
    const existingTranslations = (currentData.translations || {}) as Record<string, unknown>;

    await prisma.listing.update({
      where: { id: body.listingId },
      data: {
        marketplaceData: {
          ...currentData,
          translations: {
            ...existingTranslations,
            ...translations,
          },
          lastTranslatedAt: new Date().toISOString(),
        },
      },
    });

    logger.info(`Translated listing ${body.listingId} to ${body.targetLanguages.join(', ')}`);

    res.json({
      success: true,
      listingId: body.listingId,
      translations,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Translate error:', error);
    res.status(500).json({ error: 'Failed to translate' });
  }
});

// ========================================
// 一括翻訳
// ========================================

const bulkTranslateSchema = z.object({
  listingIds: z.array(z.string()).min(1).max(50),
  targetLanguages: z.array(z.string()).min(1).max(3),
  fields: z.array(z.enum(['title', 'description', 'keywords'])).default(['title']),
});

/**
 * @swagger
 * /api/ebay-multilingual/translate/bulk:
 *   post:
 *     summary: 一括翻訳
 *     tags: [eBay Multilingual]
 */
router.post('/translate/bulk', async (req: Request, res: Response) => {
  try {
    const body = bulkTranslateSchema.parse(req.body);

    const results: Array<{ listingId: string; success: boolean; error?: string }> = [];

    for (const listingId of body.listingIds) {
      try {
        const listing = await prisma.listing.findUnique({
          where: { id: listingId },
          include: { product: true },
        });

        if (!listing) {
          results.push({ listingId, success: false, error: 'Not found' });
          continue;
        }

        const sourceTitle = listing.product.titleEn || listing.product.title;
        const translations: Record<string, Record<string, string>> = {};

        for (const lang of body.targetLanguages) {
          const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === lang);
          if (!langInfo) continue;

          translations[lang] = {};

          if (body.fields.includes('title')) {
            const response = await openai.chat.completions.create({
              model: 'gpt-4o',
              messages: [
                {
                  role: 'system',
                  content: `Translate this eBay title to ${langInfo.name}. Max 80 chars. Return only the translation.`,
                },
                { role: 'user', content: sourceTitle },
              ],
              max_tokens: 100,
              temperature: 0.3,
            });
            translations[lang].title = response.choices[0]?.message?.content?.trim() || sourceTitle;
          }
        }

        const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
        const existingTranslations = (currentData.translations || {}) as Record<string, unknown>;

        await prisma.listing.update({
          where: { id: listingId },
          data: {
            marketplaceData: {
              ...currentData,
              translations: { ...existingTranslations, ...translations },
              lastTranslatedAt: new Date().toISOString(),
            },
          },
        });

        results.push({ listingId, success: true });
      } catch (err) {
        results.push({ listingId, success: false, error: 'Translation failed' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`Bulk translated ${successCount}/${body.listingIds.length} listings`);

    res.json({
      message: `${successCount}/${body.listingIds.length} listings translated`,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Bulk translate error:', error);
    res.status(500).json({ error: 'Failed to bulk translate' });
  }
});

// ========================================
// 翻訳取得
// ========================================

/**
 * @swagger
 * /api/ebay-multilingual/translations/{listingId}:
 *   get:
 *     summary: リスティングの翻訳を取得
 *     tags: [eBay Multilingual]
 */
router.get('/translations/:listingId', async (req: Request, res: Response) => {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: req.params.listingId },
      include: {
        product: {
          select: { title: true, titleEn: true, description: true, descriptionEn: true },
        },
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const data = listing.marketplaceData as Record<string, unknown>;
    const translations = data?.translations || {};

    res.json({
      listingId: listing.id,
      source: {
        title: listing.product.titleEn || listing.product.title,
        description: listing.product.descriptionEn || listing.product.description,
      },
      translations,
      lastTranslatedAt: data?.lastTranslatedAt,
    });
  } catch (error) {
    logger.error('Get translations error:', error);
    res.status(500).json({ error: 'Failed to get translations' });
  }
});

// ========================================
// 翻訳編集
// ========================================

const updateTranslationSchema = z.object({
  language: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.string().optional(),
});

/**
 * @swagger
 * /api/ebay-multilingual/translations/{listingId}:
 *   patch:
 *     summary: 翻訳を編集
 *     tags: [eBay Multilingual]
 */
router.patch('/translations/:listingId', async (req: Request, res: Response) => {
  try {
    const body = updateTranslationSchema.parse(req.body);

    const listing = await prisma.listing.findUnique({
      where: { id: req.params.listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
    const translations = (currentData.translations || {}) as Record<string, Record<string, string>>;
    const langTranslation = translations[body.language] || {};

    const updated = {
      ...langTranslation,
      ...(body.title && { title: body.title }),
      ...(body.description && { description: body.description }),
      ...(body.keywords && { keywords: body.keywords }),
    };

    await prisma.listing.update({
      where: { id: req.params.listingId },
      data: {
        marketplaceData: {
          ...currentData,
          translations: {
            ...translations,
            [body.language]: updated,
          },
        },
      },
    });

    res.json({ success: true, language: body.language, translation: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Update translation error:', error);
    res.status(500).json({ error: 'Failed to update translation' });
  }
});

// ========================================
// 翻訳削除
// ========================================

/**
 * @swagger
 * /api/ebay-multilingual/translations/{listingId}/{language}:
 *   delete:
 *     summary: 特定言語の翻訳を削除
 *     tags: [eBay Multilingual]
 */
router.delete('/translations/:listingId/:language', async (req: Request, res: Response) => {
  try {
    const { listingId, language } = req.params;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const currentData = (listing.marketplaceData || {}) as Record<string, unknown>;
    const translations = { ...(currentData.translations || {}) } as Record<string, unknown>;
    delete translations[language];

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        marketplaceData: {
          ...currentData,
          translations,
        },
      },
    });

    res.json({ success: true, deletedLanguage: language });
  } catch (error) {
    logger.error('Delete translation error:', error);
    res.status(500).json({ error: 'Failed to delete translation' });
  }
});

// ========================================
// 言語検出
// ========================================

const detectLanguageSchema = z.object({
  text: z.string().min(10).max(1000),
});

/**
 * @swagger
 * /api/ebay-multilingual/detect:
 *   post:
 *     summary: テキストの言語を検出
 *     tags: [eBay Multilingual]
 */
router.post('/detect', async (req: Request, res: Response) => {
  try {
    const body = detectLanguageSchema.parse(req.body);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Detect the language of the given text. Return only the ISO 639-1 language code (e.g., "en", "ja", "de").`,
        },
        { role: 'user', content: body.text },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const detectedCode = response.choices[0]?.message?.content?.trim()?.toLowerCase() || 'en';
    const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === detectedCode);

    res.json({
      detected: detectedCode,
      language: langInfo || { code: detectedCode, name: 'Unknown', nativeName: 'Unknown' },
      confidence: langInfo ? 'high' : 'low',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    logger.error('Detect language error:', error);
    res.status(500).json({ error: 'Failed to detect language' });
  }
});

// ========================================
// 統計
// ========================================

/**
 * @swagger
 * /api/ebay-multilingual/stats:
 *   get:
 *     summary: 多言語対応統計
 *     tags: [eBay Multilingual]
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const listings = await prisma.listing.findMany({
      where: { marketplace: 'EBAY' },
      select: { marketplaceData: true, status: true },
    });

    let totalTranslated = 0;
    let totalLanguages = 0;
    const languageCounts: Record<string, number> = {};
    const statusCounts: Record<string, { total: number; translated: number }> = {};

    listings.forEach(listing => {
      const data = listing.marketplaceData as Record<string, unknown>;
      const translations = data?.translations as Record<string, unknown> | undefined;

      if (!statusCounts[listing.status]) {
        statusCounts[listing.status] = { total: 0, translated: 0 };
      }
      statusCounts[listing.status].total++;

      if (translations && Object.keys(translations).length > 0) {
        totalTranslated++;
        statusCounts[listing.status].translated++;
        const langCount = Object.keys(translations).length;
        totalLanguages += langCount;

        Object.keys(translations).forEach(lang => {
          languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        });
      }
    });

    res.json({
      overview: {
        totalListings: listings.length,
        translatedListings: totalTranslated,
        translationRate: listings.length > 0
          ? Math.round((totalTranslated / listings.length) * 100)
          : 0,
        avgLanguagesPerListing: totalTranslated > 0
          ? Math.round((totalLanguages / totalTranslated) * 10) / 10
          : 0,
      },
      byLanguage: Object.entries(languageCounts)
        .map(([code, count]) => ({
          code,
          name: SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      byStatus: statusCounts,
    });
  } catch (error) {
    logger.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export { router as ebayMultilingualRouter };

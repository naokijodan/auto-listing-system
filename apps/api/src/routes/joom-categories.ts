/**
 * Phase 49: Joomカテゴリマッピング API
 */
import { Router, Request, Response } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { z } from 'zod';
import OpenAI from 'openai';

const router = Router();
const log = logger.child({ module: 'joom-categories-api' });

// OpenAIクライアント
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ========================================
// Joomカテゴリ一覧
// ========================================
const JOOM_CATEGORIES = [
  { id: '1', name: 'Electronics', path: 'Electronics' },
  { id: '1-1', name: 'Smartphones', path: 'Electronics > Smartphones' },
  { id: '1-2', name: 'Tablets', path: 'Electronics > Tablets' },
  { id: '1-3', name: 'Laptops', path: 'Electronics > Laptops' },
  { id: '1-4', name: 'Smart Watches', path: 'Electronics > Wearables > Smart Watches' },
  { id: '1-5', name: 'Headphones', path: 'Electronics > Audio > Headphones' },
  { id: '2', name: 'Fashion', path: 'Fashion' },
  { id: '2-1', name: 'Men Clothing', path: 'Fashion > Men > Clothing' },
  { id: '2-2', name: 'Women Clothing', path: 'Fashion > Women > Clothing' },
  { id: '2-3', name: 'Watches', path: 'Fashion > Accessories > Watches' },
  { id: '2-4', name: 'Jewelry', path: 'Fashion > Accessories > Jewelry' },
  { id: '2-5', name: 'Bags', path: 'Fashion > Accessories > Bags' },
  { id: '3', name: 'Home & Garden', path: 'Home & Garden' },
  { id: '3-1', name: 'Kitchen', path: 'Home & Garden > Kitchen' },
  { id: '4', name: 'Beauty & Health', path: 'Beauty & Health' },
  { id: '5', name: 'Toys & Hobbies', path: 'Toys & Hobbies' },
  { id: '5-1', name: 'Action Figures', path: 'Toys & Hobbies > Action Figures' },
  { id: '6', name: 'Sports & Outdoors', path: 'Sports & Outdoors' },
  { id: '7', name: 'Collectibles', path: 'Collectibles' },
];

// カテゴリ別必須属性
const CATEGORY_REQUIRED_ATTRIBUTES: Record<string, Record<string, any>> = {
  '1-4': { brand: 'string', model: 'string', display_type: ['LCD', 'OLED', 'AMOLED'] },
  '2-3': { brand: 'string', movement_type: ['Automatic', 'Quartz', 'Mechanical'] },
  '2-4': { material: ['Gold', 'Silver', 'Platinum'] },
  '5-1': { brand: 'string', character: 'string', scale: 'string' },
};

// ========================================
// バリデーションスキーマ
// ========================================

const ProductInfoSchema = z.object({
  title: z.string().min(1),
  titleEn: z.string().optional(),
  description: z.string(),
  descriptionEn: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  attributes: z.record(z.any()).optional(),
});

const CreateMappingSchema = z.object({
  sourceKeywords: z.array(z.string()).min(1),
  sourceBrand: z.string().optional(),
  joomCategoryId: z.string().min(1),
  joomCategoryName: z.string().min(1),
  joomCategoryPath: z.string().min(1),
  requiredAttributes: z.record(z.any()).optional(),
  recommendedAttributes: z.record(z.any()).optional(),
  priority: z.number().optional(),
});

// ========================================
// ヘルパー関数
// ========================================

async function suggestCategoryWithAI(product: z.infer<typeof ProductInfoSchema>) {
  const title = product.titleEn || product.title;
  const description = product.descriptionEn || product.description;

  const categoriesText = JOOM_CATEGORIES.map(c => `${c.id}: ${c.path}`).join('\n');

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are an e-commerce category classification expert. Respond with valid JSON.' },
        { role: 'user', content: `Analyze this product and select the best Joom category.

Product:
Title: ${title}
Description: ${description.substring(0, 500)}
Category: ${product.category || 'N/A'}
Brand: ${product.brand || 'N/A'}

Available categories:
${categoriesText}

Respond in JSON: { "categoryId": "id", "confidence": 0.0-1.0, "reasoning": "..." }` },
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const result = JSON.parse(content);
    const category = JOOM_CATEGORIES.find(c => c.id === result.categoryId);
    if (!category) return null;

    return {
      joomCategoryId: result.categoryId,
      joomCategoryName: category.name,
      joomCategoryPath: category.path,
      confidence: result.confidence,
      reasoning: result.reasoning,
      requiredAttributes: CATEGORY_REQUIRED_ATTRIBUTES[result.categoryId] || {},
    };
  } catch (error: any) {
    log.error({ type: 'ai_category_error', error: error.message });
    return null;
  }
}

// ========================================
// エンドポイント
// ========================================

/**
 * GET /api/joom-categories
 */
router.get('/', async (_req: Request, res: Response) => {
  res.json({ success: true, data: JOOM_CATEGORIES });
});

/**
 * GET /api/joom-categories/mappings
 */
router.get('/mappings', async (req: Request, res: Response) => {
  try {
    const { verified, aiSuggested, limit = '50', offset = '0' } = req.query;

    const where: any = { isActive: true };
    if (verified === 'true') where.verifiedAt = { not: null };
    if (aiSuggested === 'true') where.aiSuggested = true;
    else if (aiSuggested === 'false') where.aiSuggested = false;

    const [mappings, total] = await Promise.all([
      prisma.joomCategoryMapping.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { usageCount: 'desc' }],
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.joomCategoryMapping.count({ where }),
    ]);

    res.json({ success: true, data: mappings, total });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/joom-categories/suggest
 */
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const productInfo = ProductInfoSchema.parse(req.body);
    const useAI = req.query.useAI !== 'false';
    const saveMapping = req.query.saveMapping !== 'false';

    // 既存マッピングを検索
    const keywords = [
      productInfo.title.toLowerCase(),
      productInfo.category?.toLowerCase(),
      productInfo.brand?.toLowerCase(),
    ].filter(Boolean) as string[];

    const existingMapping = await prisma.joomCategoryMapping.findFirst({
      where: {
        isActive: true,
        OR: [
          { sourceKeywords: { hasSome: keywords } },
          { sourceBrand: productInfo.brand?.toLowerCase() },
        ],
      },
      orderBy: [{ priority: 'desc' }, { usageCount: 'desc' }],
    });

    if (existingMapping) {
      await prisma.joomCategoryMapping.update({
        where: { id: existingMapping.id },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
      });

      res.json({ success: true, data: { existingMapping } });
      return;
    }

    // AIで推定
    if (useAI) {
      const suggestion = await suggestCategoryWithAI(productInfo);
      if (suggestion && suggestion.confidence >= 0.7) {
        if (saveMapping && suggestion.confidence >= 0.85) {
          await prisma.joomCategoryMapping.create({
            data: {
              sourceKeywords: keywords,
              sourceBrand: productInfo.brand?.toLowerCase(),
              joomCategoryId: suggestion.joomCategoryId,
              joomCategoryName: suggestion.joomCategoryName,
              joomCategoryPath: suggestion.joomCategoryPath,
              requiredAttributes: suggestion.requiredAttributes,
              aiConfidence: suggestion.confidence,
              aiSuggested: true,
              usageCount: 1,
              lastUsedAt: new Date(),
            },
          });
        }
        res.json({ success: true, data: { suggestion } });
        return;
      }
    }

    res.status(404).json({ success: false, error: 'No suitable category found' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/joom-categories/mappings
 */
router.post('/mappings', async (req: Request, res: Response) => {
  try {
    const data = CreateMappingSchema.parse(req.body);

    const mapping = await prisma.joomCategoryMapping.create({
      data: {
        sourceKeywords: data.sourceKeywords.map(k => k.toLowerCase()),
        sourceBrand: data.sourceBrand?.toLowerCase(),
        joomCategoryId: data.joomCategoryId,
        joomCategoryName: data.joomCategoryName,
        joomCategoryPath: data.joomCategoryPath,
        requiredAttributes: data.requiredAttributes || {},
        recommendedAttributes: data.recommendedAttributes || {},
        priority: data.priority || 0,
      },
    });

    res.status(201).json({ success: true, data: { id: mapping.id } });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
      return;
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/joom-categories/mappings/:id
 */
router.get('/mappings/:id', async (req: Request, res: Response) => {
  try {
    const mapping = await prisma.joomCategoryMapping.findUnique({
      where: { id: req.params.id },
    });

    if (!mapping) {
      res.status(404).json({ success: false, error: 'Mapping not found' });
      return;
    }

    res.json({ success: true, data: mapping });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/joom-categories/mappings/:id
 */
router.put('/mappings/:id', async (req: Request, res: Response) => {
  try {
    const mapping = await prisma.joomCategoryMapping.update({
      where: { id: req.params.id },
      data: { ...req.body, updatedAt: new Date() },
    });

    res.json({ success: true, data: mapping });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/joom-categories/mappings/:id/verify
 */
router.post('/mappings/:id/verify', async (req: Request, res: Response) => {
  try {
    const { verifiedBy } = req.body;
    if (!verifiedBy) {
      res.status(400).json({ success: false, error: 'verifiedBy is required' });
      return;
    }

    await prisma.joomCategoryMapping.update({
      where: { id: req.params.id },
      data: { verifiedAt: new Date(), verifiedBy, aiConfidence: 1.0 },
    });

    res.json({ success: true, message: 'Mapping verified' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/joom-categories/mappings/:id
 */
router.delete('/mappings/:id', async (req: Request, res: Response) => {
  try {
    await prisma.joomCategoryMapping.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Mapping deactivated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/joom-categories/:categoryId/attributes
 */
router.get('/:categoryId/attributes', async (req: Request, res: Response) => {
  const attributes = CATEGORY_REQUIRED_ATTRIBUTES[req.params.categoryId] || {};
  res.json({ success: true, data: attributes });
});

/**
 * GET /api/joom-categories/stats
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [totalMappings, verifiedMappings, aiSuggestedMappings, topCategories] = await Promise.all([
      prisma.joomCategoryMapping.count({ where: { isActive: true } }),
      prisma.joomCategoryMapping.count({ where: { isActive: true, verifiedAt: { not: null } } }),
      prisma.joomCategoryMapping.count({ where: { isActive: true, aiSuggested: true } }),
      prisma.joomCategoryMapping.groupBy({
        by: ['joomCategoryId', 'joomCategoryName'],
        where: { isActive: true },
        _sum: { usageCount: true },
        orderBy: { _sum: { usageCount: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalMappings,
        verifiedMappings,
        aiSuggestedMappings,
        verificationRate: totalMappings > 0 ? (verifiedMappings / totalMappings * 100).toFixed(1) : 0,
        topCategories: topCategories.map(c => ({
          categoryId: c.joomCategoryId,
          categoryName: c.joomCategoryName,
          usageCount: c._sum.usageCount || 0,
        })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

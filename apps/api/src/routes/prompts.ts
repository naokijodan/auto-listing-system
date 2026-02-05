import { Router } from 'express';
import OpenAI from 'openai';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();
const log = logger.child({ module: 'prompts' });

// OpenAIクライアント
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * 翻訳プロンプト一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, category, marketplace, isActive, limit = 100, offset = 0 } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { category: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category as string;
    }

    if (marketplace) {
      where.marketplace = marketplace as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [prompts, total] = await Promise.all([
      prisma.translationPrompt.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: [{ priority: 'desc' }, { name: 'asc' }],
        include: {
          _count: { select: { templates: true } },
        },
      }),
      prisma.translationPrompt.count({ where }),
    ]);

    res.json({
      success: true,
      data: prompts,
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
 * 翻訳プロンプト取得（単一）
 */
router.get('/:id', async (req, res, next) => {
  try {
    const prompt = await prisma.translationPrompt.findUnique({
      where: { id: req.params.id },
      include: {
        templates: true,
      },
    });

    if (!prompt) {
      throw new AppError(404, 'Translation prompt not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳プロンプト作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      category,
      marketplace,
      systemPrompt,
      userPrompt,
      extractAttributes = [],
      additionalInstructions,
      seoKeywords = [],
      priority = 0,
      isActive = true,
      isDefault = false,
    } = req.body;

    if (!name || !systemPrompt || !userPrompt) {
      throw new AppError(400, 'name, systemPrompt, and userPrompt are required', 'INVALID_REQUEST');
    }

    // isDefault = true の場合、他のデフォルトを解除
    if (isDefault) {
      await prisma.translationPrompt.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const prompt = await prisma.translationPrompt.create({
      data: {
        name,
        category,
        marketplace,
        systemPrompt,
        userPrompt,
        extractAttributes,
        additionalInstructions,
        seoKeywords,
        priority,
        isActive,
        isDefault,
      },
    });

    logger.info({
      type: 'translation_prompt_created',
      promptId: prompt.id,
      name,
    });

    res.status(201).json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳プロンプト更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name,
      category,
      marketplace,
      systemPrompt,
      userPrompt,
      extractAttributes,
      additionalInstructions,
      seoKeywords,
      priority,
      isActive,
      isDefault,
    } = req.body;

    // isDefault = true の場合、他のデフォルトを解除
    if (isDefault === true) {
      await prisma.translationPrompt.updateMany({
        where: {
          id: { not: req.params.id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (marketplace !== undefined) updateData.marketplace = marketplace;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (userPrompt !== undefined) updateData.userPrompt = userPrompt;
    if (extractAttributes !== undefined) updateData.extractAttributes = extractAttributes;
    if (additionalInstructions !== undefined) updateData.additionalInstructions = additionalInstructions;
    if (seoKeywords !== undefined) updateData.seoKeywords = seoKeywords;
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    const prompt = await prisma.translationPrompt.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳プロンプト削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.translationPrompt.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Translation prompt deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テスト翻訳（プロンプトをテスト実行）
 */
router.post('/:id/test', async (req, res, next) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      throw new AppError(400, 'title is required for test', 'INVALID_REQUEST');
    }

    const prompt = await prisma.translationPrompt.findUnique({
      where: { id: req.params.id },
    });

    if (!prompt) {
      throw new AppError(404, 'Translation prompt not found', 'NOT_FOUND');
    }

    // OpenAIが設定されていない場合はモックを返す
    if (!openai) {
      const mockTranslation = {
        titleEn: `[Mock] ${title}`,
        descriptionEn: description ? `[Mock Translation] ${description.substring(0, 100)}...` : null,
        extractedAttributes: null,
        usedPrompt: {
          system: prompt.systemPrompt.substring(0, 100) + '...',
          user: prompt.userPrompt.substring(0, 100) + '...',
        },
        tokensUsed: 0,
      };

      return res.json({
        success: true,
        data: mockTranslation,
        message: 'OpenAI API key not configured. Returning mock data.',
      });
    }

    // ユーザープロンプトを構築
    const userPrompt = prompt.userPrompt
      .replace('{{title}}', title)
      .replace('{{description}}', description || '(なし)');

    // 属性抽出の指示
    const attributeInstructions = prompt.extractAttributes.length > 0
      ? `\n\nAlso extract these attributes if present: ${prompt.extractAttributes.join(', ')}`
      : '';

    const fullUserPrompt = userPrompt + attributeInstructions + `

Return a JSON object:
{
  "titleEn": "Translated title",
  "descriptionEn": "Translated description",
  "attributes": { ... }
}`;

    try {
      log.info({ type: 'test_translation_start', promptId: prompt.id, model: MODEL });

      const response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: prompt.systemPrompt },
          { role: 'user', content: fullUserPrompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      const parsed = content ? JSON.parse(content) : {};
      const tokensUsed = response.usage?.total_tokens || 0;

      log.info({ type: 'test_translation_complete', tokensUsed });

      res.json({
        success: true,
        data: {
          titleEn: parsed.titleEn || title,
          descriptionEn: parsed.descriptionEn || description,
          extractedAttributes: parsed.attributes || null,
          usedPrompt: {
            system: prompt.systemPrompt.substring(0, 200) + '...',
            user: fullUserPrompt.substring(0, 200) + '...',
          },
          tokensUsed,
          model: MODEL,
        },
      });
    } catch (aiError: any) {
      log.error({ type: 'test_translation_error', error: aiError.message });

      res.json({
        success: false,
        data: {
          titleEn: `[Error] ${title}`,
          descriptionEn: null,
          extractedAttributes: null,
          error: aiError.message,
        },
        message: 'AI translation failed',
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * 翻訳プロンプト複製
 */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await prisma.translationPrompt.findUnique({
      where: { id: req.params.id },
    });

    if (!original) {
      throw new AppError(404, 'Translation prompt not found', 'NOT_FOUND');
    }

    const { name: newName = `${original.name} (コピー)` } = req.body;

    const duplicate = await prisma.translationPrompt.create({
      data: {
        name: newName,
        category: original.category,
        marketplace: original.marketplace,
        systemPrompt: original.systemPrompt,
        userPrompt: original.userPrompt,
        extractAttributes: original.extractAttributes,
        additionalInstructions: original.additionalInstructions,
        seoKeywords: original.seoKeywords,
        priority: original.priority,
        isActive: original.isActive,
        isDefault: false, // 複製はデフォルトにしない
      },
    });

    res.status(201).json({
      success: true,
      data: duplicate,
    });
  } catch (error) {
    next(error);
  }
});

export { router as promptsRouter };

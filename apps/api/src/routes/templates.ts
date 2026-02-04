import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';

const router = Router();

/**
 * テンプレート一覧取得
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, isActive, limit = 100, offset = 0 } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [templates, total] = await Promise.all([
      prisma.listingTemplate.findMany({
        where,
        take: Number(limit),
        skip: Number(offset),
        orderBy: { name: 'asc' },
        include: {
          categoryMapping: {
            select: {
              id: true,
              sourceCategory: true,
              ebayCategoryName: true,
            },
          },
          translationPrompt: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.listingTemplate.count({ where }),
    ]);

    res.json({
      success: true,
      data: templates,
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
 * テンプレート取得（単一）
 */
router.get('/:id', async (req, res, next) => {
  try {
    const template = await prisma.listingTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        categoryMapping: true,
        translationPrompt: true,
      },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレート作成
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      categoryMappingId,
      translationPromptId,
      profitRate = 30,
      minProfit = 500,
      titleTemplate,
      descriptionTemplate,
      conditionMapping = {},
      defaultWeight,
      defaultShippingDays,
      isActive = true,
    } = req.body;

    if (!name) {
      throw new AppError(400, 'name is required', 'INVALID_REQUEST');
    }

    const template = await prisma.listingTemplate.create({
      data: {
        name,
        description,
        categoryMappingId,
        translationPromptId,
        profitRate,
        minProfit,
        titleTemplate,
        descriptionTemplate,
        conditionMapping,
        defaultWeight,
        defaultShippingDays,
        isActive,
      },
      include: {
        categoryMapping: true,
        translationPrompt: true,
      },
    });

    logger.info({
      type: 'template_created',
      templateId: template.id,
      name,
    });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレート更新
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const {
      name,
      description,
      categoryMappingId,
      translationPromptId,
      profitRate,
      minProfit,
      titleTemplate,
      descriptionTemplate,
      conditionMapping,
      defaultWeight,
      defaultShippingDays,
      isActive,
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (categoryMappingId !== undefined) updateData.categoryMappingId = categoryMappingId;
    if (translationPromptId !== undefined) updateData.translationPromptId = translationPromptId;
    if (profitRate !== undefined) updateData.profitRate = profitRate;
    if (minProfit !== undefined) updateData.minProfit = minProfit;
    if (titleTemplate !== undefined) updateData.titleTemplate = titleTemplate;
    if (descriptionTemplate !== undefined) updateData.descriptionTemplate = descriptionTemplate;
    if (conditionMapping !== undefined) updateData.conditionMapping = conditionMapping;
    if (defaultWeight !== undefined) updateData.defaultWeight = defaultWeight;
    if (defaultShippingDays !== undefined) updateData.defaultShippingDays = defaultShippingDays;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await prisma.listingTemplate.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        categoryMapping: true,
        translationPrompt: true,
      },
    });

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレート削除
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.listingTemplate.delete({
      where: { id: req.params.id },
    });

    res.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * テンプレート複製
 */
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const original = await prisma.listingTemplate.findUnique({
      where: { id: req.params.id },
    });

    if (!original) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    const { name: newName = `${original.name} (コピー)` } = req.body;

    const duplicate = await prisma.listingTemplate.create({
      data: {
        name: newName,
        description: original.description,
        categoryMappingId: original.categoryMappingId,
        translationPromptId: original.translationPromptId,
        profitRate: original.profitRate,
        minProfit: original.minProfit,
        titleTemplate: original.titleTemplate,
        descriptionTemplate: original.descriptionTemplate,
        conditionMapping: original.conditionMapping as object,
        defaultWeight: original.defaultWeight,
        defaultShippingDays: original.defaultShippingDays,
        isActive: original.isActive,
      },
      include: {
        categoryMapping: true,
        translationPrompt: true,
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

/**
 * テンプレートプレビュー（商品データを適用したプレビュー）
 */
router.post('/:id/preview', async (req, res, next) => {
  try {
    const { productData } = req.body;

    const template = await prisma.listingTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        categoryMapping: true,
        translationPrompt: true,
      },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    // テンプレート変数を置換
    const replacePlaceholders = (text: string | null, data: any): string => {
      if (!text) return '';
      return text
        .replace(/\{\{title\}\}/g, data.title || '')
        .replace(/\{\{titleEn\}\}/g, data.titleEn || '')
        .replace(/\{\{brand\}\}/g, data.brand || '')
        .replace(/\{\{condition\}\}/g, data.condition || '')
        .replace(/\{\{price\}\}/g, data.price?.toString() || '');
    };

    // 価格計算
    const calculatePrice = (sourcePrice: number): number => {
      const profitRate = template.profitRate / 100;
      const minProfit = template.minProfit;
      const basePrice = sourcePrice * (1 + profitRate);
      const withMinProfit = sourcePrice + minProfit;
      return Math.max(basePrice, withMinProfit);
    };

    const preview = {
      title: replacePlaceholders(template.titleTemplate, productData),
      description: replacePlaceholders(template.descriptionTemplate, productData),
      listingPrice: productData.price ? calculatePrice(productData.price) : null,
      category: template.categoryMapping,
      conditionMapped: template.conditionMapping?.[productData.condition as keyof typeof template.conditionMapping] || productData.condition,
      weight: productData.weight || template.defaultWeight,
      shippingDays: template.defaultShippingDays,
    };

    res.json({
      success: true,
      data: preview,
    });
  } catch (error) {
    next(error);
  }
});

export { router as templatesRouter };

/**
 * Phase 105: eBay出品テンプレート API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '@rakuda/logger';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-templates' });

// ========================================
// テンプレート一覧
// ========================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, activeOnly = 'true' } = req.query;

    const where: Record<string, unknown> = {};
    if (activeOnly === 'true') {
      where.isActive = true;
    }
    if (categoryId) {
      where.ebayCategoryId = categoryId as string;
    }

    const templates = await prisma.ebayListingTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json({ templates, total: templates.length });
  } catch (error) {
    log.error({ type: 'list_templates_error', error });
    res.status(500).json({ error: 'Failed to list templates' });
  }
});

// ========================================
// テンプレート詳細
// ========================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.ebayListingTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    log.error({ type: 'get_template_error', error });
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// ========================================
// テンプレート作成
// ========================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      ebayCategoryId,
      ebayCategoryName,
      conditionId,
      conditionDescription,
      fulfillmentPolicyId,
      paymentPolicyId,
      returnPolicyId,
      defaultShippingCost,
      priceMultiplier = 1.0,
      itemSpecifics = {},
      descriptionTemplate,
      isDefault = false,
    } = req.body;

    if (!name || !ebayCategoryId) {
      return res.status(400).json({ error: 'name and ebayCategoryId are required' });
    }

    // デフォルトに設定する場合、他のデフォルトを解除
    if (isDefault) {
      await prisma.ebayListingTemplate.updateMany({
        where: { ebayCategoryId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.ebayListingTemplate.create({
      data: {
        name,
        description,
        ebayCategoryId,
        ebayCategoryName,
        conditionId,
        conditionDescription,
        fulfillmentPolicyId,
        paymentPolicyId,
        returnPolicyId,
        defaultShippingCost,
        priceMultiplier,
        itemSpecifics,
        descriptionTemplate,
        isDefault,
      },
    });

    log.info({ type: 'template_created', templateId: template.id, name });

    res.status(201).json(template);
  } catch (error) {
    log.error({ type: 'create_template_error', error });
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ========================================
// テンプレート更新
// ========================================

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      ebayCategoryId,
      ebayCategoryName,
      conditionId,
      conditionDescription,
      fulfillmentPolicyId,
      paymentPolicyId,
      returnPolicyId,
      defaultShippingCost,
      priceMultiplier,
      itemSpecifics,
      descriptionTemplate,
      isDefault,
      isActive,
    } = req.body;

    const existing = await prisma.ebayListingTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // デフォルトに設定する場合、他のデフォルトを解除
    if (isDefault && !existing.isDefault) {
      const categoryId = ebayCategoryId || existing.ebayCategoryId;
      await prisma.ebayListingTemplate.updateMany({
        where: { ebayCategoryId: categoryId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const template = await prisma.ebayListingTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(ebayCategoryId !== undefined && { ebayCategoryId }),
        ...(ebayCategoryName !== undefined && { ebayCategoryName }),
        ...(conditionId !== undefined && { conditionId }),
        ...(conditionDescription !== undefined && { conditionDescription }),
        ...(fulfillmentPolicyId !== undefined && { fulfillmentPolicyId }),
        ...(paymentPolicyId !== undefined && { paymentPolicyId }),
        ...(returnPolicyId !== undefined && { returnPolicyId }),
        ...(defaultShippingCost !== undefined && { defaultShippingCost }),
        ...(priceMultiplier !== undefined && { priceMultiplier }),
        ...(itemSpecifics !== undefined && { itemSpecifics }),
        ...(descriptionTemplate !== undefined && { descriptionTemplate }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    log.info({ type: 'template_updated', templateId: id });

    res.json(template);
  } catch (error) {
    log.error({ type: 'update_template_error', error });
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ========================================
// テンプレート削除
// ========================================

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.ebayListingTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.ebayListingTemplate.delete({
      where: { id },
    });

    log.info({ type: 'template_deleted', templateId: id });

    res.json({ message: 'Template deleted', id });
  } catch (error) {
    log.error({ type: 'delete_template_error', error });
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ========================================
// テンプレートを出品に適用
// ========================================

router.post('/:id/apply', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { listingIds } = req.body;

    if (!listingIds || !Array.isArray(listingIds) || listingIds.length === 0) {
      return res.status(400).json({ error: 'listingIds array is required' });
    }

    const template = await prisma.ebayListingTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // 出品にテンプレートを適用
    const results: Array<{ listingId: string; status: string; error?: string }> = [];

    for (const listingId of listingIds) {
      try {
        const listing = await prisma.listing.findFirst({
          where: { id: listingId, marketplace: 'EBAY' },
        });

        if (!listing) {
          results.push({ listingId, status: 'skipped', error: 'Listing not found' });
          continue;
        }

        const existingData = (listing.marketplaceData as Record<string, unknown>) || {};

        await prisma.listing.update({
          where: { id: listingId },
          data: {
            shippingCost: template.defaultShippingCost ?? listing.shippingCost,
            marketplaceData: {
              ...existingData,
              categoryId: template.ebayCategoryId,
              conditionId: template.conditionId,
              conditionDescription: template.conditionDescription,
              fulfillmentPolicyId: template.fulfillmentPolicyId,
              paymentPolicyId: template.paymentPolicyId,
              returnPolicyId: template.returnPolicyId,
              itemSpecifics: template.itemSpecifics,
              templateId: template.id,
            },
          },
        });

        results.push({ listingId, status: 'applied' });
      } catch (error: any) {
        results.push({ listingId, status: 'error', error: error.message });
      }
    }

    const appliedCount = results.filter(r => r.status === 'applied').length;

    log.info({
      type: 'template_applied',
      templateId: id,
      totalListings: listingIds.length,
      appliedCount,
    });

    res.json({
      message: `Template applied to ${appliedCount} listings`,
      templateId: id,
      results,
    });
  } catch (error) {
    log.error({ type: 'apply_template_error', error });
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// ========================================
// カテゴリのデフォルトテンプレート取得
// ========================================

router.get('/category/:categoryId/default', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;

    const template = await prisma.ebayListingTemplate.findFirst({
      where: {
        ebayCategoryId: categoryId,
        isDefault: true,
        isActive: true,
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'No default template for this category' });
    }

    res.json(template);
  } catch (error) {
    log.error({ type: 'get_default_template_error', error });
    res.status(500).json({ error: 'Failed to get default template' });
  }
});

export default router;

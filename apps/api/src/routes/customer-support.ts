/**
 * Phase 63-64: 顧客対応自動化APIエンドポイント
 *
 * 自動返信ルール管理、メッセージ分析、統計取得
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { AppError } from '../middleware/error-handler';
import {
  analyzeMessage,
  generateAutoReply,
  findMatchingRules,
  getCustomerSupportStats,
  getPendingMessages,
  replaceTemplateVariables,
  buildTemplateVariables,
  TEMPLATE_VARIABLES,
  DEFAULT_TEMPLATES,
  DEFAULT_AUTO_REPLY_RULES,
  TriggerType,
} from '../lib/customer-support-engine';

const router = Router();
const log = logger.child({ module: 'customer-support-api' });

// バリデーションスキーマ
const createRuleSchema = z.object({
  name: z.string().min(1),
  triggerType: z.enum(['KEYWORD', 'ORDER_STATUS', 'NO_RESPONSE', 'FIRST_MESSAGE', 'REFUND_REQUEST', 'SHIPPING_INQUIRY']),
  triggerCondition: z.object({
    keywords: z.array(z.string()).optional(),
    orderStatus: z.string().optional(),
    delayMinutes: z.number().optional(),
    marketplace: z.enum(['JOOM', 'EBAY', 'ALL']).optional(),
  }),
  templateId: z.string(),
  priority: z.number().min(1).max(100).default(50),
  isActive: z.boolean().default(true),
});

const analyzeMessageSchema = z.object({
  message: z.string().min(1),
  marketplace: z.enum(['JOOM', 'EBAY']),
  isFirstMessage: z.boolean().default(false),
  orderId: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  category: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
});

/**
 * @swagger
 * /api/customer-support/stats:
 *   get:
 *     summary: 顧客対応統計を取得
 *     tags: [Customer Support]
 *     responses:
 *       200:
 *         description: 顧客対応統計
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await getCustomerSupportStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/messages/pending:
 *   get:
 *     summary: 未返信メッセージ一覧を取得
 *     tags: [Customer Support]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 未返信メッセージ一覧
 */
router.get('/messages/pending', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await getPendingMessages(limit);

    res.json({
      success: true,
      data: messages,
      total: messages.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/analyze:
 *   post:
 *     summary: メッセージを分析
 *     tags: [Customer Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - marketplace
 *             properties:
 *               message:
 *                 type: string
 *               marketplace:
 *                 type: string
 *                 enum: [JOOM, EBAY]
 *               isFirstMessage:
 *                 type: boolean
 *               orderId:
 *                 type: string
 *     responses:
 *       200:
 *         description: 分析結果
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const data = analyzeMessageSchema.parse(req.body);

    const analysis = await analyzeMessage(data.message, {
      marketplace: data.marketplace,
      isFirstMessage: data.isFirstMessage,
      orderId: data.orderId,
    });

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, `Validation error: ${error.errors.map((e) => e.message).join(', ')}`, 'VALIDATION_ERROR'));
    } else {
      next(error);
    }
  }
});

/**
 * @swagger
 * /api/customer-support/generate-reply:
 *   post:
 *     summary: 自動返信を生成
 *     tags: [Customer Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ruleId
 *             properties:
 *               ruleId:
 *                 type: string
 *               orderId:
 *                 type: string
 *               additionalVars:
 *                 type: object
 *     responses:
 *       200:
 *         description: 生成された返信
 */
router.post('/generate-reply', async (req, res, next) => {
  try {
    const { ruleId, orderId, additionalVars = {} } = req.body;

    if (!ruleId) {
      throw new AppError(400, 'ruleId is required', 'VALIDATION_ERROR');
    }

    const rule = await prisma.autoReplyRule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      throw new AppError(404, 'Rule not found', 'NOT_FOUND');
    }

    const reply = await generateAutoReply(
      {
        id: rule.id,
        name: rule.name,
        triggerType: rule.triggerType as TriggerType,
        triggerCondition: rule.triggerCondition as any,
        templateId: rule.templateId,
        priority: rule.priority,
        isActive: rule.isActive,
      },
      orderId,
      additionalVars
    );

    if (!reply) {
      throw new AppError(500, 'Failed to generate reply', 'GENERATION_FAILED');
    }

    res.json({
      success: true,
      data: reply,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/rules:
 *   get:
 *     summary: 自動返信ルール一覧を取得
 *     tags: [Customer Support]
 *     responses:
 *       200:
 *         description: ルール一覧
 */
router.get('/rules', async (_req, res, next) => {
  try {
    const rules = await prisma.autoReplyRule.findMany({
      orderBy: { priority: 'asc' },
      include: {
        template: {
          select: { id: true, name: true, category: true },
        },
      },
    });

    res.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/rules:
 *   post:
 *     summary: 自動返信ルールを作成
 *     tags: [Customer Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRuleInput'
 *     responses:
 *       201:
 *         description: 作成されたルール
 */
router.post('/rules', async (req, res, next) => {
  try {
    const data = createRuleSchema.parse(req.body);

    // テンプレートの存在確認
    const template = await prisma.messageTemplate.findUnique({
      where: { id: data.templateId },
    });

    if (!template) {
      throw new AppError(400, 'Template not found', 'TEMPLATE_NOT_FOUND');
    }

    const rule = await prisma.autoReplyRule.create({
      data: {
        name: data.name,
        triggerType: data.triggerType,
        triggerCondition: data.triggerCondition,
        templateId: data.templateId,
        priority: data.priority,
        isActive: data.isActive,
      },
    });

    log.info({ type: 'rule_created', ruleId: rule.id, name: rule.name });

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, `Validation error: ${error.errors.map((e) => e.message).join(', ')}`, 'VALIDATION_ERROR'));
    } else {
      next(error);
    }
  }
});

/**
 * @swagger
 * /api/customer-support/rules/{id}:
 *   patch:
 *     summary: 自動返信ルールを更新
 *     tags: [Customer Support]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新されたルール
 */
router.patch('/rules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rule = await prisma.autoReplyRule.update({
      where: { id },
      data: updates,
    });

    log.info({ type: 'rule_updated', ruleId: id });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/rules/{id}:
 *   delete:
 *     summary: 自動返信ルールを削除
 *     tags: [Customer Support]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 削除成功
 */
router.delete('/rules/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.autoReplyRule.delete({
      where: { id },
    });

    log.info({ type: 'rule_deleted', ruleId: id });

    res.json({
      success: true,
      message: 'Rule deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/templates:
 *   get:
 *     summary: メッセージテンプレート一覧を取得
 *     tags: [Customer Support]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: テンプレート一覧
 */
router.get('/templates', async (req, res, next) => {
  try {
    const { category } = req.query;

    const where: any = {};
    if (category) {
      where.category = category;
    }

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/templates:
 *   post:
 *     summary: メッセージテンプレートを作成
 *     tags: [Customer Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTemplateInput'
 *     responses:
 *       201:
 *         description: 作成されたテンプレート
 */
router.post('/templates', async (req, res, next) => {
  try {
    const data = createTemplateSchema.parse(req.body);

    const template = await prisma.messageTemplate.create({
      data: {
        name: data.name,
        nameEn: data.nameEn,
        category: data.category,
        triggerEvent: 'CUSTOM',
        subject: data.subject || '',
        body: data.body,
        variables: data.variables || [],
        isActive: data.isActive,
      },
    });

    log.info({ type: 'template_created', templateId: template.id, name: template.name });

    res.status(201).json({
      success: true,
      data: template,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new AppError(400, `Validation error: ${error.errors.map((e) => e.message).join(', ')}`, 'VALIDATION_ERROR'));
    } else {
      next(error);
    }
  }
});

/**
 * @swagger
 * /api/customer-support/templates/{id}:
 *   patch:
 *     summary: メッセージテンプレートを更新
 *     tags: [Customer Support]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新されたテンプレート
 */
router.patch('/templates/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: updates,
    });

    log.info({ type: 'template_updated', templateId: id });

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/templates/preview:
 *   post:
 *     summary: テンプレートをプレビュー
 *     tags: [Customer Support]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *             properties:
 *               templateId:
 *                 type: string
 *               orderId:
 *                 type: string
 *               customVars:
 *                 type: object
 *     responses:
 *       200:
 *         description: プレビュー結果
 */
router.post('/templates/preview', async (req, res, next) => {
  try {
    const { templateId, orderId, customVars = {} } = req.body;

    if (!templateId) {
      throw new AppError(400, 'templateId is required', 'VALIDATION_ERROR');
    }

    const template = await prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new AppError(404, 'Template not found', 'NOT_FOUND');
    }

    // 変数を構築
    const variables = orderId
      ? await buildTemplateVariables(orderId, customVars)
      : {
          buyer_name: 'John Smith',
          order_id: 'ORD-12345',
          tracking_number: 'JP123456789',
          tracking_url: 'https://track24.net/?code=JP123456789',
          product_title: 'Sample Product',
          estimated_delivery: '2026-02-28',
          seller_name: process.env.SELLER_NAME || 'RAKUDA Store',
          support_email: process.env.SUPPORT_EMAIL || 'support@example.com',
          refund_amount: '$25.00',
          order_total: '$49.99',
          ...customVars,
        };

    const subject = replaceTemplateVariables(template.subject || '', variables);
    const body = replaceTemplateVariables(template.body, variables);

    res.json({
      success: true,
      data: {
        subject,
        body,
        variables,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/customer-support/variables:
 *   get:
 *     summary: 利用可能なテンプレート変数一覧
 *     tags: [Customer Support]
 *     responses:
 *       200:
 *         description: 変数一覧
 */
router.get('/variables', async (_req, res) => {
  res.json({
    success: true,
    data: TEMPLATE_VARIABLES,
  });
});

/**
 * @swagger
 * /api/customer-support/init-defaults:
 *   post:
 *     summary: デフォルトテンプレートとルールを初期化
 *     tags: [Customer Support]
 *     responses:
 *       200:
 *         description: 初期化結果
 */
router.post('/init-defaults', async (_req, res, next) => {
  try {
    let templatesCreated = 0;
    let rulesCreated = 0;

    // デフォルトテンプレートを作成
    for (const tmpl of DEFAULT_TEMPLATES) {
      const existing = await prisma.messageTemplate.findFirst({
        where: { name: tmpl.name },
      });

      if (!existing) {
        await prisma.messageTemplate.create({
          data: {
            name: tmpl.name,
            nameEn: tmpl.nameEn,
            category: tmpl.category,
            triggerEvent: 'CUSTOM',
            subject: tmpl.subject || '',
            body: tmpl.body,
            variables: tmpl.variables,
            isActive: true,
          },
        });
        templatesCreated++;
      }
    }

    // テンプレートIDを取得してルールを作成
    const shippingTemplate = await prisma.messageTemplate.findFirst({
      where: { name: '配送状況問い合わせ返信' },
    });
    const firstMessageTemplate = await prisma.messageTemplate.findFirst({
      where: { name: '初回メッセージ自動返信' },
    });

    if (shippingTemplate) {
      for (const rule of DEFAULT_AUTO_REPLY_RULES) {
        const existing = await prisma.autoReplyRule.findFirst({
          where: { name: rule.name },
        });

        if (!existing) {
          const templateId =
            rule.triggerType === 'FIRST_MESSAGE'
              ? firstMessageTemplate?.id || shippingTemplate.id
              : shippingTemplate.id;

          await prisma.autoReplyRule.create({
            data: {
              name: rule.name,
              triggerType: rule.triggerType,
              triggerCondition: rule.triggerCondition,
              templateId,
              priority: rule.priority,
              isActive: rule.isActive,
            },
          });
          rulesCreated++;
        }
      }
    }

    log.info({
      type: 'defaults_initialized',
      templatesCreated,
      rulesCreated,
    });

    res.json({
      success: true,
      data: {
        templatesCreated,
        rulesCreated,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as customerSupportRouter };

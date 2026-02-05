/**
 * アラートルール・ログ管理API
 *
 * Phase 26: アクション誘導型アラートシステム
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import {
  CreateAlertRuleSchema,
  UpdateAlertRuleSchema,
  SendManualAlertSchema,
  AlertEventType,
} from '@rakuda/schema';

const router = Router();
const log = logger.child({ route: 'alerts' });

// Redis接続
const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// 通知キュー
const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATION, { connection: redis });

// ========================================
// アラートルール CRUD
// ========================================

/**
 * @swagger
 * /api/alerts/rules:
 *   get:
 *     tags: [Alerts]
 *     summary: アラートルール一覧を取得
 *     parameters:
 *       - name: eventType
 *         in: query
 *         schema:
 *           type: string
 *       - name: isActive
 *         in: query
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: ルール一覧
 */
router.get('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventType, isActive } = req.query;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rules = await prisma.alertRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/rules:
 *   post:
 *     tags: [Alerts]
 *     summary: アラートルールを作成
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: 作成されたルール
 */
router.post('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = CreateAlertRuleSchema.parse(req.body);

    const rule = await prisma.alertRule.create({
      data: {
        name: validated.name,
        eventType: validated.eventType,
        conditions: validated.conditions,
        severity: validated.severity,
        channels: validated.channels,
        cooldownMinutes: validated.cooldownMinutes,
        batchWindowMinutes: validated.batchWindowMinutes,
        isActive: validated.isActive,
      },
    });

    log.info({ type: 'alert_rule_created', ruleId: rule.id, name: rule.name });

    res.status(201).json({
      success: true,
      data: rule,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/rules/{id}:
 *   get:
 *     tags: [Alerts]
 *     summary: アラートルール詳細を取得
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ルール詳細
 */
router.get('/rules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found',
      });
    }

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
 * /api/alerts/rules/{id}:
 *   put:
 *     tags: [Alerts]
 *     summary: アラートルールを更新
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: 更新されたルール
 */
router.put('/rules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validated = UpdateAlertRuleSchema.parse(req.body);

    const existingRule = await prisma.alertRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found',
      });
    }

    const rule = await prisma.alertRule.update({
      where: { id },
      data: validated,
    });

    log.info({ type: 'alert_rule_updated', ruleId: rule.id, name: rule.name });

    res.json({
      success: true,
      data: rule,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/rules/{id}:
 *   delete:
 *     tags: [Alerts]
 *     summary: アラートルールを削除
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 削除成功
 */
router.delete('/rules/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existingRule = await prisma.alertRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found',
      });
    }

    await prisma.alertRule.delete({
      where: { id },
    });

    log.info({ type: 'alert_rule_deleted', ruleId: id });

    res.json({
      success: true,
      message: 'Alert rule deleted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/rules/{id}/test:
 *   post:
 *     tags: [Alerts]
 *     summary: アラートルールをテスト送信
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: テスト送信結果
 */
router.post('/rules/:id/test', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const rule = await prisma.alertRule.findUnique({
      where: { id },
    });

    if (!rule) {
      return res.status(404).json({
        success: false,
        error: 'Alert rule not found',
      });
    }

    // テスト通知をキューに追加
    const channels = rule.channels as string[];
    const jobs = [];

    for (const channel of channels) {
      const job = await notificationQueue.add('send-notification', {
        channel,
        template: rule.eventType,
        data: {
          title: '[テスト] ' + rule.name,
          message: 'これはテスト通知です。実際のアラートではありません。',
          severity: rule.severity,
          isTest: true,
        },
        deepLink: process.env.WEB_APP_URL || 'http://localhost:3001',
      });
      jobs.push({ channel, jobId: job.id });
    }

    log.info({ type: 'alert_rule_test', ruleId: id, channels, jobs: jobs.map(j => j.jobId) });

    res.json({
      success: true,
      message: 'Test notifications queued',
      jobs,
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// アラートログ
// ========================================

/**
 * @swagger
 * /api/alerts/logs:
 *   get:
 *     tags: [Alerts]
 *     summary: アラートログ一覧を取得
 *     parameters:
 *       - name: eventType
 *         in: query
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *       - name: severity
 *         in: query
 *         schema:
 *           type: string
 *       - name: from
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: to
 *         in: query
 *         schema:
 *           type: string
 *           format: date-time
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 50
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: ログ一覧
 */
router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      eventType,
      status,
      severity,
      from,
      to,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const [logs, total] = await Promise.all([
      prisma.alertLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.alertLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        hasMore: parseInt(offset as string, 10) + logs.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/alerts/logs/stats:
 *   get:
 *     tags: [Alerts]
 *     summary: アラート統計を取得
 *     parameters:
 *       - name: days
 *         in: query
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: 統計情報
 */
router.get('/logs/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const [
      totalLogs,
      statusCounts,
      eventTypeCounts,
      severityCounts,
      channelCounts,
    ] = await Promise.all([
      prisma.alertLog.count({
        where: { createdAt: { gte: fromDate } },
      }),
      prisma.alertLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: fromDate } },
        _count: { status: true },
      }),
      prisma.alertLog.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: fromDate } },
        _count: { eventType: true },
      }),
      prisma.alertLog.groupBy({
        by: ['severity'],
        where: { createdAt: { gte: fromDate } },
        _count: { severity: true },
      }),
      // チャネル別統計は複雑なため、ログを取得して集計
      prisma.alertLog.findMany({
        where: { createdAt: { gte: fromDate } },
        select: { channels: true },
      }),
    ]);

    // ステータス別集計
    const byStatus: Record<string, number> = {};
    statusCounts.forEach((s) => {
      byStatus[s.status] = s._count.status;
    });

    // イベントタイプ別集計
    const byEventType: Record<string, number> = {};
    eventTypeCounts.forEach((e) => {
      byEventType[e.eventType] = e._count.eventType;
    });

    // 重要度別集計
    const bySeverity: Record<string, number> = {};
    severityCounts.forEach((s) => {
      bySeverity[s.severity] = s._count.severity;
    });

    // チャネル別集計
    const byChannel: Record<string, number> = {};
    channelCounts.forEach((log) => {
      log.channels.forEach((channel) => {
        byChannel[channel] = (byChannel[channel] || 0) + 1;
      });
    });

    // 成功率を計算
    const totalSent = byStatus['sent'] || 0;
    const totalFailed = byStatus['failed'] || 0;
    const successRate = totalSent + totalFailed > 0
      ? (totalSent / (totalSent + totalFailed)) * 100
      : 100;

    res.json({
      success: true,
      data: {
        totalLogs,
        totalSent,
        totalFailed,
        totalBatched: byStatus['batched'] || 0,
        totalThrottled: byStatus['throttled'] || 0,
        successRate: Math.round(successRate * 100) / 100,
        byStatus,
        byEventType,
        bySeverity,
        byChannel,
        period: {
          from: fromDate.toISOString(),
          to: new Date().toISOString(),
          days,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========================================
// 手動通知送信
// ========================================

/**
 * @swagger
 * /api/alerts/send:
 *   post:
 *     tags: [Alerts]
 *     summary: 手動でアラートを送信
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - title
 *               - message
 *               - channels
 *             properties:
 *               eventType:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               severity:
 *                 type: string
 *                 default: info
 *               channels:
 *                 type: array
 *                 items:
 *                   type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: 送信結果
 */
router.post('/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = SendManualAlertSchema.parse(req.body);

    // アラートログを作成
    const alertLog = await prisma.alertLog.create({
      data: {
        eventType: validated.eventType,
        severity: validated.severity,
        title: validated.title,
        message: validated.message,
        metadata: validated.metadata ? JSON.parse(JSON.stringify(validated.metadata)) : undefined,
        channels: validated.channels,
        status: 'pending',
      },
    });

    // 各チャネルに通知ジョブをエンキュー
    const jobs = [];

    for (const channel of validated.channels) {
      const job = await notificationQueue.add('send-notification', {
        channel,
        template: validated.eventType,
        data: {
          title: validated.title,
          message: validated.message,
          severity: validated.severity,
          ...validated.metadata,
        },
        deepLink: process.env.WEB_APP_URL || 'http://localhost:3001',
        alertLogId: alertLog.id,
      });
      jobs.push({ channel, jobId: job.id });
    }

    log.info({
      type: 'manual_alert_sent',
      alertLogId: alertLog.id,
      channels: validated.channels,
      jobs: jobs.map(j => j.jobId),
    });

    res.json({
      success: true,
      message: 'Alert notifications queued',
      alertLogId: alertLog.id,
      jobs,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    next(error);
  }
});

// ========================================
// デフォルトルール初期化
// ========================================

/**
 * @swagger
 * /api/alerts/rules/init-defaults:
 *   post:
 *     tags: [Alerts]
 *     summary: デフォルトのアラートルールを初期化
 *     responses:
 *       200:
 *         description: 初期化結果
 */
router.post('/rules/init-defaults', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const defaultRules = [
      {
        name: '在庫切れ通知',
        eventType: 'INVENTORY_OUT_OF_STOCK',
        severity: 'critical',
        channels: ['email', 'slack'],
        cooldownMinutes: 60,
        batchWindowMinutes: 5,
      },
      {
        name: '価格急変通知',
        eventType: 'PRICE_DROP_DETECTED',
        severity: 'warning',
        channels: ['slack'],
        cooldownMinutes: 30,
        batchWindowMinutes: 10,
      },
      {
        name: '出品失敗通知',
        eventType: 'LISTING_FAILED',
        severity: 'critical',
        channels: ['email', 'slack'],
        cooldownMinutes: 0,
        batchWindowMinutes: 0,
      },
      {
        name: '競合価格変動通知',
        eventType: 'COMPETITOR_PRICE_CHANGE',
        severity: 'info',
        channels: ['slack'],
        cooldownMinutes: 60,
        batchWindowMinutes: 15,
      },
      {
        name: '新規注文通知',
        eventType: 'ORDER_RECEIVED',
        severity: 'info',
        channels: ['slack'],
        cooldownMinutes: 0,
        batchWindowMinutes: 0,
      },
      {
        name: 'スクレイプエラー通知',
        eventType: 'SCRAPE_ERROR',
        severity: 'warning',
        channels: ['email'],
        cooldownMinutes: 30,
        batchWindowMinutes: 5,
      },
    ];

    const created = [];
    const skipped = [];

    for (const rule of defaultRules) {
      // 同じ名前のルールが既にある場合はスキップ
      const existing = await prisma.alertRule.findFirst({
        where: { name: rule.name },
      });

      if (existing) {
        skipped.push(rule.name);
        continue;
      }

      const newRule = await prisma.alertRule.create({
        data: {
          ...rule,
          conditions: [],
          isActive: true,
        },
      });
      created.push(newRule);
    }

    log.info({
      type: 'default_rules_initialized',
      created: created.length,
      skipped: skipped.length,
    });

    res.json({
      success: true,
      message: 'Default alert rules initialized',
      created: created.length,
      skipped: skipped.length,
      rules: created,
    });
  } catch (error) {
    next(error);
  }
});

export { router as alertsRouter };

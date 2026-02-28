
/**
 * Phase 115: eBay自動価格調整 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace, PricingRuleType } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-auto-pricing' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const pricingQueue = new Queue(QUEUE_NAMES.INVENTORY, { connection: redisConnection });

// バリデーション
const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['COMPETITOR_FOLLOW', 'MIN_MARGIN', 'MAX_DISCOUNT', 'DEMAND_BASED', 'TIME_BASED', 'CUSTOM']),
  conditions: z.array(z.any()).default([]),
  actions: z.array(z.any()).default([]),
  marketplace: z.string().optional(),
  category: z.string().optional(),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
  safetyConfig: z.object({
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    maxChangePercent: z.number().optional(),
  }).optional(),
});

const updateRuleSchema = createRuleSchema.partial();

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      activeRules,
      totalChanges,
      recentChanges,
      changeStats,
    ] = await Promise.all([
      // アクティブなルール数
      prisma.pricingRule.count({ where: { isActive: true } }),
      // 総変更回数（30日）
      prisma.priceChangeLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // 最近の変更
      prisma.priceChangeLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // 変更統計（ソース別）
      prisma.priceChangeLog.groupBy({
        by: ['source'],
        _count: true,
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // リスティング情報を取得
    const listingIds = recentChanges.map(c => c.listingId);
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: { product: { select: { title: true, titleEn: true } } },
    });
    const listingMap = new Map(listings.map(l => [l.id, l]));

    const autoCount = changeStats.find(s => s.source === 'auto')?._count || 0;
    const ruleCount = changeStats.find(s => s.source === 'rule')?._count || 0;
    const manualCount = changeStats.find(s => s.source === 'manual')?._count || 0;

    res.json({
      summary: {
        activeRules,
        totalChanges,
        autoCount,
        ruleCount,
        manualCount,
      },
      recentChanges: recentChanges.map(c => {
        const listing = listingMap.get(c.listingId);
        return {
          id: c.id,
          listingId: c.listingId,
          productTitle: listing?.product?.titleEn || listing?.product?.title || '不明',
          oldPrice: c.oldPrice,
          newPrice: c.newPrice,
          changePercent: c.changePercent.toFixed(1),
          source: c.source,
          reason: c.reason,
          platformUpdated: c.platformUpdated,
          createdAt: c.createdAt,
        };
      }),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// ルール一覧
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const { isActive, type } = req.query;
    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (type) where.type = type;

    const rules = await prisma.pricingRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        type: r.type,
        conditions: r.conditions,
        actions: r.actions,
        marketplace: r.marketplace,
        category: r.category,
        priority: r.priority,
        isActive: r.isActive,
        safetyConfig: r.safetyConfig,
        appliedCount: r.appliedCount,
        lastAppliedAt: r.lastAppliedAt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'list_rules_error', error });
    res.status(500).json({ error: 'Failed to list rules' });
  }
});

// ルール詳細
router.get('/rules/:id', async (req: Request, res: Response) => {
  try {
    const rule = await prisma.pricingRule.findUnique({
      where: { id: req.params.id },
    });

    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    // このルールによる最近の変更
    const recentChanges = await prisma.priceChangeLog.findMany({
      where: { ruleId: rule.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ rule, recentChanges });
  } catch (error) {
    log.error({ type: 'get_rule_error', error });
    res.status(500).json({ error: 'Failed to get rule' });
  }
});

// ルール作成
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const validation = createRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { safetyConfig, ...ruleData } = validation.data;

    const rule = await prisma.pricingRule.create({
      data: {
        ...ruleData,
        type: ruleData.type as PricingRuleType,
        safetyConfig: safetyConfig || {},
      },
    });

    log.info({ type: 'rule_created', ruleId: rule.id });
    res.status(201).json({ message: 'Rule created', rule });
  } catch (error) {
    log.error({ type: 'create_rule_error', error });
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

// ルール更新
router.patch('/rules/:id', async (req: Request, res: Response) => {
  try {
    const validation = updateRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { safetyConfig, ...updateData } = validation.data;

    const rule = await prisma.pricingRule.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(safetyConfig && { safetyConfig }),
      },
    });

    log.info({ type: 'rule_updated', ruleId: rule.id });
    res.json({ message: 'Rule updated', rule });
  } catch (error) {
    log.error({ type: 'update_rule_error', error });
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

// ルール削除
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    await prisma.pricingRule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    log.error({ type: 'delete_rule_error', error });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ルール有効/無効切替
router.post('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const rule = await prisma.pricingRule.findUnique({ where: { id: req.params.id } });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    const updated = await prisma.pricingRule.update({
      where: { id: req.params.id },
      data: { isActive: !rule.isActive },
    });

    res.json({ message: `Rule ${updated.isActive ? 'activated' : 'deactivated'}`, rule: updated });
  } catch (error) {
    log.error({ type: 'toggle_rule_error', error });
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

// 手動価格調整実行
router.post('/execute', async (req: Request, res: Response) => {
  try {
    const { ruleId, listingIds, dryRun = false } = req.body;

    // ルール取得
    const rule = ruleId ? await prisma.pricingRule.findUnique({ where: { id: ruleId } }) : null;
    const safetyConfig = (rule?.safetyConfig as Record<string, number>) || {};

    // 対象リスティング取得
    const where: Record<string, unknown> = { marketplace: Marketplace.EBAY, status: 'ACTIVE' };
    if (listingIds?.length) where.id = { in: listingIds };

    const listings = await prisma.listing.findMany({
      where,
      include: {
        product: { select: { title: true, titleEn: true } },
      } as any,
      take: 100,
    }) as any[];

    const adjustments: Array<{
      listingId: string;
      productTitle: string;
      currentPrice: number;
      newPrice: number;
      changePercent: number;
      reason: string;
    }> = [];

    for (const listing of listings) {
      const competitors = listing.competitors || [];
      if (competitors.length === 0) continue;

      const lowestCompetitorPrice = Math.min(...competitors.map((c: any) => c.competitorPrice));
      let newPrice = listing.listingPrice;
      let reason = '';

      if (rule) {
        const actions = rule.actions as Array<{ type: string; value: number }>;
        const action = actions[0];

        switch (rule.type) {
          case 'COMPETITOR_FOLLOW':
            if (action?.type === 'match') {
              newPrice = lowestCompetitorPrice;
              reason = '最安値にマッチ';
            } else if (action?.type === 'undercut') {
              newPrice = lowestCompetitorPrice * (1 - (action.value || 5) / 100);
              reason = `最安値より${action.value || 5}%安く`;
            }
            break;
          case 'MIN_MARGIN':
            // マージン維持（原価がないので簡略化）
            newPrice = Math.max(lowestCompetitorPrice * 0.95, listing.listingPrice * 0.9);
            reason = 'マージン維持';
            break;
          case 'MAX_DISCOUNT':
            // 最大値下げ制限
            const maxDiscount = action?.value || 10;
            if (lowestCompetitorPrice < listing.listingPrice) {
              newPrice = Math.max(lowestCompetitorPrice, listing.listingPrice * (1 - maxDiscount / 100));
            }
            reason = `最大${maxDiscount}%値下げ`;
            break;
          default:
            // デフォルト: 競合より5%安く
            if (lowestCompetitorPrice < listing.listingPrice) {
              newPrice = lowestCompetitorPrice * 0.95;
              reason = '競合価格対応';
            }
        }

        // 安全設定適用
        if (safetyConfig.minPrice && newPrice < safetyConfig.minPrice) {
          newPrice = safetyConfig.minPrice;
        }
        if (safetyConfig.maxPrice && newPrice > safetyConfig.maxPrice) {
          newPrice = safetyConfig.maxPrice;
        }
        if (safetyConfig.maxChangePercent) {
          const maxChange = listing.listingPrice * (safetyConfig.maxChangePercent / 100);
          if (Math.abs(newPrice - listing.listingPrice) > maxChange) {
            newPrice = listing.listingPrice + (newPrice > listing.listingPrice ? maxChange : -maxChange);
          }
        }
      } else {
        // デフォルト: 競合より5%安く
        if (lowestCompetitorPrice < listing.listingPrice) {
          newPrice = lowestCompetitorPrice * 0.95;
          reason = '競合価格対応（自動）';
        }
      }

      // 価格が変わる場合のみ追加
      if (Math.abs(newPrice - listing.listingPrice) > 0.01) {
        newPrice = Math.round(newPrice * 100) / 100;
        const changePercent = ((newPrice - listing.listingPrice) / listing.listingPrice) * 100;
        adjustments.push({
          listingId: listing.id,
          productTitle: listing.product?.titleEn || listing.product?.title || '不明',
          currentPrice: listing.listingPrice,
          newPrice,
          changePercent,
          reason,
        });
      }
    }

    if (dryRun) {
      return res.json({
        message: 'Dry run completed',
        adjustments: adjustments.map(a => ({
          ...a,
          changePercent: a.changePercent.toFixed(1),
        })),
        count: adjustments.length,
      });
    }

    // 実際に価格を更新
    for (const adj of adjustments) {
      await prisma.$transaction([
        prisma.listing.update({
          where: { id: adj.listingId },
          data: { listingPrice: adj.newPrice },
        }),
        prisma.priceChangeLog.create({
          data: {
            listingId: adj.listingId,
            ruleId: rule?.id,
            oldPrice: adj.currentPrice,
            newPrice: adj.newPrice,
            changePercent: adj.changePercent,
            source: rule ? 'rule' : 'auto',
            reason: adj.reason,
          },
        }),
      ]);

      // ルール適用カウント更新
      if (rule) {
        await prisma.pricingRule.update({
          where: { id: rule.id },
          data: { appliedCount: { increment: 1 }, lastAppliedAt: new Date() },
        });
      }

      // eBay同期ジョブ
      await pricingQueue.add('sync-ebay-price', { listingId: adj.listingId, newPrice: adj.newPrice }, { priority: 2 });
    }

    log.info({ type: 'price_adjustment_executed', count: adjustments.length, ruleId });
    res.json({
      message: 'Price adjustment executed',
      adjustments: adjustments.map(a => ({
        ...a,
        changePercent: a.changePercent.toFixed(1),
      })),
      count: adjustments.length,
    });
  } catch (error) {
    log.error({ type: 'execute_error', error });
    res.status(500).json({ error: 'Failed to execute' });
  }
});

// 変更履歴
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { days = '30', limit = '100', offset = '0', source } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const where: Record<string, unknown> = { createdAt: { gte: since } };
    if (source) where.source = source;

    const [history, total] = await Promise.all([
      prisma.priceChangeLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10),
      }),
      prisma.priceChangeLog.count({ where }),
    ]);

    // リスティング情報取得
    const listingIds = history.map(h => h.listingId);
    const listings = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: { product: { select: { title: true, titleEn: true, images: true } } },
    });
    const listingMap = new Map(listings.map(l => [l.id, l]));

    // ルール情報取得
    const ruleIds = history.filter(h => h.ruleId).map(h => h.ruleId as string);
    const rules = await prisma.pricingRule.findMany({ where: { id: { in: ruleIds } } });
    const ruleMap = new Map(rules.map(r => [r.id, r]));

    res.json({
      history: history.map(h => {
        const listing = listingMap.get(h.listingId);
        const rule = h.ruleId ? ruleMap.get(h.ruleId) : null;
        return {
          id: h.id,
          listingId: h.listingId,
          productTitle: listing?.product?.titleEn || listing?.product?.title || '不明',
          productImage: listing?.product?.images?.[0],
          ruleName: rule?.name,
          oldPrice: h.oldPrice,
          newPrice: h.newPrice,
          changePercent: h.changePercent.toFixed(1),
          source: h.source,
          reason: h.reason,
          platformUpdated: h.platformUpdated,
          platformError: h.platformError,
          createdAt: h.createdAt,
        };
      }),
      total,
    });
  } catch (error) {
    log.error({ type: 'history_error', error });
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// 自動調整スケジュール設定
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findFirst({
      where: { key: 'auto_pricing_settings' },
    });

    const defaults = {
      enabled: false,
      interval: 'daily',
      runTime: '03:00',
      notifyOnChange: true,
      maxDailyAdjustments: 50,
    };

    res.json({
      settings: settings?.value ? JSON.parse(settings.value as string) : defaults,
    });
  } catch (error) {
    log.error({ type: 'get_settings_error', error });
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.post('/settings', async (req: Request, res: Response) => {
  try {
    const { enabled, interval, runTime, notifyOnChange, maxDailyAdjustments } = req.body;

    await prisma.systemSetting.upsert({
      where: { key: 'auto_pricing_settings' },
      create: {
        key: 'auto_pricing_settings',
        value: JSON.stringify({ enabled, interval, runTime, notifyOnChange, maxDailyAdjustments }),
      },
      update: {
        value: JSON.stringify({ enabled, interval, runTime, notifyOnChange, maxDailyAdjustments }),
      },
    });

    res.json({ message: 'Settings updated' });
  } catch (error) {
    log.error({ type: 'update_settings_error', error });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// 統計
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [totalChanges, bySource, avgChange] = await Promise.all([
      prisma.priceChangeLog.count({ where: { createdAt: { gte: since } } }),
      prisma.priceChangeLog.groupBy({
        by: ['source'],
        _count: true,
        where: { createdAt: { gte: since } },
      }),
      prisma.priceChangeLog.aggregate({
        _avg: { changePercent: true },
        where: { createdAt: { gte: since } },
      }),
    ]);

    res.json({
      stats: {
        totalChanges,
        bySource: bySource.map(s => ({
          source: s.source,
          count: s._count,
        })),
        avgChangePercent: avgChange._avg.changePercent?.toFixed(2) || '0',
      },
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

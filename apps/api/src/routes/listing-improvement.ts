import { Router } from 'express';
import { prisma } from '@rakuda/database';
import { logger } from '@rakuda/logger';

export const listingImprovementRouter = Router();

// GET /api/listing-improvement/stats - 改善提案統計
listingImprovementRouter.get('/stats', async (_req, res) => {
  try {
    const [
      totalSuggestions,
      pendingSuggestions,
      appliedSuggestions,
      rejectedSuggestions,
      totalBulkActions,
      completedBulkActions,
      totalHistories,
      avgEffectiveness,
    ] = await Promise.all([
      prisma.improvementSuggestion.count(),
      prisma.improvementSuggestion.count({ where: { status: 'PENDING' } }),
      prisma.improvementSuggestion.count({ where: { status: 'APPLIED' } }),
      prisma.improvementSuggestion.count({ where: { status: 'REJECTED' } }),
      prisma.bulkAction.count(),
      prisma.bulkAction.count({ where: { status: 'COMPLETED' } }),
      prisma.actionHistory.count(),
      prisma.actionHistory.aggregate({ _avg: { effectivenessScore: true } }),
    ]);

    const applicationRate = totalSuggestions > 0
      ? Math.round((appliedSuggestions / totalSuggestions) * 100)
      : 0;

    res.json({
      totalSuggestions,
      pendingSuggestions,
      appliedSuggestions,
      rejectedSuggestions,
      applicationRate,
      totalBulkActions,
      completedBulkActions,
      totalHistories,
      avgEffectiveness: avgEffectiveness._avg.effectivenessScore || 0,
    });
  } catch (error) {
    logger.error('Failed to get improvement stats', error);
    res.status(500).json({ error: 'Failed to get improvement stats' });
  }
});

// POST /api/listing-improvement/generate - AI改善提案生成
listingImprovementRouter.post('/generate', async (req, res) => {
  try {
    const { listingId, types = ['TITLE', 'DESCRIPTION', 'PRICE_REDUCE'] } = req.body;

    const listing = await prisma.listingPerformance.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // シミュレーション: GPT-4oによる改善提案生成
    const suggestions = [];

    for (const type of types) {
      let suggestion: any = {
        organizationId: 'default',
        listingId,
        suggestionType: type,
        priority: Math.floor(Math.random() * 10),
        confidenceScore: Math.random() * 0.4 + 0.6, // 0.6-1.0
        generatedBy: 'GPT-4o',
        generatedAt: new Date(),
        status: 'PENDING',
        beforeMetrics: {
          views: listing.views,
          watchers: listing.watchers,
          ctr: listing.ctr,
        },
      };

      switch (type) {
        case 'TITLE':
          suggestion.currentValue = listing.title;
          suggestion.suggestedValue = `${listing.title} - Premium Quality, Fast Shipping`;
          suggestion.explanation = 'キーワードを追加してSEOを改善し、品質と発送の速さをアピール';
          suggestion.expectedImpact = 'Views +20-30%';
          suggestion.expectedImpactScore = 25;
          break;
        case 'DESCRIPTION':
          suggestion.currentValue = 'Current description';
          suggestion.suggestedValue = 'Enhanced description with bullet points, specifications, and benefits';
          suggestion.explanation = '箇条書きと詳細な仕様を追加して購入意欲を高める';
          suggestion.expectedImpact = 'Conversion +15-25%';
          suggestion.expectedImpactScore = 20;
          break;
        case 'PRICE_REDUCE':
          const currentPrice = listing.price;
          const suggestedPrice = Math.round(currentPrice * 0.9 * 100) / 100;
          suggestion.currentValue = `$${currentPrice}`;
          suggestion.suggestedValue = `$${suggestedPrice}`;
          suggestion.explanation = `10%値下げで競争力を高める。カテゴリ平均価格との比較により推奨`;
          suggestion.expectedImpact = 'Views +40%, Watchers +30%';
          suggestion.expectedImpactScore = 35;
          break;
        case 'ITEM_SPECIFICS':
          suggestion.currentValue = '3 item specifics';
          suggestion.suggestedValue = '10 item specifics (Brand, Model, Size, Color, Material, etc.)';
          suggestion.explanation = 'Item Specificsを充実させて検索露出を向上';
          suggestion.expectedImpact = 'Impressions +50%';
          suggestion.expectedImpactScore = 40;
          break;
        case 'PHOTOS':
          suggestion.currentValue = '3 photos';
          suggestion.suggestedValue = '12 high-quality photos with multiple angles';
          suggestion.explanation = '高品質な写真を追加して商品の魅力を伝える';
          suggestion.expectedImpact = 'Conversion +20%';
          suggestion.expectedImpactScore = 20;
          break;
      }

      const created = await prisma.improvementSuggestion.create({
        data: suggestion,
      });
      suggestions.push(created);
    }

    res.status(201).json({
      success: true,
      suggestions,
      generatedCount: suggestions.length,
    });
  } catch (error) {
    logger.error('Failed to generate suggestions', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// GET /api/listing-improvement/suggestions - 提案一覧
listingImprovementRouter.get('/suggestions', async (req, res) => {
  try {
    const { status, type, listingId, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.suggestionType = type;
    if (listingId) where.listingId = listingId;

    const [suggestions, total] = await Promise.all([
      prisma.improvementSuggestion.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { confidenceScore: 'desc' }],
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          listing: { select: { title: true, price: true, views: true } },
        },
      }),
      prisma.improvementSuggestion.count({ where }),
    ]);

    res.json({ suggestions, total });
  } catch (error) {
    logger.error('Failed to get suggestions', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// POST /api/listing-improvement/apply/:id - 提案適用（ワンクリック）
listingImprovementRouter.post('/apply/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const suggestion = await prisma.improvementSuggestion.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    if (suggestion.status !== 'PENDING') {
      return res.status(400).json({ error: 'Suggestion is not pending' });
    }

    // シミュレーション: eBay APIで変更を適用
    // 実際にはeBay Trading APIのReviseItemを呼び出す

    // 提案を適用済みに更新
    const updated = await prisma.improvementSuggestion.update({
      where: { id },
      data: {
        status: 'APPLIED',
        appliedAt: new Date(),
        appliedBy: 'user',
      },
    });

    // アクション履歴を記録
    await prisma.actionHistory.create({
      data: {
        organizationId: 'default',
        listingId: suggestion.listingId,
        ebayItemId: suggestion.listing.ebayItemId,
        actionType: suggestion.suggestionType,
        actionSource: 'SUGGESTION',
        beforeState: { value: suggestion.currentValue },
        afterState: { value: suggestion.suggestedValue },
        beforeMetrics: suggestion.beforeMetrics as any,
        performedBy: 'user',
        relatedSuggestionId: id,
      },
    });

    res.json({
      success: true,
      suggestion: updated,
      message: 'Suggestion applied successfully',
    });
  } catch (error) {
    logger.error('Failed to apply suggestion', error);
    res.status(500).json({ error: 'Failed to apply suggestion' });
  }
});

// POST /api/listing-improvement/reject/:id - 提案却下
listingImprovementRouter.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const updated = await prisma.improvementSuggestion.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectedBy: 'user',
        rejectionReason: reason,
      },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Failed to reject suggestion', error);
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
});

// POST /api/listing-improvement/bulk-action - 一括アクション実行
listingImprovementRouter.post('/bulk-action', async (req, res) => {
  try {
    const {
      name,
      description,
      actionType,
      parameters = {},
      targetListings = [],
    } = req.body;

    const bulkAction = await prisma.bulkAction.create({
      data: {
        organizationId: 'default',
        name: name || `Bulk ${actionType}`,
        description,
        actionType,
        parameters,
        targetListings,
        targetCount: targetListings.length,
        status: 'RUNNING',
        startedAt: new Date(),
        createdBy: 'user',
      },
    });

    // シミュレーション: 一括処理実行
    setTimeout(async () => {
      const successCount = Math.floor(targetListings.length * 0.95);
      const failedCount = targetListings.length - successCount;

      await prisma.bulkAction.update({
        where: { id: bulkAction.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          processedCount: targetListings.length,
          successCount,
          failedCount,
          results: targetListings.map((listingId: string, index: number) => ({
            listingId,
            success: index < successCount,
            error: index >= successCount ? 'Random failure' : null,
          })),
        },
      });

      // アクション履歴を記録
      for (const listingId of targetListings.slice(0, successCount)) {
        await prisma.actionHistory.create({
          data: {
            organizationId: 'default',
            listingId,
            actionType,
            actionSource: 'BULK_ACTION',
            beforeState: {},
            afterState: parameters,
            performedBy: 'user',
            relatedBulkActionId: bulkAction.id,
          },
        });
      }

      logger.info(`Bulk action ${bulkAction.id} completed`);
    }, 3000);

    res.status(201).json(bulkAction);
  } catch (error) {
    logger.error('Failed to create bulk action', error);
    res.status(500).json({ error: 'Failed to create bulk action' });
  }
});

// GET /api/listing-improvement/bulk-actions - 一括アクション一覧
listingImprovementRouter.get('/bulk-actions', async (req, res) => {
  try {
    const { status, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const [actions, total] = await Promise.all([
      prisma.bulkAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.bulkAction.count({ where }),
    ]);

    res.json({ actions, total });
  } catch (error) {
    logger.error('Failed to get bulk actions', error);
    res.status(500).json({ error: 'Failed to get bulk actions' });
  }
});

// GET /api/listing-improvement/history - アクション履歴
listingImprovementRouter.get('/history', async (req, res) => {
  try {
    const { listingId, actionType, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (listingId) where.listingId = listingId;
    if (actionType) where.actionType = actionType;

    const [histories, total] = await Promise.all([
      prisma.actionHistory.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.actionHistory.count({ where }),
    ]);

    res.json({ histories, total });
  } catch (error) {
    logger.error('Failed to get action history', error);
    res.status(500).json({ error: 'Failed to get action history' });
  }
});

// GET /api/listing-improvement/effectiveness - 効果測定レポート
listingImprovementRouter.get('/effectiveness', async (req, res) => {
  try {
    // 適用済み提案の効果を集計
    const appliedSuggestions = await prisma.improvementSuggestion.findMany({
      where: { status: 'APPLIED' },
      include: { listing: true },
    });

    const byType = await prisma.improvementSuggestion.groupBy({
      by: ['suggestionType'],
      where: { status: 'APPLIED' },
      _count: true,
      _avg: { expectedImpactScore: true },
    });

    const histories = await prisma.actionHistory.findMany({
      where: { effectivenessScore: { not: null } },
      orderBy: { effectivenessScore: 'desc' },
      take: 10,
    });

    res.json({
      totalApplied: appliedSuggestions.length,
      byType: byType.map(t => ({
        type: t.suggestionType,
        count: t._count,
        avgExpectedImpact: t._avg.expectedImpactScore,
      })),
      topPerformingActions: histories,
    });
  } catch (error) {
    logger.error('Failed to get effectiveness report', error);
    res.status(500).json({ error: 'Failed to get effectiveness report' });
  }
});

// POST /api/listing-improvement/preview - 変更プレビュー
listingImprovementRouter.post('/preview', async (req, res) => {
  try {
    const { suggestionId } = req.body;

    const suggestion = await prisma.improvementSuggestion.findUnique({
      where: { id: suggestionId },
      include: { listing: true },
    });

    if (!suggestion) {
      return res.status(404).json({ error: 'Suggestion not found' });
    }

    res.json({
      suggestion,
      preview: {
        before: {
          value: suggestion.currentValue,
          metrics: suggestion.beforeMetrics,
        },
        after: {
          value: suggestion.suggestedValue,
          expectedMetrics: {
            views: suggestion.listing.views * 1.2,
            watchers: suggestion.listing.watchers * 1.15,
          },
        },
        explanation: suggestion.explanation,
        expectedImpact: suggestion.expectedImpact,
        confidence: `${Math.round(suggestion.confidenceScore * 100)}%`,
      },
    });
  } catch (error) {
    logger.error('Failed to get preview', error);
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

// POST /api/listing-improvement/generate-all - 低パフォーマンス出品に一括提案生成
listingImprovementRouter.post('/generate-all', async (_req, res) => {
  try {
    const lowPerformers = await prisma.listingPerformance.findMany({
      where: { isLowPerformer: true },
      take: 50,
    });

    let totalGenerated = 0;

    for (const listing of lowPerformers) {
      // 既存の保留中提案がないか確認
      const existingCount = await prisma.improvementSuggestion.count({
        where: { listingId: listing.id, status: 'PENDING' },
      });

      if (existingCount >= 3) continue;

      // スコアに応じて提案タイプを決定
      const types: string[] = [];
      if (listing.views < 50) types.push('TITLE', 'ITEM_SPECIFICS');
      if (listing.watchers < 5) types.push('PHOTOS', 'DESCRIPTION');
      if (listing.daysListed > 30) types.push('PRICE_REDUCE');

      if (types.length === 0) types.push('TITLE');

      for (const type of types.slice(0, 3 - existingCount)) {
        await prisma.improvementSuggestion.create({
          data: {
            organizationId: 'default',
            listingId: listing.id,
            suggestionType: type as any,
            priority: Math.floor(Math.random() * 10),
            confidenceScore: Math.random() * 0.3 + 0.7,
            currentValue: listing.title,
            suggestedValue: `Improved: ${listing.title}`,
            explanation: `Auto-generated suggestion for ${type.toLowerCase()}`,
            expectedImpact: 'Estimated +20% improvement',
            expectedImpactScore: 20,
            generatedBy: 'GPT-4o',
            generatedAt: new Date(),
            status: 'PENDING',
            beforeMetrics: {
              views: listing.views,
              watchers: listing.watchers,
            },
          },
        });
        totalGenerated++;
      }
    }

    res.json({
      success: true,
      processedListings: lowPerformers.length,
      totalGenerated,
    });
  } catch (error) {
    logger.error('Failed to generate all suggestions', error);
    res.status(500).json({ error: 'Failed to generate all suggestions' });
  }
});

export default listingImprovementRouter;

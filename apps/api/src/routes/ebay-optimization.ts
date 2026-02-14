/**
 * Phase 118: eBay出品最適化 API
 */

import { Router, Request, Response } from 'express';
import { PrismaClient, Marketplace } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { logger } from '@rakuda/logger';
import { QUEUE_NAMES } from '@rakuda/config';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const log = logger.child({ module: 'ebay-optimization' });

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });
const optimizationQueue = new Queue(QUEUE_NAMES.LISTING, { connection: redisConnection });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// バリデーション
const optimizeRequestSchema = z.object({
  listingId: z.string(),
  optimizeTitle: z.boolean().default(true),
  optimizeDescription: z.boolean().default(true),
  suggestKeywords: z.boolean().default(true),
});

// ダッシュボード
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalOptimizations,
      pendingOptimizations,
      appliedOptimizations,
      recentOptimizations,
      lowPerformanceListings,
    ] = await Promise.all([
      // 総最適化提案数
      prisma.listingOptimization.count(),
      // 保留中の提案
      prisma.listingOptimization.count({ where: { status: 'PENDING' } }),
      // 適用済み
      prisma.listingOptimization.count({ where: { status: 'APPLIED' } }),
      // 最近の最適化
      prisma.listingOptimization.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          listing: {
            include: { product: { select: { title: true, titleEn: true } } },
          },
        },
      }),
      // 低パフォーマンス出品（ビュー/ウォッチが少ない）
      prisma.listing.findMany({
        where: {
          marketplace: Marketplace.EBAY,
          status: 'ACTIVE',
          listedAt: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7日以上前
        },
        orderBy: { updatedAt: 'asc' },
        take: 10,
        include: { product: { select: { title: true, titleEn: true, images: true } } },
      }),
    ]);

    res.json({
      summary: {
        totalOptimizations,
        pendingOptimizations,
        appliedOptimizations,
      },
      recentOptimizations: recentOptimizations.map(o => ({
        id: o.id,
        listingId: o.listingId,
        productTitle: o.listing?.product?.titleEn || o.listing?.product?.title,
        type: o.type,
        status: o.status,
        createdAt: o.createdAt,
      })),
      lowPerformanceListings: lowPerformanceListings.map(l => ({
        id: l.id,
        productTitle: l.product?.titleEn || l.product?.title,
        productImage: l.product?.images?.[0],
        listedAt: l.listedAt,
        marketplaceData: l.marketplaceData,
      })),
    });
  } catch (error) {
    log.error({ type: 'dashboard_error', error });
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// 最適化提案一覧
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { status, type, limit = '50' } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const suggestions = await prisma.listingOptimization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
      include: {
        listing: {
          include: { product: { select: { title: true, titleEn: true, images: true } } },
        },
      },
    });

    res.json({
      suggestions: suggestions.map(s => ({
        id: s.id,
        listingId: s.listingId,
        productTitle: s.listing?.product?.titleEn || s.listing?.product?.title,
        productImage: s.listing?.product?.images?.[0],
        type: s.type,
        original: s.originalValue,
        suggested: s.suggestedValue,
        reason: s.reason,
        status: s.status,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    log.error({ type: 'list_suggestions_error', error });
    res.status(500).json({ error: 'Failed to list suggestions' });
  }
});

// 最適化を生成
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const validation = optimizeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: 'Validation failed', details: validation.error.errors });
    }

    const { listingId, optimizeTitle, optimizeDescription, suggestKeywords } = validation.data;

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, marketplace: Marketplace.EBAY },
      include: { product: true },
    });

    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const product = listing.product;
    const currentTitle = product.titleEn || product.title;
    const currentDescription = product.descriptionEn || product.description || '';

    const suggestions: Array<{
      type: string;
      original: string;
      suggested: string;
      reason: string;
    }> = [];

    // OpenAI APIでタイトル最適化
    if (optimizeTitle) {
      try {
        const titleResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an eBay listing optimization expert. Create SEO-optimized product titles that:
- Are under 80 characters
- Include key search terms
- Follow eBay best practices
- Are compelling to buyers
Respond with only the optimized title, nothing else.`,
            },
            {
              role: 'user',
              content: `Optimize this eBay product title:\n\nOriginal: ${currentTitle}\n\nCategory: ${product.category || 'General'}\nBrand: ${product.brand || 'Unknown'}\nCondition: ${product.condition || 'Unknown'}`,
            },
          ],
          max_tokens: 150,
          temperature: 0.7,
        });

        const suggestedTitle = titleResponse.choices[0]?.message?.content?.trim();
        if (suggestedTitle && suggestedTitle !== currentTitle) {
          suggestions.push({
            type: 'TITLE',
            original: currentTitle,
            suggested: suggestedTitle,
            reason: 'SEO最適化されたタイトル（検索キーワードを含む）',
          });
        }
      } catch (err) {
        log.error({ type: 'title_optimization_error', err });
      }
    }

    // 説明文最適化
    if (optimizeDescription && currentDescription) {
      try {
        const descResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an eBay listing optimization expert. Improve product descriptions to:
- Be clear and concise
- Highlight key features and benefits
- Include relevant search terms
- Use proper formatting with bullet points
- Be compelling to buyers
Respond with only the optimized description, nothing else.`,
            },
            {
              role: 'user',
              content: `Optimize this eBay product description:\n\n${currentDescription.substring(0, 2000)}\n\nProduct: ${currentTitle}`,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const suggestedDesc = descResponse.choices[0]?.message?.content?.trim();
        if (suggestedDesc && suggestedDesc !== currentDescription) {
          suggestions.push({
            type: 'DESCRIPTION',
            original: currentDescription.substring(0, 500) + '...',
            suggested: suggestedDesc.substring(0, 500) + '...',
            reason: '明確で魅力的な説明文に改善',
          });
        }
      } catch (err) {
        log.error({ type: 'description_optimization_error', err });
      }
    }

    // キーワード提案
    if (suggestKeywords) {
      try {
        const keywordResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are an eBay SEO expert. Suggest relevant search keywords that buyers might use to find this product. Return a JSON array of keywords, maximum 10 keywords.`,
            },
            {
              role: 'user',
              content: `Suggest keywords for:\nTitle: ${currentTitle}\nCategory: ${product.category || 'General'}\nBrand: ${product.brand || 'Unknown'}`,
            },
          ],
          max_tokens: 200,
          temperature: 0.7,
        });

        const keywordsText = keywordResponse.choices[0]?.message?.content?.trim();
        if (keywordsText) {
          try {
            const keywords = JSON.parse(keywordsText);
            if (Array.isArray(keywords) && keywords.length > 0) {
              suggestions.push({
                type: 'KEYWORDS',
                original: '',
                suggested: keywords.join(', '),
                reason: '検索キーワードの提案',
              });
            }
          } catch {
            // JSON解析失敗時はスキップ
          }
        }
      } catch (err) {
        log.error({ type: 'keyword_suggestion_error', err });
      }
    }

    // 提案をDBに保存
    for (const suggestion of suggestions) {
      await prisma.listingOptimization.create({
        data: {
          listingId,
          type: suggestion.type,
          originalValue: suggestion.original,
          suggestedValue: suggestion.suggested,
          reason: suggestion.reason,
          status: 'PENDING',
        },
      });
    }

    log.info({ type: 'optimization_generated', listingId, count: suggestions.length });
    res.json({
      message: `Generated ${suggestions.length} optimization suggestions`,
      suggestions,
    });
  } catch (error) {
    log.error({ type: 'generate_error', error });
    res.status(500).json({ error: 'Failed to generate optimizations' });
  }
});

// 一括最適化生成
router.post('/generate/bulk', async (req: Request, res: Response) => {
  try {
    const { listingIds } = req.body;

    if (!listingIds || !Array.isArray(listingIds)) {
      return res.status(400).json({ error: 'listingIds array required' });
    }

    for (const listingId of listingIds) {
      await optimizationQueue.add(
        'generate-optimization',
        { listingId, optimizeTitle: true, optimizeDescription: true, suggestKeywords: true },
        { priority: 3 }
      );
    }

    res.json({ message: `Queued ${listingIds.length} listings for optimization`, count: listingIds.length });
  } catch (error) {
    log.error({ type: 'bulk_generate_error', error });
    res.status(500).json({ error: 'Failed to queue bulk optimization' });
  }
});

// 提案を適用
router.post('/suggestions/:id/apply', async (req: Request, res: Response) => {
  try {
    const suggestion = await prisma.listingOptimization.findUnique({
      where: { id: req.params.id },
      include: { listing: { include: { product: true } } },
    });

    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found' });
    if (suggestion.status !== 'PENDING') {
      return res.status(400).json({ error: 'Suggestion already processed' });
    }

    // 値を適用
    if (suggestion.type === 'TITLE') {
      await prisma.product.update({
        where: { id: suggestion.listing!.productId },
        data: { titleEn: suggestion.suggestedValue },
      });
    } else if (suggestion.type === 'DESCRIPTION') {
      await prisma.product.update({
        where: { id: suggestion.listing!.productId },
        data: { descriptionEn: suggestion.suggestedValue },
      });
    }

    // ステータス更新
    await prisma.listingOptimization.update({
      where: { id: req.params.id },
      data: { status: 'APPLIED', appliedAt: new Date() },
    });

    // eBay同期ジョブ
    await optimizationQueue.add('sync-ebay-listing', { listingId: suggestion.listingId }, { priority: 2 });

    res.json({ message: 'Suggestion applied' });
  } catch (error) {
    log.error({ type: 'apply_error', error });
    res.status(500).json({ error: 'Failed to apply suggestion' });
  }
});

// 提案を却下
router.post('/suggestions/:id/reject', async (req: Request, res: Response) => {
  try {
    await prisma.listingOptimization.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    res.json({ message: 'Suggestion rejected' });
  } catch (error) {
    log.error({ type: 'reject_error', error });
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
});

// 提案を削除
router.delete('/suggestions/:id', async (req: Request, res: Response) => {
  try {
    await prisma.listingOptimization.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    log.error({ type: 'delete_error', error });
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// プレビュー（適用せずに比較表示）
router.get('/preview/:listingId', async (req: Request, res: Response) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: { id: req.params.listingId, marketplace: Marketplace.EBAY },
      include: { product: true },
    });

    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const suggestions = await prisma.listingOptimization.findMany({
      where: { listingId: req.params.listingId, status: 'PENDING' },
      orderBy: { type: 'asc' },
    });

    const titleSuggestion = suggestions.find(s => s.type === 'TITLE');
    const descSuggestion = suggestions.find(s => s.type === 'DESCRIPTION');
    const keywordSuggestion = suggestions.find(s => s.type === 'KEYWORDS');

    res.json({
      current: {
        title: listing.product.titleEn || listing.product.title,
        description: listing.product.descriptionEn || listing.product.description,
      },
      suggested: {
        title: titleSuggestion?.suggestedValue,
        description: descSuggestion?.suggestedValue,
        keywords: keywordSuggestion?.suggestedValue?.split(', '),
      },
      suggestions: suggestions.map(s => ({
        id: s.id,
        type: s.type,
        reason: s.reason,
      })),
    });
  } catch (error) {
    log.error({ type: 'preview_error', error });
    res.status(500).json({ error: 'Failed to get preview' });
  }
});

// 統計
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const since = new Date(Date.now() - parseInt(days as string, 10) * 24 * 60 * 60 * 1000);

    const [total, byStatus, byType] = await Promise.all([
      prisma.listingOptimization.count({ where: { createdAt: { gte: since } } }),
      prisma.listingOptimization.groupBy({
        by: ['status'],
        _count: true,
        where: { createdAt: { gte: since } },
      }),
      prisma.listingOptimization.groupBy({
        by: ['type'],
        _count: true,
        where: { createdAt: { gte: since } },
      }),
    ]);

    res.json({
      stats: {
        total,
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
        byType: byType.map(t => ({ type: t.type, count: t._count })),
      },
    });
  } catch (error) {
    log.error({ type: 'stats_error', error });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
